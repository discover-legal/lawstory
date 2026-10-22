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
    expect(order).toContain('no family debts to be allocated');
    expect(order).toContain('schedule: weekdays with the Applicant and every other weekend with the Respondent. In the absence');
    expect(order).not.toContain('confirm whether you and your spouse have any');
  });

  it('previews show the PDF\'s blank line for a missing value, never a [TOKEN], drafter note or US idiom', () => {
    expect(JSON.stringify(REC.sections)).not.toMatch(/\[[A-Z][A-Z /_-]{2,40}\]|\[SCHEDULE|Drafter note|\bcommunity\b|\bmarital\b/);
    const kids = text(TURNS, 'divorce_petition');
    expect(kids).toContain('"content":"(a) Anika Okafor, born September 2, 2016","type":"child_item"');
    expect(kids).not.toContain('Child 1:');
    expect(text(TURNS, 'divorce_petition')).toContain('Court File No. ______________');
  });

  it('a relief item renders only once the interview recorded a fact or request that supports it', () => {
    const relief = (s: number) => ((previewAt(s, 'divorce_petition')!.sections.reliefRequested as { items: { content: string; letter?: string }[] })
      .items.filter((i) => i.letter));
    for (let s = 1; s <= TURNS; s++) {
      const facts = docAt(s).facts.map((f) => f.content).join(' ');
      const items = relief(s).map((i) => i.content).join(' ');
      expect(relief(s).map((i) => i.letter).join('')).toBe('abcdefgh'.slice(0, relief(s).length));
      expect(items).not.toMatch(/matrimonial home|debts|spousal support/); // no possession or debt request, no waiver recorded
      expect(/net family properties/.test(items)).toBe(/jointly own/.test(facts));
      expect(/parenting order/.test(items)).toBe(/two children/.test(facts));
      expect(/child support order/.test(items)).toBe(/Child support will follow/.test(facts));
    }
    expect(relief(TURNS).map((i) => i.content.slice(0, 18))).toEqual(['A divorce order pu', 'Equalization of ne', 'A parenting order ',
      'A child support or', 'Such further and o']);
    // Before the facts exist, the drafts hold blanks, not claims, findings or orders.
    const first = text(1, 'divorce_petition') + text(1, 'divorce_decree');
    expect(first).not.toMatch(/no (minor )?children|separate and apart for|parties own property|Okafor, (was served|accepted)|ORDERS that each party (retains|shall be responsible)|child support shall/);
  });

  it('reads as an Ontario pleading and order: articles, Ontario wording and full citations', () => {
    const all = JSON.stringify(REC.sections);
    expect(all).not.toMatch(/\b(by|and|to|with|of|that) (Applicant|Respondent)\b|(^|\\n|")(Applicant|Respondent), (?!Self-Represented)/);
    expect(all).not.toMatch(/IT IS ORDERED|habitually|Venue is proper|JUDGE PRESIDING|none are expected|resident of \d|hearing the parties|c\. 3(?! \(2nd Supp\.\))/);
    expect(all).not.toMatch(/health and dental|disposes of all matters|not expressly granted is dismissed/); // nothing recorded; property still open
    const final = text(TURNS, 'divorce_petition') + text(TURNS, 'divorce_decree');
    expect(final).not.toContain('child(ren)');
    for (const s of ['by the Applicant and the Respondent', 'The Applicant, Priya Nair, resides in Toronto', 'ordinarily resident in Ontario',
      'THIS COURT ORDERS that Priya Nair and Daniel Okafor, who were married in Toronto, Ontario, on June 14, 2014, are divorced',
      'are not determined by this Order', 'Daniel Okafor shall pay to Priya Nair child support']) expect(final).toContain(s);
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
  it('every recorded draft has exactly its PDF\'s pages, and keeps every section title', () => {
    const at = (s: number, sub: 'divorce_petition' | 'divorce_decree') => paginate(previewAt(s, sub)!.sections, sub, previewAt(s, sub)!.breaks);
    for (const sub of ['divorce_petition', 'divorce_decree'] as const) {
      expect(at(TURNS, sub).length).toBe(REC.pdfs[sub].pages);
      for (let s = 1; s <= TURNS; s++) expect(at(s, sub).every((pg) => pg.content.length > 0)).toBe(true);
    }
    // A paragraph the PDF carries over is split at the same word, nothing lost.
    const [p1, p2] = at(TURNS, 'divorce_decree');
    const head = p1.content.at(-1)!; const tail = p2.content[0];
    expect([head.split, tail.split]).toEqual(['head', 'tail']);
    expect(`${head.content} ${tail.content}`).toContain('are divorced pursuant to section 8 of the Divorce Act');
    const pages = at(TURNS, 'divorce_petition');
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
