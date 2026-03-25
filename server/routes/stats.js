const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/stats/:playerId
router.get('/:playerId', (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const inventoryCount = db.prepare('SELECT COUNT(*) as c FROM inventory WHERE player_id = ?').get(req.params.playerId).c;
  const inventoryValue = db.prepare('SELECT SUM(COALESCE((SELECT price_usd FROM price_cache WHERE price_cache.market_hash_name = inventory.market_hash_name), 0.10)) as total FROM inventory WHERE player_id = ?').get(req.params.playerId).total || 0;

  const gameStats = db.prepare(`
    SELECT game_type, COUNT(*) as games, SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
    SUM(profit_loss) as total_profit
    FROM game_history WHERE player_id = ? GROUP BY game_type
  `).all(req.params.playerId);

  const bestDrop = db.prepare(`
    SELECT i.*, COALESCE(p.price_usd, 0.10) as price
    FROM inventory i LEFT JOIN price_cache p ON i.market_hash_name = p.market_hash_name
    WHERE i.player_id = ? ORDER BY COALESCE(p.price_usd, 0.10) DESC LIMIT 1
  `).get(req.params.playerId);

  const recentTransactions = db.prepare('SELECT * FROM transactions WHERE player_id = ? ORDER BY timestamp DESC LIMIT 20').all(req.params.playerId);

  res.json({
    player,
    inventoryCount,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    gameStats,
    bestDrop,
    recentTransactions,
  });
});

// GET /api/stats/leaderboard/all
router.get('/leaderboard/all', (req, res) => {
  const db = getDb();
  const players = db.prepare('SELECT * FROM players ORDER BY id').all();

  const leaderboard = players.map(p => {
    const inventoryValue = db.prepare('SELECT SUM(COALESCE((SELECT price_usd FROM price_cache WHERE price_cache.market_hash_name = inventory.market_hash_name), 0.10)) as total FROM inventory WHERE player_id = ?').get(p.id).total || 0;
    return {
      ...p,
      inventory_value: Math.round(inventoryValue * 100) / 100,
      net_worth: Math.round((p.wallet + inventoryValue) * 100) / 100,
    };
  });

  res.json(leaderboard);
});

module.exports = router;
