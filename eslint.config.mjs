import { readFileSync } from 'node:fs';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Colour, type, radius and shadow come only from styles/ (classes written against tokens). In app/,
// components/ and content/ (proven by __tests__/site/lint-colour.test.ts):
//  1. No inline style: `style`, `dangerouslySetInnerHTML`, innerHTML/outerHTML/insertAdjacentHTML and
//     adoptedStyleSheets are banned as JSX props, object keys, member names and whole string literals
//     (so createElement('style'), el['style'], setAttribute('style')), and so are <style> and SVG <animate>/<set>.
//  2. A colour slot (fill, stroke, any *color/*Color name as a JSX prop, object key, assignment or
//     setAttribute name) takes only a literal none / currentColor / inherit / transparent / var(--token).
//  3. No string or template text is a hex or colour-function value, a CSS colour declaration (or any
//     colour inside `{…}`), or a *-color / *Color name (meta theme-color, msapplication-TileColor).
const C = JSON.parse(readFileSync(new URL('./scripts/colour-literals.json', import.meta.url), 'utf8'));
const SINK = '/^(?:style|dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|adoptedStyleSheets)$/';
const SLOT = '(?:[\\w-]*[cC]olor|fill|stroke)'; // color, themeColor, stop-color, bgcolor, document.fgColor, …
const SLOT_KEY = `/^${SLOT}$/`;
const SLOT_ATTR = `/^(?:${SLOT}|text|link|vlink|alink)$/`; // the last four: <body> colour attributes
const TOKEN = '/^(?:none|currentColor|inherit|transparent|var\\(--[a-z0-9-]+\\))$/';
const COLOUR = `(?:${C.hex}|${C.functions}|\\b(?:${C.named.join('|')})\\b)`;
const DECL = `(?:^|[\\s;{"'])(?:color|fill|stroke|background|border|outline|box-shadow|text-shadow|[a-z-]+-color)(?:-[a-z]+)*\\s*:[^;{}]*?${COLOUR}|\\{[^{}]*?:[^{}]*?${COLOUR}`;
const VALUE = `/^\\s*(?:${C.hex}|${C.functions}.*\\))\\s*$|${DECL}/i`;
const notToken = (path) => `:not([${path}.type="Literal"][${path}.value=${TOKEN}])`;
const ban = (selector, message) => ({ selector, message });
const STYLE = 'Inline style: put it in styles/globals.css as a class, written against tokens.';
const COL = 'Colour literal outside styles/: use a class, or a token from styles/tokens.css (var(--…)).';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ['{app,components,content}/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'], rules: { 'no-restricted-syntax': ['error',
    ban('JSXOpeningElement[name.name=/^(?:style|animate|animateColor|set)$/]', STYLE), // <style>, SVG SMIL paint
    ban(`JSXAttribute[name.name=${SINK}]`, STYLE),
    ban(`Property[key.name=${SINK}]`, STYLE), ban(`MemberExpression[property.name=${SINK}]`, STYLE),
    ban(`Literal[value=${SINK}]`, STYLE), ban(`TemplateElement[value.raw=${SINK}]`, STYLE),
    ban(`Literal[value=${VALUE}]`, COL), ban(`Literal[value=/^(?!currentColor$)[\\w-]+(?:-c|C)olor$/]`, COL), // <meta name="theme-color">
    ban(`TemplateElement[value.raw=${VALUE}]`, COL),
    ban(`JSXAttribute[name.name=${SLOT_ATTR}]${notToken('value')}`, COL),
    ban(`Property[key.name=${SLOT_KEY}]${notToken('value')}`, COL), ban(`Property[key.value=${SLOT_KEY}]${notToken('value')}`, COL),
    ban(`Property[key.quasis.0.value.raw=${SLOT_KEY}]${notToken('value')}`, COL),
    ban(`AssignmentExpression[left.property.name=${SLOT_KEY}]${notToken('right')}`, COL),
    ban(`CallExpression[callee.property.name=/^setAttribute/] > Literal.arguments[value=${SLOT_KEY}]`, COL)] } },
  { files: ['**/*.js'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  globalIgnores(['.next/**', 'out/**', 'coverage/**', 'next-env.d.ts']),
]);
