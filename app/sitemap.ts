import type { MetadataRoute } from 'next';
import { PRODUCTION_ORIGIN, ROUTES, indexable } from '@/content/site';

// Only the production build lists pages; every other build is noindex and lists none.
export default function sitemap(): MetadataRoute.Sitemap {
  return indexable ? ROUTES.map((r) => ({ url: `${PRODUCTION_ORIGIN}${r === '/' ? '' : r}` })) : [];
}
