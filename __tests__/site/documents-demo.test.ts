import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chatTurn, DOC_NAME, docAt, phaseAt, previewAt, questionAt, REC, score, suggestionAt, TURNS } from '@/components/demo/documents/engine';
import { paginate } from '@/components/demo/documents/paginate';

// The Documents demo: a recorded engine behind the ported editor. It must replay the recording, keep
// off-script input on the recorded question, and never reach the network.
const repo = join(__dirname, '..', '..');
const text = (step: number, sub: 'divorce_petition' | 'divorce_decree') => JSON.stringify(previewAt(step, sub));

describe('recording', () => {
  it('names its source commit and holds a full Ontario interview with drafts at every turn', () => {
    expect(REC.source).toBe('c34b131');
    expect(TURNS).toBeGreaterThanOrEqual(10);
    for (let s = 1; s <= TURNS; s++) {
      expect(previewAt(s, 'divorce_petition')?.sections.title).toBe('APPLICATION FOR DIVORCE');
      expect(previewAt(s, 'divorce_decree')?.sections.title).toBe('DIVORCE ORDER');
    }
    expect(previewAt(0, 'divorce_petition')).toBeNull();
  });

  it('the final drafts carry the recorded facts and no unfilled name placeholders', () => {
    const p = text(TURNS, 'divorce_petition');
    for (const s of ['PRIYA NAIR', 'DANIEL OKAFOR', 'June 14, 2014', 'March 3, 2024', 'Anika Okafor', '8(2)(a)']) expect(p).toContain(s);
    expect(text(TURNS, 'divorce_decree')).toContain('Divorce Act');
    expect(p + text(TURNS, 'divorce_decree')).not.toMatch(/\[(PETITIONER|RESPONDENT|APPLICANT) NAME\]/);
  });

  it('facts only grow, and each recorded line matches its own turn', () => {
    for (let s = 1; s <= TURNS; s++) {
      expect(docAt(s).facts.length).toBeGreaterThanOrEqual(docAt(s - 1).facts.length);
      expect(score(REC.turns[s - 1].say, REC.turns[s - 1].topics)).toBeGreaterThan(0);
    }
    expect(docAt(TURNS).facts.length).toBeGreaterThanOrEqual(10);
  });

  it('uses Ontario\'s document names, and the Divorce Order states the no-debts finding the profile merge confirmed', () => {
    expect(DOC_NAME).toEqual({ divorce_petition: 'Application', divorce_decree: 'Divorce Order' });
    expect(Object.values(REC.pdfs).map((p) => p.href)).toEqual(['/drafts/ontario-application-draft.pdf', '/drafts/ontario-divorce-order-draft.pdf']);
    expect(questionAt(0)).toContain('Application for divorce and your Divorce Order');
    const all = JSON.stringify(REC.sections) + REC.welcome + REC.turns.map((t) => t.reply).join(' ');
    expect(all).not.toMatch(/\b(Petition|Decree)\b/);
    const order = text(TURNS, 'divorce_decree');
    expect(order).toContain('no community debts to be allocated');
    expect(order).not.toContain('confirm whether you and your spouse have any');
  });

  it('previews show the PDF\'s blank line for a missing value, never a [TOKEN]', () => {
    expect(JSON.stringify(REC.sections)).not.toMatch(/\[[A-Z][A-Z /_-]{2,40}\]/);
    expect(text(TURNS, 'divorce_petition')).toContain('Court File No. ______________');
  });

  it('the trail is the Ontario interview\'s own phases, in order, ending complete', () => {
    expect(REC.phases.map((p) => p.id)).toEqual(['INTAKE', 'RESIDENCY', 'GROUNDS', 'CHILDREN', 'PROPERTY', 'SUPPORT', 'SERVICE', 'REVIEW']);
    expect(phaseAt(0)).toMatchObject({ index: 0, total: 8, done: false, phase: { name: 'Getting Started' } });
    for (let s = 1; s <= TURNS; s++) expect(phaseAt(s).index).toBeGreaterThanOrEqual(phaseAt(s - 1).index);
    expect(phaseAt(TURNS)).toMatchObject({ index: 7, done: true });
  });

  it('ships both draft PDFs it points at', () => {
    for (const { href } of Object.values(REC.pdfs)) {
      const f = join(repo, 'public', href);
      expect(existsSync(f)).toBe(true);
      expect(readFileSync(f).subarray(0, 5).toString()).toBe('%PDF-');
    }
  });
});

describe('recorded engine', () => {
  it('plays the recorded turn for the recorded line, or for the visitor\'s own words on the same topic', () => {
    const r = chatTurn(suggestionAt(0)!, 0);
    expect(r).toMatchObject({ outcome: 'played', step: 1, response: REC.turns[0].reply });
    expect(r.newFacts.length).toBe(docAt(1).facts.length);
    expect(chatTurn('My name is Sam Lee and my wife is Jo', 0)).toMatchObject({ outcome: 'played', step: 1 });
  });

  it('off-script input stays on the recorded question with a note', () => {
    const r = chatTurn('what is the weather like', 3);
    expect(r).toMatchObject({ outcome: 'off_script', step: 3, affidavitData: docAt(3), newFacts: [] });
    expect(r.response).toContain('recorded demo');
    expect(r.response.endsWith(questionAt(3))).toBe(true);
  });

  it('a later topic is held for its turn, and a finished recording says so', () => {
    expect(chatTurn('we own a condo and a car and have no debts', 1)).toMatchObject({ outcome: 'out_of_order', step: 1 });
    expect(chatTurn('hello', TURNS)).toMatchObject({ outcome: 'finished', step: TURNS });
  });

  it('a whole interview of recorded lines reaches the end', () => {
    let step = 0;
    while (suggestionAt(step)) step = chatTurn(suggestionAt(step)!, step).step;
    expect(step).toBe(TURNS);
  });
});

describe('preview pagination (port of the v1 DocumentPreview)', () => {
  it('breaks the final petition into several pages and keeps every section title', () => {
    const pages = paginate(previewAt(TURNS, 'divorce_petition')!.sections, 'divorce_petition', (t) => 24 * Math.ceil((t.length || 1) / 70));
    expect(pages.length).toBeGreaterThan(1);
    const titles = pages.flatMap((p) => p.content).filter((b) => b.type === 'section-title').map((b) => b.content);
    expect(titles).toEqual(expect.arrayContaining(['I. PARTIES', 'IV. GROUNDS FOR DIVORCE']));
    expect(pages[0].content[0]).toMatchObject({ type: 'filerBlock', content: expect.stringContaining('Applicant, Self-Represented') });
  });
});

describe('the demo never reaches the network', () => {
  const NET = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|\bimport\s*\(/;
  it('no network API in the demo source', () => {
    const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', 'components/demo', 'app/demo/discover-legal'],
      { cwd: repo, encoding: 'utf8' }).split('\n').filter((f) => /\.tsx?$/.test(f));
    expect(files.length).toBeGreaterThan(4);
    expect(files.filter((f) => NET.test(readFileSync(join(repo, f), 'utf8')))).toEqual([]);
  });

  // After `npm run build` (CI builds after testing, so smoke.mjs repeats this against the served chunks).
  const chunks = join(repo, '.next', 'static', 'chunks');
  (existsSync(chunks) ? it : it.skip)('no network API in the built chunks that carry the recording', () => {
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.js') ? [join(d, e.name)] : []));
    const demo = walk(chunks).map((f) => readFileSync(f, 'utf8')).filter((js) => js.includes('88 Harbour Street'));
    expect(demo.length).toBeGreaterThan(0);
    expect(demo.filter((js) => /\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(js))).toEqual([]);
  });
});
