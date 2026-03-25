import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import useGameStore from '../../store/gameStore';

const navItems = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/cases', label: 'Cases', icon: '📦' },
  { path: '/inventory', label: 'Inventory', icon: '🎒' },
  { path: '/tradeup', label: 'Trade Up', icon: '🔄' },
  { path: '/market', label: 'Market', icon: '💰' },
  { type: 'divider', label: 'Games' },
  { path: '/games/coinflip', label: 'Coinflip', icon: '🪙' },
  { path: '/games/crash', label: 'Crash', icon: '🚀' },
  { path: '/games/roulette', label: 'Roulette', icon: '🎰' },
  { type: 'divider', label: 'Other' },
  { path: '/players', label: 'Players', icon: '👥' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useGameStore();

  return (
    <motion.aside
      className="fixed left-0 top-0 h-full bg-[#111318] border-r border-gray-800 z-40 flex flex-col"
      animate={{ width: sidebarOpen ? 224 : 64 }}
      transition={{ duration: 0.3 }}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-800">
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 flex items-center justify-center text-csgo-gold hover:bg-white/10 rounded"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
        {sidebarOpen && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-csgo-gold font-bold text-lg tracking-wider"
          >
            CASE SIM
          </motion.span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item, i) => {
          if (item.type === 'divider') {
            return sidebarOpen ? (
              <div key={i} className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider mt-2">
                {item.label}
              </div>
            ) : (
              <div key={i} className="border-t border-gray-800 my-2 mx-3" />
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-csgo-gold/20 text-csgo-gold border-l-2 border-csgo-gold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span className="text-lg w-6 text-center">{item.icon}</span>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-medium"
                >
                  {item.label}
                </motion.span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </motion.aside>
  );
}
