'use client';

import { useState, useSyncExternalStore } from 'react';
import type { Pick } from '@/lib/match';
import { inviteText, picksText, SITE_URL } from '@/lib/share';

type Mode = 'invite' | 'picks';
const noop = () => () => {};

export function SharePanel({ picks, electionDate, issueCount }: { picks: Pick[]; electionDate: string; issueCount: number }) {
  const [mode, setMode] = useState<Mode>('invite');
  const generated = mode === 'invite' ? inviteText() : picksText(picks, electionDate);
  // Keep the voter's edits until the generated message itself changes.
  const [edit, setEdit] = useState<{ base: string; text: string } | null>(null);
  const text = edit && edit.base === generated ? edit.text : generated;
  const setText = (t: string) => setEdit({ base: generated, text: t });
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(noop, () => !!navigator.share, () => false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      (document.getElementById('shareText') as HTMLTextAreaElement | null)?.select();
    }
  };

  const share = async () => {
    try {
      await navigator.share({ text });
    } catch {
      // Closed the share sheet, or sharing isn't allowed here.
    }
  };

  return (
    <div className="share">
      <div className="card">
        <div className="cm">{mode === 'picks' ? 'My ballot' : 'Plain Ballot'} <small>{electionDate ? new Date(`${electionDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</small></div>
        {mode === 'picks' ? (
          <>
            <ol>
              {picks.map((p) => (
                <li key={p.office}><span className={`o ${p.pick ? 'f' : ''}`} /><span className="ro">{p.office}</span><span className="pk">{p.pick ?? 'Your call'}</span></li>
              ))}
            </ol>
            <div className="foot">Matched to my own priorities on {issueCount} issues, with sources for every race.</div>
          </>
        ) : (
          <>
            <p style={{ margin: '4px 0 12px', fontSize: 19, lineHeight: 1.35 }}>I matched my whole ballot to my own priorities. Every pick came with its reasons.</p>
            <p style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--ink-2)' }}>No account, no ads, and no one tells you what to think. Try yours.</p>
            <div className="foot">{SITE_URL.replace(/^https?:\/\//, '')}</div>
          </>
        )}
      </div>
      <div className="share-ctl">
        <fieldset>
          <legend className="label">What to send</legend>
          <label className="radio"><input type="radio" name="shareMode" id="shareInvite" checked={mode === 'invite'} onChange={() => setMode('invite')} /><span>An invite to try it<small>Friends answer for themselves. Your picks stay private.</small></span></label>
          <label className="radio"><input type="radio" name="shareMode" id="sharePicks" checked={mode === 'picks'} onChange={() => setMode('picks')} /><span>My picks<small>Good for a partner or roommate on the same ballot. Your address is never included.</small></span></label>
        </fieldset>
        <label className="label" htmlFor="shareText" style={{ display: 'block', marginBottom: 6 }}>Your message (edit it if you like)</label>
        <textarea id="shareText" className="share-text" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="share-btns">
          {canShare && <button className="btn" onClick={share}>Share</button>}
          <button className={canShare ? 'btn ghost' : 'btn'} onClick={copy}>{copied ? 'Copied' : 'Copy text'}</button>
          <a className="btn ghost" href={`sms:?&body=${encodeURIComponent(text)}`} style={{ textDecoration: 'none' }}>Text a friend</a>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>Bring your picks to the booth: most states let you take your own notes in with you.</p>
      </div>
    </div>
  );
}
