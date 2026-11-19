import { AGENTS_MD } from '../../lib/agents-md';

// How an AI agent uses Plain Ballot by ear (see lib/agents-md.ts).
export const dynamic = 'force-static';

export function GET() {
  return new Response(AGENTS_MD, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
}
