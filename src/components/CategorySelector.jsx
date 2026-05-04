"use client";

import { motion } from "framer-motion";

const CATEGORIES = [
  { id: "all", label: "All Sports" },
  { id: "Baseball", label: "Baseball" },
  { id: "Basketball", label: "Basketball" },
  { id: "Football", label: "Football" },
  { id: "Soccer", label: "Soccer" },
  { id: "Hockey", label: "Hockey" },
  { id: "Racing", label: "Racing" },
  { id: "Fighting", label: "Fighting" },
  { id: "Pokemon", label: "Pokemon" },
  { id: "Magic", label: "Magic" },
  { id: "Entertainment", label: "Entertainment" },
  { id: "Other", label: "Other" },
];

export default function CategorySelector({ activeCategory, setActiveCategory }) {
  return (
    <div className="w-full max-w-3xl mx-auto mb-4 px-4">
      {/* Scrollable container for mobile */}
      <div className="flex overflow-x-auto hide-scrollbar bg-slate-900/50 backdrop-blur-sm p-1.5 rounded-full border border-emerald-500/30 shadow-inner">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`relative flex-1 min-w-[90px] px-4 py-2 text-xs font-bold rounded-full transition-colors duration-200 whitespace-nowrap outline-none ${
                isActive ? "text-slate-900" : "text-emerald-500/70 hover:text-emerald-400"
              }`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeCategoryBubble"
                  className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 drop-shadow-sm uppercase tracking-wider">{cat.label}</span>
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
