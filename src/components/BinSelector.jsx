"use client";

import { motion } from "framer-motion";

const BINS = [
  { id: "all", label: "All Cards" },
  { id: "1", label: "$1 Bin" },
  { id: "3", label: "$3 Bin" },
  { id: "5", label: "$5 Bin" },
  { id: "10", label: "$10 Bin" },
  { id: "20", label: "$20 Bin" },
  { id: "premium", label: "Premium" },
];

export default function BinSelector({ activeBin, setActiveBin }) {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8 px-4">
      {/* Scrollable container for mobile */}
      <div className="flex overflow-x-auto hide-scrollbar bg-slate-800/50 backdrop-blur-sm p-1.5 rounded-full border border-slate-700/50 shadow-inner">
        {BINS.map((bin) => {
          const isActive = activeBin === bin.id;

          return (
            <button
              key={bin.id}
              onClick={() => setActiveBin(bin.id)}
              className={`relative flex-1 min-w-[80px] px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 whitespace-nowrap outline-none ${
                isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-200"
              }`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeBinBubble"
                  className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 drop-shadow-sm">{bin.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hide scrollbar CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
