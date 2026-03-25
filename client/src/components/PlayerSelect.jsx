import React from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../store/gameStore';

const PLAYERS = [
  { id: 1, name: 'Keshawn', color: '#80e060', ngames_id: 'keshawn' },
  { id: 2, name: 'Sean', color: '#f0c040', ngames_id: 'sean' },
  { id: 3, name: 'Dart', color: '#e04040', ngames_id: 'dart' },
  { id: 4, name: 'Amari', color: '#40c0e0', ngames_id: 'amari' },
];

export default function PlayerSelect() {
  const { players, setActivePlayer } = useGameStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      {/* Background particles */}
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-csgo-gold rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Title */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12 relative z-10"
      >
        <h1 className="text-6xl font-bold text-csgo-gold tracking-wider mb-2">
          CS:GO CASE SIM
        </h1>
        <p className="text-gray-500 text-lg">Select your player to begin</p>
      </motion.div>

      {/* Player cards */}
      <div className="flex gap-6 relative z-10">
        {(players.length ? players : PLAYERS).map((player, i) => (
          <motion.button
            key={player.id}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActivePlayer(player.id)}
            className="flex flex-col items-center gap-4 p-8 rounded-xl bg-[#1a1d23] border-2 border-transparent hover:border-opacity-50 transition-all duration-300 w-44"
            style={{ '--hover-color': player.color }}
            onMouseEnter={e => e.currentTarget.style.borderColor = player.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
          >
            {/* Avatar circle */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
              style={{ backgroundColor: player.color + '20', color: player.color, border: `3px solid ${player.color}` }}
            >
              {player.name[0]}
            </div>

            {/* Name */}
            <span className="text-lg font-semibold">{player.name}</span>

            {/* Wallet */}
            <span className="text-csgo-gold font-mono text-sm">
              ${(player.wallet || 10).toFixed(2)}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
