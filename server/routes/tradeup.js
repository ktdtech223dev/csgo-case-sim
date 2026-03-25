const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { getPrice, FALLBACK_PRICES } = require('../services/priceCache');
const { generateServerSeed, generateClientSeed, fairRandom, generateFloat, getWear, rollStatTrak } = require('../services/rng');
const { cases } = require('../services/skinData');

// Trade-up contract: 10 skins of same rarity -> 1 skin of next rarity up
const RARITY_UPGRADE = {
  'Consumer Grade': 'Industrial Grade',
  'Industrial Grade': 'Mil-Spec',
  'Mil-Spec': 'Restricted',
  'Restricted': 'Classified',
  'Classified': 'Covert',
};

// POST /api/tradeup/execute - execute a trade-up contract
router.post('/execute', async (req, res) => {
  const db = getDb();
  const { playerId, inventoryIds } = req.body;

  if (!inventoryIds || inventoryIds.length !== 10) {
    return res.status(400).json({ error: 'Trade-up requires exactly 10 items' });
  }

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  // Fetch all items
  const items = inventoryIds.map(id =>
    db.prepare('SELECT * FROM inventory WHERE id = ? AND player_id = ?').get(id, playerId)
  );

  if (items.some(i => !i)) {
    return res.status(400).json({ error: 'Some items not found in your inventory' });
  }

  // Verify all items are same rarity
  const rarity = items[0].rarity;
  if (!RARITY_UPGRADE[rarity]) {
    return res.status(400).json({ error: 'Cannot trade up Covert or Rare Special items' });
  }
  if (!items.every(i => i.rarity === rarity)) {
    return res.status(400).json({ error: 'All items must be the same rarity' });
  }

  const nextRarity = RARITY_UPGRADE[rarity];

  // Find all possible output skins from the next rarity tier
  const possibleOutputs = [];
  for (const c of cases) {
    for (const skin of c.skins) {
      if (skin.rarity === nextRarity) {
        possibleOutputs.push({ ...skin, caseName: c.name });
      }
    }
  }

  if (possibleOutputs.length === 0) {
    return res.status(400).json({ error: 'No possible trade-up outputs found' });
  }

  // Calculate average float of input items (trade-up float formula)
  const avgFloat = items.reduce((sum, i) => sum + i.float_value, 0) / items.length;

  // Generate result
  const serverSeed = generateServerSeed();
  const clientSeed = generateClientSeed();
  const skinRoll = fairRandom(serverSeed, clientSeed, 0);
  const selectedSkin = possibleOutputs[Math.floor(skinRoll * possibleOutputs.length)];

  // Float for trade-up uses the average float formula with some randomness
  const floatRoll = fairRandom(serverSeed, clientSeed, 1);
  const outputFloat = Math.min(
    selectedSkin.max_float,
    Math.max(
      selectedSkin.min_float,
      selectedSkin.min_float + (avgFloat * (selectedSkin.max_float - selectedSkin.min_float)) + (floatRoll * 0.05 - 0.025)
    )
  );
  const wear = getWear(outputFloat);

  // StatTrak: if ALL inputs are StatTrak, output is StatTrak
  const allStatTrak = items.every(i => i.stattrak === 1);
  const isStatTrak = allStatTrak;

  const stPrefix = isStatTrak ? 'StatTrak\u2122 ' : '';
  const marketHashName = `${stPrefix}${selectedSkin.name} (${wear})`;

  // Get price
  let price = await getPrice(marketHashName, nextRarity);
  if (isStatTrak) price = Math.round(price * 1.3 * 100) / 100;

  // Remove input items
  for (const id of inventoryIds) {
    db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
  }

  // Add output item
  const result = db.prepare(
    'INSERT INTO inventory (player_id, skin_name, market_hash_name, wear, float_value, stattrak, image_url, rarity, case_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(playerId, selectedSkin.name, marketHashName, wear, outputFloat, isStatTrak ? 1 : 0, selectedSkin.image_id || '', nextRarity, 'Trade Up');

  db.prepare('INSERT INTO transactions (player_id, type, amount, description) VALUES (?, ?, ?, ?)')
    .run(playerId, 'tradeup', 0, `Trade-up: 10x ${rarity} → ${marketHashName}`);

  res.json({
    input: { count: 10, rarity, avgFloat },
    output: {
      id: result.lastInsertRowid,
      name: selectedSkin.name,
      market_hash_name: marketHashName,
      rarity: nextRarity,
      wear,
      float_value: outputFloat,
      stattrak: isStatTrak,
      image_id: selectedSkin.image_id || '',
      price,
    },
    provablyFair: { serverSeed, clientSeed },
  });
});

// GET /api/tradeup/eligible/:playerId - get items eligible for trade-up grouped by rarity
router.get('/eligible/:playerId', (req, res) => {
  const db = getDb();
  const items = db.prepare(
    "SELECT * FROM inventory WHERE player_id = ? AND rarity != 'Covert' AND rarity != 'Rare Special' ORDER BY rarity, skin_name"
  ).all(req.params.playerId);

  // Group by rarity
  const grouped = {};
  for (const item of items) {
    if (!grouped[item.rarity]) grouped[item.rarity] = [];
    grouped[item.rarity].push(item);
  }

  res.json(grouped);
});

module.exports = router;
