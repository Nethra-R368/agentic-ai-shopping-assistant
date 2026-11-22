/** Square monogram mark: an italic serif "a" with the vermillion dot. */
export default function Logo({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="var(--primary)" />
      <text x="15" y="23.5" textAnchor="middle" fontFamily="Instrument Serif, Georgia, serif" fontStyle="italic" fontSize="24" fill="var(--on-primary)">a</text>
      <circle cx="24" cy="21.5" r="2.4" fill="var(--brand)" />
    </svg>
  );
}

/** Wordmark used in the header and footer. */
export function Wordmark({ className = '' }) {
  return (
    <span className={`font-display text-[26px] leading-none tracking-tight ${className}`}>
      aurabuy<span className="text-brand">.</span>
    </span>
  );
}
