import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/gameStore';
import { formatPrice } from '../../utils/helpers';

export default function TopBar() {
  const { players, activePlayer, setActivePlayer } = useGameStore();

  return (
    <div className="h-14 bg-[#111318] border-b border-gray-800 flex items-center justify-between px-4 sticky top-0 z-30">
      {/* Player tabs */}
      <div className="flex gap-2">
        {players.map(player => (
          <button
            key={player.id}
            onClick={() => setActivePlayer(player.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activePlayer?.id === player.id
                ? 'bg-white/10 border border-gray-600'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: player.color || '#888' }}
            />
            <span>{player.name}</span>
            <span className="text-csgo-gold font-mono text-xs">
              {formatPrice(player.wallet)}
            </span>
          </button>
        ))}
      </div>

      {/* Active player wallet */}
      {activePlayer && (
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-500">BALANCE</div>
            <motion.div
              key={activePlayer.wallet}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-csgo-gold font-mono font-bold text-lg"
            >
              {formatPrice(activePlayer.wallet)}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
