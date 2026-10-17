import { readFileSync } from 'node:fs';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Colour, type, radius and shadow live in styles/ only. In app/ and components/: no colour literal
// in any string, no named colour in a colour-ish prop, and no inline `style` (use a class in styles/).
// Proven by __tests__/site/lint-colour.test.ts.
const C = JSON.parse(readFileSync(new URL('./styles/colour-literals.json', import.meta.url), 'utf8'));
const LIT = `/${C.hex}|${C.functions}/i`;
const NAMED = `/^\\s*(?:${C.named.join('|')})\\s*$/i`;
const PROP = '/^(?:color|fill|stroke|stopColor|floodColor|lightingColor|background(?:Color)?|border(?:\\w*Color)?|outlineColor)$/';
const ban = (selector, message) => ({ selector, message });
const colour = 'Colour literal outside styles/: use a token from styles/tokens.css (var(--…)).';
const STYLE = 'Inline style: put it in styles/globals.css as a class, written against tokens.';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ['{app,components}/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'], rules: { 'no-restricted-syntax': ['error',
    ban(`Literal[value=${LIT}]`, colour), ban(`TemplateElement[value.raw=${LIT}]`, colour), ban(`JSXText[value=${LIT}]`, colour),
    ban(`JSXAttribute[name.name=${PROP}] Literal[value=${NAMED}]`, colour),
    ban(`Property[key.name=${PROP}] > Literal[value=${NAMED}]`, colour),
    ban('JSXAttribute[name.name="style"]', STYLE), ban('Property[key.name="style"]', STYLE),
    ban('JSXOpeningElement[name.name="style"]', STYLE)] } },
  { files: ['**/*.js'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  globalIgnores(['.next/**', 'out/**', 'coverage/**', 'next-env.d.ts']),
]);
