import InventoryLoader from "@/components/InventoryLoader";

export const metadata = {
  title: 'DailyCardBin',
  description: 'Inventory Tracker and eBay Lister',
};

export default function Home() {
  return (
    // #0F172A is Tailwind's slate-900
    <main className="min-h-screen bg-slate-900 text-slate-50 selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        
        {/* Welcome Section */}
        <div className="text-center mb-6 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
            Inventory Tracker
          </h1>
          <p className="text-base text-slate-400 leading-relaxed">
            Swipe right to queue a card for an eBay draft. Swipe left to skip.
          </p>
        </div>

        {/* Inventory Loader / Swiping Deck Component */}
        <InventoryLoader />

        {/* Footer/Instructions */}
        <div className="mt-auto pt-12 pb-6 text-center">
          <p className="text-sm text-slate-500">
            Powered by DailyCardBin
          </p>
        </div>

      </div>
    </main>
  );
}
