'use client';
import { bookingUrl, mailto } from '@/content/site';
import { Icon } from './Icon';
import { useBrowser } from './useHydrated';

const VARIANTS = {
  hero: 'group inline-flex items-center justify-center px-6 py-3.5 bg-slate-900 text-white text-base font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5',
  nav: 'group inline-flex items-center bg-slate-900 text-white px-4 sm:px-5 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm font-semibold',
  closing: 'group inline-flex items-center px-8 py-4 bg-white text-slate-900 text-base font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-xl hover:shadow-2xl hover:-translate-y-0.5',
} as const;

/**
 * "Book a call" when NEXT_PUBLIC_BOOKING_URL is an https URL, else "Email us". The address is assembled in
 * the browser from the page's own host; without JavaScript the link goes to the footer's spelled-out address.
 */
export function ContactCta({ variant = 'hero', booking = bookingUrl() }: { variant?: keyof typeof VARIANTS; booking?: string | null }) {
  const mail = useBrowser(() => mailto(window.location.hostname), '#contact');
  return (
    <a className={VARIANTS[variant]} href={booking ?? mail} {...(booking ? { rel: 'noopener noreferrer' } : {})}>
      {variant !== 'nav' && <Icon name={booking ? 'calendar' : 'mail'} className="mr-2 h-4 w-4" />}
      {booking ? 'Book a call' : 'Email us'}
      <Icon name="arrowRight" className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
    </a>
  );
}

/** The booking link's quiet companion: email stays reachable when a scheduler is primary. */
export function EmailLink({ booking = bookingUrl(), className }: { booking?: string | null; className?: string }) {
  const mail = useBrowser(() => mailto(window.location.hostname), '#contact');
  return booking ? <a className={className} href={mail}>or email us</a> : null;
}
