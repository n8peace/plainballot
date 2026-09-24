'use client';

import { useState } from 'react';
import type { Interpretation } from '@/lib/ai/interpret';
import { issueById, readout } from '@/lib/issues';

const EXAMPLE =
  "I rent and can't afford to buy here, so we need way more housing. I'd pay a little more in taxes for better schools, but I don't want vouchers. I want cops, but also more mental-health responders. Energy isn't a big one for me.";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function WordsInput({ onApply, onDone }: { onApply: (r: Interpretation) => void; onDone: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Interpretation | null>(null);

  const read = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/interpret', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setResult(data);
      onApply(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="words">
      <label className="label" htmlFor="freeText" style={{ display: 'block', marginBottom: 8 }}>Say it like you’d say it to a friend</label>
      <textarea
        id="freeText"
        value={text}
        maxLength={1500}
        placeholder="What do you want from the people you elect? What matters most, and what doesn’t?"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="row">
        <button className="btn" onClick={read} disabled={busy || text.trim().length < 10}>{busy ? 'Reading…' : 'Read my priorities'}</button>
        {!text && <button className="btn ghost small" onClick={() => setText(EXAMPLE)}>Try an example</button>}
        <span className="hint">We turn what you wrote into dial settings. You can check and change every one.</span>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      {result && (
        <div className="heard">
          <p className="label" style={{ margin: '14px 0 4px' }}>Here’s how we read that: {result.dials.length} issues</p>
          {result.dials.map((d) => (
            <div className="heard-item" key={d.issue}>
              <span className="issue">{issueById[d.issue].name}</span>
              <span className="val">{readout(issueById[d.issue], d.position)} · {cap(d.importance)}</span>
              {d.quote && <span className="quote">“{d.quote}”</span>}
            </div>
          ))}
          {result.unmatched.length > 0 && (
            <p className="hint" style={{ marginTop: 12 }}>Not on our dials yet: {result.unmatched.join('; ')}. Tell us on GitHub if an issue is missing.</p>
          )}
          <p className="hint" style={{ marginTop: 12 }}>Issues you didn’t mention don’t count. Add any of them on the dials.</p>
          <div className="row">
            <button className="btn ghost" onClick={onDone}>Check these on the dials</button>
            <span className="hint">Your words are read once and not stored.</span>
          </div>
        </div>
      )}
    </div>
  );
}
