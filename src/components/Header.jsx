"use client";

import { useBundle } from './BundleContext';

import Logo from './Logo';

export default function Header() {
  const { toggleDrawer, bundle } = useBundle();

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="h-16 w-auto" />
        </div>
        
        <button
          onClick={toggleDrawer}
          className="relative p-2 text-slate-300 hover:text-white transition-colors flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-lg px-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium text-sm">eBay Queue</span>
          {bundle.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-emerald-500 text-slate-950 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-slate-900">
              {bundle.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
