/**
 * Marketing chrome regressions:
 *  - ContactCta's pre-hydration / no-JS href pointed at "#contact", which no
 *    element had. It now lands on /contact, and the address is still absent
 *    from server-rendered HTML.
 *  - The consultancy nav hid every link (and Sign in) on phones with no menu.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactCta, { CONTACT_PAGE } from '@/components/marketing/consultancy/ContactCta';
import ConsultancyNav from '@/components/marketing/consultancy/ConsultancyNav';
import ContactPage from '@/app/contact/page';
import sitemap from '@/app/sitemap';

// The Node build of the server renderer: what Next uses to produce the HTML
// a visitor without JavaScript actually receives.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToString } = require('react-dom/server.node') as typeof import('react-dom/server');

jest.mock('next/link', () => {
  const Link = ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

describe('ContactCta without JavaScript', () => {
  it('server-renders a link to the contact page, never the address', () => {
    const html = renderToString(<ContactCta />);
    expect(CONTACT_PAGE).toBe('/contact');
    expect(html).toContain('href="/contact"');
    expect(html).not.toContain('mailto');
    expect(html).not.toContain('@');
  });

  it('the contact page exists, carries the #contact anchor and no address', async () => {
    const html = renderToString(await ContactPage({}));
    expect(html).toContain('id="contact"');
    expect(html).not.toContain('mailto');
    expect(html).not.toMatch(/h@|@discover/);
    expect(sitemap().map((e) => e.url)).toContain('https://discover.legal/contact');
  });

  it('offers a plain-HTML form that works without JavaScript', async () => {
    const html = renderToString(await ContactPage({}));
    const formTag = html.match(/<form[^>]*>/)?.[0] ?? "";
    expect(formTag).toContain('method="post"');
    expect(formTag).toContain('action="/api/contact"');
    for (const name of ['name', 'email', 'message']) expect(html).toContain(`name="${name}"`);
    // The page's own button must not link to the page itself.
    expect(html).toContain('href="#contact-form"');
    expect(html.match(/<main[\s\S]*<\/main>/)?.[0]).not.toContain('href="/contact"');
  });

  it('confirms a sent message and hides the form', async () => {
    const html = renderToString(await ContactPage({ searchParams: Promise.resolve({ status: 'sent' }) }));
    expect(html).toContain('Your message is with us');
    expect(html).not.toContain('<form');
  });
});

describe('ConsultancyNav on phones', () => {
  it('server-renders a native disclosure menu holding every link and Sign in', () => {
    const html = renderToString(<ConsultancyNav />);
    expect(html).toMatch(/<details[^>]*lg:hidden/);
    // Inline links only from lg up (they overflowed the bar at 768–880px).
    expect(html).toMatch(/hidden lg:inline[^"]*"[^>]*>Services</);
    expect(html).toMatch(/<summary[^>]*aria-label="Menu"/);
    for (const href of ['/services', '/tools/documents', '/tools/biglaw', '/research', '/resources', '/api/auth/login']) {
      // Each destination appears in the desktop row (or Sign in) AND the menu.
      expect(html.split(`href="${href}"`).length - 1).toBeGreaterThanOrEqual(2);
    }
  });

  it('closes on Escape and when a menu link is chosen', () => {
    const { container } = render(<ConsultancyNav />);
    const details = container.querySelector('details') as HTMLDetailsElement;
    details.open = true;
    fireEvent.keyDown(details, { key: 'Escape' });
    expect(details.open).toBe(false);

    details.open = true;
    const menuLinks = details.querySelectorAll('a[href="/services"]');
    fireEvent.click(menuLinks[0]);
    expect(details.open).toBe(false);
    expect(screen.getAllByText('Sign in').length).toBeGreaterThanOrEqual(2);
  });

  it('closes on a click outside the menu, not inside it', () => {
    const { container } = render(<ConsultancyNav />);
    const details = container.querySelector('details') as HTMLDetailsElement;
    details.open = true;
    fireEvent.pointerDown(details.querySelector('ul') as Element);
    expect(details.open).toBe(true);
    fireEvent.pointerDown(document.body);
    expect(details.open).toBe(false);
  });
});
