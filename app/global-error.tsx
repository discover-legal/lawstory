'use client';
// Shown only when the root layout itself fails; it replaces the layout, so it loads the styles itself.
import '@/styles/tokens.css';
import '@/styles/globals.css';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main id="main" className="wrap">
          <section className="hero" aria-labelledby="ge-title">
            <p className="kicker">Error</p>
            <h1 id="ge-title">This page could not be shown.</h1>
            <p className="lede">
              Something went wrong on our side. <button type="button" className="link" onClick={reset}>Try again</button>{' '}
              or{' '}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload: the root layout failed */}
              <a href="/">go to the home page</a>.
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
