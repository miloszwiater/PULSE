import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * The PULSE turntable — the session timer drawn as a record deck.
 *
 *  - The platter turns at a real 33⅓ rpm (one turn per 1.8 s) while time runs, with inertia:
 *    it spins up when the session starts and runs down when it is paused.
 *  - The tonearm tracks progress the way a record plays: outer groove at the start, run-out groove
 *    at the chosen length. On pause the arm lifts. Past the intention the arc turns amber — no alarm.
 *  - Reflections stay still while the record turns (as on a real deck); the label print and the strobe
 *    dots on the platter rim make the rotation readable.
 *
 * Purely visual: the time itself always comes from timestamps (shared/domain/sessions.ts).
 */
export function Turntable({
  state,
  progress,
  over = false,
  label,
  tone,
  size = 320,
  onToggle,
  toggleLabel,
  children,
}: {
  /** idle: arm at rest, platter still · cueing: arm swings in (start) · playing · paused */
  state: 'idle' | 'cueing' | 'playing' | 'paused';
  /** 0…1 along the record */
  progress: number;
  over?: boolean;
  /** Printed on the label (curved). */
  label: string;
  /** CSS colour for the label ink (workflow tone). */
  tone?: string;
  size?: number;
  onToggle?: () => void;
  toggleLabel?: string;
  children?: ReactNode;
}) {
  const id = useId().replace(/:/g, '');
  const disc = useRef<SVGGElement>(null);
  const anim = useRef<Animation | null>(null);
  const raf = useRef(0);
  const spinning = state === 'playing' || state === 'cueing';

  // Platter motor with inertia (Web Animations playbackRate ramp). Reduced motion: no rotation at all.
  useEffect(() => {
    const el = disc.current;
    if (!el || typeof el.animate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!anim.current) {
      anim.current = el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 1800, iterations: Infinity });
      // A deck that mounts already playing (e.g. the session screen opening) is simply turning — no spin-up.
      anim.current.playbackRate = spinning ? 1 : 0;
      return;
    }
    const a = anim.current;
    const from = a.playbackRate;
    const to = spinning ? 1 : 0;
    const dur = spinning ? 700 : 1300; // spin-up is quicker than the run-down
    const t0 = performance.now();
    cancelAnimationFrame(raf.current);
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = spinning ? 1 - Math.pow(1 - k, 3) : 1 - Math.pow(1 - k, 2);
      a.playbackRate = from + (to - from) * e;
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [spinning]);
  useEffect(() => () => { anim.current?.cancel(); anim.current = null; }, []);

  // Geometry (viewBox units). Record centred at (160,160), r 150; tonearm pivot top-right.
  const C = 160;
  const R = 148;
  const grooveOuter = 140;
  const grooveInner = 64;
  const p = Math.max(0, Math.min(1, progress));
  // Arm angles: rest (parked beside the record), lead-in (outer groove), run-out (inner groove).
  const REST = -6;
  const START = 8;
  const END = 29;
  const armAngle = state === 'idle' ? REST : START + (END - START) * p;
  const grooves: ReactNode[] = [];
  for (let r = grooveInner + 2; r < grooveOuter; r += 2.2) {
    const band = Math.sin(r * 0.37) * 0.5 + 0.5;
    grooves.push(<circle key={r} cx={C} cy={C} r={r} className="tt__groove" style={{ opacity: 0.25 + band * 0.45 }} />);
  }
  // Two track gaps make the record read as an album side.
  const gaps = [118, 92].map((r) => <circle key={r} cx={C} cy={C} r={r} className="tt__gap" />);
  const strobe: ReactNode[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    strobe.push(<rect key={i} x={C - 1} y={C - R - 9} width={2} height={4} rx={0.6} transform={`rotate(${(a * 180) / Math.PI} ${C} ${C})`} className="tt__strobe" />);
  }
  const arc = 2 * Math.PI * (R + 3.5);

  const Tag = onToggle ? 'button' : 'div';
  return (
    <div className={`tt tt--${state}${over ? ' is-over' : ''}`} style={{ '--tt-size': `${size}px`, '--tt-tone': tone ?? 'var(--violet)' } as React.CSSProperties}>
      <Tag className="tt__deck" {...(onToggle ? { type: 'button' as const, onClick: onToggle, 'aria-label': toggleLabel } : { 'aria-hidden': true })}>
        <svg viewBox="0 0 360 330" className="tt__svg" aria-hidden="true">
          <defs>
            <radialGradient id={`vin-${id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#141219" />
              <stop offset="0.7" stopColor="#0d0c11" />
              <stop offset="1" stopColor="#08070b" />
            </radialGradient>
            <radialGradient id={`lab-${id}`} cx="40%" cy="35%" r="70%">
              <stop offset="0" stopColor="#f3eff8" />
              <stop offset="1" stopColor="#d6d0e0" />
            </radialGradient>
            <path id={`ring-${id}`} d={`M ${C} ${C} m -33 0 a 33 33 0 1 1 66 0 a 33 33 0 1 1 -66 0`} />
            <linearGradient id={`arm-${id}`} x1="0" x2="1">
              <stop offset="0" stopColor="#c9c4d4" />
              <stop offset="0.5" stopColor="#f4f1f8" />
              <stop offset="1" stopColor="#9d98aa" />
            </linearGradient>
          </defs>

          {/* Platter and mat */}
          <circle cx={C} cy={C} r={R + 11} className="tt__platter" />
          <circle cx={C} cy={C} r={R + 3.5} className="tt__track" />
          <circle cx={C} cy={C} r={R + 3.5} className="tt__progress" strokeDasharray={`${arc} ${arc}`} strokeDashoffset={arc * (1 - p)} transform={`rotate(-90 ${C} ${C})`} />

          {/* Everything that turns */}
          <g ref={disc} className="tt__disc" style={{ transformOrigin: `${C}px ${C}px`, transformBox: 'view-box' } as React.CSSProperties}>
            <g className="tt__strobes">{strobe}</g>
            <circle cx={C} cy={C} r={R} fill={`url(#vin-${id})`} />
            <circle cx={C} cy={C} r={R - 1} className="tt__edge" />
            {grooves}
            {gaps}
            <circle cx={C} cy={C} r={grooveInner - 6} className="tt__runout" />
            <circle cx={C} cy={C} r={46} fill={`url(#lab-${id})`} />
            <circle cx={C} cy={C} r={46} className="tt__label-ring" />
            <circle cx={C} cy={C} r={24} className="tt__label-ink" />
            <text className="tt__print"><textPath href={`#ring-${id}`} startOffset="2%">{label.toUpperCase().slice(0, 28)}</textPath></text>
            <text className="tt__print tt__print--rpm" x={C} y={C + 40} textAnchor="middle">33⅓</text>
            <circle cx={C} cy={C} r={3.2} className="tt__spindle" />
          </g>

          {/* Fixed reflections: light from the lamp above the deck */}
          <circle cx={C} cy={C} r={R} className="tt__sheen" style={{ fill: `url(#sheen-${id})` }} />
          <defs>
            <radialGradient id={`sheen-${id}`} cx="30%" cy="22%" r="80%">
              <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
              <stop offset="0.45" stopColor="#fff" stopOpacity="0.015" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path className="tt__glint" d={`M ${C - 118} ${C - 66} A 136 136 0 0 1 ${C - 52} ${C - 126}`} />
          <path className="tt__glint tt__glint--soft" d={`M ${C + 118} ${C + 70} A 136 136 0 0 1 ${C + 56} ${C + 124}`} />

          {/* Tonearm: pivot, counterweight, arm, headshell. Rotates about the pivot. */}
          <g className="tt__arm" style={{ transform: `rotate(${armAngle}deg)`, transformOrigin: '318px 34px' } as React.CSSProperties}>
            <g className="tt__arm-lift">
              <rect x="311" y="4" width="14" height="22" rx="3" className="tt__weight" />
              <path d="M318 34 L318 214 Q318 236 300 250" className="tt__tube" stroke={`url(#arm-${id})`} />
              <g transform="translate(300 250) rotate(38)">
                <rect x="-9" y="-4" width="20" height="30" rx="3" className="tt__shell" />
                <rect x="-3" y="22" width="6" height="7" rx="1.5" className="tt__cart" />
                <circle cx="0" cy="30" r="1.4" className="tt__needle" />
              </g>
            </g>
          </g>
          <circle cx="318" cy="34" r="15" className="tt__pivot" />
          <circle cx="318" cy="34" r="6" className="tt__pivot-cap" />
        </svg>
      </Tag>
      {children && <div className="tt__readout">{children}</div>}
    </div>
  );
}

/** Timer digits in the display face with fixed advance widths, so the numbers never jitter. */
export function TimerDigits({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`digits ${className}`} aria-hidden="true">
      {[...text].map((ch, i) => <span key={i} className={ch === ':' ? 'digits__sep' : 'digits__d'}>{ch}</span>)}
    </span>
  );
}
