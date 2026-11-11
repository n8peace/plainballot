'use client';

// The front page's signature: a paper sample ballot that fills itself in. Each candidate's
// oval is marked in pencil where their record puts them on one issue, and the quote behind
// that mark appears under it. The last row is the visitor's: mark an oval and each candidate
// shows how closely they fit, using the same arithmetic as the real ballot (lib/match.ts).
// The ballot is the fictional sample, and says so. Plays once; Reduce Motion shows it filled.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { issueById, readout, type IssueId, type Position } from '@/lib/issues';
import { score } from '@/lib/match';
import { sampleSource } from '@/lib/ballot/sample';
import type { Ballot, Contest, Prefs } from '@/lib/types';

const SPOTS: Position[] = [-2, -1, 0, 1, 2];
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The races the ballot shows, each on one issue. */
export const HERO_RACES: [string, IssueId][] = [['us-house-7', 'tax'], ['state-senate-14', 'housing']];

type Row = { key: string; race: Contest; issue: IssueId; choiceId: string };

/** Which hand-filled oval drawing a mark uses: stable per row, so no two neighbors match. */
const drawing = (n: number) => (n * 3) % 8;

/** "Strongly for lower taxes", "Lean toward more services", "Neither side". */
function sideWords(id: IssueId, p: Position) {
  const i = issueById[id];
  if (p === 0) return 'Neither side';
  return `${Math.abs(p) === 2 ? 'Strongly for' : 'Leans toward'} ${p < 0 ? i.l : i.r}`;
}

/** Layout offset of el inside root (ignores the sheet's tilt, unlike getBoundingClientRect). */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = el.offsetWidth / 2;
  let y = el.offsetHeight / 2;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

export function BallotHero({ sample, onOpen }: { sample: Ballot; onOpen: (race?: string) => void }) {
  const races = useMemo(
    () => HERO_RACES.flatMap(([id, issue]) => {
      const race = sample.contests.find((c) => c.id === id);
      return race ? [{ race, issue, choices: race.choices.filter((c) => c.stances[issue]?.quote) }] : [];
    }),
    [sample],
  );
  const rows: Row[] = useMemo(
    () => races.flatMap(({ race, issue, choices }) => choices.map((c) => ({ key: `${race.id}/${c.id}`, race, issue, choiceId: c.id }))),
    [races],
  );

  // How many rows are marked so far; all of them once played.
  const [marked, setMarked] = useState(0);
  const [pen, setPen] = useState<{ x: number; y: number; writing: boolean; rest?: boolean } | null>(null);
  const [mine, setMine] = useState<Position | undefined>(undefined);
  const sheet = useRef<HTMLDivElement>(null);
  const ovals = useRef(new Map<string, HTMLElement>());
  const rest = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);

  const finish = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMarked(Infinity);
    const s = sheet.current;
    if (s && rest.current) setPen({ ...offsetIn(rest.current, s), writing: false, rest: true });
  }, []);

  // The pencil rests by the visitor's row; place it before first paint so it never jumps.
  useLayoutEffect(() => {
    const s = sheet.current;
    if (s && rest.current) setPen({ ...offsetIn(rest.current, s), writing: false, rest: true });
  }, []);

  // Play once, when the ballot is on screen. Touching it ends the play at the filled-in state.
  useEffect(() => {
    // Reduce Motion: the CSS already shows the filled-in ballot; this only catches the state up.
    if (reduced()) { const id = requestAnimationFrame(finish); return () => cancelAnimationFrame(id); }
    const s = sheet.current;
    if (!s) return;
    const at = (fn: () => void, t: number) => timers.current.push(window.setTimeout(fn, t));
    const play = () => {
      let t = 300;
      rows.forEach((r, n) => {
        const el = ovals.current.get(r.key);
        if (!el) return;
        at(() => setPen({ ...offsetIn(el, s), writing: false }), t);
        at(() => setPen((p) => p && { ...p, writing: true }), t + 380);
        at(() => setMarked(n + 1), t + 400);
        t += 820;
      });
      at(finish, t + 100);
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); play(); } }, { rootMargin: '0px 0px -15% 0px' });
    io.observe(s);
    // Re-place the resting pencil if the layout changes size.
    const onResize = () => { if (rest.current && sheet.current) setPen((p) => (p?.rest ? { ...offsetIn(rest.current!, sheet.current!), writing: false, rest: true } : p)); };
    window.addEventListener('resize', onResize);
    const all = timers.current;
    return () => { io.disconnect(); all.forEach(clearTimeout); window.removeEventListener('resize', onResize); };
  }, [rows, finish]);

  // The visitor's mark: fit per candidate from lib/match.ts, only once a side is set.
  const fits = useMemo(() => {
    const out = new Map<string, number | null>();
    if (mine === undefined) return out;
    const [first] = races;
    if (!first) return out;
    const prefs: Prefs = { sel: [first.issue], pos: { [first.issue]: mine }, imp: { [first.issue]: 'medium' } };
    for (const c of first.choices) out.set(c.id, score(c, first.race, prefs).match);
    return out;
  }, [mine, races]);
  const top = Math.max(...[...fits.values()].map((v) => v ?? -1));
  const tiedTop = [...fits.values()].filter((v) => v === top).length > 1;

  const title = (
    <div className="bh-titles">
      <p className="bh-title">Sample ballot</p>
      <p className="bh-sub"><strong className="bh-fict">Fictional candidates.</strong> General Election, November 3, 2026. <button type="button" className="bh-more" onClick={() => onOpen()}>See the whole sample</button></p>
    </div>
  );
  let n = 0;
  return (
    <div className="bh-sheet" ref={sheet} onPointerDown={finish} onFocusCapture={finish}>
      <div className="bh-stub">{title}</div>
      <div className="bh-ballot">
        {races.map(({ race, issue, choices }, ri) => {
          const info = issueById[issue];
          return (
            <section className="bh-race" key={race.id} aria-label={`${race.office}, ${info.name}`}>
              <h3 className="bh-office"><span>{race.office}</span> <span>{race.sub.split(' · ')[0]}</span></h3>
              <div className="bh-scale" aria-hidden="true">
                <span className="bh-issue">{info.name}</span>
                <span className="bh-ends"><span>{info.l}</span><span>neither</span><span>{info.r}</span></span>
              </div>
              <ol className="bh-rows">
                {choices.map((c) => {
                  const i = n++;
                  const key = `${race.id}/${c.id}`;
                  const s = c.stances[issue]!;
                  const on = i < marked;
                  const fit = ri === 0 ? fits.get(c.id) : undefined;
                  return (
                    <li key={c.id} className="bh-row" data-on={on}>
                      <span className="bh-name">{c.name}{fit != null && <span className="bh-fit">{fit}% fit{tiedTop && fit === top ? ', tied' : ''}</span>}</span>
                      <span className="bh-ovals" role="img" aria-label={`${c.name}: ${sideWords(issue, s.pos)}`}>
                        {SPOTS.map((p) => (
                          <span key={p} className="bh-oval" ref={p === s.pos ? (el) => { if (el) ovals.current.set(key, el); else ovals.current.delete(key); } : undefined}>
                            {p === s.pos && <i style={{ '--d': drawing(i) } as React.CSSProperties} />}
                          </span>
                        ))}
                      </span>
                      <blockquote className="bh-quote">
                        <p>“{s.quote}”</p>
                        <cite>{sampleSource(c.id, issue)}</cite>
                      </blockquote>
                    </li>
                  );
                })}
                {ri === 0 && (
                  <li className="bh-row bh-you" data-on="true">
                    <span className="bh-name">You</span>
                    <span className="bh-ovals" role="radiogroup" aria-label={`Where you stand on ${info.name.toLowerCase()}`}>
                      {SPOTS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          role="radio"
                          aria-checked={mine === p}
                          aria-label={readout(info, p)}
                          className="bh-oval"
                          onClick={() => setMine(mine === p ? undefined : p)}
                        >
                          {mine === p && <i style={{ '--d': 5 } as React.CSSProperties} />}
                        </button>
                      ))}
                    </span>
                    <span className="bh-rest" ref={rest} aria-hidden="true" />
                    <span className="bh-hint" aria-live="polite">{mine === undefined ? 'Mark where you stand to see who fits.' : 'Fit is how close each candidate is to your mark.'}</span>
                  </li>
                )}
              </ol>
            </section>
          );
        })}
        <div className="bh-also">
          <p>Also on this sample ballot</p>
          <ul>
            {sample.contests.filter((c) => !HERO_RACES.some(([id]) => id === c.id)).map((c) => (
              <li key={c.id}><button type="button" onClick={() => onOpen(c.id)}>{c.office}</button></li>
            ))}
          </ul>
        </div>
      </div>
      {pen && <span className="bh-pencil" data-writing={pen.writing} data-rest={!!pen.rest} aria-hidden="true" style={{ '--x': `${pen.x}px`, '--y': `${pen.y}px` } as React.CSSProperties}><i /></span>}
    </div>
  );
}
