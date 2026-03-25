const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDb, getDb } = require('./db/database');
const { batchRefreshPrices } = require('./services/priceCache');
const { getAllMarketHashNames } = require('./services/skinData');

const playersRouter = require('./routes/players');
const casesRouter = require('./routes/cases');
const marketRouter = require('./routes/market');
const gamesRouter = require('./routes/games');
const statsRouter = require('./routes/stats');
const tradeupRouter = require('./routes/tradeup');
const renameRouter = require('./routes/rename');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Serve static skin images
app.use('/skins', express.static(path.join(__dirname, '..', 'public', 'skins')));

// API Routes
app.use('/api/players', playersRouter);
app.use('/api/cases', casesRouter);
app.use('/api/market', marketRouter);
app.use('/api/games', gamesRouter(io));
app.use('/api/stats', statsRouter);
app.use('/api/tradeup', tradeupRouter);
app.use('/api/rename', renameRouter);

// Serve built client in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

// Socket.io for real-time games
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join_game', (data) => {
    socket.join(data.gameRoom);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

async function start() {
  // Initialize database (async for sql.js WASM loading)
  await initDb();
  console.log('Database initialized');

  // Refresh stale prices in background (don't block startup)
  const allNames = getAllMarketHashNames();
  console.log(`Loaded ${allNames.length} unique skins across all cases`);
  batchRefreshPrices(allNames.slice(0, 20)).catch(e => console.error('Price refresh error:', e));

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
