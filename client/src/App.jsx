import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useGameStore from './store/gameStore';
import Sidebar from './components/HUD/Sidebar';
import TopBar from './components/HUD/TopBar';
import Notifications from './components/HUD/Notifications';
import PlayerSelect from './components/PlayerSelect';
import Home from './components/Home';
import CaseShop from './components/CaseOpening/CaseShop';
import CaseOpen from './components/CaseOpening/CaseOpen';
import Inventory from './components/Inventory/Inventory';
import Market from './components/Market/Market';
import Coinflip from './components/Games/Coinflip/Coinflip';
import Crash from './components/Games/Crash/Crash';
import Roulette from './components/Games/Roulette/Roulette';
import Players from './components/Players/Players';
import Settings from './components/Settings/Settings';
import TradeUp from './components/Inventory/TradeUp';
import { initSocket } from './utils/socket';

export default function App() {
  const { activePlayerId, fetchPlayers, fetchCases, sidebarOpen } = useGameStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchPlayers().then(() => setLoaded(true));
    fetchCases();
    initSocket();

    // NGame offline beacon
    const handleUnload = () => {
      const player = useGameStore.getState().activePlayer;
      if (player?.ngames_id) {
        navigator.sendBeacon(
          'https://ngames-server-production.up.railway.app/presence/offline',
          JSON.stringify({ profile_id: player.ngames_id })
        );
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // NGame ping timer
  useEffect(() => {
    if (!activePlayerId) return;
    const interval = setInterval(() => {
      const { activePlayer, pingNGame } = useGameStore.getState();
      if (activePlayer) {
        pingNGame({ screen: 'idle', balance: activePlayer.wallet });
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [activePlayerId]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-csgo-gold text-4xl font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!activePlayerId) {
    return <PlayerSelect />;
  }

  return (
    <div className="min-h-screen flex bg-[#0f0f0f]">
      <Sidebar />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-16'}`}>
        <TopBar />
        <main className="flex-1 p-4 overflow-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cases" element={<CaseShop />} />
            <Route path="/cases/:caseId" element={<CaseOpen />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/tradeup" element={<TradeUp />} />
            <Route path="/market" element={<Market />} />
            <Route path="/games/coinflip" element={<Coinflip />} />
            <Route path="/games/crash" element={<Crash />} />
            <Route path="/games/roulette" element={<Roulette />} />
            <Route path="/players" element={<Players />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
      <Notifications />
    </div>
  );
}
