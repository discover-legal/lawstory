'use client';
import Link from 'next/link';
import { bookingUrl, mailto } from '@/content/site';
import { useBrowser } from './useHydrated';

/**
 * Primary: "Book a call" (NEXT_PUBLIC_BOOKING_URL). Unset: "Email us" is primary instead. The email is
 * assembled in the browser; without JavaScript the link goes to the footer's spelled-out address.
 */
export function Cta({ booking = bookingUrl(), sample = true }: { booking?: string | null; sample?: boolean }) {
  const mail = useBrowser(() => mailto(window.location.hostname), '#contact');
  return (
    <p className="cta">
      {booking ? <a className="btn" href={booking} rel="noopener noreferrer">Book a call</a> : <a className="btn" href={mail}>Email us</a>}
      {sample && <Link className="btn btn-quiet" href="/demo/discover-legal">See the sample</Link>}
      {booking && <a className="link-quiet" href={mail}>or email us</a>}
    </p>
  );
}
