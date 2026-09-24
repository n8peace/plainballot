'use client';

import { useEffect, useId, useRef, useState } from 'react';

// Address field with suggestions as you type (an accessible combobox).
export function AddressInput({ value, onChange, onPick, id = 'address' }: { value: string; onChange: (v: string) => void; onPick: (v: string) => void; id?: string }) {
  const [items, setItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const picked = useRef<string | null>(null);
  // The page has two address boxes sharing one value; only the one being typed in suggests.
  const focused = useRef(false);
  const listId = useId();

  useEffect(() => {
    const q = value.trim();
    if (!focused.current || q.length < 4 || q === picked.current) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { suggestions?: string[] };
        setItems(data.suggestions ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        // Typing again cancels the previous request; suggestions are optional.
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value]);

  const choose = (s: string) => {
    picked.current = s;
    onChange(s);
    setOpen(false);
    setItems([]);
    onPick(s);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(items[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const showList = open && items.length > 0 && value.trim().length >= 4;

  return (
    <div className="combo">
      <input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="street-address"
        value={value}
        placeholder="Start typing your street address"
        onChange={(e) => { picked.current = null; onChange(e.target.value); if (e.target.value.trim().length < 4) setOpen(false); }}
        onKeyDown={onKeyDown}
        onBlur={() => { focused.current = false; setTimeout(() => setOpen(false), 150); }}
        onFocus={() => { focused.current = true; if (items.length) setOpen(true); }}
      />
      {showList && (
        <ul id={listId} role="listbox" className="combo-list">
          {items.map((s, i) => (
            <li
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(s); }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
