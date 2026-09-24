// Finds which districts an address is in, using the U.S. Census Bureau's free
// geocoder (no key). This works even before Google publishes candidate lists, and
// it's how researched races are matched to a voter.

import { Memo } from '../ratelimit';

export interface District {
  /** Stable key used in research files, e.g. "ca/cd-10", "ca/sldu-9", "ca/county-contra-costa". */
  key: string;
  label: string;
}

export interface Located {
  matchedAddress: string;
  state: string; // two-letter, e.g. "CA"
  districts: District[];
}

interface Geo { NAME?: string; BASENAME?: string; STUSAB?: string }

const cache = new Memo<Located | null>(2000);
const slug = (s: string) => s.toLowerCase().replace(/ (city|town|village|cdp)$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const first = (geos: Record<string, Geo[]>, match: (layer: string) => boolean): Geo | undefined =>
  Object.entries(geos).find(([k, v]) => match(k) && v?.length)?.[1][0];

export async function locate(address: string): Promise<Located | null> {
  const norm = address.trim().toLowerCase().replace(/\s+/g, ' ');
  const hit = cache.get(norm);
  if (hit !== undefined) return hit;

  const url = new URL('https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress');
  url.searchParams.set('address', address);
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('vintage', 'Current_Current');
  url.searchParams.set('layers', 'all');
  url.searchParams.set('format', 'json');

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Census geocoder returned ${res.status}`);
  const data = await res.json();
  const m = data?.result?.addressMatches?.[0];
  if (!m) {
    cache.set(norm, null);
    return null;
  }
  const g = m.geographies as Record<string, Geo[]>;
  const state = first(g, (k) => k === 'States');
  const st = (state?.STUSAB ?? m.addressComponents?.state ?? '').toLowerCase();
  const districts: District[] = [];
  const add = (geo: Geo | undefined, key: (b: string) => string, label: (geo: Geo) => string) => {
    if (geo?.BASENAME) districts.push({ key: `${st}/${key(geo.BASENAME)}`, label: label(geo) });
  };

  if (state) districts.push({ key: `${st}/state`, label: state.NAME ?? st.toUpperCase() });
  add(first(g, (k) => k.includes('Congressional Districts')), (b) => `cd-${Number(b) || b.toLowerCase()}`, (x) =>
    x.BASENAME && /at large/i.test(x.NAME ?? '') ? 'U.S. House (at large)' : `U.S. House District ${x.BASENAME}`);
  add(first(g, (k) => k.includes('Legislative Districts - Upper')), (b) => `sldu-${slug(b)}`, (x) => x.NAME ?? '');
  add(first(g, (k) => k.includes('Legislative Districts - Lower')), (b) => `sldl-${slug(b)}`, (x) => x.NAME ?? '');
  add(first(g, (k) => k === 'Counties'), (b) => `county-${slug(b)}`, (x) => x.NAME ?? '');
  add(first(g, (k) => k === 'Incorporated Places'), (b) => `place-${slug(b)}`, (x) => (x.NAME ?? '').replace(/ city$/, ''));
  for (const layer of ['Unified School Districts', 'Elementary School Districts', 'Secondary School Districts']) {
    add(first(g, (k) => k === layer), (b) => `school-${slug(b.replace(/ School District$/, ''))}`, (x) => x.NAME ?? '');
  }

  const out: Located = { matchedAddress: m.matchedAddress, state: st.toUpperCase(), districts };
  cache.set(norm, out);
  return out;
}
