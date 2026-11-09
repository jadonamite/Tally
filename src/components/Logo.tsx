/** Tally wordmark. Inherits currentColor so it works on both themes. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`select-none text-lg font-bold italic leading-none tracking-[-0.04em] ${className}`}>
      TAL<span className="opacity-45">LY</span>
    </span>
  );
}
