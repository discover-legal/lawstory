'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Menu, Scale, X } from 'lucide-react';
import { AUTH0_PROFILE_ROUTE } from '@/lib/auth0-routes';
import ContactCta from './ContactCta';

const LINKS = [
  { href: '/services', label: 'Services' },
  { href: '/tools/documents', label: 'Documents' },
  { href: '/tools/biglaw', label: 'BigLaw' },
  { href: '/research', label: 'Research' },
  { href: '/resources', label: 'Resources' },
] as const;

export default function ConsultancyNav() {
  const { user } = useUser({ route: AUTH0_PROFILE_ROUTE });
  const signInHref = user ? '/dashboard' : '/api/auth/login';
  const signInLabel = user ? 'Dashboard' : 'Sign in';
  const menuRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand to-brand-strong rounded-lg blur-sm opacity-40" />
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg p-1.5">
                <Scale className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              discover<span className="text-brand">.</span>legal
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hidden md:inline text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2"
              >
                {l.label}
              </Link>
            ))}
            {/* Plain <a>: /api/auth/login answers with a 302 to Auth0; see StartCta.tsx. */}
            <a
              href={signInHref}
              className="hidden sm:inline text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2"
            >
              {signInLabel}
            </a>
            <ContactCta variant="nav" />

            {/* Mobile menu: a native disclosure, so it opens before hydration
                and without JavaScript, and is announced as expandable. */}
            <details
              ref={menuRef}
              className="group md:hidden"
              onKeyDown={(e) => {
                if (e.key === 'Escape' && menuRef.current?.open) {
                  closeMenu();
                  menuRef.current.querySelector('summary')?.focus();
                }
              }}
            >
              <summary
                aria-label="Menu"
                className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center justify-center h-10 w-10 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Menu className="h-5 w-5 group-open:hidden" aria-hidden="true" />
                <X className="h-5 w-5 hidden group-open:block" aria-hidden="true" />
              </summary>
              <div
                className="absolute inset-x-0 top-16 border-b border-slate-200/70 bg-white shadow-lg"
              >
                <ul className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
                  {LINKS.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={closeMenu}
                        className="block rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                  <li className="border-t border-slate-200/70 mt-1 pt-1">
                    <a
                      href={signInHref}
                      onClick={closeMenu}
                      className="block rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      {signInLabel}
                    </a>
                  </li>
                </ul>
              </div>
            </details>
          </div>
        </div>
      </div>
    </nav>
  );
}
