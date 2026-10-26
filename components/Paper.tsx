'use client';

// The newspaper edition of Plain Ballot: one question on the front page (your address),
// then your whole ballot as a front page. Each race is a story: the office as the
// headline, the candidates side by side, and one row per issue saying where each stands,
// with the quote and source a tap away. Matching is optional ("Personalize").

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AddressInput } from './AddressInput';
import { Dials } from './Dials';
import { IssuePicker } from './IssuePicker';
import { ReportForm } from './ReportForm';
import { WordsInput } from './WordsInput';
import { issueById, ISSUES, type Importance, type IssueId, type Position } from '@/lib/issues';
import { rank, score } from '@/lib/match';
import { DATA_REPO_URL, GITHUB_URL, stateResearchUrl, X_URL } from '@/lib/share';
import type { Interpretation } from '@/lib/ai/interpret';
import type { Ballot, Choice, Contest, Prefs, Stance } from '@/lib/types';

const ELECTION = new Date('2026-11-03T12:00:00');

function daysToGo(): number {
  return Math.max(0, Math.ceil((ELECTION.getTime() - Date.now()) / 86_400_000));
}

/** "Lower taxes", "Strongly: lower taxes" or "No strong view". */
function sideOf(id: IssueId, s: Stance): { label: string; strong: boolean } {
  const i = issueById[id];
  if (s.pos === 0) return { label: 'Neither side', strong: false };
  const side = s.pos < 0 ? i.l : i.r;
  return { label: side[0].toUpperCase() + side.slice(1), strong: Math.abs(s.pos) === 2 };
}

const isMeasure = (c: Contest) => c.kind === 'measure';

function hostOf(url?: string) {
  try { return url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch { return ''; }
}

export function Paper({ sample }: { sample: Ballot }) {
  const [ballot, setBallot] = useState<Ballot | null>(null);
  const [address, setAddress] = useState('');
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({ sel: [], pos: {}, imp: {} });
  const [personalizing, setPersonalizing] = useState(false);
  const [showParty, setShowParty] = useState(false);

  const lookup = async (e?: React.FormEvent, addr = address) => {
    e?.preventDefault();
    if (addr.trim().length < 5) return;
    setLooking(true);
    setError(null);
    try {
      const res = await fetch(`/api/ballot?address=${encodeURIComponent(addr)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.');
      setBallot(data);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLooking(false);
    }
  };

  const countFor = (id: IssueId) => (ballot?.contests ?? []).filter((c) => c.issues.includes(id)).length;
  const toggle = (id: IssueId) => setPrefs((p) => (p.sel.includes(id) ? { ...p, sel: p.sel.filter((x) => x !== id) } : { ...p, sel: [...p.sel, id] }));
  const setPos = (id: IssueId, v: Position) => setPrefs((p) => ({ ...p, pos: { ...p.pos, [id]: v } }));
  const setImp = (id: IssueId, v: Importance) => setPrefs((p) => ({ ...p, imp: { ...p.imp, [id]: v } }));
  const applyWords = (r: Interpretation) => setPrefs((p) => {
    const next: Prefs = { sel: [...p.sel], pos: { ...p.pos }, imp: { ...p.imp } };
    for (const d of r.dials) {
      if (!next.sel.includes(d.issue)) next.sel.push(d.issue);
      next.pos[d.issue] = d.position;
      next.imp[d.issue] = d.importance;
    }
    return next;
  });

  return (
    <div className="paper">
      <header className="pp-mast">
        <div className="pp-dateline">
          <span>Tuesday, November 3, 2026 · General Election</span>
          <span><b>{daysToGo()} days</b> to go · Free · No ads · No account</span>
        </div>
        <h1 className="pp-title"><button onClick={() => setBallot(null)}>Plain Ballot</button></h1>
        <div className="pp-rule" />
      </header>

      {!ballot ? (
        <main className="pp-front">
          <h2 className="pp-headline">Who’s on your ballot, and where they stand.</h2>
          <p className="pp-deck">Every race, side by side, <em>in the candidates’ own words</em>, with a link to where they said it. We don’t take sides.</p>
          <form className="pp-ask" onSubmit={lookup}>
            <label className="pp-label" htmlFor="pp-address">Your street address</label>
            <div className="pp-ask-row">
              <AddressInput id="pp-address" value={address} onChange={setAddress} onPick={(a) => lookup(undefined, a)} />
              <button className="pp-btn" type="submit" disabled={looking || address.trim().length < 5}>{looking ? 'Finding…' : 'See my ballot'}</button>
            </div>
            {error && <p className="pp-error" role="alert">{error}</p>}
            <p className="pp-fine">Your address is only used to find your ballot. It isn’t stored. <button type="button" className="pp-link" onClick={() => setBallot(sample)}>Or browse a sample ballot</button>.</p>
          </form>
          <div className="pp-front-cols">
            <p><b>In their own words.</b> Every position is something the candidate said or did, quoted exactly, with the page it came from. Never a guess from their party.</p>
            <p><b>Party labels are hidden</b> until you ask, so you see the issues first.</p>
            <p><b>Free and open.</b> The research is <a href={DATA_REPO_URL}>open data</a> anyone can check, and <a href={GITHUB_URL}>so is the code</a>.</p>
          </div>
        </main>
      ) : (
        <Edition
          ballot={ballot}
          prefs={prefs}
          showParty={showParty}
          onParty={setShowParty}
          onPersonalize={() => setPersonalizing(true)}
          onChangeAddress={() => setBallot(null)}
        />
      )}

      {personalizing && ballot && (
        <aside className="pp-drawer" aria-label="Personalize">
          <div className="pp-drawer-head">
            <h3>Personalize</h3>
            <button className="pp-link" onClick={() => setPersonalizing(false)}>Done</button>
          </div>
          <p className="pp-fine">Pick the issues you care about and set where you stand. Each race then shows how closely each choice fits you. Nothing is stored.</p>
          <WordsInput onApply={applyWords} onDone={() => undefined} />
          <IssuePicker selected={prefs.sel} countFor={countFor} onToggle={toggle} />
          <Dials prefs={prefs} flash={null} countFor={countFor} onPosition={setPos} onImportance={setImp} onRemove={toggle} />
        </aside>
      )}

      <footer className="pp-foot">
        <div className="pp-rule" />
        <p>Researched by independent AI agents that have to agree; every quote is checked against its source. <Link href="/methodology">How it works</Link> · <a href={DATA_REPO_URL}>Open data</a> · <a href={GITHUB_URL}>Code</a></p>
        <p>Using an AI assistant? Send it to <a href="https://github.com/n8peace/plainballot#send-your-agent">plainballot.com/mcp</a>.</p>
        <p>Free and open source. If it helps, <a href={GITHUB_URL}>star it on GitHub</a> or <a href={X_URL}>follow @n8peace</a>.</p>
      </footer>
    </div>
  );
}

function Edition({ ballot, prefs, showParty, onParty, onPersonalize, onChangeAddress }: {
  ballot: Ballot; prefs: Prefs; showParty: boolean;
  onParty: (v: boolean) => void; onPersonalize: () => void; onChangeAddress: () => void;
}) {
  const personalized = prefs.sel.length > 0;
  const researched = ballot.contests.filter((c) => c.researched);
  return (
    <main className="pp-edition">
      <div className="pp-edition-head">
        <div>
          <p className="pp-kicker">{ballot.sample ? 'Sample ballot · fictional candidates' : `Your ballot${ballot.place ? ` · ${ballot.place}` : ''}`}</p>
          <h2 className="pp-headline sm">{researched.length} {researched.length === 1 ? 'race' : 'races'} on your ballot</h2>
          <p className="pp-fine">Every position below is in the candidate’s own words. Tap one to read the quote.</p>
          {ballot.notice && <p className="pp-fine">{ballot.notice}</p>}
          {(ballot.needsResearch || ballot.partial) && (
            <p className="pp-fine"><a href={stateResearchUrl(ballot.districts?.find((d) => d.key.endsWith('/state'))?.label)} target="_blank" rel="noopener noreferrer">Help research your area</a>: pick one race, about 20 minutes, no coding needed.</p>
          )}
          <button className="pp-link" onClick={onChangeAddress}>Change address</button>
        </div>
        <div className="pp-tools">
          <button className="pp-btn" onClick={onPersonalize}>{personalized ? `Personalized · ${prefs.sel.length} issues` : 'Personalize'}</button>
          <label className="pp-switch"><input type="checkbox" checked={showParty} onChange={(e) => onParty(e.target.checked)} /> Show party</label>
        </div>
      </div>
      <div className="pp-rule thin" />
      {ballot.contests.map((c) => <Story key={c.id} contest={c} prefs={prefs} showParty={showParty} />)}
    </main>
  );
}

function Story({ contest, prefs, showParty }: { contest: Contest; prefs: Prefs; showParty: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [report, setReport] = useState<{ candidate?: string; issue?: string } | null>(null);
  const personalized = prefs.sel.some((id) => contest.issues.includes(id));
  const choices: { choice: Choice; fit: number | null }[] = useMemo(() => {
    if (!personalized) return contest.choices.map((choice) => ({ choice, fit: null }));
    return rank(contest, prefs).map((r) => ({ choice: r.choice, fit: score(r.choice, contest, prefs).match }));
  }, [contest, prefs, personalized]);

  // Issues where at least one choice has a sourced position; the voter's issues first.
  const rows = contest.issues
    .filter((id) => contest.choices.some((ch) => ch.stances[id]))
    .sort((a, b) => Number(prefs.sel.includes(b)) - Number(prefs.sel.includes(a)) || ISSUES.findIndex((i) => i.id === a) - ISSUES.findIndex((i) => i.id === b));
  const cols = { gridTemplateColumns: `minmax(120px, 0.8fr) repeat(${choices.length}, minmax(140px, 1fr))`, '--n': choices.length } as React.CSSProperties;

  return (
    <article className="pp-story">
      <p className="pp-kicker">{contest.sub.split(' · ')[0]}</p>
      <h3 className="pp-office">{contest.office}</h3>
      {contest.summary && <p className="pp-deck sm">{contest.summary}</p>}
      {!contest.researched || !rows.length ? (
        <p className="pp-fine">Not researched yet. <a href={`${DATA_REPO_URL}/blob/main/CONTRIBUTING.md`}>Help research it</a>.</p>
      ) : (
        <div className="pp-table" role="table" aria-label={contest.office}>
          <div className="pp-row head" role="row" style={cols}>
            <div role="columnheader" className="pp-corner" />
            {choices.map(({ choice, fit }, n) => (
              <div key={choice.id} role="columnheader" className={`pp-cand ${personalized && n === 0 ? 'top' : ''}`}>
                <span className="pp-name">{choice.name}</span>
                {showParty && choice.party && <span className="pp-party">{choice.party}</span>}
                {fit !== null && <span className="pp-fit">{fit}% fit</span>}
              </div>
            ))}
          </div>
          {rows.map((id) => (
            <div key={id} role="row">
              <div className="pp-row" style={cols}>
                <div role="rowheader" className={`pp-issue ${prefs.sel.includes(id) ? 'mine' : ''}`}>{issueById[id].name}</div>
                {choices.map(({ choice }) => {
                  const s = choice.stances[id];
                  const key = `${id}|${choice.id}`;
                  if (!s) return <div key={choice.id} role="cell" className="pp-cell none">No public position found</div>;
                  const side = sideOf(id, s);
                  return (
                    <div key={choice.id} role="cell" className="pp-cell">
                      <button className="pp-stance" aria-expanded={open === key} onClick={() => setOpen(open === key ? null : key)}>
                        {side.strong ? <><span className="pp-strong">Strongly</span> {side.label.toLowerCase()}</> : side.label}
                      </button>
                    </div>
                  );
                })}
              </div>
              {choices.map(({ choice }) => {
                const s = choice.stances[id];
                if (!s || open !== `${id}|${choice.id}`) return null;
                return (
                  <div key={choice.id} className="pp-quote">
                    <p><b>{choice.name}:</b> {s.text}</p>
                    {s.quote && <><p className="pp-kicker pp-own">In {isMeasure(contest) ? 'the measure’s' : 'their'} own words</p><blockquote>“{s.quote}”</blockquote></>}
                    {s.sourceUrl && <p className="pp-fine">Source: <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer">{hostOf(s.sourceUrl)}</a>{s.agreement ? ` · found by ${s.agreement.replace('/', ' of ')} independent checks` : ''} · <button className="pp-link" onClick={() => setReport({ candidate: choice.name, issue: id })}>Not right?</button></p>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {report && <ReportForm contest={contest} initial={report} onClose={() => setReport(null)} />}
    </article>
  );
}
