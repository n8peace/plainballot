// Tells Bing and the other IndexNow search engines which pages exist, so new or changed
// pages are picked up within minutes. Runs after each production deploy (.github/workflows/indexnow.yml).
// The key isn't a secret: IndexNow checks it against the public file at /599c4bf6bd719cd7926e38e8a04a1394.txt.
const SITE = 'https://plainballot.com';
const KEY = '599c4bf6bd719cd7926e38e8a04a1394';

async function main() {
  const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urlList.length === 0) throw new Error('No URLs found in the sitemap');
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
  });
  // 200 and 202 both mean accepted; 202 is normal while the key is being verified.
  console.log(`IndexNow: ${res.status} for ${urlList.length} URLs`);
  if (res.status !== 200 && res.status !== 202) process.exit(1);
}

main();
