import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import RootLayout from '@/app/layout';
import Home from '@/app/page';
import WorkPage from '@/app/work/page';
import DocumentsSample from '@/app/demo/discover-legal/page';
import BigLawSample from '@/app/demo/biglaw/page';
import { Cta } from '@/components/Cta';
import { ROUTES, bookingUrl, mailto } from '@/content/site';

// The S2 sample pages: routes exist, samples disclose that they are samples, nothing can be typed or
// saved, and the CTA follows NEXT_PUBLIC_BOOKING_URL. (smoke.mjs checks 200s, prerender and links live.)
const repo = join(__dirname, '..', '..');
const PAGES: Record<string, () => React.ReactNode> = { '/': Home, '/work': WorkPage, '/demo/discover-legal': DocumentsSample,
  '/demo/biglaw': BigLawSample };
const html = (r: string) => renderToStaticMarkup(<RootLayout>{PAGES[r]()}</RootLayout>);

describe('sample site pages', () => {
  it('every listed route has a page, and every page is listed', () => {
    expect(Object.keys(PAGES).sort()).toEqual([...ROUTES].sort());
    for (const r of ROUTES) expect(existsSync(join(repo, 'app', r, 'page.tsx'))).toBe(true);
  });

  it.each(['/demo/discover-legal', '/demo/biglaw'])('%s says it is a fictional sample with nothing saved', (r) => {
    const text = html(r).replace(/<[^>]+>/g, ' ');
    expect(text).toMatch(/Sample walkthrough: a fictional (client|matter) and scripted output/);
    expect(text).toMatch(/not legal advice/);
    expect(text).toMatch(/nothing to type here and nothing is saved/);
  });

  it.each(ROUTES)('%s has no form controls and no literal email address', (r) => {
    const page = html(r);
    expect(page).not.toMatch(/<(form|input|textarea|select)\b/i);
    expect(page).not.toMatch(/@discover\.legal/);
  });

  it('no form controls exist in the source either', () => {
    const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', 'app', 'components'], { cwd: repo, encoding: 'utf8' })
      .split('\n').filter((f) => f.endsWith('.tsx'));
    expect(files.filter((f) => /<(form|input|textarea|select)\b/.test(readFileSync(join(repo, f), 'utf8')))).toEqual([]);
  });
});

describe('call to action', () => {
  it('uses the booking URL as the primary action when set, email second', () => {
    const out = renderToStaticMarkup(<Cta booking="https://cal.example.com/discover" />);
    expect(out.indexOf('href="https://cal.example.com/discover"')).toBeGreaterThan(-1);
    expect(out.indexOf('Book a call')).toBeLessThan(out.indexOf('or email us'));
  });
  it('falls back to the email, which needs JavaScript and otherwise points at the spelled-out footer', () => {
    const out = renderToStaticMarkup(<Cta booking={null} />);
    expect(out).not.toMatch(/Book a call/);
    expect(out).toMatch(/class="btn" href="#contact">Email us/);
    expect(html('/')).toMatch(/id="contact">Contact: h at discover dot legal/);
  });
  it('accepts only an https booking URL', () => {
    for (const bad of [undefined, '', 'javascript:alert(1)', 'http://cal.example.com', 'not a url']) expect(bookingUrl(bad)).toBeNull();
    expect(bookingUrl('https://cal.example.com/x')).toBe('https://cal.example.com/x');
  });
  it('assembles the email for our apex only', () => {
    expect(mailto('www.discover.legal')).toBe('mailto:h@discover.legal');
    expect(mailto('discover.legal.evil.example')).toBe('mailto:h@discover.legal');
    expect(mailto('localhost')).toBe('mailto:h@discover.legal');
  });
});

describe('sitemap and robots', () => {
  const load = async (site?: string) => {
    let out: { sitemap: unknown; robots: unknown } = { sitemap: null, robots: null };
    const old = process.env.NEXT_PUBLIC_SITE_URL;
    if (site) process.env.NEXT_PUBLIC_SITE_URL = site; else delete process.env.NEXT_PUBLIC_SITE_URL;
    await jest.isolateModulesAsync(async () => {
      out = { sitemap: (await import('@/app/sitemap')).default(), robots: (await import('@/app/robots')).default() };
    });
    if (old === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = old;
    return out;
  };
  it('lists every route and allows crawling only on the production build', async () => {
    const prod = await load('https://discover.legal');
    expect(prod.sitemap).toEqual(ROUTES.map((r) => ({ url: `https://discover.legal${r === '/' ? '' : r}` })));
    expect(prod.robots).toEqual({ rules: { userAgent: '*', allow: '/' }, sitemap: 'https://discover.legal/sitemap.xml' });
    for (const site of [undefined, 'https://preview.onrender.com']) {
      expect(await load(site)).toEqual({ sitemap: [], robots: { rules: { userAgent: '*', disallow: '/' } } });
    }
  });
});

it('the smoke script checks exactly the listed routes', () => {
  const smoke = readFileSync(join(repo, 'scripts', 'smoke.mjs'), 'utf8').match(/const ROUTES = (\[.*\]);/)?.[1];
  expect(JSON.parse((smoke ?? '').replace(/'/g, '"'))).toEqual([...ROUTES]);
});
