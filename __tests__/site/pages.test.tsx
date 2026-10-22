import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import RootLayout from '@/app/layout';
import Home from '@/app/page';
import WorkPage from '@/app/work/page';
import ResearchPage from '@/app/research/page';
import PrivacyPage from '@/app/privacy/page';
import TermsPage from '@/app/tos/page';
import DocumentsSample from '@/app/demo/discover-legal/page';
import { ContactCta, EmailLink } from '@/components/ContactCta';
import { ROUTES, STATIC_APPS, bookingUrl, mailto } from '@/content/site';

// The S2 sample pages: routes exist, samples disclose that they are samples, nothing can be typed or
// saved, and the CTA follows NEXT_PUBLIC_BOOKING_URL. (smoke.mjs checks 200s, prerender and links live.)
const repo = join(__dirname, '..', '..');
const PAGES: Record<string, () => React.ReactNode> = { '/': Home, '/work': WorkPage, '/demo/discover-legal': DocumentsSample,
  '/research': ResearchPage, '/privacy': PrivacyPage, '/tos': TermsPage };
const PAGE_ROUTES = ROUTES.filter((r) => !STATIC_APPS.includes(r));
const html = (r: string) => renderToStaticMarkup(<RootLayout>{PAGES[r]()}</RootLayout>);

describe('sample site pages', () => {
  it('every listed route has a page (or a vendored static app), and every page is listed', () => {
    expect(Object.keys(PAGES).sort()).toEqual([...PAGE_ROUTES].sort());
    for (const r of PAGE_ROUTES) expect(existsSync(join(repo, 'app', r, 'page.tsx'))).toBe(true);
    for (const r of STATIC_APPS) {
      expect(ROUTES).toContain(r);
      expect(existsSync(join(repo, 'app', r))).toBe(false); // the rewrite to public/ would lose to a page
      expect(existsSync(join(repo, 'public', r, 'index.html'))).toBe(true);
    }
  });

  it('/demo/discover-legal says it is a recorded demo with a fictional client, not live AI, nothing sent or saved', () => {
    const text = html('/demo/discover-legal').replace(/<[^>]+>/g, ' ').replace(/&#x27;|’/g, "'");
    expect(text).toMatch(/Recorded demo: a fictional client \(Priya Nair\) and a fixed recording, not live AI/);
    expect(text).toMatch(/not legal advice/);
    expect(text).toMatch(/Nothing you type is sent anywhere or saved/);
    expect(text).toMatch(/replies were scripted for this recording/); // the honest source note
  });

  // Inputs are allowed only on /demo/* pages, and nothing there is ever submitted: no <form> anywhere.
  it.each(PAGE_ROUTES)('%s has no form, no form controls outside /demo/*, and no literal email address', (r) => {
    const page = html(r);
    expect(page).not.toMatch(/<form\b|\baction=/i);
    if (!r.startsWith('/demo/')) expect(page).not.toMatch(/<(input|textarea|select)\b/i);
    expect(page).not.toMatch(/@discover\.legal/);
  });

  it('the Documents demo renders its chat input (the one place typing is allowed)', () => {
    expect(html('/demo/discover-legal')).toMatch(/<input[^>]*id="demo-chat-input"/);
  });

  it('no form controls in the source outside the demo, and no <form> or action= anywhere', () => {
    const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', 'app', 'components'], { cwd: repo, encoding: 'utf8' })
      .split('\n').filter((f) => f.endsWith('.tsx'));
    const isDemo = (f: string) => /^(app|components)\/demo\//.test(f);
    expect(files.some(isDemo)).toBe(true);
    expect(files.filter((f) => !isDemo(f) && /<(form|input|textarea|select)\b/.test(readFileSync(join(repo, f), 'utf8')))).toEqual([]);
    expect(files.filter((f) => /<form\b|\baction=/.test(readFileSync(join(repo, f), 'utf8')))).toEqual([]);
  });
});

describe('call to action', () => {
  it('uses the booking URL as the primary action when set, email second', () => {
    const out = renderToStaticMarkup(<><ContactCta booking="https://cal.example.com/discover" /><EmailLink booking="https://cal.example.com/discover" /></>);
    expect(out.indexOf('href="https://cal.example.com/discover"')).toBeGreaterThan(-1);
    expect(out.indexOf('Book a call')).toBeLessThan(out.indexOf('or email us'));
  });
  it('falls back to the email, which needs JavaScript and otherwise points at the spelled-out footer', () => {
    const out = renderToStaticMarkup(<><ContactCta booking={null} /><EmailLink booking={null} /></>);
    expect(out).not.toMatch(/Book a call|or email us/);
    expect(out).toMatch(/href="#contact">.*Email us/);
    expect(html('/')).toMatch(/id="contact">Contact: h at discover dot legal/);
  });
  it('the home page keeps the restored sections, with Documents labelled as a sample and prices on request', () => {
    const text = html('/').replace(/<[^>]+>/g, ' ');
    for (const s of ['From', 'to build to run.', 'Four ways to work with us.', 'Two things we built and give away.',
      'Sample walkthrough · Ontario', 'Questions firms ask first.', 'Bring us the problem.']) expect(text).toContain(s);
    expect(text).not.toMatch(/Sign in|free to use|CAD \d/);
    expect(html('/')).toMatch(/href="\/demo\/discover-legal"[^>]*>Explore Documents/);
    expect(html('/')).toMatch(/href="\/demo\/biglaw"[^>]*>Explore BigLaw/);
    expect(html('/')).toContain('href="https://github.com/discover-legal/BigLaw"');
    expect(html('/work').replace(/<[^>]+>/g, ' ')).toContain('Price on request');
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
