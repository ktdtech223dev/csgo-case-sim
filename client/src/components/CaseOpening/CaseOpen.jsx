import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/gameStore';
import { formatPrice, getSkinImageUrl, getRarityColor, getRarityGlow, formatFloat, wearShort } from '../../utils/helpers';

const ITEM_WIDTH = 140;
const VISIBLE_ITEMS = 7;

export default function CaseOpen() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { openCase, finishCaseOpening, isOpeningCase, caseResult, caseReel, activePlayer, sellImmediate, pingNGame, postToWall, addNotification } = useGameStore();
  const [caseData, setCaseData] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle, spinning, reveal
  const [reelOffset, setReelOffset] = useState(0);
  const reelRef = useRef(null);

  useEffect(() => {
    fetch(`/api/cases/${caseId}`).then(r => r.json()).then(setCaseData);
    pingNGame({ screen: 'case_opening', case: caseId });
  }, [caseId]);

  const handleOpen = async () => {
    if (phase !== 'idle') return;
    const totalCost = (caseData?.price || 2.49) + 2.49;
    if (activePlayer.wallet < totalCost) {
      addNotification('Not enough money!', 'red');
      return;
    }

    setPhase('spinning');
    const result = await openCase(caseId);
    if (!result) {
      setPhase('idle');
      return;
    }

    // Calculate reel offset to land on winning item
    const winPos = result.winPosition;
    const centerOffset = (VISIBLE_ITEMS / 2) * ITEM_WIDTH;
    const targetOffset = winPos * ITEM_WIDTH - centerOffset + ITEM_WIDTH / 2 + (Math.random() * 40 - 20);

    // Animate reel
    setReelOffset(0);
    requestAnimationFrame(() => {
      setReelOffset(-targetOffset);
    });

    // Reveal after animation
    setTimeout(() => {
      setPhase('reveal');
    }, 5500);
  };

  const handleSell = async () => {
    if (caseResult) {
      await sellImmediate(caseResult.id, caseResult.price);
      setPhase('idle');
      finishCaseOpening();
    }
  };

  const handleKeep = () => {
    setPhase('idle');
    finishCaseOpening();
    addNotification('Added to inventory!', 'green');
  };

  if (!caseData) {
    return <div className="text-gray-500">Loading case...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back button */}
      <button onClick={() => navigate('/cases')} className="text-gray-400 hover:text-white mb-4 flex items-center gap-2">
        ← Back to Cases
      </button>

      {/* Case info */}
      <div className="flex items-center gap-6 mb-8">
        <img src={caseData.image} alt={caseData.name} className="h-24 object-contain" />
        <div>
          <h1 className="text-3xl font-bold text-white">{caseData.name}</h1>
          <p className="text-gray-400">
            Cost: <span className="text-csgo-gold font-mono">{formatPrice(caseData.price + 2.49)}</span>
            <span className="text-gray-600 ml-2">(Case + Key)</span>
          </p>
        </div>
      </div>

      {/* Reel area */}
      <div className="relative bg-[#111318] rounded-xl border border-gray-800 overflow-hidden mb-8">
        {/* Center marker */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-csgo-gold z-10 transform -translate-x-1/2" />
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-4 h-4 bg-csgo-gold rotate-45 transform -translate-y-1" />
        </div>

        {/* Reel */}
        <div className="h-44 overflow-hidden relative">
          {phase !== 'idle' && caseReel.length > 0 ? (
            <div
              ref={reelRef}
              className="flex items-center h-full absolute"
              style={{
                transform: `translateX(${reelOffset}px)`,
                transition: phase === 'spinning' ? 'transform 5s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none',
              }}
            >
              {caseReel.map((item, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 flex flex-col items-center justify-center p-2 border-r border-gray-800"
                  style={{ width: ITEM_WIDTH, borderBottom: `3px solid ${getRarityColor(item.rarity)}` }}
                >
                  <img
                    src={getSkinImageUrl(item.image_id)}
                    alt={item.name}
                    className="h-20 object-contain"
                    loading="lazy"
                  />
                  <div className="text-[10px] text-gray-400 truncate max-w-full text-center mt-1">
                    {item.name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600">
              Click Open to spin!
            </div>
          )}
        </div>
      </div>

      {/* Open button */}
      {phase === 'idle' && (
        <div className="flex justify-center mb-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpen}
            className="px-12 py-4 bg-gradient-to-r from-csgo-gold to-yellow-600 text-black font-bold text-xl rounded-lg pulse-glow"
          >
            OPEN CASE — {formatPrice(caseData.price + 2.49)}
          </motion.button>
        </div>
      )}

      {/* Result reveal */}
      <AnimatePresence>
        {phase === 'reveal' && caseResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className={`bg-[#1a1d23] rounded-2xl p-8 max-w-lg w-full mx-4 border-2 ${getRarityGlow(caseResult.rarity)}`}
              style={{ borderColor: getRarityColor(caseResult.rarity) }}
            >
              {/* Skin image */}
              <div className="flex justify-center mb-6">
                <motion.img
                  initial={{ rotateY: 90 }}
                  animate={{ rotateY: 0 }}
                  transition={{ delay: 0.2 }}
                  src={getSkinImageUrl(caseResult.image_id)}
                  alt={caseResult.name}
                  className="h-48 object-contain"
                />
              </div>

              {/* Skin info */}
              <div className="text-center">
                {caseResult.stattrak && (
                  <div className="text-orange-400 text-sm font-mono mb-1">StatTrak™</div>
                )}
                <h2 className="text-2xl font-bold" style={{ color: getRarityColor(caseResult.rarity) }}>
                  {caseResult.name}
                </h2>
                <div className="text-gray-400 mt-1">
                  {caseResult.wear} ({wearShort(caseResult.wear)})
                </div>
                <div className="font-mono text-gray-500 text-sm mt-1">
                  Float: {formatFloat(caseResult.float_value)}
                </div>

                {/* Float bar */}
                <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500"
                    style={{ width: `${caseResult.float_value * 100}%` }}
                  />
                </div>

                <div className="text-csgo-gold font-mono text-3xl font-bold mt-4">
                  {formatPrice(caseResult.price)}
                </div>

                <div className="text-sm text-gray-500 mt-1" style={{ color: getRarityColor(caseResult.rarity) }}>
                  {caseResult.rarity}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-6">
                <div className="flex gap-4">
                  <button
                    onClick={handleKeep}
                    className="flex-1 py-3 bg-csgo-green/20 text-csgo-green border border-csgo-green/30 rounded-lg font-bold hover:bg-csgo-green/30 transition"
                  >
                    Add to Inventory
                  </button>
                  <button
                    onClick={handleSell}
                    className="flex-1 py-3 bg-csgo-gold/20 text-csgo-gold border border-csgo-gold/30 rounded-lg font-bold hover:bg-csgo-gold/30 transition"
                  >
                    Sell for {formatPrice(caseResult.price * 0.93)}
                  </button>
                </div>
                <button
                  onClick={() => {
                    const playerName = activePlayer?.name || 'Player';
                    const st = caseResult.stattrak ? 'StatTrak\u2122 ' : '';
                    postToWall(`🎁 ${playerName} unboxed ${st}${caseResult.name} (${caseResult.wear}) from ${caseData.name} — $${caseResult.price.toFixed(2)}`);
                    addNotification('Posted to N Games wall!', 'blue');
                  }}
                  className="w-full py-2 bg-csgo-purple/20 text-csgo-purple border border-csgo-purple/30 rounded-lg font-bold hover:bg-csgo-purple/30 transition text-sm"
                >
                  Share to Crew Wall
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Case contents */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-4">CASE CONTENTS</h2>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[...caseData.skins, ...caseData.rare_special].map((skin, i) => (
            <div
              key={i}
              className="bg-[#1a1d23] rounded-lg p-3 border border-gray-800"
              style={{ borderBottomColor: getRarityColor(skin.rarity), borderBottomWidth: 3 }}
            >
              <img
                src={getSkinImageUrl(skin.image_id)}
                alt={skin.name}
                className="h-20 w-full object-contain mb-2"
                loading="lazy"
              />
              <div className="text-xs text-white truncate">{skin.name}</div>
              <div className="text-[10px]" style={{ color: getRarityColor(skin.rarity) }}>{skin.rarity}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
