import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../../store/gameStore';
import { formatPrice } from '../../utils/helpers';

export default function Players() {
  const { players, fetchPlayers, pingNGame } = useGameStore();
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchPlayers();
    pingNGame({ screen: 'leaderboard' });
    fetch('/api/stats/leaderboard/all').then(r => r.json()).then(setLeaderboard).catch(() => {});
  }, []);

  const loadStats = async (playerId) => {
    setSelectedPlayer(playerId);
    try {
      const res = await fetch(`/api/stats/${playerId}`);
      setStats(await res.json());
    } catch (e) {
      setStats(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">PLAYERS</h1>

      {/* Leaderboard */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {(leaderboard.length ? leaderboard : players).map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => loadStats(player.id)}
            className={`bg-[#1a1d23] rounded-xl border p-6 cursor-pointer transition-all hover:border-gray-600 ${
              selectedPlayer === player.id ? 'border-csgo-gold' : 'border-gray-800'
            }`}
          >
            <div className="flex flex-col items-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-3"
                style={{ backgroundColor: (player.color || '#888') + '20', color: player.color, border: `3px solid ${player.color}` }}
              >
                {player.name?.[0]}
              </div>
              <div className="font-bold text-white text-lg">{player.name}</div>
              <div className="text-csgo-gold font-mono mt-1">{formatPrice(player.wallet)}</div>
              {player.net_worth !== undefined && (
                <div className="text-gray-500 text-xs mt-1">
                  Net Worth: {formatPrice(player.net_worth)}
                </div>
              )}
              <div className="text-gray-600 text-xs mt-1">
                {player.total_cases_opened || 0} cases opened
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Player stats detail */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a1d23] rounded-xl border border-gray-800 p-6"
        >
          <h2 className="text-xl font-bold text-white mb-4">
            {stats.player.name}'s Stats
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatBox label="Wallet" value={formatPrice(stats.player.wallet)} color="text-csgo-gold" />
            <StatBox label="Inventory Items" value={stats.inventoryCount} color="text-white" />
            <StatBox label="Inventory Value" value={formatPrice(stats.inventoryValue)} color="text-green-400" />
            <StatBox label="Cases Opened" value={stats.player.total_cases_opened} color="text-blue-400" />
          </div>

          {/* Game stats */}
          {stats.gameStats.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-400 mb-2">GAME STATS</h3>
              <div className="grid grid-cols-3 gap-3">
                {stats.gameStats.map(gs => (
                  <div key={gs.game_type} className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-sm font-bold text-white capitalize">{gs.game_type}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {gs.games} games | {gs.wins} wins
                    </div>
                    <div className={`font-mono text-sm ${gs.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {gs.total_profit >= 0 ? '+' : ''}{formatPrice(gs.total_profit)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Best drop */}
          {stats.bestDrop && (
            <div>
              <h3 className="text-sm font-bold text-gray-400 mb-2">BEST DROP</h3>
              <div className="bg-gray-800/50 rounded-lg p-3 inline-block">
                <div className="text-white font-bold">{stats.bestDrop.skin_name}</div>
                <div className="text-gray-400 text-sm">{stats.bestDrop.wear}</div>
                <div className="text-csgo-gold font-mono">{formatPrice(stats.bestDrop.price)}</div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-3">
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}
