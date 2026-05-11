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

  const clearBundle = () => setBundle([]);

  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);
  
  return (
    <BundleContext.Provider
      value={{
        bundle,
        addToBundle,
        removeFromBundle,
        clearBundle,
        isDrawerOpen,
        setIsDrawerOpen,
        toggleDrawer,
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
