import { checkBotId } from 'botid/server';
import { z } from 'zod';
import { ISSUE_IDS, issueById } from '@/lib/issues';
import { allow, clientIp, tooLarge } from '@/lib/ratelimit';
import { GITHUB_URL } from '@/lib/share';

// A voter says something on their ballot is wrong. Each report becomes a public
// GitHub issue labeled "claim-report"; that label starts an automatic recheck
// (independent agents re-research the claim and propose a fix for a person to approve).

export const maxDuration = 15;

const REPO = GITHUB_URL.replace('https://github.com/', '');

const Report = z.object({
  contestId: z.string().max(120),
  office: z.string().max(200),
  district: z.string().max(200).optional(),
  candidate: z.string().max(120).optional(),
  issue: z.union([z.enum(ISSUE_IDS), z.literal('roster'), z.literal('other')]),
  details: z.string().trim().min(10).max(1500),
  sourceUrl: z.union([z.url().max(500), z.literal('')]).optional(),
});

export type ReportInput = z.infer<typeof Report>;

export async function POST(req: Request) {
  if (tooLarge(req, 6_000)) return Response.json({ error: 'That’s too long.' }, { status: 413 });
  if ((await checkBotId()).isBot) return Response.json({ error: 'This looks automated.' }, { status: 403 });
  if (!allow(`report:${clientIp(req)}`, 5)) return Response.json({ error: 'Too many reports in a few minutes. Try again later.' }, { status: 429 });

  const parsed = Report.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Tell us what’s wrong in at least a sentence. Links must start with https://' }, { status: 400 });
  const r = parsed.data;

  const topic = r.issue === 'roster' ? 'who is on the ballot' : r.issue === 'other' ? 'something else' : issueById[r.issue].name;
  const title = `Report: ${r.candidate ? `${r.candidate} on ` : ''}${topic} (${r.office}${r.district ? `, ${r.district}` : ''})`.slice(0, 200);
  // The fenced block is what the recheck bot reads. The voter's own words are shown
  // to people but never given to the research agents.
  const body = `A voter reported a problem on Plain Ballot.

**What they said**
> ${r.details.replace(/\n/g, '\n> ')}

${r.sourceUrl ? `**Source they pointed to:** ${r.sourceUrl}\n\n` : ''}An automatic recheck will run: independent research agents look at this claim again and, if the result changes, open a pull request for a person to review.

\`\`\`json plainballot-report
${JSON.stringify({ contestId: r.contestId, office: r.office, district: r.district, candidate: r.candidate, issue: r.issue, sourceUrl: r.sourceUrl || undefined })}
\`\`\``;

  const token = process.env.GITHUB_REPORT_TOKEN;
  if (!token) {
    // No bot token configured: send the voter to a pre-filled GitHub issue instead.
    const u = new URL(`${GITHUB_URL}/issues/new`);
    u.searchParams.set('title', title);
    u.searchParams.set('body', body);
    return Response.json({ fallbackUrl: u.toString() });
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
    body: JSON.stringify({ title, body, labels: ['claim-report'] }),
  });
  if (!res.ok) {
    console.error('report issue failed', res.status, await res.text().catch(() => ''));
    return Response.json({ error: 'We couldn’t file that just now. Try again in a minute.' }, { status: 502 });
  }
  const issue = (await res.json()) as { html_url: string; number: number };
  return Response.json({ url: issue.html_url, number: issue.number });
}
