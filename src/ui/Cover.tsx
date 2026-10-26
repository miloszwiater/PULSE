import { memo } from 'react';

/**
 * Generated cover art (exercises, projects): seeded abstract waveform in the
 * hue of its area. Replaces stock photos — every item gets its own image.
 */
const HUES: Record<string, [string, string]> = {
  songwriting: ['#8b5cff', '#2a1670'],
  flow: ['#4cb6ff', '#16205a'],
  melody: ['#e58bb7', '#3a1650'],
  production: ['#f2b65a', '#3b1d3c'],
  analysis: ['#49d5a4', '#13304a'],
  default: ['#8b5cff', '#1d1450'],
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function CoverImpl({ seed, tone = 'default', size = 56, radius = 12, label }: { seed: string; tone?: string; size?: number; radius?: number; label?: string }) {
  const [a, b] = HUES[tone] ?? HUES.default;
  const h = hash(seed);
  const id = `cv${h.toString(36)}`;
  const bars = Array.from({ length: 13 }, (_, i) => {
    const v = Math.abs(Math.sin((h % 97) * 0.13 + i * (0.6 + (h % 7) * 0.08)));
    return 6 + v * 34 + ((h >> i) & 1 ? 6 : 0);
  });
  const ang = h % 360;
  return (
    <svg className="cover" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ borderRadius: radius }}>
      <defs>
        <linearGradient id={`${id}g`} gradientTransform={`rotate(${ang % 90} .5 .5)`}>
          <stop offset="0" stopColor={b} />
          <stop offset="1" stopColor="#07061a" />
        </linearGradient>
        <radialGradient id={`${id}r`} cx={0.2 + (h % 60) / 100} cy={0.25} r="0.7">
          <stop offset="0" stopColor={a} stopOpacity="0.75" />
          <stop offset="1" stopColor={a} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${id}g)`} />
      <rect width="64" height="64" fill={`url(#${id}r)`} />
      {bars.map((v, i) => <rect key={i} x={6 + i * 4} y={36 - v / 2} width="2.2" height={v} rx="1.1" fill={i % 4 === 1 ? '#ffffff' : a} opacity={i % 4 === 1 ? 0.75 : 0.9} />)}
      {label && <text x="6" y="58" fontSize="8" fontWeight="700" fill="#fff" opacity="0.85" fontFamily="Bodoni Moda Variable, Georgia, serif">{label}</text>}
    </svg>
  );
}
export const Cover = memo(CoverImpl);

/** Typographic book cover: title set on a coloured board with a spine shadow. */
function BookCoverImpl({ title, author, width = 64 }: { title: string; author: string; width?: number }) {
  const h = hash(title + author);
  const palettes = [['#2b1d6e', '#c9b6ff'], ['#0f3a5a', '#9fd8ff'], ['#4a1a3d', '#ffc1df'], ['#3b2a0f', '#ffd28a'], ['#123b33', '#a6f0d6'], ['#1a1a1a', '#f2efff']];
  const [bg, fg] = palettes[h % palettes.length];
  const words = title.replace(/\(.*?\)/g, '').split(/\s+/).slice(0, 4);
  return (
    <svg className="bookcover" width={width} height={width * 1.45} viewBox="0 0 64 93" aria-hidden="true">
      <rect width="64" height="93" rx="3" fill={bg} />
      <rect width="5" height="93" fill="#000" opacity="0.28" />
      <rect x="5" width="1" height="93" fill="#fff" opacity="0.08" />
      {words.map((w, i) => (
        <text key={i} x="10" y={18 + i * 11} fontSize={w.length > 8 ? 6.2 : w.length > 6 ? 7.4 : 9} fontWeight="700" fill={fg} fontFamily="Bodoni Moda Variable, Georgia, serif" letterSpacing="-0.2">{w}</text>
      ))}
      <rect x="10" y="68" width="22" height="1.5" fill={fg} opacity="0.6" />
      <text x="10" y="82" fontSize="5.5" fill={fg} opacity="0.85" fontFamily="Onest Variable, sans-serif">{author.split(' ').slice(-1)[0]}</text>
    </svg>
  );
}
export const BookCover = memo(BookCoverImpl);
