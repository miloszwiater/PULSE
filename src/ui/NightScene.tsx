import { memo, useMemo } from 'react';

/**
 * Generated "studio at night" scene: a personal skyline (seeded by the
 * account), a window frame, and the artist's silhouette at the desk with a
 * glowing DAW monitor. The sky follows the time of day. Pure SVG — crisp on
 * any screen, ~0 kB of images, no stock or AI art.
 */

type Phase = 'dawn' | 'day' | 'dusk' | 'night';

const SKY: Record<Phase, { top: string; mid: string; glow: string; city: string; city2: string; lit: number }> = {
  dawn: { top: '#120c33', mid: '#4a2370', glow: '#e67fb4', city: '#24164f', city2: '#140d33', lit: 0.25 },
  day: { top: '#141a4a', mid: '#2f3a8a', glow: '#7f8cf0', city: '#1f2156', city2: '#121338', lit: 0.12 },
  dusk: { top: '#0f0a2e', mid: '#3b1d78', glow: '#b05cff', city: '#211650', city2: '#120c31', lit: 0.45 },
  night: { top: '#06051a', mid: '#1f1052', glow: '#7b46ff', city: '#170f3e', city2: '#0c0826', lit: 0.7 },
};

export function phaseFor(minute: number): Phase {
  const h = minute / 60;
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 16) return 'day';
  if (h >= 16 && h < 19.5) return 'dusk';
  return 'night';
}

function rng(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Building { x: number; w: number; h: number; windows: { x: number; y: number; on: boolean; warm: boolean }[]; antenna: boolean }

function skyline(seed: string, base: number, minH: number, maxH: number, density: number): Building[] {
  const r = rng(seed);
  const out: Building[] = [];
  let x = -10;
  while (x < 400) {
    const w = 18 + Math.floor(r() * 34);
    const h = minH + Math.floor(r() * (maxH - minH));
    const windows: Building['windows'] = [];
    for (let wy = base - h + 8; wy < base - 6; wy += 9) {
      for (let wx = x + 4; wx < x + w - 5; wx += 7) {
        if (r() < density) windows.push({ x: wx, y: wy, on: r() < 0.55, warm: r() < 0.25 });
      }
    }
    out.push({ x, w, h, windows, antenna: r() < 0.18 });
    x += w + (r() < 0.3 ? 2 : 0);
  }
  return out;
}

function NightSceneImpl({ seed, minute, figure = true, person = true, rain = false, className = '', photo }: { seed: string; minute: number; figure?: boolean; person?: boolean; rain?: boolean; className?: string; photo?: string | null }) {
  const phase = phaseFor(minute);
  const c = SKY[phase];
  const far = useMemo(() => skyline(`${seed}:far`, 236, 40, 120, 0.55), [seed]);
  const near = useMemo(() => skyline(`${seed}:near`, 262, 30, 90, 0.4), [seed]);
  const stars = useMemo(() => { const r = rng(`${seed}:stars`); return Array.from({ length: 26 }, () => ({ x: r() * 390, y: r() * 120, s: r() * 1.1 + 0.3, o: r() * 0.6 + 0.2 })); }, [seed]);
  const id = `ns${seed.replace(/[^a-z0-9]/gi, '').slice(0, 8)}`;

  if (photo) {
    return (
      <div className={`scene scene--photo ${className}`} aria-hidden="true">
        <img src={photo} alt="" />
      </div>
    );
  }

  return (
    <div className={`scene scene--${phase} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 390 330" preserveAspectRatio="xMidYMax slice" className="scene__svg">
        <defs>
          <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.top} />
            <stop offset="0.55" stopColor={c.mid} />
            <stop offset="0.78" stopColor={c.glow} stopOpacity="0.85" />
            <stop offset="1" stopColor={c.city2} />
          </linearGradient>
          <radialGradient id={`${id}moon`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="0.35" stopColor={c.glow} stopOpacity="0.35" />
            <stop offset="1" stopColor={c.glow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}screen`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#8b5cff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#8b5cff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.55" stopColor="#a98bff" stopOpacity="0" />
            <stop offset="1" stopColor="#c7b4ff" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`${id}side`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#07061a" stopOpacity="0.78" />
            <stop offset="0.55" stopColor="#07061a" stopOpacity="0.15" />
            <stop offset="1" stopColor="#07061a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#07061a" stopOpacity="0" />
            <stop offset="1" stopColor="#07061a" stopOpacity="1" />
          </linearGradient>
        </defs>

        <rect width="390" height="330" fill={`url(#${id}sky)`} />
        {phase !== 'day' && stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity={s.o * (phase === 'night' ? 1 : 0.4)} />)}
        <circle cx="300" cy="70" r="46" fill={`url(#${id}moon)`} />

        <g className="scene__far">
          {far.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={236 - b.h} width={b.w} height={b.h + 100} fill={c.city} />
              {b.antenna && <rect x={b.x + b.w / 2} y={236 - b.h - 14} width="1.5" height="14" fill={c.city} />}
              {b.windows.map((w, j) => w.on && <rect key={j} x={w.x} y={w.y} width="3" height="4" fill={w.warm ? '#ffc6e8' : '#b9a6ff'} opacity={c.lit * 0.75} />)}
            </g>
          ))}
        </g>
        <g className="scene__near">
          {near.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={262 - b.h} width={b.w} height={b.h + 100} fill={c.city2} />
              {b.windows.map((w, j) => w.on && <rect key={j} x={w.x} y={w.y} width="3" height="4" fill={w.warm ? '#ffd2a6' : '#cdbdff'} opacity={c.lit} />)}
            </g>
          ))}
        </g>

        {rain && (
          <g className="scene__rain" stroke="#c9bcff" strokeOpacity="0.18" strokeWidth="1">
            {Array.from({ length: 40 }, (_, i) => <line key={i} x1={(i * 37) % 390} y1={(i * 53) % 260} x2={(i * 37) % 390 - 4} y2={(i * 53) % 260 + 16} />)}
          </g>
        )}

        {/* window frame */}
        <g fill="#06051a">
          <rect x="0" y="0" width="390" height="7" />
          <rect x="196" y="0" width="5" height="330" opacity="0.92" />
          <rect x="0" y="146" width="390" height="4" opacity="0.85" />
        </g>

        {figure && (
          <g className="scene__room" transform="translate(84 6)">
            {/* monitor glow + monitor */}
            <ellipse cx="300" cy="250" rx="110" ry="60" fill={`url(#${id}screen)`} />
            <rect x="242" y="214" width="122" height="70" rx="5" fill="#0d0a26" stroke="#3a2f7a" strokeWidth="1.5" />
            <rect x="247" y="219" width="112" height="60" rx="3" fill="#160f3d" />
            {Array.from({ length: 26 }, (_, i) => {
              const r = rng(`${seed}:wave`)();
              const h = 4 + Math.abs(Math.sin(i * 0.9 + r * 6)) * 18 + (i % 5 === 0 ? 6 : 0);
              return <rect key={i} x={251 + i * 4} y={249 - h / 2} width="2.2" height={h} rx="1" fill={i % 7 === 3 ? '#4cb6ff' : '#9b74ff'} opacity="0.9" />;
            })}
            <rect x="251" y="226" width="40" height="3" rx="1.5" fill="#4cb6ff" opacity="0.6" />
            <rect x="296" y="226" width="22" height="3" rx="1.5" fill="#9b74ff" opacity="0.5" />
            <rect x="298" y="284" width="10" height="16" fill="#0a0820" />
            {/* desk */}
            <rect x="-120" y="298" width="520" height="40" fill="#08061a" />
            <rect x="-120" y="298" width="520" height="1.5" fill="#6d4dd8" opacity="0.45" />
            {/* figure seen from behind: hood up, headphones on, lit from the monitor */}
            {person && <>
            <g fill="#04030c">
              <path d="M58 340 C62 300 90 272 126 263 C138 260 148 258 156 256 L200 256 C208 258 218 260 230 263 C266 272 292 300 296 340 Z" />
              <path d="M138 226 C132 186 148 152 178 149 C209 146 226 178 221 218 C219 236 212 250 200 258 L156 258 C146 250 140 238 138 226 Z" />
            </g>
            <path d="M156 258 C146 250 140 238 138 226 C134 196 142 170 160 158" fill="none" stroke="#1d1650" strokeWidth="1.2" opacity="0.8" />
            <path d="M139 206 C136 160 222 152 220 204" fill="none" stroke="#0b0920" strokeWidth="6" strokeLinecap="round" />
            <path d="M139 206 C136 160 222 152 220 204" fill="none" stroke="#3a2e7c" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
            <rect x="131" y="196" width="15" height="28" rx="7" fill="#0b0920" stroke="#2d2466" strokeWidth="1" />
            <rect x="213" y="194" width="15" height="28" rx="7" fill="#0d0a26" stroke="#7a5cff" strokeWidth="1.2" />
            <path d="M221 218 C219 236 212 250 200 258" fill="none" stroke={`url(#${id}rim)`} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M205 150 C214 158 222 176 221 196" fill="none" stroke="#a98bff" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M230 263 C266 272 292 300 296 340" fill="none" stroke="#a98bff" strokeOpacity="0.4" strokeWidth="2" />
            </>}
          </g>
        )}
        <rect y="120" width="390" height="210" fill={`url(#${id}side)`} />
        <rect y="230" width="390" height="100" fill={`url(#${id}fade)`} />
      </svg>
    </div>
  );
}

export const NightScene = memo(NightSceneImpl);
