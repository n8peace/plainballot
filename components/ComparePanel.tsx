'use client';

import { issueById, readout, type IssueId } from '@/lib/issues';
import { agreement } from '@/lib/share';
import type { Prefs } from '@/lib/types';

// Shown when someone opens a friend's link: where the two of you land, issue by issue.
export function ComparePanel({ mine, theirs, onAdd, onClose }: { mine: Prefs; theirs: Prefs; onAdd: (id: IssueId) => void; onClose: () => void }) {
  const a = agreement(mine, theirs);
  return (
    <div className="compare">
      <div className="compare-head">
        <h4>{a.shared.length ? `You agree on ${a.agree.length} of ${a.shared.length} ${a.shared.length === 1 ? 'issue' : 'issues'} you both chose` : 'Your friend shared what they care about'}</h4>
        <button className="rm" onClick={onClose}>Hide</button>
      </div>
      <p className="hint">Agreeing means you’re on the same side of the dial. Your answers never leave your browser.</p>
      <ul className="compare-list">
        {theirs.sel.map((id) => {
          const i = issueById[id];
          const set = mine.sel.includes(id);
          const same = a.agree.includes(id);
          return (
            <li key={id}>
              <span className="issue">{i.name}</span>
              <span className="them">Friend: {readout(i, theirs.pos[id] ?? 0)}</span>
              {set ? (
                <span className={`you ${same ? 'same' : 'diff'}`}>You: {readout(i, mine.pos[id] ?? 0)} {same ? '· agree' : '· differ'}</span>
              ) : (
                <button className="add" onClick={() => onAdd(id)}>+ Set yours</button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
