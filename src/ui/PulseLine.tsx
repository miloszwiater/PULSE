import { WD_SHORT } from './format';

export interface PulseDay {
  date: string;
  minutes: number;
  planned: number;
  protectedDay: boolean;
}

const W = 700;
const BASE = 58;
const STEP = 100;

function amp(minutes: number) {
  if (minutes <= 0) return 0;
  return Math.min(44, 12 + (minutes / 180) * 32);
}

/** The week as a heartbeat: each spike is real creative time logged that day. */
export function PulseLine({ days, today, animate = true }: { days: PulseDay[]; today: string; animate?: boolean }) {
  let d = `M0 ${BASE}`;
  const ghosts: string[] = [];
  days.forEach((day, i) => {
    const x = 50 + i * STEP;
    const a = amp(day.minutes);
    if (a > 0) {
      d += ` L${x - 26} ${BASE} L${x - 16} ${BASE + 5} L${x - 6} ${BASE - a} L${x + 5} ${BASE + a * 0.38} L${x + 14} ${BASE}`;
    } else {
      d += ` L${x + 14} ${BASE}`;
    }
    if (day.planned > 0 && day.date >= today && day.minutes === 0) {
      const g = amp(day.planned) * 0.75;
      ghosts.push(`M${x - 26} ${BASE} L${x - 16} ${BASE + 4} L${x - 6} ${BASE - g} L${x + 5} ${BASE + g * 0.35} L${x + 14} ${BASE}`);
    }
  });
  d += ` L${W} ${BASE}`;
  const ti = days.findIndex((x) => x.date === today);
  const label = days.map((x, i) => `${WD_SHORT[i]}: ${x.minutes ? `${x.minutes} min` : 'brak'}${x.planned && !x.minutes ? `, zaplanowane ${x.planned} min` : ''}`).join('; ');
  return (
    <figure className="pulse" aria-label={`Rytm tygodnia. ${label}`}>
      <div className="pulse__plot">
      <svg viewBox={`0 0 ${W} 110`} preserveAspectRatio="none" className="pulse__svg" role="img" aria-hidden="true">
        {days.map((day, i) => day.protectedDay && (
          <rect key={day.date} x={i * STEP + 2} y={10} width={STEP - 4} height={74} rx={10} className="pulse__protected" />
        ))}
        <line x1="0" x2={W} y1={BASE} y2={BASE} className="pulse__base" />
        {ghosts.map((g, i) => <path key={i} d={g} className="pulse__ghost" />)}
        <path d={d} className={`pulse__trace${animate ? ' is-drawing' : ''}`} pathLength={1} />
      </svg>
      {ti >= 0 && <span className="pulse__now" style={{ left: `${((50 + ti * STEP + 26) / W) * 100}%`, top: `${(BASE / 110) * 100}%` }} />}
      </div>
      <figcaption className="pulse__days">
        {days.map((day, i) => (
          <span key={day.date} className={`pulse__day${day.date === today ? ' is-today' : ''}${day.date > today ? ' is-future' : ''}`}>
            <span>{WD_SHORT[i]}</span>
            <span className="pulse__min num">{day.minutes ? `${day.minutes >= 60 ? `${Math.floor(day.minutes / 60)}h${day.minutes % 60 ? String(day.minutes % 60).padStart(2, '0') : ''}` : `${day.minutes}m`}` : day.protectedDay ? '—' : '·'}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
