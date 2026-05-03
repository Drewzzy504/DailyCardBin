"use client";

import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useBundle } from './BundleContext';

export default function SwipingDeck({ inventory }) {
  const [cards, setCards] = useState(inventory);
  const { bundle, addToBundle } = useBundle();

  // Reset the deck when the inventory prop changes (e.g., when switching bins)
  useEffect(() => {
    // Filter out items already in the bundle so they don't reappear immediately upon bin switch
    const available = inventory.filter(invCard => !bundle.some(b => b.ID === invCard.ID));
    setCards(available);
  }, [inventory, bundle]);

  // Infinite Loop Logic
  useEffect(() => {
    if (cards.length === 0 && inventory.length > 0) {
      // When deck runs out, filter the original inventory against what's already in the bundle
      const remainingCards = inventory.filter(invCard => !bundle.some(b => b.ID === invCard.ID));
      // Only replenish if there are actually cards left to show
      if (remainingCards.length > 0) {
        setCards(remainingCards);
      }
    }
  }, [cards.length, inventory, bundle]);

  const handleDragEnd = (event, info, card) => {
    const swipeThreshold = 100;
    
    // Swipe Right (Add to Bundle)
    if (info.offset.x > swipeThreshold) {
      addToBundle(card);
      setCards((prev) => prev.slice(1));
    } 
    // Swipe Left (Dismiss)
    else if (info.offset.x < -swipeThreshold) {
      setCards((prev) => prev.slice(1));
    }
  };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500">
        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-xl font-medium">Bin Empty!</p>
        <p className="text-sm">You've cleared out this entire bin.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto h-[500px] flex items-center justify-center">
      <AnimatePresence>
        {cards.slice(0, 3).reverse().map((card, idx) => {
          // Because we reverse the array, the top card is the last one in the mapped array (index === 2 if there are 3 cards)
          const isTop = idx === cards.slice(0, 3).length - 1;
          
          // Index relative to the top card (0 = top, 1 = second, 2 = third)
          const relativeIndex = cards.slice(0, 3).length - 1 - idx;

          return (
            <Card
              key={`${card.ID}-${cards.length}`} // Ensure unique key for re-renders on loop
              card={card}
              isTop={isTop}
              relativeIndex={relativeIndex}
              handleDragEnd={(e, info) => handleDragEnd(e, info, card)}
            />
          );
        })}
      </AnimatePresence>

      {/* Swipe Instructions Overlay */}
      <div className="absolute -bottom-16 left-0 right-0 flex justify-between px-8 pointer-events-none opacity-50">
        <div className="flex flex-col items-center text-rose-500">
          <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider">Pass</span>
        </div>
        <div className="flex flex-col items-center text-emerald-500">
          <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider">Add</span>
        </div>
      </div>
    </div>
  );
}

// Separate component for individual cards to handle motion values per card
function Card({ card, isTop, relativeIndex, handleDragEnd }) {
  const x = useMotionValue(0);
  
  // Rotate slightly based on drag distance
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  
  // Opacity overlays for swipe indicators
  const swipeRightOpacity = useTransform(x, [0, 100], [0, 1]);
  const swipeLeftOpacity = useTransform(x, [0, -100], [0, 1]);

  // Stamping Scale Effect (starts large and stamps down to normal size as opacity increases)
  const stampScaleRight = useTransform(x, [0, 100], [1.5, 1]);
  const stampScaleLeft = useTransform(x, [0, -100], [1.5, 1]);

  return (
    <motion.div
      className="absolute w-full h-[450px] rounded-2xl bg-slate-800 border border-slate-700 flex flex-col overflow-hidden will-change-transform cursor-grab active:cursor-grabbing"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        zIndex: isTop ? 10 : 10 - relativeIndex,
        // The neon glow: only on top card
        boxShadow: isTop 
          ? "0 0 40px 5px rgba(16, 185, 129, 0.25), 0 0 20px 2px rgba(245, 158, 11, 0.15), 0 10px 15px -3px rgba(0, 0, 0, 0.5)" 
          : "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
      }}
      initial={{ 
        scale: 1 - relativeIndex * 0.05, 
        y: relativeIndex * 20, 
        opacity: 0 
      }}
      animate={{ 
        scale: 1 - relativeIndex * 0.05, 
        y: relativeIndex * 20, 
        opacity: 1 - relativeIndex * 0.2
      }}
      exit={{ 
        x: x.get() > 0 ? 300 : -300, 
        opacity: 0, 
        transition: { duration: 0.2 } 
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.02 }}
    >
      {/* Dynamic Overlay for Swiping Actions */}
      {isTop && (
        <>
          <motion.div 
            style={{ opacity: swipeRightOpacity }}
            className="absolute inset-0 z-20 bg-emerald-500/20 border-4 border-emerald-500 rounded-2xl pointer-events-none flex items-center justify-center overflow-hidden"
          >
            <motion.div 
              style={{ scale: stampScaleRight }}
              className="border-4 border-emerald-500 text-emerald-500 text-5xl font-black uppercase tracking-widest px-8 py-3 rounded-xl transform -rotate-12 bg-slate-900/80 backdrop-blur-md shadow-[0_0_30px_rgba(16,185,129,0.5)]"
            >
              KEEP
            </motion.div>
          </motion.div>
          <motion.div 
            style={{ opacity: swipeLeftOpacity }}
            className="absolute inset-0 z-20 bg-rose-500/20 border-4 border-rose-500 rounded-2xl pointer-events-none flex items-center justify-center overflow-hidden"
          >
            <motion.div 
              style={{ scale: stampScaleLeft }}
              className="border-4 border-rose-500 text-rose-500 text-5xl font-black uppercase tracking-widest px-8 py-3 rounded-xl transform rotate-12 bg-slate-900/80 backdrop-blur-md shadow-[0_0_30px_rgba(243,64,84,0.5)]"
            >
              PASS
            </motion.div>
          </motion.div>
        </>
      )}

      {/* Card Image Area */}
      <div className="relative flex-1 bg-slate-900 border-b border-slate-700 overflow-hidden">
        {card.ImageURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.ImageURL} alt={card.Name} className="w-full h-full object-cover select-none pointer-events-none" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-950 font-medium">
            No Image Provided
          </div>
        )}
        
        {/* Tier Label (Gold Accent) */}
        <div className="absolute top-4 right-4 z-10 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold px-4 py-1.5 rounded-full shadow-lg border border-amber-300">
          ${card.PriceBin} Bin
        </div>
      </div>

      {/* Card Details */}
      <div className="p-6 bg-slate-800">
        <h3 className="text-2xl font-bold text-white mb-1 truncate">{card.Name}</h3>
        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">
          {card.Set} <span className="text-slate-600 mx-1">•</span> {card.Year}
        </p>
      </div>
    </motion.div>
  );
}
