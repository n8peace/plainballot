'use client';

import { useEffect } from 'react';
import { countRef } from '@/lib/ref';

/** Counts one visit per page load when the link carried a post tag. Renders nothing. */
export function RefCount() {
  useEffect(() => { countRef(); }, []);
  return null;
}
