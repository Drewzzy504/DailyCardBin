"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBundle } from './BundleContext';

export default function BundleDrawer() {
  const { 
    bundle, 
    removeFromBundle,
    clearBundle,
    isDrawerOpen, 
    toggleDrawer, 
  } = useBundle();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);

  const handleGenerateDrafts = async () => {
    if (bundle.length === 0) return;
    setIsSubmitting(true);
    setResultMessage(null);

    try {
      const response = await fetch('/api/create-ebay-drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cards: bundle }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResultMessage({ type: 'success', text: `Successfully created ${bundle.length} eBay drafts!` });
        clearBundle();
      } else {
        setResultMessage({ type: 'error', text: data.error || 'Some drafts failed to create. Check logs.' });
      }
    } catch (error) {
      setResultMessage({ type: 'error', text: 'Network error. Could not connect to the API.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleDrawer}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">eBay Draft Queue</h2>
                <p className="text-sm text-slate-400">{bundle.length} cards queued</p>
              </div>
              <button 
                onClick={toggleDrawer}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                aria-label="Close drawer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {bundle.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                  <svg className="w-16 h-16 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p>Your queue is empty.</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {bundle.map((item) => (
                    <motion.div
                      key={item.ID}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                      className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors"
                    >
                      {/* Placeholder for Card Image */}
                      <div className="w-16 h-20 bg-slate-900 rounded-lg shrink-0 border border-slate-700 overflow-hidden relative shadow-inner">
                        {item.ImageURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.ImageURL} alt={item.Name} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs text-center p-1 font-medium">No Image</div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold truncate">{item.Name}</h4>
                        <p className="text-xs text-slate-400 truncate uppercase tracking-wider">{item.Manufacturer || item.Set} • {item.Year}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 bg-gradient-to-br from-emerald-400 to-emerald-600 px-2.5 py-0.5 rounded-full shadow-sm">
                            {item.CardCondition || 'NM'}
                          </span>
                          {item.Graded && (
                             <span className="text-xs font-bold text-slate-900 bg-slate-300 px-2.5 py-0.5 rounded-full shadow-sm">
                              Graded
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromBundle(item.ID)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                        aria-label="Remove item"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md relative">
              {resultMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${resultMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                  {resultMessage.text}
                </div>
              )}
              <button 
                onClick={handleGenerateDrafts}
                disabled={bundle.length === 0 || isSubmitting}
                className="w-full py-4 rounded-xl font-black tracking-widest uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
              >
                {isSubmitting ? 'Creating Drafts...' : 'Generate eBay Drafts'}
                {!isSubmitting && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
