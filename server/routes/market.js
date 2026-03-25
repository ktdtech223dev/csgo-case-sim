const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { getPrice, FALLBACK_PRICES } = require('../services/priceCache');

const MARKET_FEE = 0.07; // 7% fee

// POST /api/market/sell - sell a skin
router.post('/sell', async (req, res) => {
  const db = getDb();
  const { inventoryId, playerId } = req.body;

  const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND player_id = ?').get(inventoryId, playerId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  let price = await getPrice(item.market_hash_name, item.rarity);
  if (item.stattrak) price = Math.round(price * 1.3 * 100) / 100;
  const fee = Math.round(price * MARKET_FEE * 100) / 100;
  const payout = Math.round((price - fee) * 100) / 100;

  db.prepare('DELETE FROM inventory WHERE id = ?').run(inventoryId);
  db.prepare('UPDATE players SET wallet = wallet + ?, total_earned = total_earned + ? WHERE id = ?')
    .run(payout, payout, playerId);

  db.prepare('INSERT INTO transactions (player_id, type, amount, description) VALUES (?, ?, ?, ?)')
    .run(playerId, 'sell', payout, `Sold ${item.market_hash_name} for $${payout}`);

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  res.json({ player, payout, fee, price });
});

// POST /api/market/sell-bulk - sell multiple skins
router.post('/sell-bulk', async (req, res) => {
  const db = getDb();
  const { inventoryIds, playerId } = req.body;

  let totalPayout = 0;
  let totalFee = 0;
  const sold = [];

  for (const id of inventoryIds) {
    const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND player_id = ?').get(id, playerId);
    if (!item) continue;

    let price = await getPrice(item.market_hash_name, item.rarity);
    if (item.stattrak) price = Math.round(price * 1.3 * 100) / 100;
    const fee = Math.round(price * MARKET_FEE * 100) / 100;
    const payout = Math.round((price - fee) * 100) / 100;

    db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
    totalPayout += payout;
    totalFee += fee;
    sold.push({ id, name: item.market_hash_name, payout });

    db.prepare('INSERT INTO transactions (player_id, type, amount, description) VALUES (?, ?, ?, ?)')
      .run(playerId, 'sell', payout, `Sold ${item.market_hash_name} for $${payout}`);
  }

  db.prepare('UPDATE players SET wallet = wallet + ?, total_earned = total_earned + ? WHERE id = ?')
    .run(totalPayout, totalPayout, playerId);

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  res.json({ player, totalPayout: Math.round(totalPayout * 100) / 100, totalFee: Math.round(totalFee * 100) / 100, sold });
});

// GET /api/market/history/:playerId
router.get('/history/:playerId', (req, res) => {
  const db = getDb();
  const history = db.prepare(
    "SELECT * FROM transactions WHERE player_id = ? AND type = 'sell' ORDER BY timestamp DESC LIMIT 50"
  ).all(req.params.playerId);
  res.json(history);
});

// GET /api/prices/:market_hash_name
router.get('/prices/:market_hash_name', async (req, res) => {
  const price = await getPrice(decodeURIComponent(req.params.market_hash_name));
  res.json({ market_hash_name: req.params.market_hash_name, price });
});

module.exports = router;
