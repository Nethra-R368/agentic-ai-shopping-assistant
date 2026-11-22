export default function Logo({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="aura-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#ff6fa8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#aura-logo)" />
      <path d="M20 26h24l-2.4 19.2A4 4 0 0 1 37.6 49H26.4a4 4 0 0 1-4-3.8L20 26z" fill="#fff" />
      <path d="M26 27v-4a6 6 0 0 1 12 0v4" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M32 32.5l1.6 3.4 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#7c5cff" />
    </svg>
  );
}
