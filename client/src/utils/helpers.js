// Format price with $
export function formatPrice(price) {
  if (price == null) return '$0.00';
  return `$${Number(price).toFixed(2)}`;
}

// Get rarity color class
export function getRarityColor(rarity) {
  const map = {
    'Consumer Grade': '#b0c3d9',
    'Industrial Grade': '#5e98d9',
    'Mil-Spec': '#4b69ff',
    'Restricted': '#8847ff',
    'Classified': '#d32ce6',
    'Covert': '#eb4b4b',
    'Rare Special': '#e4b900',
  };
  return map[rarity] || '#b0c3d9';
}

export function getRarityBgClass(rarity) {
  const map = {
    'Consumer Grade': 'rarity-bg-consumer',
    'Industrial Grade': 'rarity-bg-industrial',
    'Mil-Spec': 'rarity-bg-milspec',
    'Restricted': 'rarity-bg-restricted',
    'Classified': 'rarity-bg-classified',
    'Covert': 'rarity-bg-covert',
    'Rare Special': 'rarity-bg-rare-special',
  };
  return map[rarity] || 'rarity-bg-consumer';
}

export function getRarityGlow(rarity) {
  const map = {
    'Classified': 'glow-pink',
    'Covert': 'glow-red',
    'Rare Special': 'glow-gold',
    'Restricted': 'glow-purple',
    'Mil-Spec': 'glow-blue',
  };
  return map[rarity] || '';
}

// Get skin image URL from image_id
export function getSkinImageUrl(imageId) {
  if (!imageId) return '/placeholder.png';
  if (imageId.startsWith('http')) return imageId;
  return `https://community.cloudflare.steamstatic.com/economy/image/${imageId}/256x192`;
}

// Format float value
export function formatFloat(value) {
  return Number(value).toFixed(8);
}

// Short wear label
export function wearShort(wear) {
  const map = {
    'Factory New': 'FN',
    'Minimal Wear': 'MW',
    'Field-Tested': 'FT',
    'Well-Worn': 'WW',
    'Battle-Scarred': 'BS',
  };
  return map[wear] || wear;
}
