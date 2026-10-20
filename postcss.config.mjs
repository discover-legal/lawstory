// Tailwind runs at build time only (devDependency); the output is a same-origin stylesheet (CSP style-src 'self').
const config = { plugins: { tailwindcss: {} } };
export default config;
