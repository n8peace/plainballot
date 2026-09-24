'use client';

import { useState } from 'react';
import { issueById } from '@/lib/issues';
import type { Contest } from '@/lib/types';

// "Something here isn't right": files a public report that triggers an automatic recheck.
export function ReportForm({ contest, onClose, initial }: { contest: Contest; onClose: () => void; initial?: { candidate?: string; issue?: string } }) {
  const [candidate, setCandidate] = useState(initial?.candidate ?? contest.choices[0]?.name ?? '');
  const [issue, setIssue] = useState(initial?.issue ?? contest.issues[0] ?? 'other');
  const [details, setDetails] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: string }>({});
  const id = `report-${contest.id}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      const [office, district] = [contest.office, contest.sub.split(' · ')[0]];
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contestId: contest.id, office, district, candidate: issue === 'roster' ? undefined : candidate, issue, details, sourceUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      if (data.fallbackUrl) {
        window.open(data.fallbackUrl, '_blank', 'noopener');
        setState({ done: 'We opened a pre-filled report on GitHub. Submit it there to start the recheck.' });
      } else {
        setState({ done: `Thanks. Report #${data.number} is filed, and a recheck has started. You can follow it on GitHub.` });
      }
    } catch (err) {
      setState({ error: (err as Error).message });
    }
  };

  if (state.done) {
    return (
      <div className="report">
        <p className="report-done" role="status">{state.done}</p>
        <button className="rm" onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <form className="report" onSubmit={submit}>
      <div className="report-head"><b>What isn’t right?</b><button type="button" className="rm" onClick={onClose}>Cancel</button></div>
      <div className="report-grid">
        <label htmlFor={`${id}-issue`}>About
          <select id={`${id}-issue`} value={issue} onChange={(e) => setIssue(e.target.value)}>
            {contest.issues.map((i) => <option key={i} value={i}>{issueById[i].name}</option>)}
            <option value="roster">Who’s on the ballot</option>
            <option value="other">Something else</option>
          </select>
        </label>
        {issue !== 'roster' && contest.choices.length > 0 && (
          <label htmlFor={`${id}-cand`}>Candidate
            <select id={`${id}-cand`} value={candidate} onChange={(e) => setCandidate(e.target.value)}>
              {contest.choices.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </label>
        )}
      </div>
      <label htmlFor={`${id}-details`}>What’s wrong
        <textarea id={`${id}-details`} required minLength={10} maxLength={1500} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. She changed her position in 2025 and now supports…" />
      </label>
      <label htmlFor={`${id}-src`}>A link that shows it (optional, but it helps)
        <input id={`${id}-src`} type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" />
      </label>
      {state.error && <p className="err" role="alert">{state.error}</p>}
      <div className="row">
        <button className="btn small" type="submit" disabled={state.busy}>{state.busy ? 'Sending…' : 'Send report'}</button>
        <span className="hint">Reports are public, with no name or email attached. Fresh research agents recheck it right away, and any correction is public.</span>
      </div>
    </form>
  );
}
