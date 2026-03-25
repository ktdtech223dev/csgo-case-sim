const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/players - list all players
router.get('/', (req, res) => {
  const db = getDb();
  const players = db.prepare('SELECT * FROM players ORDER BY id').all();
  res.json(players);
});

// POST /api/players - create player
router.post('/', (req, res) => {
  const db = getDb();
  const { name, avatar, ngames_id, color } = req.body;
  const result = db.prepare(
    'INSERT INTO players (name, avatar, ngames_id, color) VALUES (?, ?, ?, ?)'
  ).run(name, avatar, ngames_id || null, color || '#ffffff');
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);
  res.json(player);
});

// PUT /api/players/:id - update player
router.put('/:id', (req, res) => {
  const db = getDb();
  const { wallet, total_cases_opened, total_earned, total_clicks, click_value, auto_income } = req.body;
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  db.prepare(`
    UPDATE players SET
      wallet = COALESCE(?, wallet),
      total_cases_opened = COALESCE(?, total_cases_opened),
      total_earned = COALESCE(?, total_earned),
      total_clicks = COALESCE(?, total_clicks),
      click_value = COALESCE(?, click_value),
      auto_income = COALESCE(?, auto_income)
    WHERE id = ?
  `).run(wallet, total_cases_opened, total_earned, total_clicks, click_value, auto_income, req.params.id);

  const updated = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// GET /api/players/:id/inventory
router.get('/:id/inventory', (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM inventory WHERE player_id = ? ORDER BY obtained_at DESC').all(req.params.id);
  res.json(items);
});

// POST /api/players/:id/click - handle click income
router.post('/:id/click', (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const earned = player.click_value;
  db.prepare('UPDATE players SET wallet = wallet + ?, total_earned = total_earned + ?, total_clicks = total_clicks + 1 WHERE id = ?')
    .run(earned, earned, req.params.id);

  // Random case drop every ~200 clicks (0.5% chance)
  let caseDrop = null;
  if (Math.random() < 0.005) {
    const caseNames = ['CS:GO Weapon Case', 'Chroma Case', 'Clutch Case', 'Danger Zone Case',
      'Dreams & Nightmares Case', 'Fracture Case', 'Gallery Case', 'Kilowatt Case',
      'Operation Riptide Case', 'Revolution Case', 'Recoil Case', 'Snakebite Case', 'Spectrum 2 Case'];
    caseDrop = caseNames[Math.floor(Math.random() * caseNames.length)];
  }

  const updated = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  res.json({ player: updated, earned, caseDrop });
});

// POST /api/players/:id/upgrade - purchase upgrade
router.post('/:id/upgrade', (req, res) => {
  const db = getDb();
  const { upgrade_type } = req.body;
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const upgrades = {
    click_power_1: { cost: 1, click_bonus: 0.01, auto_bonus: 0, name: 'Better Clicks' },
    click_power_2: { cost: 5, click_bonus: 0.04, auto_bonus: 0, name: 'Pro Clicks' },
    awp_sniper: { cost: 10, click_bonus: 0, auto_bonus: 0.10, name: 'AWP Sniper' },
    ak47: { cost: 50, click_bonus: 0, auto_bonus: 0.25, name: 'AK-47' },
    knife_collector: { cost: 200, click_bonus: 0, auto_bonus: 1.00, name: 'Knife Collector' },
    arms_dealer: { cost: 1000, click_bonus: 0, auto_bonus: 5.00, name: 'Arms Dealer' },
  };

  const upgrade = upgrades[upgrade_type];
  if (!upgrade) return res.status(400).json({ error: 'Invalid upgrade' });

  // Get current level
  let row = db.prepare('SELECT level FROM upgrades WHERE player_id = ? AND upgrade_type = ?').get(req.params.id, upgrade_type);
  const level = row ? row.level : 0;
  const cost = upgrade.cost * Math.pow(1.5, level);

  if (player.wallet < cost) return res.status(400).json({ error: 'Not enough money' });

  db.prepare('UPDATE players SET wallet = wallet - ? WHERE id = ?').run(cost, req.params.id);

  if (upgrade.click_bonus > 0) {
    db.prepare('UPDATE players SET click_value = click_value + ? WHERE id = ?').run(upgrade.click_bonus, req.params.id);
  }
  if (upgrade.auto_bonus > 0) {
    db.prepare('UPDATE players SET auto_income = auto_income + ? WHERE id = ?').run(upgrade.auto_bonus, req.params.id);
  }

  db.prepare('INSERT INTO upgrades (player_id, upgrade_type, level) VALUES (?, ?, 1) ON CONFLICT(player_id, upgrade_type) DO UPDATE SET level = level + 1')
    .run(req.params.id, upgrade_type);

  db.prepare('INSERT INTO transactions (player_id, type, amount, description) VALUES (?, ?, ?, ?)')
    .run(req.params.id, 'upgrade', -cost, `Purchased ${upgrade.name} (Level ${level + 1})`);

  const updated = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  const upgradeLevels = db.prepare('SELECT upgrade_type, level FROM upgrades WHERE player_id = ?').all(req.params.id);
  res.json({ player: updated, upgrades: upgradeLevels, cost: Math.round(cost * 100) / 100 });
});

// GET /api/players/:id/upgrades
router.get('/:id/upgrades', (req, res) => {
  const db = getDb();
  const upgrades = db.prepare('SELECT upgrade_type, level FROM upgrades WHERE player_id = ?').all(req.params.id);
  res.json(upgrades);
});

// POST /api/players/:id/auto-income - collect auto income
router.post('/:id/auto-income', (req, res) => {
  const db = getDb();
  const { seconds } = req.body;
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const earned = player.auto_income * (seconds || 1);
  if (earned > 0) {
    db.prepare('UPDATE players SET wallet = wallet + ?, total_earned = total_earned + ? WHERE id = ?')
      .run(earned, earned, req.params.id);
  }

  const updated = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  res.json({ player: updated, earned });
});

// POST /api/players/:id/reset - reset player data
router.post('/:id/reset', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE players SET wallet = 10.00, total_cases_opened = 0, total_earned = 0, total_clicks = 0, click_value = 0.01, auto_income = 0 WHERE id = ?')
    .run(req.params.id);
  db.prepare('DELETE FROM inventory WHERE player_id = ?').run(req.params.id);
  db.prepare('DELETE FROM upgrades WHERE player_id = ?').run(req.params.id);
  db.prepare('DELETE FROM transactions WHERE player_id = ?').run(req.params.id);
  db.prepare('DELETE FROM game_history WHERE player_id = ?').run(req.params.id);
  db.prepare('DELETE FROM achievements WHERE player_id = ?').run(req.params.id);
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  res.json(player);
});

// GET /api/players/:id/achievements
router.get('/:id/achievements', (req, res) => {
  const db = getDb();
  const achievements = db.prepare('SELECT * FROM achievements WHERE player_id = ?').all(req.params.id);
  res.json(achievements);
});

// POST /api/players/:id/achievements
router.post('/:id/achievements', (req, res) => {
  const db = getDb();
  const { achievement_id } = req.body;
  try {
    db.prepare('INSERT OR IGNORE INTO achievements (player_id, achievement_id) VALUES (?, ?)')
      .run(req.params.id, achievement_id);
    res.json({ success: true, achievement_id });
  } catch (e) {
    res.json({ success: false, already_unlocked: true });
  }
});

module.exports = router;
