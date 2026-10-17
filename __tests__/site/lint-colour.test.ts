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
const BAD: [string, string][] = [
  ['hex in a string', "export const a = '#ABCDEF';"],
  ['short hex', "export const a = '#f00';"],
  ['rgb()', "export const a = 'rgb(1, 2, 3)';"],
  ['hwb()', "export const a = 'hwb(0 0% 0%)';"],
  ['color()', "export const a = 'color(srgb 1 0 0)';"],
  ['color-mix()', "export const a = 'color-mix(in srgb, red 50%, blue)';"],
  ['oklch() in a template', 'export const a = `oklch(0.9 0 0)`;'],
  ['hex in JSX text', 'export const a = <p>#123456</p>;'],
  ['named colour in an SVG fill', 'export const a = <svg><rect fill="crimson" /></svg>;'],
  ['named colour in a colour property', "export const a = { backgroundColor: 'White' };"],
];

const FILES = ['app/x.tsx', 'app/x.ts', 'components/x.jsx', 'components/x.js', 'components/x.mjs'];
const STYLES = ["export const a = <p style={{ borderRadius: 3, fontFamily: 'Arial' }}>x</p>;",
  "import { createElement } from 'react';\nexport const a = createElement('p', { style: { fontFamily: 'Arial' } });",
  "export const a = <style>{'p { color: red }'}</style>;"];
const OK = "export const a = <p className=\"muted\">red flags and black-letter law</p>;\nexport const t = { tone: 'red' };";
let results: string[][];
beforeAll(() => {
  results = lintAll([...BAD.map(([, code]) => ['components/Probe.tsx', code] as [string, string]),
    ...FILES.map((f) => [f, "export const a = '#00ff00';"] as [string, string]),
    ['app/x.tsx', OK], ['scripts/x.mjs', "export const a = '#00ff00';"],
    ...STYLES.map((code) => ['app/x.tsx', code] as [string, string])]);
}, 60_000);
const lint = (i: number) => results[i];

describe('ESLint: no colour literal (or inline style) in app/ and components/', () => {
  it.each(BAD.map(([name], i) => [name, i] as const))('flags %s', (_, i) => {
    expect(lint(i)).toEqual([expect.stringMatching(COLOUR)]);
  });

  it.each(FILES.map((f, i) => [f, BAD.length + i] as const))('applies to %s', (_, i) => {
    expect(lint(i)).toEqual([expect.stringMatching(COLOUR)]);
  });

  it.each(STYLES.map((code, i) => [code.split('\n').at(-1)!, BAD.length + FILES.length + 2 + i] as const))(
    'flags inline style (type, radius and shadow included): %s', (_, i) => {
      expect(lint(i)).toEqual(expect.arrayContaining([expect.stringMatching(/^Inline style/)]));
    });

  it('leaves copy and non-colour props alone', () => {
    expect(lint(BAD.length + FILES.length)).toEqual([]);
  });

  it('does not apply outside app/ and components/ (styles live in CSS, scripts are tooling)', () => {
    expect(lint(BAD.length + FILES.length + 1)).toEqual([]);
  });
});
