import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../store/gameStore';
import { formatPrice } from '../utils/helpers';

const UPGRADES = [
  { id: 'click_power_1', name: 'Better Clicks', desc: '+$0.01/click', baseCost: 1, icon: '🔫' },
  { id: 'click_power_2', name: 'Pro Clicks', desc: '+$0.04/click', baseCost: 5, icon: '🎯' },
  { id: 'awp_sniper', name: 'AWP Sniper', desc: '+$0.10/sec', baseCost: 10, icon: '🔭' },
  { id: 'ak47', name: 'AK-47', desc: '+$0.25/sec', baseCost: 50, icon: '💥' },
  { id: 'knife_collector', name: 'Knife Collector', desc: '+$1.00/sec', baseCost: 200, icon: '🔪' },
  { id: 'arms_dealer', name: 'Arms Dealer', desc: '+$5.00/sec', baseCost: 1000, icon: '💎' },
];

export default function Home() {
  const { activePlayer, handleClick, collectAutoIncome, purchaseUpgrade, pingNGame } = useGameStore();
  const autoIncomeRef = useRef(null);

  useEffect(() => {
    pingNGame({ screen: 'clicking', balance: activePlayer?.wallet });

    // Auto income ticker
    autoIncomeRef.current = setInterval(() => {
      collectAutoIncome(1);
    }, 1000);

    return () => clearInterval(autoIncomeRef.current);
  }, []);

  const onClickButton = async () => {
    await handleClick();
  };

  if (!activePlayer) return null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Earned" value={formatPrice(activePlayer.total_earned)} color="text-csgo-gold" />
        <StatCard label="Per Click" value={formatPrice(activePlayer.click_value)} color="text-green-400" />
        <StatCard label="Per Second" value={formatPrice(activePlayer.auto_income)} color="text-blue-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Click area */}
        <div className="flex flex-col items-center justify-center">
          <motion.button
            onClick={onClickButton}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            className="w-56 h-56 rounded-full bg-gradient-to-br from-csgo-gold/30 to-csgo-gold/10 border-4 border-csgo-gold flex items-center justify-center cursor-pointer pulse-glow select-none"
          >
            <div className="text-center">
              <div className="text-6xl mb-2">💣</div>
              <div className="text-csgo-gold font-bold text-xl">CLICK!</div>
              <div className="text-csgo-gold/60 text-sm font-mono">
                +{formatPrice(activePlayer.click_value)}
              </div>
            </div>
          </motion.button>

          <div className="mt-6 text-center">
            <div className="text-gray-500 text-sm">Total Clicks</div>
            <div className="text-2xl font-mono text-white">{activePlayer.total_clicks?.toLocaleString() || 0}</div>
          </div>
        </div>

        {/* Upgrades */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">UPGRADES</h2>
          <div className="flex flex-col gap-3">
            {UPGRADES.map(upg => {
              const cost = upg.baseCost; // Server handles scaling
              const canAfford = activePlayer.wallet >= cost;

              return (
                <motion.button
                  key={upg.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => purchaseUpgrade(upg.id)}
                  disabled={!canAfford}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                    canAfford
                      ? 'bg-[#1a1d23] border-gray-700 hover:border-csgo-gold/50 cursor-pointer'
                      : 'bg-[#141418] border-gray-800 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="text-3xl">{upg.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">{upg.name}</div>
                    <div className="text-sm text-gray-400">{upg.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-csgo-gold font-mono font-bold">
                      {formatPrice(cost)}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[#1a1d23] rounded-lg p-4 border border-gray-800">
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}
