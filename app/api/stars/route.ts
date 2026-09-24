import { GITHUB_URL } from '@/lib/share';

// Live GitHub star count for the site's buttons. Cached for 10 minutes so the
// site never gets near GitHub's rate limit, however much traffic it has.
export const revalidate = 600;

export async function GET() {
  try {
    const res = await fetch(GITHUB_URL.replace('https://github.com/', 'https://api.github.com/repos/'), {
      headers: { accept: 'application/vnd.github+json' },
      next: { revalidate: 600 },
    });
    if (!res.ok) return Response.json({ stars: null });
    const { stargazers_count } = (await res.json()) as { stargazers_count: number };
    return Response.json({ stars: stargazers_count }, { headers: { 'cache-control': 'public, s-maxage=600, stale-while-revalidate=3600' } });
  } catch {
    return Response.json({ stars: null });
  }
}
