/** PULSE logotype: a record seen from above and the name set in the display didone. */
export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`wordmark wordmark--${size}`} aria-label="PULSE">
      <svg viewBox="0 0 20 20" className="wordmark__disc" aria-hidden="true">
        <circle cx="10" cy="10" r="9.4" className="d-vinyl" />
        <circle cx="10" cy="10" r="7.2" className="d-groove" />
        <circle cx="10" cy="10" r="5.4" className="d-groove" />
        <circle cx="10" cy="10" r="3.4" className="d-label" />
        <circle cx="10" cy="10" r="0.9" className="d-hole" />
      </svg>
      <span aria-hidden="true">Pulse</span>
    </span>
  );
}
