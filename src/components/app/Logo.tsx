export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--accent)" />
        <path d="M9.5 23 16 9l6.5 14M12 18h8" stroke="var(--accent-contrast)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="text-[1.0625rem] font-extrabold tracking-[0.14em]">ATLAS</span>
    </span>
  );
}
