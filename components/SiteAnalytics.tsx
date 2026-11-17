'use client';

import { Analytics } from '@vercel/analytics/next';
import { isTeamBrowser } from '@/lib/team';

function ours(): boolean {
  try { return isTeamBrowser(location.search, localStorage); } catch { return false; }
}

/** Cookie-free page counts on Vercel; nothing personal is collected. Our own browsers send nothing. */
export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => (ours() ? null : event)} />;
}
