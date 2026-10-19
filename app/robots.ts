import type { MetadataRoute } from 'next';
import { PRODUCTION_ORIGIN, indexable } from '@/content/site';

export default function robots(): MetadataRoute.Robots {
  return indexable ? { rules: { userAgent: '*', allow: '/' }, sitemap: `${PRODUCTION_ORIGIN}/sitemap.xml` }
    : { rules: { userAgent: '*', disallow: '/' } };
}
