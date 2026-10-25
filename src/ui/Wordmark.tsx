export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`wordmark wordmark--${size}`} aria-label="PULSE">
      <svg viewBox="0 0 40 20" className="wordmark__beat" aria-hidden="true">
        <path d="M0 11h10l3-7 5 13 4-9 2 3h16" />
      </svg>
      <span aria-hidden="true">PULSE</span>
    </span>
  );
}
