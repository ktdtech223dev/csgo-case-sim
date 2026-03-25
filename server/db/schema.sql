-- Players
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  ngames_id TEXT,
  color TEXT,
  wallet REAL DEFAULT 10.00,
  total_cases_opened INTEGER DEFAULT 0,
  total_earned REAL DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  click_value REAL DEFAULT 0.01,
  auto_income REAL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  skin_name TEXT NOT NULL,
  market_hash_name TEXT NOT NULL,
  wear TEXT NOT NULL,
  float_value REAL NOT NULL,
  stattrak INTEGER DEFAULT 0,
  image_url TEXT,
  rarity TEXT,
  case_name TEXT,
  custom_name TEXT,
  obtained_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Price Cache
CREATE TABLE IF NOT EXISTS price_cache (
  market_hash_name TEXT PRIMARY KEY,
  price_usd REAL,
  last_fetched INTEGER
);

-- Transaction Log
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  type TEXT,
  amount REAL,
  description TEXT,
  timestamp INTEGER DEFAULT (strftime('%s','now'))
);

-- Game History
CREATE TABLE IF NOT EXISTS game_history (
  id INTEGER PRIMARY KEY,
  game_type TEXT,
  player_id INTEGER,
  wager REAL,
  result TEXT,
  profit_loss REAL,
  timestamp INTEGER DEFAULT (strftime('%s','now'))
);

-- Upgrades
CREATE TABLE IF NOT EXISTS upgrades (
  id INTEGER PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  upgrade_type TEXT NOT NULL,
  level INTEGER DEFAULT 0,
  UNIQUE(player_id, upgrade_type)
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  achievement_id TEXT NOT NULL,
  unlocked_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(player_id, achievement_id)
);
