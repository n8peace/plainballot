// How a quote's source is named on the page. After an election, a quote can point at
// an Internet Archive copy of the original page; name the original site, marked as archived.
const ARCHIVE = /^https?:\/\/web\.archive\.org\/web\/\d{1,14}[a-z_]*\/(.+)$/i;

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export function sourceLabel(url?: string): string {
  if (!url) return '';
  const original = ARCHIVE.exec(url)?.[1];
  if (!original) return host(url);
  const name = host(/^https?:\/\//i.test(original) ? original : `https://${original}`);
  return name ? `${name} (archived copy)` : host(url);
}
