const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { getCaseById, getAllCases } = require('../services/skinData');
const { getPrice, FALLBACK_PRICES } = require('../services/priceCache');
const { generateServerSeed, generateClientSeed, fairRandom, pickRarity, getWear, generateFloat, rollStatTrak } = require('../services/rng');

// GET /api/cases - list all cases
router.get('/', (req, res) => {
  res.json(getAllCases());
});

// GET /api/cases/:id - get case details with skins
router.get('/:id', (req, res) => {
  const caseData = getCaseById(req.params.id);
  if (!caseData) return res.status(404).json({ error: 'Case not found' });
  res.json(caseData);
});

// POST /api/cases/open - open a case
router.post('/open', async (req, res) => {
  const db = getDb();
  const { playerId, caseId } = req.body;

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const caseData = getCaseById(caseId);
  if (!caseData) return res.status(404).json({ error: 'Case not found' });

  const totalCost = caseData.price + 2.49; // case + key
  if (player.wallet < totalCost) {
    return res.status(400).json({ error: 'Not enough money', required: totalCost, wallet: player.wallet });
  }

  // Deduct cost
  db.prepare('UPDATE players SET wallet = wallet - ?, total_cases_opened = total_cases_opened + 1 WHERE id = ?')
    .run(totalCost, playerId);

  // Generate provably fair result
  const serverSeed = generateServerSeed();
  const clientSeed = generateClientSeed();

  // Roll rarity
  const rarityRoll = fairRandom(serverSeed, clientSeed, 0);
  const rarity = pickRarity(rarityRoll);

  // Pick skin from appropriate pool
  let skinPool;
  if (rarity === 'Rare Special') {
    skinPool = caseData.rare_special;
  } else {
    skinPool = caseData.skins.filter(s => s.rarity === rarity);
    // If no skins of this rarity, pick from closest available
    if (skinPool.length === 0) {
      const rarityOrder = ['Consumer Grade', 'Industrial Grade', 'Mil-Spec', 'Restricted', 'Classified', 'Covert'];
      const targetIdx = rarityOrder.indexOf(rarity);
      for (let i = targetIdx; i >= 0; i--) {
        skinPool = caseData.skins.filter(s => s.rarity === rarityOrder[i]);
        if (skinPool.length > 0) break;
      }
      if (skinPool.length === 0) skinPool = caseData.skins;
    }
  }

  const skinRoll = fairRandom(serverSeed, clientSeed, 1);
  const selectedSkin = skinPool[Math.floor(skinRoll * skinPool.length)];

  // Generate float and wear
  const floatRoll = fairRandom(serverSeed, clientSeed, 2);
  const floatValue = generateFloat(selectedSkin.min_float, selectedSkin.max_float, floatRoll);
  const wear = getWear(floatValue);

  // StatTrak roll
  const stattrakRoll = fairRandom(serverSeed, clientSeed, 3);
  const isStatTrak = rollStatTrak(stattrakRoll);

  // Build market hash name
  const stPrefix = isStatTrak ? 'StatTrak\u2122 ' : '';
  const marketHashName = `${stPrefix}${selectedSkin.name} (${wear})`;

  // Get price
  let price = await getPrice(marketHashName, selectedSkin.rarity);
  if (isStatTrak) price = Math.round(price * 1.3 * 100) / 100; // StatTrak ~30% premium

  // Save to inventory
  const result = db.prepare(
    'INSERT INTO inventory (player_id, skin_name, market_hash_name, wear, float_value, stattrak, image_url, rarity, case_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(playerId, selectedSkin.name, marketHashName, wear, floatValue, isStatTrak ? 1 : 0, selectedSkin.image_id, selectedSkin.rarity, caseData.name);

  // Log transaction
  db.prepare('INSERT INTO transactions (player_id, type, amount, description) VALUES (?, ?, ?, ?)')
    .run(playerId, 'case_open', -totalCost, `Opened ${caseData.name} - Got ${marketHashName}`);

  const updatedPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);

  // Build reel items (60+ items for animation)
  const reelItems = [];
  for (let i = 0; i < 70; i++) {
    const rRoll = Math.random();
    const rRarity = pickRarity(rRoll);
    let pool = caseData.skins.filter(s => s.rarity === rRarity);
    if (pool.length === 0) pool = caseData.skins;
    const s = pool[Math.floor(Math.random() * pool.length)];
    const fv = generateFloat(s.min_float, s.max_float, Math.random());
    reelItems.push({
      name: s.name,
      rarity: s.rarity,
      image_id: s.image_id,
      wear: getWear(fv),
    });
  }

  // Insert winning item at position 55-60
  const winPos = 55 + Math.floor(Math.random() * 5);
  reelItems[winPos] = {
    name: selectedSkin.name,
    rarity: selectedSkin.rarity,
    image_id: selectedSkin.image_id,
    wear: wear,
    isWinner: true,
  };

  res.json({
    skin: {
      id: result.lastInsertRowid,
      name: selectedSkin.name,
      market_hash_name: marketHashName,
      rarity: selectedSkin.rarity,
      wear,
      float_value: floatValue,
      stattrak: isStatTrak,
      image_id: selectedSkin.image_id,
      price,
      case_name: caseData.name,
    },
    reel: reelItems,
    winPosition: winPos,
    player: updatedPlayer,
    provablyFair: {
      serverSeed,
      clientSeed,
      serverSeedHash: require('../services/rng').hashSeed(serverSeed),
    },
  });
});

module.exports = router;
