import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/gameStore';
import { formatPrice, getSkinImageUrl, getRarityColor, getRarityBgClass, formatFloat, wearShort } from '../../utils/helpers';

const SORT_OPTIONS = [
  { value: 'date', label: 'Date Obtained' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'price', label: 'Price (High→Low)' },
  { value: 'name', label: 'Name' },
];

const RARITY_ORDER = ['Rare Special', 'Covert', 'Classified', 'Restricted', 'Mil-Spec', 'Industrial Grade', 'Consumer Grade'];

export default function Inventory() {
  const { inventory, fetchInventory, sellSkin, sellBulk, activePlayer, pingNGame } = useGameStore();
  const [sortBy, setSortBy] = useState('date');
  const [filterRarity, setFilterRarity] = useState('all');
  const [filterWear, setFilterWear] = useState('all');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    fetchInventory();
    pingNGame({ screen: 'inventory' });
  }, []);

  const sorted = [...inventory].sort((a, b) => {
    switch (sortBy) {
      case 'rarity': return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      case 'name': return a.skin_name.localeCompare(b.skin_name);
      case 'price': return 0; // Would need cached prices
      default: return b.obtained_at - a.obtained_at;
    }
  });

  const filtered = sorted.filter(item => {
    if (filterRarity !== 'all' && item.rarity !== filterRarity) return false;
    if (filterWear !== 'all' && item.wear !== filterWear) return false;
    return true;
  });

  const toggleSelect = (id) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkSell = async () => {
    if (selectedItems.size === 0) return;
    await sellBulk(Array.from(selectedItems));
    setSelectedItems(new Set());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">INVENTORY</h1>
        <div className="text-gray-400">
          {inventory.length} items
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-[#1a1d23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filterRarity}
          onChange={e => setFilterRarity(e.target.value)}
          className="bg-[#1a1d23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="all">All Rarities</option>
          {RARITY_ORDER.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={filterWear}
          onChange={e => setFilterWear(e.target.value)}
          className="bg-[#1a1d23] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="all">All Wear</option>
          <option value="Factory New">Factory New</option>
          <option value="Minimal Wear">Minimal Wear</option>
          <option value="Field-Tested">Field-Tested</option>
          <option value="Well-Worn">Well-Worn</option>
          <option value="Battle-Scarred">Battle-Scarred</option>
        </select>

        {selectedItems.size > 0 && (
          <button
            onClick={handleBulkSell}
            className="bg-csgo-gold/20 text-csgo-gold border border-csgo-gold/30 px-4 py-2 rounded-lg text-sm font-bold hover:bg-csgo-gold/30"
          >
            Sell {selectedItems.size} Selected
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtered.map(item => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            className={`bg-[#1a1d23] rounded-lg border cursor-pointer transition-all relative ${
              selectedItems.has(item.id) ? 'border-csgo-gold ring-1 ring-csgo-gold/30' : 'border-gray-800 hover:border-gray-600'
            }`}
            style={{ borderBottomColor: getRarityColor(item.rarity), borderBottomWidth: 3 }}
          >
            {/* Checkbox */}
            <div
              className="absolute top-2 left-2 z-10"
              onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                selectedItems.has(item.id) ? 'bg-csgo-gold border-csgo-gold' : 'border-gray-600 hover:border-gray-400'
              }`}>
                {selectedItems.has(item.id) && <span className="text-black text-xs">✓</span>}
              </div>
            </div>

            <div onClick={() => setDetailItem(item)} className="p-3">
              {item.stattrak === 1 && (
                <div className="text-[9px] text-orange-400 font-mono mb-1">StatTrak™</div>
              )}
              <img
                src={getSkinImageUrl(item.image_url)}
                alt={item.skin_name}
                className="h-20 w-full object-contain mb-2"
                loading="lazy"
              />
              <div className="text-xs text-white truncate">{item.skin_name}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-400">{wearShort(item.wear)}</span>
                <span className="text-[10px] font-mono" style={{ color: getRarityColor(item.rarity) }}>
                  {item.rarity?.split(' ')[0]}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-gray-600 py-20">
          <div className="text-5xl mb-4">🎒</div>
          <div>Your inventory is empty. Open some cases!</div>
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {detailItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
            onClick={() => setDetailItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#1a1d23] rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={getSkinImageUrl(detailItem.image_url)}
                alt={detailItem.skin_name}
                className="h-48 w-full object-contain mb-4"
              />
              {detailItem.stattrak === 1 && (
                <div className="text-orange-400 text-sm font-mono mb-1">StatTrak™</div>
              )}
              {detailItem.custom_name && (
                <div className="text-csgo-gold text-sm mb-1">"{detailItem.custom_name}"</div>
              )}
              <h3 className="text-xl font-bold" style={{ color: getRarityColor(detailItem.rarity) }}>
                {detailItem.skin_name}
              </h3>
              <div className="text-gray-400 mt-1">{detailItem.wear}</div>
              <div className="font-mono text-gray-500 text-sm mt-1">
                Float: {formatFloat(detailItem.float_value)}
              </div>
              <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500"
                  style={{ width: `${detailItem.float_value * 100}%` }}
                />
              </div>
              <div className="text-sm text-gray-500 mt-2">
                From: {detailItem.case_name || 'Unknown'}
              </div>

              {/* Rename section */}
              <RenameSection item={detailItem} onRenamed={(updated) => {
                setDetailItem(updated);
                fetchInventory();
              }} />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={async () => { await sellSkin(detailItem.id); setDetailItem(null); }}
                  className="flex-1 py-2 bg-csgo-gold/20 text-csgo-gold border border-csgo-gold/30 rounded-lg font-bold hover:bg-csgo-gold/30"
                >
                  Sell to Market
                </button>
                <button
                  onClick={() => setDetailItem(null)}
                  className="flex-1 py-2 bg-gray-700/30 text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-700/50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RenameSection({ item, onRenamed }) {
  const { activePlayer, addNotification } = useGameStore();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(item.custom_name || '');

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: activePlayer.id, inventoryId: item.id, newName }),
      });
      if (!res.ok) {
        const err = await res.json();
        addNotification(err.error, 'red');
        return;
      }
      const data = await res.json();
      addNotification('Item renamed!', 'green');
      setEditing(false);
      onRenamed(data.item);
      // Update player wallet
      useGameStore.setState({ activePlayer: data.player });
      useGameStore.setState(state => ({
        players: state.players.map(p => p.id === data.player.id ? data.player : p),
      }));
    } catch (e) {
      addNotification('Rename failed', 'red');
    }
  };

  const handleRemoveName = async () => {
    try {
      const res = await fetch('/api/rename/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: activePlayer.id, inventoryId: item.id }),
      });
      const data = await res.json();
      onRenamed(data.item);
      setNewName('');
    } catch (e) {}
  };

  if (!editing) {
    return (
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-3 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700"
        >
          {item.custom_name ? 'Edit Name' : 'Add Name Tag ($1.99)'}
        </button>
        {item.custom_name && (
          <button
            onClick={handleRemoveName}
            className="text-xs px-3 py-1 bg-gray-800 text-gray-500 rounded hover:bg-gray-700"
          >
            Remove Name
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Enter name..."
          maxLength={40}
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-white text-sm"
          autoFocus
        />
        <button
          onClick={handleRename}
          className="px-3 py-1.5 bg-csgo-gold/20 text-csgo-gold rounded text-sm font-bold"
        >
          Apply ($1.99)
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
