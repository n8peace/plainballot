// Serves the Markdown version of a page (see lib/markdown.ts). Reached by a rewrite in
// next.config.ts when a request says Accept: text/markdown, or at <page>.md.
import { htmlToMarkdown, markdownPagePath } from '@/lib/markdown';
import { SITE_URL } from '@/lib/share';

export async function GET(req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const path = markdownPagePath((await params).path);
  if (!path) return new Response('Not found\n', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  // The page itself, from this same deployment, exactly as a browser gets it.
  const page = await fetch(new URL(path, new URL(req.url).origin), { headers: { accept: 'text/html' }, redirect: 'follow' }).catch(() => null);
  if (!page || !page.ok || !(page.headers.get('content-type') ?? '').includes('text/html')) {
    return new Response('Not found\n', { status: page?.status === 404 || !page ? 404 : 502, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  const canonical = `${SITE_URL}${path === '/' ? '' : path}`;
  return new Response(htmlToMarkdown(await page.text(), canonical), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      vary: 'Accept',
      link: `<${canonical}>; rel="canonical"`,
    },
  });
}
