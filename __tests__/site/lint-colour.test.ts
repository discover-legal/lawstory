import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// Runs the real ESLint config (eslint.config.mjs) in one child process: Jest's VM cannot import the
// ESM flat config. Each snippet is linted as if it lived at its file path.
const repo = join(__dirname, '..', '..');
const LINTER = `import { ESLint } from 'eslint';
const cases = JSON.parse(await new Response(process.stdin).text());
const eslint = new ESLint({ cwd: process.cwd() });
const out = [];
for (const [file, code] of cases) {
  const [r] = await eslint.lintText(code, { filePath: file });
  out.push(r.messages.filter((m) => m.ruleId === 'no-restricted-syntax').map((m) => m.message));
}
console.log(JSON.stringify(out));`;
function lintAll(cases: [string, string][]): string[][] {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', LINTER],
    { cwd: repo, input: JSON.stringify(cases), encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}

const COLOUR = /^Colour literal outside styles\//;
const STYLE = /^Inline style/;
// Every form found by the S1 committee (rounds 1 to 3), each a literal (not assembled at runtime).
const BAD: [string, string, RegExp][] = [
  ['hex in a string', "export const a = '#ABCDEF';", COLOUR],
  ['short hex', "export const a = '#f00';", COLOUR],
  ['rgb()', "export const a = 'rgb(1, 2, 3)';", COLOUR],
  ['hwb()', "export const a = 'hwb(0 0% 0%)';", COLOUR],
  ['color()', "export const a = 'color(srgb 1 0 0)';", COLOUR],
  ['color-mix()', "export const a = 'color-mix(in srgb, red 50%, blue)';", COLOUR],
  ['oklch() in a template', 'export const a = `oklch(0.9 0 0)`;', COLOUR],
  ['named colour in an SVG fill', 'export const a = <svg><rect fill="crimson" /></svg>;', COLOUR],
  ['template literal in a fill', 'export const a = <svg><rect fill={`crimson`} /></svg>;', COLOUR],
  ['variable in a fill', "const c = 'crimson';\nexport const a = <svg><rect fill={c} /></svg>;", COLOUR],
  ['hyphenated SVG attribute', 'export const a = <svg><stop stop-color="red" /></svg>;', COLOUR],
  ['bgcolor', 'export const a = <table bgcolor="red" />;', COLOUR],
  ['viewport themeColor', "export const viewport = { themeColor: 'black' };", COLOUR],
  ['themeColor media list', "export const viewport = { themeColor: [{ media: '(prefers-color-scheme: dark)', color: 'black' }] };", COLOUR],
  ['string-keyed colour property', "export const a = { 'color': 'red' };", COLOUR],
  ['computed template key', "export const a = { [`fill`]: 'red' };", COLOUR],
  ['quoted keys spread onto an SVG', "const paint = { 'fill': 'crimson', 'stroke': 'black' };\nexport const a = <rect {...paint} />;", COLOUR],
  ['shorthand colour property', "const fill = 'red';\nexport const a = { fill };", COLOUR],
  ['document colour assignment', "document.bgColor = 'black';", COLOUR],
  ['setAttribute of a colour', "document.body.setAttribute('fill', 'red');", COLOUR],
  ['CSS text into a constructed sheet', "new CSSStyleSheet().replaceSync('p{border:1px solid rebeccapurple}');", STYLE],
  ['cssText', 'document.styleSheets[0].cssRules[0].cssText = `body { color: red }`;', STYLE],
  ['Web Animations', "document.body.animate([{ background: 'black' }, { background: 'white' }]);", STYLE],
  ['Typed OM', "document.body.attributeStyleMap.set('color', 'red');", STYLE],
  ['adoptedStyleSheets', 'document.adoptedStyleSheets = [];', STYLE],
  ['data: stylesheet', 'export const a = <link rel="stylesheet" href="data:text/css,body%7Bcolor:red%7D" />;', STYLE],
  ['document.write of an inline style', "document.write('<p style=\"color:red\">x</p>');", STYLE],
  ['iframe srcDoc', 'export const a = <iframe srcDoc="<p>x</p>" />;', STYLE],
  ['<body> text colour', 'export const a = <body text="red" />;', COLOUR],
  ['a var() with a fallback colour', 'export const a = <svg><path fill="var(--accent, #ff0000)" /></svg>;', COLOUR],
  ['style prop', "export const a = <p style={{ borderRadius: 3, fontFamily: 'Arial' }}>x</p>;", STYLE],
  ['createElement style object', "import { createElement } from 'react';\nexport const a = createElement('p', { style: { fontFamily: 'Arial' } });", STYLE],
  ['computed style key', "import { createElement } from 'react';\nexport const a = createElement('p', { ['style']: {} });", STYLE],
  ['<style> element', "export const a = <style>{'p { margin: 0 }'}</style>;", STYLE],
  ['createElement("style")', "import { createElement } from 'react';\nexport const a = createElement('style', null, 'p{margin:0}');", STYLE],
  ['createElement(`style`)', "import { createElement } from 'react';\nexport const a = createElement(`style`);", STYLE],
  ['dangerouslySetInnerHTML', "export const a = <div dangerouslySetInnerHTML={{ __html: '<b>x</b>' }} />;", STYLE],
  ['DOM style assignment', "document.body.style.background = 'black';", STYLE],
  ['setProperty on a token', "document.documentElement.style.setProperty('--bg', 'black');", STYLE],
  ['bracket style access', "document.body['style'].margin = '0';", STYLE],
  ['innerHTML', "document.body.innerHTML = '<p>x</p>';", STYLE],
  ['setAttribute("style")', "document.body.setAttribute('style', 'margin:0');", STYLE],
  ['theme-color meta tag', 'export const a = <meta name="theme-color" content="black" />;', COLOUR],
  ['msapplication-TileColor', "export const metadata = { other: { 'msapplication-TileColor': 'black' } };", COLOUR],
  ['SVG animate to a colour', 'export const a = <svg><animate attributeName="fill" to="red" /></svg>;', STYLE],
  ['insertRule CSS text', "document.styleSheets[0].insertRule('p{filter:drop-shadow(0 0 2px red)}');", STYLE],
  ['feFlood floodColor', 'export const a = <svg><feFlood floodColor="red" /></svg>;', COLOUR],
];
// Copy, anchors and token-valued slots that must stay legal (round-2 false positives included).
const GOOD = [
  '<p className="muted">red flags and black-letter law</p>', '<a href="/services#add-ons">Add-ons</a>',
  '<p>Fixed in PR #350 and issue #128.</p>', '<p>Pick any color(s) you like.</p>', "{ tone: 'red', link: '/services' }",
  "'Pick any color(s) you like.'", "'Status: green light'", '<svg><rect fill="currentColor" stroke="none" /></svg>',
  '<svg><path fill="var(--accent)" /></svg>', '<svg><rect fill="url(#g)" /></svg>', '<Cta text="Book a call" link="/contact" />',
  "'Background: red light ahead'", "{ themeColor: 'var(--bg)', color: 'inherit' }", '<a className="skip" href="#main">Skip</a>',
];

const FILES = ['app/x.tsx', 'app/x.ts', 'app/x.mts', 'app/x.cts', 'components/x.jsx', 'components/x.js', 'components/x.mjs', 'components/x.cjs', 'content/site.ts'];
let results: string[][];
beforeAll(() => {
  results = lintAll([...BAD.map(([, code]) => ['components/Probe.tsx', code] as [string, string]),
    ...FILES.map((f) => [f, "export const a = '#00ff00';"] as [string, string]),
    ...GOOD.map((g) => ['app/x.tsx', `export const a = ${g};`] as [string, string]),
    ['scripts/x.mjs', "export const a = '#00ff00';"]]);
}, 60_000);
const lint = (i: number) => results[i];

describe('ESLint: colour only from tokens, no inline style, in app/, components/ and content/', () => {
  it.each(BAD.map(([name, , kind], i) => [name, i, kind] as const))('flags %s', (_, i, kind) => {
    expect(lint(i)).toEqual(expect.arrayContaining([expect.stringMatching(kind)]));
  });

  it.each(FILES.map((f, i) => [f, BAD.length + i] as const))('applies to %s', (_, i) => {
    expect(lint(i)).toEqual([expect.stringMatching(COLOUR)]);
  });

  it.each(GOOD.map((g, i) => [g, BAD.length + FILES.length + i] as const))('leaves alone: %s', (_, i) => {
    expect(lint(i)).toEqual([]);
  });

  it('does not apply outside app/, components/ and content/ (styles live in CSS, scripts are tooling)', () => {
    expect(lint(BAD.length + FILES.length + GOOD.length)).toEqual([]);
  });
});
