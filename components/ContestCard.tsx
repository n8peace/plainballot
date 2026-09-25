'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ReportForm } from './ReportForm';
import { issueById, leanPhrase, type IssueId } from '@/lib/issues';
import { CLOSE_CALL, explain, rank, RETAIN_THRESHOLD, retentionMatch, type Ranked } from '@/lib/match';
import { researchIssueUrl } from '@/lib/share';
import type { Choice, Contest, Prefs } from '@/lib/types';

const lower = (id: IssueId) => issueById[id].name.toLowerCase();
const isYesNo = (c: Choice) => c.name === 'Yes' || c.name === 'No';
// Full names: last-word shortening breaks multi-word surnames (e.g. Avila Farias).
const shortName = (c: Choice) => (isYesNo(c) ? `“${c.name}”` : c.name);
const longName = (c: Choice) => (isYesNo(c) ? `A ${c.name.toLowerCase()} vote` : c.name);

function Meter({ value }: { value: number | null }) {
  if (value === null) return <div className="meter">No match yet</div>;
  return (
    <div className="meter" title="How closely this choice fits the dials you set. Not a poll or a prediction." aria-label={`Fits your views ${value} percent`}>
      <span className="bar"><b style={{ width: `${value}%` }} /></span>
      {value}% fit
    </div>
  );
}

function Src({ url }: { url?: string }) {
  if (!url) return null;
  return <a href={url} target="_blank" rel="noopener noreferrer">source</a>;
}

function Basis({ contest, prefs, onAdd }: { contest: Contest; prefs: Prefs; onAdd: (id: IssueId) => void }) {
  const used = contest.issues.filter((id) => prefs.sel.includes(id));
  const unused = contest.issues.filter((id) => !prefs.sel.includes(id));
  if (!contest.issues.length) return null;
  return (
    <p className="basis">
      {used.length > 0 && <>Matched on <b>{used.map((id) => issueById[id].name).join(', ')}</b>. </>}
      {unused.length > 0 && (
        <>
          {used.length ? 'Also at stake here: ' : 'At stake here: '}
          {unused.map((id) => (
            <button key={id} className="add" onClick={() => onAdd(id)}>+ {issueById[id].name}</button>
          ))}
        </>
      )}
    </p>
  );
}

function Why({ contest, prefs, ranked, onReport }: { contest: Contest; prefs: Prefs; ranked: Ranked[]; onReport: (candidate: string, issue: string) => void }) {
  const [win, run] = ranked;
  const ex = explain(contest, prefs, ranked);
  const missing = win.score.missing;
  return (
    <>
      {ex.decisive ? (
        <>
          <p>
            <b>Why {isYesNo(win.choice) ? win.choice.name : shortName(win.choice)}.</b> The biggest difference is {lower(ex.decisive)}. You{' '}
            {leanPhrase(issueById[ex.decisive], prefs.pos[ex.decisive] ?? 0)}, and you rated it {prefs.imp[ex.decisive] ?? 'medium'} priority.
          </p>
          <ul className="ev">
            {[win, run].map(({ choice }) => {
              const s = choice.stances[ex.decisive!]!;
              return (
                <li key={choice.id}>
                  <b>{longName(choice)}:</b> {s.text} <Src url={s.sourceUrl} />
                  {s.agreement && <span className="agree" title="Independent research agents, on models from different AI companies, that found this same position.">found by {s.agreement.replace('/', ' of ')} independent checks</span>}
                  <button className="notright" onClick={() => onReport(choice.name, ex.decisive!)}>Not right?</button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p><b>Too close to call on your issues.</b> These options are equally close to your dials on everything you chose. This one is up to you.</p>
      )}
      {missing.length > 0 && (
        <p className="missing">
          {win.choice.name} hasn’t taken a public position on {missing.map(lower).join(' and ')}. We left it out instead of guessing, so this
          match is based on {ex.used.length - missing.length} of your issues, not {ex.used.length}.
        </p>
      )}
      <details>
        <summary>What would change this</summary>
        <p>
          {ex.counter ? (
            <>
              {longName(run.choice)} is closer to you on {lower(ex.counter)}: {run.choice.stances[ex.counter]!.text.replace(/\.$/, '')}.{' '}
              {ex.counterFlips
                ? `If ${lower(ex.counter)} mattered most to you, ${shortName(run.choice)} would come out ahead.`
                : `But even if ${lower(ex.counter)} mattered most to you, ${shortName(win.choice)} would still be the closer match.`}
            </>
          ) : (
            `${longName(run.choice)} isn’t closer to you on any issue you chose. Changing how much each one matters wouldn’t flip this. Changing where you stand, or adding issues, could.`
          )}
        </p>
      </details>
    </>
  );
}

function Retention({ contest, prefs, onAdd }: { contest: Contest; prefs: Prefs; onAdd: (id: IssueId) => void }) {
  const r = contest.record!;
  const m = retentionMatch(contest, prefs);
  const retain = m !== null && m >= RETAIN_THRESHOLD;
  const issue = issueById[r.issue];
  return (
    <>
      <div className="opts-head" aria-hidden="true"><span>Your vote</span><span>Fit with your views</span></div>
      <ul className="opts">
        <li className={`opt ${m !== null && retain ? 'pick' : ''}`}><span className="oval" /><div className="who"><span className="name">Yes, retain</span></div><Meter value={m} /></li>
        <li className={`opt ${m !== null && !retain ? 'pick' : ''}`}><span className="oval" /><div className="who"><span className="name">No, remove</span></div><Meter value={m === null ? null : 100 - m} /></li>
      </ul>
      <div className="why">
        {m === null ? (
          <p>
            <b>No match yet.</b> Judges don’t campaign on issues. For a trial judge, the one thing we can fairly match is the sentencing record.{' '}
            <button className="add" onClick={() => onAdd(r.issue)}>+ {issue.name}</button>
          </p>
        ) : (
          <p>
            <b>{retain ? 'The record fits you.' : 'The record doesn’t fit you.'}</b> You {leanPhrase(issue, prefs.pos[r.issue] ?? 0)}. {r.stance.text} That’s a {m}% fit with your views on the only issue we can measure for judges.
          </p>
        )}
        <p style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 14 }}>Other things on the record for you to weigh:</p>
        <div className="facts">
          {r.facts.map((f) => <div key={f.label}><b>{f.value}</b><span>{f.label}</span></div>)}
        </div>
        {contest.sources && <p className="src">Sources: {contest.sources}</p>}
      </div>
    </>
  );
}

export function ContestCard({ contest, prefs, showParty, place, onAdd }: { contest: Contest; prefs: Prefs; showParty: boolean; place?: string; onAdd: (id: IssueId) => void }) {
  const [report, setReport] = useState<{ candidate?: string; issue?: string } | null>(null);
  const reportUi = report ? (
    <ReportForm contest={contest} initial={report} onClose={() => setReport(null)} />
  ) : (
    <button className="notright" onClick={() => setReport({})}>Report a problem with this race</button>
  );
  const head = (
    <div className="race-head"><span className="office">{contest.office}</span><span className="sub">{contest.sub}</span></div>
  );

  if (contest.kind === 'retention' && contest.record) {
    return <article className="race">{head}<div className="race-body"><Retention contest={contest} prefs={prefs} onAdd={onAdd} /></div></article>;
  }

  if (!contest.researched) {
    return (
      <article className="race">
        {head}
        <div className="race-body">
          {contest.summary && <p className="summary">{contest.summary}</p>}
          <ul className="opts">
            {contest.choices.map((c) => (
              <li key={c.id} className="opt"><span className="oval" /><div className="who"><span className="name">{c.name}</span>{showParty && c.party && <span className="party">{c.party}</span>}{c.url && <a href={c.url} target="_blank" rel="noopener noreferrer">website</a>}</div><div className="meter">Not researched</div></li>
            ))}
          </ul>
          <p className="unresearched">
            We haven’t researched this contest yet, so there’s no match. We’d rather show nothing than guess.{' '}
            <a className="btn small" href={researchIssueUrl({ contest: [contest.office, contest.sub.split(' · ')[0]].join(', '), place, candidates: contest.choices.map((c) => (c.party ? `${c.name} (${c.party})` : c.name)) })} target="_blank" rel="noopener noreferrer">Research this race</a>
          </p>
        </div>
      </article>
    );
  }

  const ranked = rank(contest, prefs);
  const none = ranked.length < 2 || ranked[0].score.match === null;
  const gap = none ? 0 : ranked[0].score.match! - (ranked[1].score.match ?? 0);

  return (
    <article className="race">
      {head}
      <div className="race-body">
        {contest.summary && <p className="summary">{contest.summary}</p>}
        <div className="opts-head" aria-hidden="true"><span>{contest.kind === 'measure' ? 'Your vote' : 'Candidates'}</span><span>Fit with your views</span></div>
        <ul className="opts">
          {contest.choices.map((c) => {
            const r = ranked.find((x) => x.choice.id === c.id)!;
            const pick = !none && ranked[0].choice.id === c.id;
            return (
              <li key={c.id} className={`opt ${pick ? 'pick' : ''}`}>
                <span className="oval" aria-hidden="true" />
                <div className="who">
                  <span className="name">{c.name}</span>
                  {showParty && c.party && <span className="party">{c.party}</span>}
                  {pick && gap < CLOSE_CALL && <span className="tag">Close call</span>}
                </div>
                <Meter value={r.score.match} />
              </li>
            );
          })}
        </ul>
        <Basis contest={contest} prefs={prefs} onAdd={onAdd} />
        <div className="why">
          {none ? (
            <p><b>None of your issues are at stake in this contest.</b> Add one above to see a match, or decide this one yourself.</p>
          ) : (
            <Why contest={contest} prefs={prefs} ranked={ranked} onReport={(candidate, issue) => setReport({ candidate, issue })} />
          )}
          {contest.sources && <p className="src">Sources: {contest.sources} <Link href="/methodology">How matching works</Link></p>}
          <p className="src">{contest.reviewedByPerson ? 'Researched by independent AI agents and reviewed by a person.' : 'Researched by independent AI agents; not reviewed by a person.'} Every quote is checked against its source.</p>
          {reportUi}
        </div>
      </div>
    </article>
  );
}
