const fetch = require('node-fetch');
const { getDb } = require('../db/database');

const STEAM_API_BASE = 'https://steamcommunity.com/market/priceoverview/';
const TTL = 24 * 60 * 60; // 24 hours in seconds

// Fallback prices by rarity if Steam API unavailable
const FALLBACK_PRICES = {
  'Consumer Grade': 0.03,
  'Industrial Grade': 0.05,
  'Mil-Spec': 0.15,
  'Restricted': 1.50,
  'Classified': 5.00,
  'Covert': 25.00,
  'Rare Special': 150.00,
};

async function fetchSteamPrice(marketHashName) {
  try {
    const url = `${STEAM_API_BASE}?appid=730&currency=1&market_hash_name=${encodeURIComponent(marketHashName)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.lowest_price) {
      return parseFloat(data.lowest_price.replace('$', '').replace(',', ''));
    }
    if (data.success && data.median_price) {
      return parseFloat(data.median_price.replace('$', '').replace(',', ''));
    }
    return null;
  } catch (e) {
    console.error(`Price fetch failed for ${marketHashName}:`, e.message);
    return null;
  }
}

function getCachedPrice(marketHashName) {
  const db = getDb();
  const row = db.prepare('SELECT price_usd, last_fetched FROM price_cache WHERE market_hash_name = ?').get(marketHashName);
  if (row && (Date.now() / 1000 - row.last_fetched) < TTL) {
    return row.price_usd;
  }
  return null;
}

function setCachedPrice(marketHashName, price) {
  const db = getDb();
  db.prepare(
    'INSERT OR REPLACE INTO price_cache (market_hash_name, price_usd, last_fetched) VALUES (?, ?, ?)'
  ).run(marketHashName, price, Math.floor(Date.now() / 1000));
}

async function getPrice(marketHashName, rarity = 'Mil-Spec') {
  // Check cache first
  const cached = getCachedPrice(marketHashName);
  if (cached !== null) return cached;

  // Try Steam API
  const steamPrice = await fetchSteamPrice(marketHashName);
  if (steamPrice !== null) {
    setCachedPrice(marketHashName, steamPrice);
    return steamPrice;
  }

  // Check if any cached price exists (even expired)
  const db = getDb();
  const row = db.prepare('SELECT price_usd FROM price_cache WHERE market_hash_name = ?').get(marketHashName);
  if (row) return row.price_usd;

  // Fallback
  return FALLBACK_PRICES[rarity] || 0.10;
}

async function batchRefreshPrices(marketHashNames) {
  const db = getDb();
  const stale = [];
  const now = Math.floor(Date.now() / 1000);

  for (const name of marketHashNames) {
    const row = db.prepare('SELECT last_fetched FROM price_cache WHERE market_hash_name = ?').get(name);
    if (!row || (now - row.last_fetched) >= TTL) {
      stale.push(name);
    }
  }

  console.log(`Price cache: ${marketHashNames.length - stale.length} fresh, ${stale.length} need refresh`);

  // Fetch stale prices with 1s delay between requests
  for (let i = 0; i < stale.length; i++) {
    const price = await fetchSteamPrice(stale[i]);
    if (price !== null) {
      setCachedPrice(stale[i], price);
    }
    if (i < stale.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

module.exports = { getPrice, getCachedPrice, setCachedPrice, batchRefreshPrices, FALLBACK_PRICES };
