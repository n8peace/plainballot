'use client';

import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { isTeamBrowser, withoutNotrack } from '@/lib/team';

function ours(): boolean {
  try { return isTeamBrowser(location.search, localStorage); } catch { return false; }
}

/** Cookie-free page counts on Vercel; nothing personal is collected. Our own browsers send nothing. */
export function SiteAnalytics() {
  // Store a ?notrack= flag, then take it out of the address bar so it is not shared or bookmarked.
  useEffect(() => {
    ours();
    try {
      const clean = withoutNotrack(location.href);
      if (clean !== null) history.replaceState(history.state, '', clean);
    } catch {}
  }, []);
  return <Analytics beforeSend={(event) => (ours() ? null : event)} />;
}
