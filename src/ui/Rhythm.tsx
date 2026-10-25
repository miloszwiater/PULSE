import { useMemo, type ReactNode } from 'react';
import type { DayActivity } from '../../shared/domain/workflow';
import { addDays, weekStart } from '../../shared/time';

/**
 * Rhythm ring — the PULSE signature. Four weeks drawn as the grooves of a
 * record: the outer groove is this week, older weeks lie inward. Each day is
 * an arc; its brightness is the real creative time of that day. Protected
 * days (illness, holiday, day off) are drawn in sand, planned music as a
 * dashed arc. Nothing here is decorative: every mark is a day.
 */
export function RhythmRing({ days, planned, today, size = 248, children, animate = true }: {
  days: DayActivity[];
  planned: Set<string>;
  today: string;
  size?: number;
  children?: ReactNode;
  animate?: boolean;
}) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const ws = weekStart(today);
  const c = size / 2;
  const stroke = size * 0.05;
  const gap = stroke * 0.55;
  const outer = c - stroke / 2 - 2;
  const arcs: ReactNode[] = [];
  for (let w = 0; w < 4; w++) {
    const r = outer - w * (stroke + gap);
    const start = addDays(ws, -7 * w);
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      const a0 = -90 + i * (360 / 7) + 2.6;
      const a1 = -90 + (i + 1) * (360 / 7) - 2.6;
      const d = arcPath(c, c, r, a0, a1);
      const act = byDate.get(date);
      const future = date > today;
      let cls = 'rr__day';
      let style: Record<string, string | number> | undefined;
      if (act?.minutes) {
        cls += ' is-on';
        style = { '--k': Math.min(1, 0.3 + act.minutes / 150).toFixed(2) };
      } else if (act?.protected) cls += ' is-protected';
      else if (future && planned.has(date)) cls += ' is-planned';
      else if (future) cls += ' is-future';
      if (date === today) cls += ' is-today';
      arcs.push(
        <path key={date} d={d} className={cls} strokeWidth={stroke} pathLength={1} style={{ ...style, '--i': w * 7 + i } as React.CSSProperties}>
          <title>{`${date}: ${act?.minutes ? `${act.minutes} min` : act?.protected ? 'dzień chroniony' : planned.has(date) ? 'zaplanowane' : 'bez muzyki'}`}</title>
        </path>,
      );
    }
  }
  const todayIdx = Math.round((Date.parse(today) - Date.parse(ws)) / 864e5);
  const ang = (-90 + (todayIdx + 0.5) * (360 / 7)) * (Math.PI / 180);
  const mr = outer + stroke / 2 + 7;
  return (
    <div className={`rr${animate ? ' rr--animate' : ''}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Rytm ostatnich czterech tygodni: zewnętrzny pierścień to ten tydzień, od poniedziałku u góry, zgodnie z ruchem wskazówek zegara.">
        <circle cx={c} cy={c} r={outer - 4 * (stroke + gap) + stroke / 2 + gap} className="rr__label-disc" />
        {arcs}
        <circle cx={c + mr * Math.cos(ang)} cy={c + mr * Math.sin(ang)} r={3} className="rr__now" />
      </svg>
      <div className="rr__center">{children}</div>
    </div>
  );
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * Session disc: a record that turns while time runs and stops on pause.
 * The arc shows progress towards the chosen length; open sessions fill one
 * lap per hour. The time itself always comes from timestamps.
 */
export function SessionDisc({ seconds, targetMinutes, paused, children }: { seconds: number; targetMinutes: number | null; paused: boolean; children?: ReactNode }) {
  const size = 280;
  const c = size / 2;
  const r = 128;
  const circ = 2 * Math.PI * r;
  const lap = (targetMinutes ?? 60) * 60;
  const frac = targetMinutes ? Math.min(1, seconds / lap) : (seconds % lap) / lap;
  const over = targetMinutes != null && seconds >= lap;
  return (
    <div className={`disc${paused ? ' is-paused' : ''}${over ? ' is-over' : ''}`}>
      <div className="disc__vinyl" aria-hidden="true"><span className="disc__sheen" /><span className="disc__label" /></div>
      <svg className="disc__ring" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={c} cy={c} r={r} className="disc__track" />
        <circle cx={c} cy={c} r={r} className="disc__progress" strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - frac)} transform={`rotate(-90 ${c} ${c})`} />
      </svg>
      <div className="disc__center">{children}</div>
    </div>
  );
}
