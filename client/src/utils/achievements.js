// All achievable achievements
export const ACHIEVEMENTS = {
  first_case: { name: 'First Case', desc: 'Open your first case', icon: '📦' },
  opened_100_cases: { name: 'Case Addict', desc: 'Open 100 cases', icon: '📦' },
  first_knife: { name: 'Knife Collector', desc: 'Unbox your first knife', icon: '🔪' },
  won_10_coinflips: { name: 'Lucky Flipper', desc: 'Win 10 coinflips', icon: '🪙' },
  crash_10x: { name: 'To The Moon', desc: 'Cash out at 10x or higher in Crash', icon: '🚀' },
  roulette_green: { name: 'Green Machine', desc: 'Hit green on Roulette', icon: '🟢' },
  inventory_1k: { name: 'Stacked', desc: 'Inventory worth $1,000+', icon: '💰' },
  big_spender: { name: 'Big Spender', desc: 'Spend $100+ total', icon: '💸' },
  first_tradeup: { name: 'Trade Up Artist', desc: 'Complete your first trade-up contract', icon: '🔄' },
  covert_unbox: { name: 'Seeing Red', desc: 'Unbox a Covert (red) item', icon: '🔴' },
  stattrak_unbox: { name: 'StatTrak Hunter', desc: 'Unbox a StatTrak item', icon: '📊' },
  first_rename: { name: 'Name Tag', desc: 'Rename a weapon', icon: '🏷️' },
  all_cases: { name: 'Case Completionist', desc: 'Open every case at least once', icon: '🏆' },
  millionaire: { name: 'Millionaire', desc: 'Have $1,000,000 total earned', icon: '👑' },
  win_streak_5: { name: 'Hot Streak', desc: 'Win 5 gambles in a row', icon: '🔥' },
  crash_bust_10: { name: 'Paper Hands', desc: 'Bust 10 times in Crash', icon: '📉' },
  factory_new: { name: 'Pristine', desc: 'Unbox a Factory New skin with float < 0.001', icon: '✨' },
  battle_scarred: { name: 'Battle Hardened', desc: 'Unbox a Battle-Scarred skin with float > 0.99', icon: '💀' },
  bulk_sell: { name: 'Fire Sale', desc: 'Sell 10+ items at once', icon: '🏪' },
  high_roller: { name: 'High Roller', desc: 'Place a single bet of $100+', icon: '🎲' },
};

export function getAchievementInfo(id) {
  return ACHIEVEMENTS[id] || { name: id, desc: 'Unknown achievement', icon: '❓' };
}
