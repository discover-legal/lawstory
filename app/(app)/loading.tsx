// Loading state for the authenticated app only. At the root this file
// wrapped EVERY route (marketing included) in a Suspense boundary, so the
// streamed HTML carried the page hidden behind this spinner until an inline
// script swapped it in: visitors and crawlers without JavaScript saw only
// "Loading…". Marketing pages render fast and must ship their content in the
// initial HTML.
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-700 font-medium">Loading…</p>
      </div>
    </div>
  );
}
