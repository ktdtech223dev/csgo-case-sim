import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';

export default function Settings() {
  const { settings, updateSettings, activePlayer, players, resetPlayer } = useGameStore();
  const [confirmReset, setConfirmReset] = useState(null);

  const Slider = ({ label, value, onChange, min = 0, max = 1, step = 0.01 }) => (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-400 text-sm w-32">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-csgo-gold"
      />
      <span className="text-white font-mono text-sm w-12 text-right">{Math.round(value * 100)}%</span>
    </div>
  );

  const Toggle = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-sm">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-csgo-gold' : 'bg-gray-700'}`}
      >
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">SETTINGS</h1>

      {/* Audio */}
      <Section title="AUDIO">
        <Slider label="Master Volume" value={settings.masterVolume} onChange={v => updateSettings('masterVolume', v)} />
        <Slider label="SFX Volume" value={settings.sfxVolume} onChange={v => updateSettings('sfxVolume', v)} />
        <Slider label="Music Volume" value={settings.musicVolume} onChange={v => updateSettings('musicVolume', v)} />
      </Section>

      {/* Display */}
      <Section title="DISPLAY">
        <Toggle label="Animations" value={settings.animations} onChange={v => updateSettings('animations', v)} />
        <Toggle label="Show Float Values" value={settings.showFloats} onChange={v => updateSettings('showFloats', v)} />
        <Toggle label="Show Prices in Inventory" value={settings.showPrices} onChange={v => updateSettings('showPrices', v)} />
        <Toggle label="Dark Mode" value={settings.darkMode} onChange={v => updateSettings('darkMode', v)} />
      </Section>

      {/* Price */}
      <Section title="PRICES">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Currency</span>
          <select
            value={settings.currency}
            onChange={e => updateSettings('currency', e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-white text-sm"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (\u20ac)</option>
            <option value="GBP">GBP (\u00a3)</option>
          </select>
        </div>
        <button
          onClick={() => {
            fetch('/api/cases').then(() => {
              useGameStore.getState().addNotification('Prices refreshed!', 'green');
            });
          }}
          className="w-full py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm"
        >
          Force Refresh Prices
        </button>
      </Section>

      {/* Player Reset */}
      <Section title="PLAYER DATA">
        <div className="flex flex-col gap-2">
          {players.map(p => (
            <div key={p.id} className="flex items-center justify-between">
              <span className="text-gray-400">{p.name}</span>
              {confirmReset === p.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { resetPlayer(p.id); setConfirmReset(null); }}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setConfirmReset(null)}
                    className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(p.id)}
                  className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-600/30 rounded text-sm hover:bg-red-600/30"
                >
                  Reset
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-[#1a1d23] rounded-xl border border-gray-800 p-6 mb-6">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">{title}</h2>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}
