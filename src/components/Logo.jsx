export default function Logo({ className = "" }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 280 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Neon Glow for the front card */}
        <filter id="emeraldGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Premium Gold Gradient for text */}
        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        
        {/* Emerald Gradient for the front card */}
        <linearGradient id="emeraldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Subtle dark gradient for background cards */}
        <linearGradient id="darkCard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>

      {/* Cards Icon Group */}
      <g transform="translate(10, 15)">
        {/* Back card (Blue hue) */}
        <rect x="0" y="10" width="30" height="42" rx="3" transform="rotate(-15 15 31)" fill="url(#darkCard)" stroke="#3B82F6" strokeWidth="1" />
        
        {/* Middle card (Light blue hue) */}
        <rect x="12" y="5" width="30" height="42" rx="3" transform="rotate(-5 27 26)" fill="url(#darkCard)" stroke="#60A5FA" strokeWidth="1" />
        
        {/* Front card with Emerald Glow */}
        <rect x="26" y="0" width="32" height="44" rx="4" transform="rotate(8 42 22)" fill="url(#emeraldGrad)" filter="url(#emeraldGlow)" stroke="#10B981" strokeWidth="1.5" />
      </g>

      {/* Typography */}
      <text x="85" y="32" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="16" fill="#F8FAFC" letterSpacing="4">
        DAILY
      </text>
      
      <text x="83" y="62" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="32" fill="url(#goldGrad)" letterSpacing="0">
        CARD BIN
      </text>
    </svg>
  );
}
