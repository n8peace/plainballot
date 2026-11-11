'use client';

// The newspaper edition of Plain Ballot: one question on the front page (your address),
// then your whole ballot as a front page. Each race is a story: the office as the
// headline, the candidates side by side, and one row per issue saying where each stands,
// with the quote and source a tap away. Matching is optional ("Personalize").

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AddressInput } from './AddressInput';
import { ThemeToggle } from './ThemeToggle';
import { Dials } from './Dials';
import { IssuePicker } from './IssuePicker';
import { ReportForm } from './ReportForm';
import { WordsInput } from './WordsInput';
import { BallotHero } from './BallotHero';
import { issueById, ISSUES, type Importance, type IssueId, type Position } from '@/lib/issues';
import { rank, score } from '@/lib/match';
import { sampleSource } from '@/lib/ballot/sample';
import { countPull } from '@/lib/pulled';
import { FAQ } from '@/lib/faq';
import { CURSOR_INSTALL_URL, SETUP_PROMPT } from '@/lib/setup';
import { DATA_REPO_URL, GITHUB_URL, stateResearchUrl, X_URL } from '@/lib/share';
import type { Interpretation } from '@/lib/ai/interpret';
import type { Ballot, Choice, Contest, Prefs, Stance } from '@/lib/types';

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
  const [canRetry, setCanRetry] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ sel: [], pos: {}, imp: {} });
  const [personalizing, setPersonalizing] = useState(false);
  const [showParty, setShowParty] = useState(false);

  // Closing the panel hands focus back to the button that opened it.
  const closePanel = () => {
    setPersonalizing(false);
    requestAnimationFrame(() => document.getElementById('pp-personalize')?.focus());
  };
  useEffect(() => {
    if (!personalizing) return;
    document.getElementById('pp-drawer-done')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closePanel();
      if (e.key !== 'Tab') return;
      const items = [...document.querySelectorAll<HTMLElement>('.pp-drawer button, .pp-drawer input, .pp-drawer textarea, .pp-drawer a[href]')].filter((el) => !el.hasAttribute('disabled'));
      const [first, last] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [personalizing]);

  const lookup = async (e?: React.FormEvent, addr = address) => {
    e?.preventDefault();
    if (addr.trim().length < 5) { setError('Enter your street address first.'); return; }
    setLooking(true);
    setError(null);
    setCanRetry(false);
    try {
      const res = await fetch(`/api/ballot?address=${encodeURIComponent(addr)}`);
      const data = await res.json();
      if (!res.ok) {
        setCanRetry(res.status === 429 || res.status >= 500);
        throw new Error(data.error ?? 'Something went wrong. Please try again.');
      }
      setBallot(data);
      countPull(data);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError((err as Error).message);
      if ((err as Error).name !== 'Error') setCanRetry(true); // network failure or a non-JSON reply
    } finally {
      setLooking(false);
    }
  };

  // Opens the sample ballot, at one race when asked.
  const openSample = (race?: string) => {
    setBallot(sample);
    window.scrollTo({ top: 0 });
    if (race) requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(`race-${race}`)?.scrollIntoView()));
  };
  const ask = (
    <form className="pp-ask bh-ask" onSubmit={lookup}>
      <label className="bh-label" htmlFor="pp-address">Your street address</label>
      <div className="pp-ask-row">
        <AddressInput id="pp-address" value={address} onChange={(v) => { setAddress(v); setError(null); }} onPick={(a) => lookup(undefined, a)} />
        <button className="pp-btn" type="submit" aria-busy={looking} disabled={looking}>{looking ? 'Finding…' : 'See my ballot'}</button>
      </div>
      {error && <p className="pp-error" role="alert">{error}{canRetry && <> <button type="submit" className="pp-link">Try again</button></>}</p>}
      <p className="pp-fine pp-privacy">Your address is only used to find your ballot. It isn’t stored.</p>
    </form>
  );
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
    <div className="paper" id="top">
      <header className={`pp-mast${ballot ? '' : ' is-front'}`}>
        <h1 className="pp-title"><button onClick={() => setBallot(null)}>Plain Ballot</button></h1>
        <span className="pp-promise">Free, with no ads and no account</span>
        <ThemeToggle />
      </header>

      {!ballot ? (
        <main className="pp-front">
          <section className="bh" aria-label="Find your ballot">
            <div className="bh-copy">
              <h2 className="bh-head">Your ballot, and where each candidate stands.</h2>
              <p className="bh-deck">Their own words, quoted exactly, with a link to the source.</p>
              {ask}
            </div>
            <div className="bh-table">
              <BallotHero sample={sample} onOpen={openSample} />
            </div>
            <section className="pp-instr" aria-labelledby="pp-instr-head">
              <h2 id="pp-instr-head" className="pp-bar">How Plain Ballot works</h2>
              <dl>
                <div><dt>Quoted, never guessed</dt><dd>Each position links to the page it came from. Nothing is inferred from party.</dd></div>
                <div><dt>Party labels hidden</dt><dd>Until you ask, so you see the issues first.</dd></div>
                <div><dt>Free and open</dt><dd>The research is <a href={DATA_REPO_URL}>open data</a> anyone can check, and <a href={GITHUB_URL}>so is the code</a>.</dd></div>
              </dl>
            </section>
          </section>
          <section className="pp-faq" aria-labelledby="pp-faq-head">
            <h2 id="pp-faq-head">Questions</h2>
            <div className="pp-faq-list">
              {FAQ.map(({ q, a }) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </section>
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

      {personalizing && ballot && <div className="pp-scrim" onClick={closePanel} aria-hidden="true" />}
      {personalizing && ballot && (
        <aside className="pp-drawer" role="dialog" aria-modal="true" aria-label="Personalize">
          <div className="pp-drawer-head">
            <h3>Personalize</h3>
            <button id="pp-drawer-done" className="pp-link" onClick={closePanel}>Done</button>
          </div>
          <p className="pp-fine">Pick the issues you care about and set where you stand. Each race then shows how closely each choice fits you. Your choices aren’t stored.</p>
          <WordsInput onApply={applyWords} onDone={() => undefined} />
          <IssuePicker selected={prefs.sel} countFor={countFor} onToggle={toggle} />
          <Dials prefs={prefs} flash={null} countFor={countFor} onPosition={setPos} onImportance={setImp} onRemove={toggle} />
        </aside>
      )}

      <footer className="pp-foot">
        <nav aria-label="About Plain Ballot"><Link href="/methodology">How it works</Link><a href={DATA_REPO_URL}>Open data</a><a href={GITHUB_URL}>Code</a><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href={X_URL}>@n8peace</a></nav>
        <AgentSetup />
      </footer>
    </div>
  );
}

/** "Set up with your agent": one line a voter pastes into their own AI app. */
function AgentSetup() {
  const [copied, setCopied] = useState(false);
  // Where the browser blocks the clipboard, select the line so it can be copied by hand.
  const selectLine = () => {
    const line = document.getElementById('pp-setup-prompt');
    if (line) window.getSelection()?.selectAllChildren(line);
  };
  const copy = () => {
    if (!navigator.clipboard) return selectLine();
    navigator.clipboard.writeText(SETUP_PROMPT).then(() => setCopied(true), selectLine);
  };
  return (
    <p className="pp-agent">Using an AI assistant? Tell it: <span className="pp-prompt">“<span id="pp-setup-prompt">{SETUP_PROMPT}</span>”</span> <span className="pp-agent-acts"><button className="pp-link" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button> <a href={CURSOR_INSTALL_URL}>Add to Cursor</a></span></p>
  );
}

function Edition({ ballot, prefs, showParty, onParty, onPersonalize, onChangeAddress }: {
  ballot: Ballot; prefs: Prefs; showParty: boolean;
  onParty: (v: boolean) => void; onPersonalize: () => void; onChangeAddress: () => void;
}) {
  const researched = ballot.contests.filter((c) => c.researched);
  const measures = researched.filter(isMeasure).length;
  const races = researched.length - measures;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const set = prefs.sel.filter((id) => prefs.pos[id] !== undefined).length;
  const personalized = set > 0;
  return (
    <main className="pp-edition">
      <div className="pp-edition-head">
        <h2 className="pp-headline sm">{[races && plural(races, 'race', 'races'), measures && plural(measures, 'measure', 'measures')].filter(Boolean).join(' and ')} on your ballot</h2>
        <p className="pp-meta">{ballot.sample ? 'Sample ballot, fictional candidates' : `Your ballot${ballot.place ? `, ${ballot.place}` : ''}`} · <button className="pp-link" onClick={onChangeAddress}>{ballot.sample ? 'Look up your own' : 'Change address'}</button></p>
        <p className="pp-meta">Every position below is quoted exactly from its source. Tap one to read it.{ballot.notice && !ballot.sample && <><br />{ballot.notice}</>}</p>
        {(ballot.needsResearch || ballot.partial) && (
          <p className="pp-meta"><a href={stateResearchUrl(ballot.districts?.find((d) => d.key.endsWith('/state'))?.label)} target="_blank" rel="noopener noreferrer">Help research your area</a>: pick one race, about 20 minutes, no coding needed.</p>
        )}
        <div className="pp-tools">
          <button id="pp-personalize" className="pp-btn" onClick={onPersonalize}>{personalized ? `Personalized · ${plural(set, 'issue', 'issues')}` : 'Personalize'}</button>
          <label className="pp-switch"><input type="checkbox" checked={showParty} onChange={(e) => onParty(e.target.checked)} /> Show party</label>
        </div>
      </div>
      {ballot.contests.length > 5 && (
        <nav className="pp-index" aria-label="Races on this ballot">
          <ol>{ballot.contests.map((c) => <li key={c.id}><a href={`#race-${c.id}`}>{c.office}</a></li>)}</ol>
        </nav>
      )}
      {ballot.contests.map((c) => <Story key={c.id} contest={c} prefs={prefs} showParty={showParty} sample={ballot.sample} />)}
      {ballot.contests.length > 5 && <p className="pp-top"><a href="#top">Back to the top ↑</a></p>}
    </main>
  );
}

function Story({ contest, prefs, showParty, sample }: { contest: Contest; prefs: Prefs; showParty: boolean; sample?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [report, setReport] = useState<{ candidate?: string; issue?: string } | null>(null);
  const personalized = prefs.sel.some((id) => contest.issues.includes(id) && prefs.pos[id] !== undefined);
  const used = contest.issues.filter((id) => prefs.sel.includes(id) && prefs.pos[id] !== undefined).length;
  const choices: { choice: Choice; fit: number | null; on: number }[] = useMemo(() => {
    if (!personalized) return contest.choices.map((choice) => ({ choice, fit: null, on: 0 }));
    return rank(contest, prefs).map((r) => {
      const s = score(r.choice, contest, prefs);
      return { choice: r.choice, fit: s.match, on: used - s.missing.length };
    });
  }, [contest, prefs, personalized, used]);

  // Issues where at least one choice has a sourced position; the voter's issues first.
  const rows = contest.issues
    .filter((id) => contest.choices.some((ch) => ch.stances[id]))
    .sort((a, b) => Number(prefs.sel.includes(b)) - Number(prefs.sel.includes(a)) || ISSUES.findIndex((i) => i.id === a) - ISSUES.findIndex((i) => i.id === b));
  // Mark a leader only when one choice fits strictly better than every other. A tie shows no winner.
  const leads = personalized && choices.length > 1 && choices[0].fit !== null && choices[0].fit > (choices[1].fit ?? -1);
  const cols = { gridTemplateColumns: `minmax(120px, 0.8fr) repeat(${choices.length}, minmax(140px, 1fr))`, '--n': choices.length } as React.CSSProperties;

  return (
    <article className="pp-story" id={`race-${contest.id}`}>
      <h3 className="pp-office">{contest.office} <span className="pp-district">{contest.sub.split(' · ')[0]}</span></h3>
      {contest.summary && <p className="pp-deck sm">{contest.summary}</p>}
      {!contest.researched ? (
        <p className="pp-fine">Not researched yet. <a href={`${DATA_REPO_URL}/blob/main/CONTRIBUTING.md`}>Help research it</a>.</p>
      ) : !rows.length ? (
        isMeasure(contest) && contest.summary ? null : (
          <p className="pp-fine">No public positions found yet on the issues we track. <a href={`${DATA_REPO_URL}/blob/main/CONTRIBUTING.md`}>Help research it</a>.</p>
        )
      ) : (
        <div className={`pp-table${showParty || personalized ? ' has-meta' : ''}`} role="table" aria-label={contest.office}>
          <div className="pp-row head" role="row" style={cols}>
            <div role="columnheader" className="pp-corner" />
            {choices.map(({ choice, fit, on }, n) => (
              <div key={choice.id} role="columnheader" className={`pp-cand ${leads && n === 0 ? 'top' : ''}`}>
                <span className="pp-name">{choice.name}</span>
                {showParty && choice.party && <span className="pp-party">{choice.party}</span>}
                {fit !== null && <span className="pp-fit">{fit}% fit{!leads && fit === choices[0].fit ? ' · tied' : ''}</span>}
                {fit !== null && <span className="pp-basis">based on {on} {on === 1 ? 'issue' : 'issues'}</span>}
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
                  // The name inside each cell shows only on phones, where each choice gets its own line.
                  const who = <span className="pp-who">{choice.name}</span>;
                  if (!s) return <div key={choice.id} role="cell" className="pp-cell none">{who}<span>No public position found</span></div>;
                  const side = sideOf(id, s);
                  return (
                    <div key={choice.id} role="cell" className="pp-cell">
                      {who}
                      <button className="pp-stance" aria-expanded={open === key} onClick={() => setOpen(open === key ? null : key)}>
                        {side.strong ? <><span className="pp-strong">Strongly</span> for {side.label.toLowerCase()}</> : side.label}
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
                    {s.quote && <><p className="pp-kicker pp-own">{isMeasure(contest) ? 'From the measure' : s.sourceUrl ? `Quoted from ${hostOf(s.sourceUrl)}` : sample && sampleSource(choice.id, id) ? `Quoted from: ${sampleSource(choice.id, id)}` : 'Quoted'}</p><blockquote>“{s.quote}”</blockquote></>}
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
