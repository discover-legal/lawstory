import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Colour lives in styles/ only: pages and components may not carry colour literals.
const C = '/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b|\\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\\(/';
const message = 'Colour literal outside styles/: use a token from styles/tokens.css (var(--…)).';
const ban = (selector) => ({ selector, message });

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'], rules: { 'no-restricted-syntax': ['error',
    ban(`Literal[value=${C}]`), ban(`TemplateElement[value.raw=${C}]`), ban(`JSXText[value=${C}]`)] } },
  { files: ['**/*.js'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  globalIgnores(['.next/**', 'out/**', 'coverage/**', 'next-env.d.ts']),
]);
