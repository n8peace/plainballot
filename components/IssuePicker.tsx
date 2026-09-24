'use client';

import { useState } from 'react';
import { GROUPS, ISSUES, type Issue, type IssueId } from '@/lib/issues';

const TOP_N = 6;

export function IssuePicker({
  selected,
  countFor,
  onToggle,
}: {
  selected: IssueId[];
  countFor: (id: IssueId) => number;
  onToggle: (id: IssueId) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const byCount = [...ISSUES].sort((a, b) => countFor(b.id) - countFor(a.id));
  const top = byCount.slice(0, TOP_N).map((i) => i.id);
  const shown = byCount.filter((i) => top.includes(i.id) || selected.includes(i.id));
  const hidden = ISSUES.length - shown.length;
  const hiddenNames = byCount.filter((i) => !shown.includes(i)).slice(0, 4).map((i) => i.name.toLowerCase());

  const chip = (i: Issue) => {
    const n = countFor(i.id);
    return (
      <button key={i.id} className={`chip ${n ? '' : 'none'}`} aria-pressed={selected.includes(i.id)} onClick={() => onToggle(i.id)}>
        <span className="nm">{i.name}</span>
        <span className="n" aria-label={`${n} contests`}>{n}</span>
      </button>
    );
  };

  return (
    <div className="picker">
      <div className="picker-head">
        <h4>Choose your issues</h4>
        <span className="count">{selected.length} of {ISSUES.length} chosen</span>
      </div>
      <p className="hint">Only the issues you choose count toward your matches. The number is how many contests on your ballot each one affects.</p>
      {showAll ? (
        <div className="groups">
          {GROUPS.map((g, gi) => (
            <div className="group" key={g}>
              <span className="label">{g}</span>
              {ISSUES.filter((i) => i.g === gi).map(chip)}
            </div>
          ))}
        </div>
      ) : (
        <div className="pills">
          <span className="label" style={{ flexBasis: '100%' }}>Most on your ballot</span>
          {shown.map(chip)}
        </div>
      )}
      <div className="more">
        <button aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show fewer' : `Show all ${ISSUES.length} issues`}
        </button>
        <span className="hint">
          {showAll ? 'Grouped by topic.' : hidden ? `${hidden} more, including ${hiddenNames.join(', ')}.` : ''}
        </span>
      </div>
    </div>
  );
}
