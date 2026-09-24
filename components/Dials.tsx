'use client';

import { ISSUES, readout, type Importance, type IssueId, type Position } from '@/lib/issues';
import type { Prefs } from '@/lib/types';

const IMPORTANCE: Importance[] = ['low', 'medium', 'high'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function Dials({
  prefs,
  flash,
  countFor,
  onPosition,
  onImportance,
  onRemove,
}: {
  prefs: Prefs;
  flash: IssueId | null;
  countFor: (id: IssueId) => number;
  onPosition: (id: IssueId, v: Position) => void;
  onImportance: (id: IssueId, v: Importance) => void;
  onRemove: (id: IssueId) => void;
}) {
  const chosen = ISSUES.filter((i) => prefs.sel.includes(i.id));
  if (!chosen.length) return <p className="empty">Choose at least one issue above, or describe your priorities in your own words.</p>;

  return (
    <div>
      {chosen.map((i) => {
        const v = prefs.pos[i.id] ?? 0;
        return (
          <div key={i.id} id={`dial-${i.id}`} className={`dial ${flash === i.id ? 'new' : ''}`}>
            <div className="dial-top">
              <span className="dial-name">{i.name}<small>{countFor(i.id)} contests</small></span>
              <span className="dial-read">{readout(i, v)}</span>
            </div>
            <div className="track">
              <div className="ticks" aria-hidden="true"><i /><i /><i /><i /><i /></div>
              <input
                type="range"
                id={`pos-${i.id}`}
                min={-2}
                max={2}
                step={1}
                value={v}
                aria-label={`${i.name}: from ${i.left} to ${i.right}`}
                aria-valuetext={readout(i, v)}
                onChange={(e) => onPosition(i.id, Number(e.target.value) as Position)}
              />
            </div>
            <div className="poles"><span>{i.left}</span><span>{i.right}</span></div>
            <div className="imp">
              <span className="label">How much it matters</span>
              <div className="seg" role="group" aria-label={`${i.name} importance`}>
                {IMPORTANCE.map((k) => (
                  <button key={k} aria-pressed={(prefs.imp[i.id] ?? 'medium') === k} onClick={() => onImportance(i.id, k)}>{cap(k)}</button>
                ))}
              </div>
              <button className="rm" onClick={() => onRemove(i.id)}>Remove</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
