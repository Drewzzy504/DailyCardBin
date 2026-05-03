"use client";

import { createContext, useContext, useState, useMemo } from 'react';

const BundleContext = createContext(undefined);

export function BundleProvider({ children }) {
  const [bundle, setBundle] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Actions
  const addToBundle = (card) => {
    // Avoid duplicates if card ID already exists
    if (!bundle.find((item) => item.ID === card.ID)) {
      setBundle((prev) => [...prev, card]);
    }
  };

  const removeFromBundle = (cardId) => {
    setBundle((prev) => prev.filter((item) => item.ID !== cardId));
  };

  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);
  
  // Computations
  const bundleStats = useMemo(() => {
    let subtotal = 0;
    let bin1Count = 0;
    let bin3Count = 0;
    let bin5Count = 0;
    let bin10Count = 0;
    let bin20Count = 0;

    bundle.forEach((item) => {
      // Parse the price bin, fallback to 0 if invalid
      const price = parseFloat(item.PriceBin) || 0;
      subtotal += price;

      if (price === 1) bin1Count++;
      else if (price === 3) bin3Count++;
      else if (price === 5) bin5Count++;
      else if (price === 10) bin10Count++;
      else if (price === 20) bin20Count++;
    });

    // Deals Logic
    // $1 Bin: 5 for $4.50 ($0.50 discount)
    // $3 Bin: 3 for $8.00 ($1.00 discount)
    // $5 Bin: 3 for $13.50 ($1.50 discount)
    // $10 Bin: 2 for $18.00 ($2.00 discount)
    // $20 Bin: 2 for $35.00 ($5.00 discount)
    const discount1 = Math.floor(bin1Count / 5) * 0.50;
    const discount3 = Math.floor(bin3Count / 3) * 1.00;
    const discount5 = Math.floor(bin5Count / 3) * 1.50;
    const discount10 = Math.floor(bin10Count / 2) * 2.00;
    const discount20 = Math.floor(bin20Count / 2) * 5.00;

    const discountAmount = discount1 + discount3 + discount5 + discount10 + discount20;
    const total = subtotal - discountAmount;

    return {
      subtotal,
      total,
      discountAmount,
      bin1Count,
      bin3Count,
      bin5Count,
      bin10Count,
      bin20Count,
    };
  }, [bundle]);

  return (
    <BundleContext.Provider
      value={{
        bundle,
        addToBundle,
        removeFromBundle,
        isDrawerOpen,
        setIsDrawerOpen,
        toggleDrawer,
        ...bundleStats,
      }}
    >
      {children}
    </BundleContext.Provider>
  );
}

export function useBundle() {
  const context = useContext(BundleContext);
  if (context === undefined) {
    throw new Error('useBundle must be used within a BundleProvider');
  }
  return context;
}
