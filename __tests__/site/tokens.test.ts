import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const styles = join(__dirname, '..', '..', 'styles');
const read = (f: string) => readFileSync(join(styles, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

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

function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const full = v.length === 3 ? [...v].map((c) => c + c).join('') : v;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
// Text pairs that must meet WCAG AA (4.5:1) in every file and both schemes.
const PAIRS: [string, string][] = [['--ink', '--bg'], ['--ink', '--surface'], ['--muted', '--bg'], ['--muted', '--surface'],
  ['--accent', '--bg'], ['--accent', '--surface'], ['--accent-ink', '--accent'],
  ['--ok', '--surface'], ['--wait', '--surface'], ['--stop', '--surface']];

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

  it.each(['tokens.css', ...DIRECTIONS.map((d) => `directions/${d}`)])('%s text colours meet WCAG AA', (file) => {
    for (const block of parse(read(file))) {
      const all = new Map([...parse(read(file))[0].decls, ...block.decls]);
      const failing = PAIRS.map(([fg, bg]) => [block.scheme, fg, bg, contrast(all.get(fg)!, all.get(bg)!)] as const)
        .filter(([, , , ratio]) => ratio < 4.5);
      expect(failing).toEqual([]);
    }
  });

  it('globals.css uses tokens only: no colour literals, and every var() it reads is a token', () => {
    const css = read('globals.css');
    expect(css.match(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(|\b(?:white|black)\b/gi)).toBeNull();
    const used = [...new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]))];
    expect(used.filter((v) => !TOKENS.includes(v))).toEqual([]);
  });
});
