import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import LITERALS from '@/scripts/colour-literals.json';

const repo = join(__dirname, '..', '..');
const styles = join(repo, 'styles');
const read = (f: string) => readFileSync(join(styles, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** [property, value] pairs of `css` with a colour literal in the value; only a bare `var(--token)` is stripped. */
function colourLiterals(css: string): string[][] {
  const colour = new RegExp(`${LITERALS.hex}|${LITERALS.functions}|\\b(?:${LITERALS.named.join('|')})\\b`, 'i');
  return [...css.matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)].map((m) => [m[1], m[2].trim()])
    .filter(([, v]) => colour.test(v.replace(/var\(--[\w-]+\)/g, '')));
}

type Block = { scheme: 'light' | 'dark'; selector: string; decls: Map<string, string> };

/** Tokens files are `:root {…}` plus `@media (prefers-color-scheme: dark) { :root {…} }`, nothing else. */
function parse(css: string): Block[] {
  const out: Block[] = [];
  const re = /(@media[^{]*\{)?\s*([^{}@]+)\{([^{}]*)\}\s*(\})?/g;
  let m: RegExpExecArray | null; let consumed = '';
  while ((m = re.exec(css))) {
    consumed += m[0];
    const scheme = m[1] ? (/prefers-color-scheme:\s*dark/.test(m[1]) ? 'dark' : 'other') : 'light';
    if (scheme === 'other') throw new Error(`unexpected at-rule ${m[1]}`);
    const decls = new Map<string, string>();
    for (const d of m[3].split(';').map((s) => s.trim()).filter(Boolean)) {
      const i = d.indexOf(':');
      decls.set(d.slice(0, i).trim(), d.slice(i + 1).trim());
    }
    out.push({ scheme, selector: m[2].trim(), decls });
  }
  expect(consumed.replace(/\s/g, '')).toBe(css.replace(/\s/g, '')); // nothing outside the blocks
  return out;
}

const sets = (blocks: Block[]) => ({
  light: [...(blocks.find((b) => b.scheme === 'light')?.decls.keys() ?? [])].sort(),
  dark: [...(blocks.find((b) => b.scheme === 'dark')?.decls.keys() ?? [])].sort(),
});

const COLOURS = ['--bg', '--surface', '--ink', '--muted', '--line', '--accent', '--accent-ink', '--ok', '--wait', '--stop'];
const TOKENS = [...COLOURS, '--font-display', '--font-body', '--radius-card', '--radius-control', '--shadow-raised'].sort();
const DARK = [...COLOURS, '--shadow-raised'].sort();
const DIRECTIONS = ['case-file.css', 'chambers.css', 'protocol.css'];
const base = parse(read('tokens.css'));

/** WCAG relative luminance. Colour tokens must be lowercase #rrggbb, so nothing can parse to NaN. */
function luminance(hex: string): number {
  if (!/^#[0-9a-f]{6}$/.test(hex)) throw new Error(`colour token is not #rrggbb: ${hex}`);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  const ratio = (x + 0.05) / (y + 0.05);
  if (!Number.isFinite(ratio)) throw new Error(`non-finite contrast for ${a} / ${b}`);
  return ratio;
};
// Text pairs that must meet WCAG AA (4.5:1) in every file and both schemes.
const PAIRS: [string, string][] = [['--ink', '--bg'], ['--ink', '--surface'], ['--muted', '--bg'], ['--muted', '--surface'],
  ['--accent', '--bg'], ['--accent', '--surface'], ['--accent-ink', '--accent'],
  ['--ok', '--surface'], ['--wait', '--surface'], ['--stop', '--surface'], ['--ok', '--bg'], ['--wait', '--bg'], ['--stop', '--bg']];
// Non-text (WCAG 1.4.11, 3:1): the focus ring is --accent (globals.css) on either background. --line is
// decorative only (card and section separators, never the sole boundary of a control: the site has none).
const RING: [string, string][] = [['--accent', '--bg'], ['--accent', '--surface']];
const FILES = ['tokens.css', ...DIRECTIONS.map((d) => `directions/${d}`)];
const merged = (file: string) => parse(read(file)).map((block) =>
  ({ scheme: block.scheme, all: new Map([...parse(read(file))[0].decls, ...block.decls]) }));

describe('design tokens', () => {
  it('tokens.css declares exactly the semantic token set, light and dark', () => {
    expect(sets(base)).toEqual({ light: TOKENS, dark: DARK });
  });

  it('there are exactly the three planned direction files', () => {
    expect(readdirSync(join(styles, 'directions')).sort()).toEqual(DIRECTIONS);
  });

  it.each(DIRECTIONS)('%s declares exactly the tokens.css set, on :root, and nothing else', (file) => {
    const blocks = parse(read(`directions/${file}`));
    expect(blocks.map((b) => [b.scheme, b.selector])).toEqual([['light', ':root'], ['dark', ':root']]);
    expect(sets(blocks)).toEqual(sets(base));
  });

  it.each(FILES)('%s colour tokens are all lowercase #rrggbb (no alpha, no other syntax)', (file) => {
    for (const { scheme, all } of merged(file)) {
      const bad = COLOURS.filter((c) => !/^#[0-9a-f]{6}$/.test(all.get(c) ?? '')).map((c) => [scheme, c, all.get(c)]);
      expect(bad).toEqual([]);
    }
  });

  it.each(FILES)('%s text colours meet WCAG AA (4.5:1) and the focus ring 3:1', (file) => {
    for (const { scheme, all } of merged(file)) {
      const ratio = ([fg, bg]: [string, string]) => [scheme, fg, bg, contrast(all.get(fg)!, all.get(bg)!)] as const;
      expect(PAIRS.map(ratio).filter(([, , , r]) => r < 4.5)).toEqual([]);
      expect(RING.map(ratio).filter(([, , , r]) => r < 3)).toEqual([]);
    }
  });

  it('the contrast check rejects what it cannot measure', () => {
    for (const bad of ['rgb(250, 250, 250)', 'white', '#1a1f2b00', '#fff', 'oklch(0.9 0 0)', 'var(--bg)']) {
      expect(() => contrast(bad, '#ffffff')).toThrow(/not #rrggbb/);
    }
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('the globals scan sees literals in var() fallbacks, and only bare var(--token) is exempt', () => {
    expect(colourLiterals('body { color: var(--ink, #ff0000); background: var(--bg, red); border-color: var(--line) }'))
      .toEqual([['color', 'var(--ink, #ff0000)'], ['background', 'var(--bg, red)']]);
  });

  it('globals.css uses tokens only: no colour literal, type/radius/shadow via tokens, every var() a token', () => {
    const css = read('globals.css');
    expect(colourLiterals(css)).toEqual([]);
    const raw = [...css.matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)].map((m) => [m[1], m[2].trim()]);
    const needs: Record<string, RegExp> = { 'font-family': /^var\(--font-/, font: /var\(--font-|^inherit$/,
      'border-radius': /^var\(--radius-/, 'box-shadow': /^var\(--shadow-|^none$/ };
    expect(raw.filter(([p, v]) => needs[p] && !needs[p].test(v))).toEqual([]);
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:[^;]*var\(--accent\)/); // the RING pair above
    const used = [...new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]))];
    expect(used.filter((v) => !TOKENS.includes(v))).toEqual([]);
  });

  it('CSS lives only in styles/ (tokens, globals, directions): no CSS file or module anywhere else', () => {
    const css = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '*.css', '*.scss', '*.sass', '*.less'],
      { cwd: repo, encoding: 'utf8' }).split('\n').filter((f) => f && !f.startsWith('public/demo/biglaw/')).sort(); // vendored build
    expect(css).toEqual(['styles/globals.css', 'styles/tokens.css', ...DIRECTIONS.map((d) => `styles/directions/${d}`)].sort());
  });

  it('app/icon.svg uses only light-scheme token colours (a favicon cannot read CSS variables)', () => {
    const svg = readFileSync(join(repo, 'app', 'icon.svg'), 'utf8');
    const light = new Set([...base[0].decls].filter(([k]) => COLOURS.includes(k)).map(([, v]) => v));
    const paints = [...svg.matchAll(/(?:fill|stroke|stop-color|color)\s*[=:]\s*"?([^";\s>]+)/g)].map((m) => m[1].toLowerCase());
    expect(paints.length).toBeGreaterThan(0);
    expect(paints.filter((p) => !light.has(p))).toEqual([]);
    expect(svg).not.toMatch(/style\s*=|<style/);
  });
});
