const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'casesim.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;
let SQL = null;

// Compatibility wrapper around sql.js to mimic better-sqlite3 API
// so all route files work unchanged
class StatementWrapper {
  constructor(database, sql) {
    this._db = database;
    this._sql = sql;
  }

  run(...params) {
    const flatParams = flattenParams(params);
    this._db.run(this._sql, flatParams);
    const lastId = this._db.exec('SELECT last_insert_rowid() as id');
    const changes = this._db.getRowsModified();
    return {
      lastInsertRowid: lastId.length > 0 ? lastId[0].values[0][0] : 0,
      changes,
    };
  }

  get(...params) {
    const flatParams = flattenParams(params);
    try {
      const stmt = this._db.prepare(this._sql);
      if (flatParams.length > 0) stmt.bind(flatParams);
      if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        stmt.free();
        const row = {};
        for (let i = 0; i < cols.length; i++) row[cols[i]] = vals[i];
        return row;
      }
      stmt.free();
      return undefined;
    } catch (e) {
      console.error('SQL get error:', e.message, this._sql);
      return undefined;
    }
  }

  all(...params) {
    const flatParams = flattenParams(params);
    try {
      const stmt = this._db.prepare(this._sql);
      if (flatParams.length > 0) stmt.bind(flatParams);
      const rows = [];
      while (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        const row = {};
        for (let i = 0; i < cols.length; i++) row[cols[i]] = vals[i];
        rows.push(row);
      }
      stmt.free();
      return rows;
    } catch (e) {
      console.error('SQL all error:', e.message, this._sql);
      return [];
    }
  }
}

function flattenParams(params) {
  if (params.length === 0) return [];
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
}

class DatabaseWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  prepare(sql) {
    return new StatementWrapper(this._db, sql);
  }

  exec(sql) {
    this._db.run(sql);
  }

  pragma(str) {
    try {
      this._db.run(`PRAGMA ${str}`);
    } catch (e) {
      // Some pragmas may not be supported in sql.js
    }
  }

  // Save database to disk
  save() {
    try {
      const data = this._db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (e) {
      console.error('DB save error:', e.message);
    }
  }
}

let dbWrapper = null;
let saveInterval = null;

async function initDb() {
  if (dbWrapper) return dbWrapper;

  SQL = await initSqlJs();

  // Load existing DB or create new
  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  dbWrapper = new DatabaseWrapper(sqlDb);

  // Run schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  // Split by semicolons and run each statement
  const statements = schema.split(';').filter(s => s.trim().length > 0);
  for (const stmt of statements) {
    try {
      sqlDb.run(stmt + ';');
    } catch (e) {
      // Table already exists etc - ignore
    }
  }

  // Seed default players if none exist
  const countResult = sqlDb.exec('SELECT COUNT(*) as c FROM players');
  const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
  if (count === 0) {
    sqlDb.run("INSERT INTO players (name, avatar, ngames_id, color, wallet) VALUES ('Keshawn', 'agent_ct_1', 'keshawn', '#80e060', 10.00)");
    sqlDb.run("INSERT INTO players (name, avatar, ngames_id, color, wallet) VALUES ('Sean', 'agent_ct_2', 'sean', '#f0c040', 10.00)");
    sqlDb.run("INSERT INTO players (name, avatar, ngames_id, color, wallet) VALUES ('Dart', 'agent_t_1', 'dart', '#e04040', 10.00)");
    sqlDb.run("INSERT INTO players (name, avatar, ngames_id, color, wallet) VALUES ('Amari', 'agent_t_2', 'amari', '#40c0e0', 10.00)");
  }

  // Auto-save every 10 seconds
  saveInterval = setInterval(() => dbWrapper.save(), 10000);

  // Save on exit
  process.on('exit', () => dbWrapper.save());
  process.on('SIGINT', () => { dbWrapper.save(); process.exit(); });
  process.on('SIGTERM', () => { dbWrapper.save(); process.exit(); });

  return dbWrapper;
}

// Synchronous getter - returns the wrapper after init
// For backward compatibility with getDb() calls in routes
function getDb() {
  if (!dbWrapper) {
    throw new Error('Database not initialized. Call await initDb() first.');
  }
  return dbWrapper;
}

module.exports = { initDb, getDb };
