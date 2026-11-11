import { SETUP_MD } from '../../lib/setup';

// The setup guide a voter's own AI app fetches and follows (see lib/setup.ts).
export const dynamic = 'force-static';

export function GET() {
  return new Response(SETUP_MD, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
}
