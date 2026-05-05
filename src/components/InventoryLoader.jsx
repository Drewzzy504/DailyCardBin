"use client";

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import SwipingDeck from './SwipingDeck';
import BinSelector from './BinSelector';
import CategorySelector from './CategorySelector';

export default function InventoryLoader() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeBin, setActiveBin] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await fetch('/api/get-inventory');
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        
        const data = await res.json();
        setInventory(data.inventory);
      } catch (err) {
        console.error('Error in InventoryLoader:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchInventory();
  }, []);

  // Filter the inventory based on the active bin and category
  const filteredInventory = useMemo(() => {
    let filtered = inventory;

    // Filter by Category
    if (activeCategory !== 'all') {
      filtered = filtered.filter((item) => {
        const itemCategory = String(item.Category ?? item.category ?? item.Sport ?? item.sport ?? 'Other')
          .trim()
          .toLowerCase();
        return itemCategory === activeCategory.toLowerCase();
      });
    }

    // Filter by Price Bin
    if (activeBin !== 'all') {
      filtered = filtered.filter(item => {
        const price = parseFloat(item.PriceBin) || 0;
        if (activeBin === 'premium') return price > 20;
        return item.PriceBin.toString() === activeBin;
      });
    }

    return filtered;
  }, [inventory, activeBin, activeCategory]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px]">
        <motion.div
          className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-emerald-500 font-medium tracking-widest uppercase text-sm">Loading Deck...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-rose-500 bg-rose-500/10 p-6 rounded-2xl border border-rose-500/20 text-center max-w-md mx-auto h-[500px] flex flex-col items-center justify-center">
        <svg className="w-12 h-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>Error loading cards: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center mt-4">
      <CategorySelector activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
      <BinSelector activeBin={activeBin} setActiveBin={setActiveBin} />
      <SwipingDeck inventory={filteredInventory} />
    </div>
  );
}
