import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../../store/gameStore';
import { formatPrice } from '../../../utils/helpers';

const SLOTS = [
  { n: 0, color: 'green' },
  { n: 1, color: 'red' }, { n: 2, color: 'black' },
  { n: 3, color: 'red' }, { n: 4, color: 'black' },
  { n: 5, color: 'red' }, { n: 6, color: 'black' },
  { n: 7, color: 'red' }, { n: 8, color: 'black' },
  { n: 9, color: 'red' }, { n: 10, color: 'black' },
  { n: 11, color: 'red' }, { n: 12, color: 'black' },
  { n: 13, color: 'red' }, { n: 14, color: 'black' },
];

const SLOT_WIDTH = 80;

const COLOR_MAP = {
  red: 'bg-red-600',
  black: 'bg-gray-800',
  green: 'bg-green-600',
};

export default function Roulette() {
  const { activePlayer, rouletteState, placeRouletteBet, pingNGame } = useGameStore();
  const [betAmount, setBetAmount] = useState('1.00');
  const [spinOffset, setSpinOffset] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    pingNGame({ screen: 'in_game', mode: 'roulette' });
  }, []);

  useEffect(() => {
    if (rouletteState.phase === 'spinning' && rouletteState.slotIndex !== undefined) {
      setIsSpinning(true);
      // Spin animation: go through several full rotations then land on target
      const fullWidth = SLOTS.length * SLOT_WIDTH;
      const targetOffset = rouletteState.slotIndex * SLOT_WIDTH;
      const totalOffset = fullWidth * 5 + targetOffset; // 5 full rotations + target
      setSpinOffset(-totalOffset);

      setTimeout(() => setIsSpinning(false), 5000);
    }
    if (rouletteState.phase === 'betting') {
      setSpinOffset(0);
    }
  }, [rouletteState.phase, rouletteState.slotIndex]);

  const handleBet = async (betType) => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return;
    await placeRouletteBet(amount, betType);
  };

  const phase = rouletteState.phase || 'betting';
  const presets = [0.50, 1, 5, 10, 25, 50];

  // Build repeating wheel for animation
  const wheelSlots = [];
  for (let i = 0; i < 30; i++) {
    wheelSlots.push(...SLOTS);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">ROULETTE</h1>

      {/* Wheel */}
      <div className="bg-[#1a1d23] rounded-xl border border-gray-800 p-6 mb-6 relative overflow-hidden">
        {/* Center marker */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-3 h-3 bg-csgo-gold rotate-45 transform translate-y-1" />
        </div>
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-csgo-gold/30 z-10" />

        {/* Spinning strip */}
        <div className="h-20 overflow-hidden relative">
          <div
            className="flex items-center h-full absolute"
            style={{
              transform: `translateX(calc(50% + ${spinOffset}px - ${SLOT_WIDTH / 2}px))`,
              transition: isSpinning ? 'transform 5s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none',
            }}
          >
            {wheelSlots.map((slot, i) => (
              <div
                key={i}
                className={`flex-shrink-0 h-16 flex items-center justify-center text-white font-bold text-lg rounded-lg mx-1 ${COLOR_MAP[slot.color]}`}
                style={{ width: SLOT_WIDTH - 8 }}
              >
                {slot.n}
              </div>
            ))}
          </div>
        </div>

        {/* Result display */}
        {rouletteState.result && phase === 'result' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-4"
          >
            <span className={`text-2xl font-bold ${
              rouletteState.result.color === 'green' ? 'text-green-400' :
              rouletteState.result.color === 'red' ? 'text-red-400' : 'text-gray-300'
            }`}>
              {rouletteState.result.number} {rouletteState.result.color.toUpperCase()}
            </span>
          </motion.div>
        )}
      </div>

      {/* Betting area */}
      <div className="bg-[#1a1d23] rounded-xl border border-gray-800 p-6">
        {/* Amount selector */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex gap-1">
            {presets.map(p => (
              <button
                key={p}
                onClick={() => setBetAmount(p.toFixed(2))}
                className="px-3 py-1 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700"
              >
                ${p}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={betAmount}
            onChange={e => setBetAmount(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono w-28 text-center"
            step="0.01"
          />
        </div>

        {/* Bet buttons */}
        <div className="grid grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleBet('red')}
            disabled={phase !== 'betting'}
            className="py-6 bg-red-600/20 border-2 border-red-600 rounded-xl text-red-400 font-bold text-xl hover:bg-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div>RED</div>
            <div className="text-sm font-normal mt-1">2x payout</div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleBet('green')}
            disabled={phase !== 'betting'}
            className="py-6 bg-green-600/20 border-2 border-green-600 rounded-xl text-green-400 font-bold text-xl hover:bg-green-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div>GREEN</div>
            <div className="text-sm font-normal mt-1">14x payout</div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleBet('black')}
            disabled={phase !== 'betting'}
            className="py-6 bg-gray-700/20 border-2 border-gray-600 rounded-xl text-gray-300 font-bold text-xl hover:bg-gray-700/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div>BLACK</div>
            <div className="text-sm font-normal mt-1">2x payout</div>
          </motion.button>
        </div>

        {/* Phase indicator */}
        <div className="text-center mt-4 text-sm">
          {phase === 'betting' && <span className="text-green-400">Accepting bets...</span>}
          {phase === 'spinning' && <span className="text-csgo-gold">Spinning...</span>}
          {phase === 'result' && <span className="text-gray-400">Waiting for next round...</span>}
        </div>

        {/* Current bets */}
        {(rouletteState.bets || []).length > 0 && (
          <div className="mt-4 border-t border-gray-800 pt-4">
            <h3 className="text-sm font-bold text-gray-400 mb-2">CURRENT BETS</h3>
            <div className="flex flex-wrap gap-2">
              {(rouletteState.bets || []).map((b, i) => (
                <div
                  key={i}
                  className={`px-3 py-1 rounded text-sm ${
                    b.betType === 'red' ? 'bg-red-500/20 text-red-400' :
                    b.betType === 'green' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-700/50 text-gray-300'
                  }`}
                >
                  P{b.playerId}: {formatPrice(b.amount)} on {b.betType}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
