import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useGameStore from '../../store/gameStore';
import { formatPrice } from '../../utils/helpers';

export default function CaseShop() {
  const { cases, fetchCases, activePlayer, pingNGame } = useGameStore();

  useEffect(() => {
    fetchCases();
    pingNGame({ screen: 'case_shop' });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">CASE SHOP</h1>
        <div className="text-gray-400">
          Balance: <span className="text-csgo-gold font-mono">{formatPrice(activePlayer?.wallet)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {cases.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/cases/${c.id}`}
              className="block bg-[#1a1d23] rounded-lg border border-gray-800 hover:border-csgo-gold/30 transition-all duration-300 overflow-hidden group"
            >
              {/* Case image */}
              <div className="p-4 flex items-center justify-center bg-gradient-to-b from-white/5 to-transparent h-40">
                <img
                  src={c.image}
                  alt={c.name}
                  className="max-h-32 object-contain group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
              </div>

              {/* Info */}
              <div className="p-3 border-t border-gray-800">
                <div className="text-sm font-semibold text-white truncate">{c.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-csgo-gold font-mono text-sm">{formatPrice(c.price + 2.49)}</span>
                  <span className="text-gray-500 text-xs">{c.skinCount} skins</span>
                </div>
                {c.hasKnives && (
                  <div className="text-[10px] text-yellow-500 mt-1">Contains Rare Special Items</div>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
