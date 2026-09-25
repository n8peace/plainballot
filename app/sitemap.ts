import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/share';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/methodology`, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
