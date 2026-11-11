'use client';

// The front page's lead: one race from the fictional sample ballot, working. The candidates
// stand on one issue's dial where their record puts them. The voter's own marker slides along
// it, and the race re-sorts by fit using the same arithmetic as the real ballot (lib/match.ts).
// Any candidate opens to the quote and source behind their position.
// On load it plays once: the voter's marker walks from one end to the other and settles in the
// middle, then one quote opens. Touching anything stops it. Reduce Motion shows the settled state.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { issueById, readout, type IssueId, type Position } from '@/lib/issues';
import { rank } from '@/lib/match';
import type { Contest, Prefs, Stance } from '@/lib/types';

/** "Lower taxes", "Strongly for lower taxes" or "Neither side". */
export function sideOf(id: IssueId, s: Stance): { label: string; strong: boolean } {
  const i = issueById[id];
  if (s.pos === 0) return { label: 'Neither side', strong: false };
  const side = s.pos < 0 ? i.l : i.r;
  return { label: side[0].toUpperCase() + side.slice(1), strong: Math.abs(s.pos) === 2 };
}

// The walk: both ends get the same time, then it rests on neither side.
const WALK: [Position, number][] = [[-2, 1700], [-1, 900], [0, 900], [1, 900], [2, 1700], [1, 700], [0, 1300]];
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const at = (p: number) => `${(p + 2) * 25}%`;

/** A fit figure that rolls to its new value. */
function Fit({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || reduced()) { from.current = value; setShown(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 480);
      const v = Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3)));
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown}</>;
}

function Side({ id, s }: { id: IssueId; s: Stance }) {
  const side = sideOf(id, s);
  return side.strong ? <><i>Strongly</i> for {side.label.toLowerCase()}</> : <>{side.label}</>;
}

/** "You: lean lower taxes", "You: no strong view". */
function you(id: IssueId, v: Position) {
  const i = issueById[id];
  if (v === 0) return 'You: no strong view';
  return `You: ${Math.abs(v) === 2 ? 'strongly' : 'lean'} ${v < 0 ? i.l : i.r}`;
}

export function LiveRace({ contest, issue, note }: { contest: Contest; issue: IssueId; note: React.ReactNode }) {
  const [pos, setPos] = useState<Position | undefined>(undefined);
  const [open, setOpen] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const played = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<string, HTMLElement>());
  const spots = useRef(new Map<string, number>());
  const info = issueById[issue];
  // The race as matching sees it, limited to choices with a sourced position on this issue.
  const race = useMemo(() => ({ ...contest, choices: contest.choices.filter((c) => c.stances[issue]) }), [contest, issue]);

  const prefs: Prefs = useMemo(
    () => ({ sel: [issue], pos: pos === undefined ? {} : { [issue]: pos }, imp: { [issue]: 'medium' } }),
    [issue, pos],
  );
  // No side set, no fit: the race stays in ballot order with no figures.
  const ranked = useMemo(
    () => (pos === undefined ? race.choices.map((choice) => ({ choice, fit: null as number | null })) : rank(race, prefs).map((r) => ({ choice: r.choice, fit: r.score.match }))),
    [race, prefs, pos],
  );
  const leads = ranked.length > 1 && ranked[0].fit !== null && ranked[0].fit > (ranked[1].fit ?? -1);
  const order = ranked.map((r) => r.choice.id).join(',');

  const stop = useCallback(() => {
    played.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Settled state: neither side, and the closest candidate's quote open.
  const settle = useCallback(() => {
    setPos(0);
    setOpen(rank(race, { sel: [issue], pos: { [issue]: 0 }, imp: { [issue]: 'medium' } })[0].choice.id);
  }, [race, issue]);

  // Play once, when the race is on screen. If the walk is cut short by an unmount (or a
  // dev-mode remount), it may play again; a visitor's touch ends it for good.
  const settleRef = useRef(settle);
  useEffect(() => { settleRef.current = settle; }, [settle]);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (reduced()) { played.current = true; settleRef.current(); return; }
    let mine: number[] = [];
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || played.current) return;
      played.current = true;
      io.disconnect();
      let t = 700;
      for (const [p, hold] of WALK) {
        mine.push(window.setTimeout(() => setPos(p), t));
        t += hold;
      }
      mine.push(window.setTimeout(() => { settleRef.current(); mine = []; }, t - 500));
      timers.current = mine;
    }, { threshold: 0.3 });
    io.observe(el);
    return () => {
      io.disconnect();
      if (mine.length) { mine.forEach(clearTimeout); played.current = false; }
    };
  }, []);

  // Rows glide to their new place when the order changes (measure, invert, play).
  // Layout offsets, not screen rects, so scrolling and running animations don't skew them.
  useLayoutEffect(() => {
    const still = reduced();
    for (const [id, el] of rows.current) {
      const now = el.offsetTop;
      const was = spots.current.get(id);
      spots.current.set(id, now);
      if (was === undefined || still || Math.abs(was - now) < 1) continue;
      el.animate([{ transform: `translateY(${was - now}px)` }, { transform: 'none' }], { duration: 640, easing: EASE });
    }
  }, [order]);
  useEffect(() => {
    const remeasure = () => { for (const [id, el] of rows.current) spots.current.set(id, el.offsetTop); };
    window.addEventListener('resize', remeasure);
    return () => window.removeEventListener('resize', remeasure);
  }, []);

  const toggle = (id: string) => setOpen(open === id ? null : id);
  const summary = pos === undefined ? 'No side set, so no fit is shown.' : ranked.map((r) => `${r.choice.name} ${r.fit}%`).join(', ');

  return (
    <div className="lr" ref={root} onPointerDown={stop} onKeyDown={stop} onFocusCapture={stop}>
      <div className="lr-head">
        <h2 className="lr-office">{contest.office} <span>{contest.sub.split(' · ')[0]}</span></h2>
        <p className="lr-sample">{note}</p>
      </div>

      {/* Where they stand: each candidate on the dial, and the voter's own marker. */}
      <div className="lr-stand" data-set={pos !== undefined}>
        <div className="lr-stand-top">
          <label htmlFor="lr-pos" className="lr-issue">{info.name}</label>
          <span className="lr-read" aria-hidden="true">{pos === undefined ? 'Slide to set where you stand' : you(issue, pos)}</span>
        </div>
        <div className="lr-scale">
          {race.choices.map((c) => {
            const p = c.stances[issue]!.pos;
            return (
              <button
                key={c.id}
                className="lr-mark"
                data-anchor={p === -2 ? 'start' : p === 2 ? 'end' : 'center'}
                aria-expanded={open === c.id}
                aria-controls="lr-quote"
                style={{ '--x': at(p) } as React.CSSProperties}
                onClick={() => toggle(c.id)}
              >
                <span className="lr-mark-name">{c.name}</span>
                <span className="lr-mark-side"><Side id={issue} s={c.stances[issue]!} /></span>
              </button>
            );
          })}
          <div className="lr-line" aria-hidden="true">
            <i /><i /><i /><i /><i />
            {race.choices.map((c) => <b key={c.id} style={{ '--x': at(c.stances[issue]!.pos) } as React.CSSProperties} />)}
          </div>
          <span className="lr-you" aria-hidden="true" style={{ '--x': at(pos ?? 0) } as React.CSSProperties}><span>You</span></span>
          <input
            id="lr-pos"
            type="range"
            min={-2}
            max={2}
            step={1}
            value={pos ?? 0}
            aria-valuetext={pos === undefined ? 'Not set' : readout(info, pos)}
            onChange={(e) => setPos(Number(e.target.value) as Position)}
            onPointerUp={() => pos === undefined && setPos(0)}
          />
        </div>
        <div className="lr-poles" aria-hidden="true"><span>{info.left}</span><span>{info.right}</span></div>
      </div>

      <div className="lr-body">
        <p className="pp-sr" aria-live="polite">{summary}</p>
        <ol className="lr-rank" aria-label={`${contest.office} candidates, closest fit to you first`}>
          {race.choices.map((choice) => {
            const n = ranked.findIndex((r) => r.choice.id === choice.id);
            const fit = ranked[n].fit;
            const tied = fit !== null && !leads && fit === ranked[0].fit;
            return (
              <li
                key={choice.id}
                ref={(el) => { if (el) rows.current.set(choice.id, el); else rows.current.delete(choice.id); }}
                className={`lr-row${leads && n === 0 ? ' top' : ''}`}
                style={{ order: n }}
              >
                <span className="lr-fit">
                  {fit === null ? <span className="lr-nofit">No fit yet</span> : <><b><Fit value={fit} /></b><span>% fit{tied ? ', tied' : ''}</span></>}
                </span>
                <button className="lr-name" aria-expanded={open === choice.id} aria-controls="lr-quote" onClick={() => toggle(choice.id)}>
                  {choice.name}<span className="pp-sr">, {info.name}: <Side id={issue} s={choice.stances[issue]!} /></span>
                </button>
                <span className="lr-bar" aria-hidden="true"><i style={{ '--f': (fit ?? 0) / 100 } as React.CSSProperties} /></span>
              </li>
            );
          })}
        </ol>

        {/* Every quote sits in one cell, so the box is always as tall as the longest: opening one never moves the page. */}
        <div className="lr-quote" id="lr-quote">
          <p className="lr-hint" data-on={!open}>Tap a candidate to read the quote behind their position.</p>
          {race.choices.filter((c) => c.stances[issue]!.quote).map((c) => {
            const s = c.stances[issue]!;
            const on = open === c.id;
            return (
              <figure key={c.id} className="lr-q" data-on={on} aria-hidden={!on}>
                <blockquote>“{s.quote}”</blockquote>
                <figcaption><b>{c.name}</b>, {s.source}</figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </div>
  );
}
