import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../../../store/gameStore';
import { formatPrice } from '../../../utils/helpers';

export default function Crash() {
  const { activePlayer, crashState, placeCrashBet, crashCashout, pingNGame } = useGameStore();
  const [betAmount, setBetAmount] = useState('1.00');
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutMult, setCashoutMult] = useState(0);
  const [graphPoints, setGraphPoints] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    pingNGame({ screen: 'in_game', mode: 'crash' });
  }, []);

  // Track phase changes
  useEffect(() => {
    if (crashState.phase === 'betting') {
      setHasBet(false);
      setCashedOut(false);
      setCashoutMult(0);
      setGraphPoints([]);
    }
  }, [crashState.phase]);

  // Update graph
  useEffect(() => {
    if (crashState.phase === 'running' || crashState.phase?.phase === 'running') {
      setGraphPoints(prev => [...prev, crashState.multiplier || 1]);
    }
  }, [crashState.multiplier]);

  // Draw crash graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth;
    const h = canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = h - (i * h / 4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      ctx.fillStyle = '#555';
      ctx.font = '12px Share Tech Mono';
      ctx.fillText(`${(1 + i * 2).toFixed(1)}x`, 5, y - 5);
    }

    if (graphPoints.length < 2) return;

    const maxMult = Math.max(...graphPoints, 3);
    const xStep = w / Math.max(graphPoints.length - 1, 1);

    // Line
    ctx.beginPath();
    ctx.strokeStyle = crashState.phase === 'crashed' ? '#eb4b4b' : '#4CAF50';
    ctx.lineWidth = 3;

    graphPoints.forEach((mult, i) => {
      const x = i * xStep;
      const y = h - ((mult - 1) / (maxMult - 1)) * (h - 40);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill below
    const lastX = (graphPoints.length - 1) * xStep;
    const lastY = h - ((graphPoints[graphPoints.length - 1] - 1) / (maxMult - 1)) * (h - 40);
    ctx.lineTo(lastX, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = crashState.phase === 'crashed' ? 'rgba(235,75,75,0.1)' : 'rgba(76,175,80,0.1)';
    ctx.fill();
  }, [graphPoints, crashState.phase]);

  const handleBet = async () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return;
    const result = await placeCrashBet(amount);
    if (result) setHasBet(true);
  };

  const handleCashout = async () => {
    const result = await crashCashout();
    if (result) {
      setCashedOut(true);
      setCashoutMult(result.multiplier);
    }
  };

  const mult = crashState.multiplier || 1;
  const phase = crashState.phase || 'betting';

  const getMultColor = () => {
    if (phase === 'crashed') return 'text-red-500';
    if (mult >= 5) return 'text-red-400';
    if (mult >= 2) return 'text-yellow-400';
    return 'text-green-400';
  };

  const presets = [0.50, 1, 5, 10, 25, 50];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">CRASH</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph */}
        <div className="lg:col-span-3">
          <div className="bg-[#1a1d23] rounded-xl border border-gray-800 p-6 relative">
            {/* Multiplier display */}
            <div className="absolute top-6 right-6 z-10">
              <div className={`text-5xl font-mono font-bold ${getMultColor()}`}>
                {phase === 'crashed' ? `${mult.toFixed(2)}x` : phase === 'running' ? `${mult.toFixed(2)}x` : 'WAITING'}
              </div>
              {phase === 'crashed' && (
                <div className="text-red-500 text-lg font-bold text-right">CRASHED!</div>
              )}
              {phase === 'betting' && (
                <div className="text-gray-400 text-sm text-right">Placing bets...</div>
              )}
            </div>

            {/* Canvas graph */}
            <div className="h-64 relative">
              <canvas ref={canvasRef} className="w-full h-full" />
              {phase === 'running' && (
                <motion.div
                  className="absolute text-3xl"
                  style={{
                    right: '10%',
                    bottom: `${Math.min(((mult - 1) / 8) * 100, 80)}%`,
                  }}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                >
                  🚀
                </motion.div>
              )}
              {phase === 'crashed' && (
                <div className="absolute right-[10%] bottom-[20%] text-4xl">💥</div>
              )}
            </div>
          </div>
        </div>

        {/* Betting panel */}
        <div>
          <div className="bg-[#1a1d23] rounded-xl border border-gray-800 p-4">
            <h3 className="font-bold text-white mb-3">PLACE BET</h3>

            <div className="flex flex-wrap gap-1 mb-3">
              {presets.map(p => (
                <button
                  key={p}
                  onClick={() => setBetAmount(p.toFixed(2))}
                  className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700"
                >
                  ${p}
                </button>
              ))}
            </div>

            <input
              type="number"
              value={betAmount}
              onChange={e => setBetAmount(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-center mb-3"
              step="0.01"
            />

            {phase === 'betting' && !hasBet && (
              <button
                onClick={handleBet}
                className="w-full py-3 bg-gradient-to-r from-csgo-gold to-yellow-600 text-black font-bold rounded-lg"
              >
                BET {formatPrice(parseFloat(betAmount) || 0)}
              </button>
            )}

            {phase === 'betting' && hasBet && (
              <div className="text-center text-gray-400 py-3">Waiting for round...</div>
            )}

            {phase === 'running' && hasBet && !cashedOut && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCashout}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg text-lg"
              >
                CASH OUT @ {mult.toFixed(2)}x
              </motion.button>
            )}

            {cashedOut && (
              <div className="text-center text-green-400 py-3 font-bold">
                Cashed out @ {cashoutMult.toFixed(2)}x!
              </div>
            )}

            {phase === 'running' && !hasBet && (
              <div className="text-center text-gray-500 py-3 text-sm">Round in progress</div>
            )}

            {/* Active bets */}
            <div className="mt-4">
              <h4 className="text-sm font-bold text-gray-400 mb-2">BETS</h4>
              {(crashState.bets || []).map((b, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-800/50">
                  <span className="text-gray-400">P{b.playerId}</span>
                  <span className="font-mono text-white">{formatPrice(b.amount)}</span>
                  {b.cashedOut && (
                    <span className="text-green-400 text-xs">{b.cashoutMult?.toFixed(2)}x</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
