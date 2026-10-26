import { useMemo } from 'react';
import { PATH_BY_KEY, LESSON_BY_KEY, type PathKey } from '../../../shared/catalog/academy';
import { allProgress, pathProgress } from '../../../shared/domain/academy';
import { useStore } from '../../data/store';
import { openLesson, setLessonDone, saveLessonNote, setPathStatus, startPath, startSession } from '../../data/actions';
import { navigate } from '../../app/router';
import { Button, Empty, ScreenHeader } from '../../ui/kit';
import { Icon, type IconName } from '../../ui/Icon';
import { SOURCE_BY_KEY } from '../../../shared/catalog/sources';
import { BOOKS } from '../../../shared/catalog/books';
import { ownedRow } from '../../../shared/domain/library';
import { useEffect, useState } from 'react';
import { toast } from '../../ui/toast';

const PATH_ICON: Record<PathKey, IconName> = { vocal: 'mic', theory: 'music', flow: 'wave', writing: 'pen', analysis: 'headphones' };

const toneVar = (t: number) => ({ '--tone': `var(--tone-${t})` } as React.CSSProperties);

export function AcademyScreen() {
  const snap = useStore((s) => s.snap);
  const prog = useMemo(() => allProgress(snap), [snap]);
  const active = prog.filter((p) => p.state === 'active');
  const reading = snap.books.filter((b) => b.status === 'reading').length;
  const books = snap.books.filter((b) => b.status !== 'dropped').length;
  return (
    <div className="screen learn">
      <header className="learn__head">
        <h1 className="learn__title">Nauka</h1>
        <p className="learn__lead">Opcjonalnie, we własnym tempie. Bez terminów i bez ocen — postęp to lekcje oznaczone przez Ciebie jako zrobione.</p>
      </header>

      {active.length > 0 && (
        <section className="block" aria-labelledby="cont-h">
          <h2 className="block__title" id="cont-h">W toku</h2>
          <div className="continue">
            {active.map((p) => p.next && (
              <button key={p.path.key} className="continue__item" style={toneVar(p.path.tone)} onClick={() => navigate(`/nauka/${p.path.key}/${p.next!.key}`)}>
                <span className="continue__path">{p.path.title} · {p.done}/{p.total}</span>
                <span className="continue__lesson">{p.next.title}</span>
                <span className="continue__meta">ok. {p.next.minutes} min</span>
                <span className="continue__bar" aria-hidden="true"><span style={{ width: `${(p.done / p.total) * 100}%` }} /></span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="block" aria-labelledby="paths-h">
        <h2 className="block__title" id="paths-h">Ścieżki Akademii</h2>
        <ul className="paths">
          {prog.map((p) => (
            <li key={p.path.key}>
              <button className="pathrow" style={toneVar(p.path.tone)} onClick={() => navigate(`/nauka/${p.path.key}`)}>
                <span className="pathrow__glyph" aria-hidden="true"><Icon name={PATH_ICON[p.path.key]} size={20} /></span>
                <span className="pathrow__text">
                  <span className="pathrow__title">{p.path.title}</span>
                  <span className="pathrow__meta">{p.state === 'new' ? `${p.total} lekcji` : p.state === 'paused' ? `wstrzymana · ${p.done}/${p.total}` : p.state === 'done' ? 'ukończona' : `${p.done}/${p.total} lekcji`}</span>
                </span>
                <span className="pathrow__ticks" aria-hidden="true">
                  {p.path.lessons.map((l, i) => <span key={l.key} className={i < p.done ? 'is-on' : ''} />)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="block">
        <button className="pathrow pathrow--books" onClick={() => navigate('/nauka/ksiazki')}>
          <span className="pathrow__glyph" aria-hidden="true"><Icon name="book" size={20} /></span>
          <span className="pathrow__text">
            <span className="pathrow__title">Biblioteka</span>
            <span className="pathrow__meta">{books ? `${books} na półce${reading ? `, ${reading} w trakcie` : ''} · ` : ''}{BOOKS.filter((b) => !b.retired).length} książek o obrazie, języku i wrażliwości</span>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      </section>
    </div>
  );
}

export function PathScreen({ pathKey }: { pathKey: string }) {
  const snap = useStore((s) => s.snap);
  const path = PATH_BY_KEY[pathKey as PathKey];
  if (!path) return <div className="screen"><ScreenHeader title="Nauka" onBack /><Empty title="Nie ma takiej ścieżki." /></div>;
  const p = pathProgress(snap, path.key);
  const related = BOOKS.filter((b) => !b.retired && b.paths.includes(path.key)).slice(0, 4);
  return (
    <div className="screen learn" style={toneVar(path.tone)}>
      <ScreenHeader title={path.title} onBack={() => navigate('/nauka')} />
      <p className="learn__desc">{path.description}</p>
      <div className="pathstate">
        <span className="pathstate__count num">{p.done}<span>/{p.total}</span></span>
        <span className="pathstate__label">{p.state === 'new' ? 'nie zaczęta' : p.state === 'paused' ? 'wstrzymana — postęp zostaje' : p.state === 'done' ? 'ukończona — można wracać' : 'lekcji ukończonych'}</span>
        <div className="pathstate__actions">
          {p.state === 'new' && <Button variant="primary" onClick={() => { startPath(path.key); navigate(`/nauka/${path.key}/${path.lessons[0].key}`); }}>Zacznij ścieżkę</Button>}
          {p.state === 'active' && p.next && <Button variant="primary" onClick={() => navigate(`/nauka/${path.key}/${p.next!.key}`)}>Dalej: lekcja {path.lessons.indexOf(p.next) + 1}</Button>}
          {p.state === 'active' && <Button variant="ghost" onClick={() => { setPathStatus(path.key, 'paused'); toast('Ścieżka wstrzymana. Postęp zostaje.', 'ok'); }}>Wstrzymaj</Button>}
          {p.state === 'paused' && <Button variant="primary" onClick={() => setPathStatus(path.key, 'active')}>Wznów</Button>}
        </div>
      </div>
      <ol className="lessons">
        {path.lessons.map((l, i) => {
          const row = snap.learning.find((r) => r.id === l.key);
          const done = row?.status === 'done';
          return (
            <li key={l.key}>
              <button className={`lessonrow${done ? ' is-done' : ''}${p.next?.key === l.key ? ' is-next' : ''}`} onClick={() => navigate(`/nauka/${path.key}/${l.key}`)}>
                <span className="lessonrow__n num" aria-hidden="true">{done ? <Icon name="check" size={16} strokeWidth={2.4} /> : i + 1}</span>
                <span className="lessonrow__text">
                  <span className="lessonrow__title">{l.title}</span>
                  <span className="lessonrow__sum">{l.summary}</span>
                </span>
                <span className="lessonrow__min num">{l.minutes} min</span>
              </button>
            </li>
          );
        })}
      </ol>
      {related.length > 0 && (
        <section className="block" aria-labelledby="rel-h">
          <h2 className="block__title" id="rel-h">Z biblioteki do tej ścieżki</h2>
          <ul className="shelf">
            {related.map((b) => (
              <li key={b.key}>
                <button className="shelf__item" onClick={() => navigate(`/nauka/ksiazki?b=${b.key}`)}>
                  <span className="shelf__text">
                    <span className="shelf__title">{b.title}</span>
                    <span className="shelf__by">{b.author}{ownedRow(snap, b) ? ' · na półce' : ''}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function LessonScreen({ lessonKey }: { lessonKey: string }) {
  const lesson = LESSON_BY_KEY[lessonKey];
  const row = useStore((s) => s.rows.learning[lessonKey]);
  const [note, setNote] = useState(row?.note ?? '');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  useEffect(() => { if (lesson) openLesson(lesson.key); }, [lesson]);
  useEffect(() => { if (row && note === '' && row.note) setNote(row.note); }, [row]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!lesson) return <div className="screen"><ScreenHeader title="Nauka" onBack /><Empty title="Nie ma takiej lekcji." /></div>;
  const path = PATH_BY_KEY[lesson.path];
  const done = row?.status === 'done';
  const next = path.lessons[lesson.index + 1];
  const toggle = (k: string) => { const n = new Set(checked); if (n.has(k)) n.delete(k); else n.add(k); setChecked(n); };
  return (
    <div className="screen learn lesson" style={toneVar(path.tone)}>
      <ScreenHeader title="" onBack={() => navigate(`/nauka/${path.key}`)} actions={<span className="lesson__crumb">{path.title} · {lesson.index + 1}/{path.lessons.length}</span>} />
      <h1 className="lesson__title">{lesson.title}</h1>
      <p className="lesson__summary">{lesson.summary}</p>
      <div className="lesson__body">
        {lesson.body.map((para, i) => <p key={i}>{para}</p>)}
      </div>
      {lesson.terms && (
        <dl className="terms">
          {lesson.terms.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
        </dl>
      )}
      <h2 className="lesson__h">Praktyka</h2>
      {lesson.practice.map((pr) => (
        <section key={pr.title} className="practice">
          <div className="practice__head">
            <h3>{pr.title}</h3>
            <span className="num">{pr.minutes} min</span>
          </div>
          <ol className="practice__steps">
            {pr.steps.map((s, i) => {
              const k = `${pr.title}:${i}`;
              return (
                <li key={k}>
                  <label className={checked.has(k) ? 'is-done' : ''}>
                    <input type="checkbox" checked={checked.has(k)} onChange={() => toggle(k)} />
                    <span>{s}</span>
                  </label>
                </li>
              );
            })}
          </ol>
          <button className="btn btn--quiet" onClick={() => { startSession({ title: `Nauka: ${lesson.title}`, minutes: Math.max(10, pr.minutes) }); navigate('/sesja'); }}><Icon name="play" size={16} /> Ćwicz z timerem</button>
        </section>
      ))}
      {lesson.safety && <p className="safety"><Icon name="shield" size={18} /> {lesson.safety}</p>}

      <h2 className="lesson__h">Źródła</h2>
      <ul className="sources">
        {lesson.sources.map((k) => {
          const s = SOURCE_BY_KEY[k];
          return (
            <li key={k}>
              <span className={`src-tag${s.verified ? ' is-ok' : ''}`}>{s.verified ? 'sprawdzone' : 'do sprawdzenia'}</span>
              <span className="sources__main">
                {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : <span>{s.title}</span>}
                <span className="sources__by">{s.author}{s.year ? `, ${s.year}` : ''}{s.publisher ? ` · ${s.publisher}` : ''}</span>
                <span className="sources__note">{s.note}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <label className="field lesson__note">
        <span className="field__label">Twoje notatki</span>
        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (row?.note ?? '') && saveLessonNote(lesson.key, note)} maxLength={4000} placeholder="Obserwacje, utwory, które warto przesłuchać, pytania do nauczyciela." />
      </label>

      <div className="lesson__end">
        {done ? (
          <>
            <p className="lesson__done"><Icon name="check" size={18} /> Ukończona{row?.revisits ? ` · powroty: ${row.revisits}` : ''}</p>
            <Button variant="ghost" onClick={() => setLessonDone(lesson.key, false)}>Cofnij oznaczenie</Button>
          </>
        ) : (
          <Button variant="primary" size="lg" block onClick={() => { setLessonDone(lesson.key, true); toast('Lekcja oznaczona jako ukończona.', 'ok'); }}>Oznacz jako ukończoną</Button>
        )}
        {next && <Button variant="secondary" block onClick={() => navigate(`/nauka/${path.key}/${next.key}`)}>Następna: {next.title}</Button>}
        {!next && done && <p className="muted small">To ostatnia lekcja ścieżki. Do każdej można wracać.</p>}
      </div>
    </div>
  );
}

