const crypto = require('crypto');

// Provably fair RNG system
function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

function generateClientSeed() {
  return crypto.randomBytes(16).toString('hex');
}

function hashSeed(serverSeed) {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

// Generate a provably fair random float [0, 1)
function fairRandom(serverSeed, clientSeed, nonce) {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  // Use first 8 hex chars (32 bits) to generate float
  const int = parseInt(hash.substring(0, 8), 16);
  return int / 0x100000000;
}

// Generate crash point using provably fair method
function generateCrashPoint(serverSeed, clientSeed) {
  const hash = crypto.createHmac('sha256', serverSeed).update(clientSeed).digest('hex');
  const h = parseInt(hash.substring(0, 13), 16);
  const e = Math.pow(2, 52);
  // 3% house edge
  const result = Math.max(1, Math.floor((100 * e - h) / (e - h)) / 100);
  return result;
}

// Pick rarity based on CS:GO drop rates
function pickRarity(random) {
  const rates = [
    { rarity: 'Consumer Grade', cumulative: 0.7992 },
    { rarity: 'Industrial Grade', cumulative: 0.9590 },
    { rarity: 'Mil-Spec', cumulative: 0.9910 },
    { rarity: 'Restricted', cumulative: 0.9974 },
    { rarity: 'Classified', cumulative: 0.99868 },
    { rarity: 'Covert', cumulative: 0.999936 },
    { rarity: 'Rare Special', cumulative: 1.0 },
  ];
  for (const tier of rates) {
    if (random < tier.cumulative) return tier.rarity;
  }
  return 'Consumer Grade';
}

// Determine wear from float value
function getWear(floatValue) {
  if (floatValue < 0.07) return 'Factory New';
  if (floatValue < 0.15) return 'Minimal Wear';
  if (floatValue < 0.38) return 'Field-Tested';
  if (floatValue < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
}

// Generate float value within skin's min/max range
function generateFloat(minFloat, maxFloat, random) {
  return minFloat + random * (maxFloat - minFloat);
}

// Determine if StatTrak (10% chance)
function rollStatTrak(random) {
  return random < 0.10;
}

module.exports = {
  generateServerSeed,
  generateClientSeed,
  hashSeed,
  fairRandom,
  generateCrashPoint,
  pickRarity,
  getWear,
  generateFloat,
  rollStatTrak,
};
