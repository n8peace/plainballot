'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Interpretation } from '@/lib/ai/interpret';
import type { Importance, IssueId, Position } from '@/lib/issues';
import { picksFor } from '@/lib/match';
import { decodePrefs, encodePrefs, GITHUB_URL, researchIssueUrl, X_URL } from '@/lib/share';
import type { Ballot, Prefs } from '@/lib/types';
import { AddressInput } from './AddressInput';
import { ComparePanel } from './ComparePanel';
import { ContestCard } from './ContestCard';
import { Dials } from './Dials';
import { IssuePicker } from './IssuePicker';
import { SharePanel } from './SharePanel';
import { WordsInput } from './WordsInput';

const EMPTY: Prefs = { sel: [], pos: {}, imp: {} };
const STORE_KEY = 'pb:prefs';

function daysUntil(date: string): number | null {
  if (!date) return null;
  const d = Math.ceil((new Date(`${date}T07:00:00`).getTime() - Date.now()) / 864e5);
  return d > 0 ? d : null;
}

function longDate(date: string) {
  return date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';
}

export function BallotApp({ initialBallot, friend = null }: { initialBallot: Ballot; friend?: Prefs | null }) {
  const [ballot, setBallot] = useState(initialBallot);
  const [prefs, setPrefs] = useState<Prefs>(EMPTY);
  const [tab, setTab] = useState<'words' | 'dials'>('words');
  const [flash, setFlash] = useState<IssueId | null>(null);
  const [showParty, setShowParty] = useState(false);
  const [address, setAddress] = useState('');
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [days, setDays] = useState<number | null>(null);
  const [jump, setJump] = useState(false);
  const [showCompare, setShowCompare] = useState(!!friend);
  const dialsRef = useRef<HTMLElement>(null);
  const ballotRef = useRef<HTMLElement>(null);

  // Restore answers from a ?p= link or from this device. Nothing leaves the browser.
  useEffect(() => {
    const fromUrl = decodePrefs(new URLSearchParams(location.search).get('p'));
    let saved: Prefs | null = null;
    try { saved = decodePrefs(localStorage.getItem(STORE_KEY)); } catch {}
    const restored = fromUrl ?? saved;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from browser-only storage
    if (restored) { setPrefs(restored); setTab('dials'); }
    setDays(daysUntil(initialBallot.electionDate));
  }, [initialBallot.electionDate]);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, encodePrefs(prefs)); } catch {}
  }, [prefs]);

  // Phone: while the dials are on screen and the ballot isn't, offer a jump to it.
  useEffect(() => {
    if (!('IntersectionObserver' in window) || !dialsRef.current || !ballotRef.current) return;
    const seen = { dials: false, ballot: false };
    const sync = () => setJump(seen.dials && !seen.ballot);
    const a = new IntersectionObserver(([e]) => { seen.dials = e.isIntersecting; sync(); });
    const b = new IntersectionObserver(([e]) => { seen.ballot = e.isIntersecting; sync(); }, { rootMargin: '0px 0px -40% 0px' });
    a.observe(dialsRef.current);
    b.observe(ballotRef.current);
    return () => { a.disconnect(); b.disconnect(); };
  }, []);

  const countFor = useMemo(() => {
    const counts = new Map<IssueId, number>();
    for (const c of ballot.contests) for (const id of c.issues) counts.set(id, (counts.get(id) ?? 0) + 1);
    return (id: IssueId) => counts.get(id) ?? 0;
  }, [ballot]);

  const picks = useMemo(() => picksFor(ballot.contests, prefs), [ballot, prefs]);

  const addIssue = (id: IssueId) => {
    setPrefs((p) => (p.sel.includes(id) ? p : { sel: [...p.sel, id], pos: { ...p.pos, [id]: p.pos[id] ?? 0 }, imp: { ...p.imp, [id]: p.imp[id] ?? 'medium' } }));
    setFlash(id);
  };
  const removeIssue = (id: IssueId) => setPrefs((p) => ({ ...p, sel: p.sel.filter((x) => x !== id) }));
  const setPos = (id: IssueId, v: Position) => setPrefs((p) => ({ ...p, pos: { ...p.pos, [id]: v } }));
  const setImp = (id: IssueId, v: Importance) => setPrefs((p) => ({ ...p, imp: { ...p.imp, [id]: v } }));

  const addFromBallot = (id: IssueId) => {
    addIssue(id);
    setTab('dials');
    requestAnimationFrame(() => document.getElementById(`dial-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const applyInterpretation = (r: Interpretation) => {
    setPrefs((p) => {
      const next: Prefs = { sel: [...p.sel], pos: { ...p.pos }, imp: { ...p.imp } };
      for (const d of r.dials) {
        if (!next.sel.includes(d.issue)) next.sel.push(d.issue);
        next.pos[d.issue] = d.position;
        next.imp[d.issue] = d.importance;
      }
      return next;
    });
  };

  const lookup = async (e?: React.FormEvent, addr = address) => {
    e?.preventDefault();
    if (addr.trim().length < 5) return;
    setLooking(true);
    setLookupError('');
    try {
      const res = await fetch(`/api/ballot?address=${encodeURIComponent(addr)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Ballot lookup failed.');
      setBallot(data);
      setDays(daysUntil(data.electionDate));
    } catch (err) {
      setLookupError((err as Error).message);
    } finally {
      setLooking(false);
    }
  };

  const researched = ballot.contests.filter((c) => c.researched).length;

  return (
    <>
      <div className="wrap">
        {ballot.notice && <p className="mock-note">{ballot.notice}</p>}

        <header className="mast">
          <div className="mast-top">
            <span>{ballot.electionName}{ballot.electionDate ? ` · ${longDate(ballot.electionDate)}` : ''}</span>
            <span>{days !== null && <><b>{days} {days === 1 ? 'day' : 'days'}</b> to go · </>}Free. No account. No ads.</span>
          </div>
          <h1 className="wordmark">Plain Ballot</h1>
          <div className="mast-sub">Your ballot, matched to your priorities</div>
        </header>
        <hr className="double" />

        <section className="hero">
          <h2>Every race on your ballot, matched to what you care about. We show our work.</h2>
          <p>Tell us your priorities in your own words, or pick the issues you care about and set the dials. We’ll go through your whole ballot, from Congress to school board, and show why each choice fits you better than the others. <em>We don’t take sides. You do.</em></p>
        </section>

        <section className="step" aria-labelledby="s1">
          <div className="step-head"><span className="step-num">1</span><h3 id="s1">Where you vote</h3></div>
          <form className="addr" onSubmit={lookup}>
            <div className="field">
              <label className="label" htmlFor="address">Street address and ZIP code</label>
              <AddressInput value={address} onChange={setAddress} onPick={(a) => lookup(undefined, a)} />
            </div>
            <button className="btn" type="submit" disabled={looking || address.trim().length < 5}>{looking ? 'Finding…' : 'Find my ballot'}</button>
          </form>
          {lookupError && <p className="err" role="alert">{lookupError}</p>}
          <p className="notice" style={{ marginTop: 12 }}>
            {ballot.sample
              ? <>Showing a <b>sample ballot</b>{address ? ' for now' : ' until you enter your address'}. Your address is only used to look up your ballot and isn’t stored.</>
              : <>We found <b>{ballot.contests.length} contests</b> on your ballot{ballot.place ? ` in ${ballot.place}` : ''}. {researched < ballot.contests.length && <>We’ve researched {researched} so far.</>}</>}
          </p>
          {ballot.districts && ballot.districts.length > 0 && (
            <div className="districts">
              <span className="label">Your districts</span>
              <ul>{ballot.districts.map((d) => <li key={d.key}>{d.label}</li>)}</ul>
              {ballot.needsResearch && (
                <p className="research-cta">
                  None of your races are researched yet. Help put your area on the map: pick one race and research it in about 20 minutes, no coding needed.{' '}
                  <a className="btn small" href={researchIssueUrl({ place: ballot.districts.find((d) => d.key.endsWith('/state'))?.label })} target="_blank" rel="noopener noreferrer">Research a race here</a>
                </p>
              )}
            </div>
          )}
        </section>

        <section className="step" aria-labelledby="s2" ref={dialsRef}>
          <div className="step-head"><span className="step-num">2</span><h3 id="s2">What you care about</h3><span className="aside">Change anything. Your ballot updates as you go.</span></div>
          {friend && showCompare && (
            <ComparePanel mine={prefs} theirs={friend} onAdd={addFromBallot} onClose={() => setShowCompare(false)} />
          )}
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'words'} onClick={() => setTab('words')}>In your own words</button>
            <button role="tab" aria-selected={tab === 'dials'} onClick={() => setTab('dials')}>Pick issues and set dials</button>
          </div>
          <div hidden={tab !== 'words'}>
            <WordsInput onApply={applyInterpretation} onDone={() => setTab('dials')} />
          </div>
          <div hidden={tab !== 'dials'}>
            <IssuePicker selected={prefs.sel} countFor={countFor} onToggle={(id) => (prefs.sel.includes(id) ? removeIssue(id) : addIssue(id))} />
            <Dials prefs={prefs} flash={flash} countFor={countFor} onPosition={setPos} onImportance={setImp} onRemove={removeIssue} />
            <p className="hint" style={{ marginTop: 14 }}>The dials aren’t lined up left to right by party. Each one stands on its own, and each end is worded the way its own supporters would say it.</p>
          </div>
        </section>

        <section className="step" aria-labelledby="s3" ref={ballotRef}>
          <div className="step-head"><span className="step-num">3</span><h3 id="s3">Your ballot</h3></div>
          <div className="ballot-tools">
            <label className="switch"><input type="checkbox" id="showParty" checked={showParty} onChange={(e) => setShowParty(e.target.checked)} /> Show party labels</label>
            <span className="hint">Hidden by default, so you see the issues before the party.</span>
          </div>
          {ballot.contests.map((c) => (
            <ContestCard key={c.id} contest={c} prefs={prefs} showParty={showParty} place={ballot.place} onAdd={addFromBallot} />
          ))}
        </section>

        <section className="step" aria-labelledby="s4">
          <div className="step-head"><span className="step-num">4</span><h3 id="s4">Send it to a friend</h3></div>
          <SharePanel picks={picks} prefs={prefs} electionDate={ballot.electionDate} />
        </section>

        <section className="ask" aria-labelledby="askH">
          <div>
            <h3 id="askH">Free, and open source.</h3>
            <p>No ads, no account, no data sold. Every line of code, every dial’s wording and every source is public, so anyone can check our work. If this helped, the only thing we ask is a star or a follow.</p>
          </div>
          <div className="ask-btns">
            <a className="btn" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">★ Star the code on GitHub</a>
            <a className="btn ghost" href={X_URL} target="_blank" rel="noopener noreferrer">Follow @n8peace on X</a>
          </div>
        </section>

        <section className="step" aria-labelledby="s5">
          <div className="step-head"><h3 id="s5">How we stay fair</h3></div>
          <div className="principles">
            <div><h4>No opinions of our own</h4><p>Every match comes from the issues you pick and the dials you set. Two people with the same answers get the same ballot.</p></div>
            <div><h4>Every claim has a source</h4><p>Votes, rulings, questionnaires and public statements, each linked. A person checks every claim before it’s published.</p></div>
            <div><h4>We say when we don’t know</h4><p>If a candidate hasn’t taken a position, we leave that issue out rather than guess, and tell you we did.</p></div>
            <div><h4>Judges are matched on the record only</h4><p>Judges can’t promise how they’ll rule, so we use what they’ve already done: written opinions and sentencing data.</p></div>
          </div>
        </section>

        <footer>
          <span>Plain Ballot · Nonpartisan · Free</span>
          <span><a href={GITHUB_URL}>Open source</a> · <Link href="/methodology">Methodology</Link> · <a href={`${GITHUB_URL}/issues`}>Report a problem</a></span>
        </footer>
      </div>
      <div className={`jump ${jump ? 'on' : ''}`} aria-hidden={!jump}>
        <span><b>{prefs.sel.length} issues</b> · {picks.filter((p) => p.pick).length} of {picks.length} contests matched</span>
        <a href="#s3" tabIndex={jump ? 0 : -1}>See my ballot</a>
      </div>
    </>
  );
}
