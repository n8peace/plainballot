// Address suggestions while the voter types. Uses Google Places when a Places key
// is configured (best house-number coverage), otherwise the free Photon service
// built on OpenStreetMap. Either way the address goes only to that service, and
// we don't store it.

import { Memo } from '../ratelimit';

const cache = new Memo<string[]>(2000);

export async function suggestAddresses(q: string): Promise<string[]> {
  const norm = q.trim().toLowerCase().replace(/\s+/g, ' ');
  const hit = cache.get(norm);
  if (hit) return hit;
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const out = key ? await google(q, key).catch(() => photon(q)) : await photon(q);
  cache.set(norm, out);
  return out;
}

async function google(q: string, key: string): Promise<string[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({ input: q, includedRegionCodes: ['us'], includedPrimaryTypes: ['street_address', 'premise', 'subpremise'] }),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`Places returned ${res.status}`);
  const data = (await res.json()) as { suggestions?: { placePrediction?: { text?: { text?: string } } }[] };
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction?.text?.text?.replace(/, USA$/, ''))
    .filter((s): s is string => !!s)
    .slice(0, 5);
}

interface PhotonProps { housenumber?: string; street?: string; name?: string; city?: string; state?: string; postcode?: string; countrycode?: string }

const STATE_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};

export function formatPhoton(p: PhotonProps, typedNumber?: string): string | null {
  const street = p.street ?? p.name;
  if (p.countrycode !== 'US' || !street || !p.city || !p.state) return null;
  // OpenStreetMap often knows the street but not each house number; keep what the voter typed.
  const number = p.housenumber ?? typedNumber;
  if (!number) return null;
  return `${number} ${street}, ${p.city}, ${STATE_ABBR[p.state] ?? p.state}${p.postcode ? ` ${p.postcode}` : ''}`;
}

async function photon(q: string): Promise<string[]> {
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '8');
  url.searchParams.set('lang', 'en');
  url.searchParams.set('bbox', '-179.9,18.9,-66.9,71.4'); // United States
  const res = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { 'user-agent': 'PlainBallot (+https://github.com/n8peace/plainballot)' } });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: { properties: PhotonProps }[] };
  const typedNumber = /^\s*(\d+[a-z]?)\b/i.exec(q)?.[1];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of data.features ?? []) {
    const s = formatPhoton(f.properties, typedNumber);
    if (s && !seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out.slice(0, 5);
}
