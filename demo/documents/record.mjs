// Builds the Documents demo's recording (owner-run tooling; never part of `npm run build`).
//
//   node demo/documents/record.mjs            # extracts the v1 app at c34b131, installs its lockfile, records
//   V1_DIR=/path/to/v1 node demo/documents/record.mjs   # reuse an extracted + installed copy
//
// There is NO recorded real-model run of an Ontario interview in this repo's history (the persona
// replays kept their transcripts outside git). So this script makes the recording the way the brief
// allows: the client's lines (persona.mjs, adapted from e2e/drive-persona.mjs at c34b131) and the
// model's per-turn tool call (reply wording + extracted fields) are SCRIPTED, the reply questions
// taken from the v1 Ontario interview script (services/agents/prompts/onDivorce). Everything after
// that is the real v1 code at c34b131, run offline with no model: ONDivorceOrchestrator.processMessage
// (field merge, fact building, phase advance, document selection), StateTemplateManager +
// templates/states/ontario (every word of the draft preview), lib/api/documentStructure +
// services/pdfService (the two draft PDFs). The fake LLM below is the same pattern as e2e/fakeLLM.js.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PERSONA, SOURCE_COMMIT } from './persona.mjs';

const repo = new URL('../..', import.meta.url).pathname;
let v1 = process.env.V1_DIR;
if (!v1) {
  v1 = mkdtempSync(join(tmpdir(), 'v1-'));
  execFileSync('sh', ['-c', `git archive ${SOURCE_COMMIT} | tar -x -C "${v1}"`], { cwd: repo });
  execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: v1, stdio: 'inherit' });
}
const req = createRequire(join(v1, 'package.json'));
process.chdir(v1); // v1's TemplateLoader resolves templates/ from the working directory

// Frozen clock (the c34b131 commit date) so ids, timestamps and "today" are reproducible.
const FROZEN = Date.parse('2026-09-22T12:00:00Z');
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...a) { super(...(a.length ? a : [FROZEN])); }
  static now() { return FROZEN; }
};
let seed = 1;
Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
process.env.LOG_LEVEL = 'error';

let scripted = null;
globalThis.openAIService = {
  async chat(_messages, opts) {
    if (opts?.tools?.[0]?.function?.name === 'process_phase_data') {
      return { choices: [{ message: { tool_calls: [{ function: { name: 'process_phase_data', arguments: JSON.stringify(scripted) } }] } }] };
    }
    return { choices: [{ message: { content: '{}' } }] }; // companion promoter: no backfill (fails open, as in v1)
  },
};

const orchestrator = req('./services/agents/ONDivorceOrchestrator');
const { initializeTemplates } = req('./templates/initialize');
const { StateTemplateManager } = req('./templates/StateTemplateManager');
const templateManager = new StateTemplateManager({ registry: await initializeTemplates() });
const jiti = req('jiti')(join(v1, 'package.json'), { alias: { '@': v1 } });
const { buildDocumentStructure } = jiti('./lib/api/documentStructure.ts');
const PDFService = req('./services/pdfService');
const routeSrc = readFileSync(join(v1, 'app/api/documents/generate/route.ts'), 'utf8');
const DENY = [...routeSrc.matchAll(/\{ token: '([^']+)',\s*missing: '([^']+)' \}/g)].map((m) => m[1]);

const SUBDOCS = ['divorce_petition', 'divorce_decree'];
// Same three lines as mapDivorceDataFields in app/api/documents/preview/route.ts at c34b131.
const mapNames = (d) => {
  const x = { ...d };
  if (!x.petitionerName && (x.petitionerFirstName || x.petitionerLastName)) x.petitionerName = [x.petitionerFirstName, x.petitionerLastName].filter(Boolean).join(' ');
  if (!x.respondentName && (x.respondentFirstName || x.respondentLastName)) x.respondentName = [x.respondentFirstName, x.respondentLastName].filter(Boolean).join(' ');
  return x;
};
const prune = (v) => {
  if (Array.isArray(v)) return v.map(prune);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).filter(([k, x]) => x !== null && x !== undefined && k !== 'nextParagraphNumber').map(([k, x]) => [k, prune(x)]));
  }
  return v;
};
const KEEP = ['documentType', 'state', 'county', 'petitionerFirstName', 'petitionerLastName', 'petitionerName', 'respondentFirstName',
  'respondentLastName', 'respondentName', 'affiantName', 'marriageDate', 'marriageCity', 'separationDate', 'groundsForDivorce', 'caseNumber',
  'requiredDocuments'];
const docView = (d) => ({
  ...Object.fromEntries(KEEP.filter((k) => d[k] !== undefined && d[k] !== null).map((k) => [k, d[k]])),
  phase: d.orchestratorState?.currentPhase,
  facts: (d.facts ?? []).map((f) => ({ content: f.content, category: f.category, quote: f.sourceQuote })),
});

// Sections repeat across turns, so each distinct section is stored once and turns refer to it by index.
const sections = [];
const seen = new Map();
const intern = (sec) => {
  const key = JSON.stringify(sec);
  if (!seen.has(key)) { seen.set(key, sections.length); sections.push(sec); }
  return seen.get(key);
};

let data = { documentType: 'divorce_package', state: 'ON' }; // single active jurisdiction is set client-side (c34b131 ChatInterface)
const history = [];
const turns = [];
for (const t of PERSONA.turns) {
  scripted = t.model;
  const out = await orchestrator.processMessage(t.say, history.slice(-10), data, 'demo', 'demo');
  data = out.affidavitData;
  history.push({ role: 'user', content: t.say }, { role: 'assistant', content: out.response });
  const preview = Object.fromEntries(SUBDOCS.map((s) =>
    [s, Object.fromEntries(Object.entries(prune(templateManager.generateDocument('ON', s, mapNames({ ...data, activeSubDocument: s })).sections))
      .map(([k, sec]) => [k, intern(sec)]))]));
  turns.push({ say: t.say, topics: t.topics, reply: out.response, doc: docView(data), preview });
}

// Draft PDFs of the final recorded state, through the real generate path (minus auth/payment/DB).
const outDir = join(repo, 'public', 'drafts');
mkdirSync(outDir, { recursive: true });
const pdfs = {};
for (const s of SUBDOCS) {
  const structure = buildDocumentStructure(templateManager, 'ON', { ...data, activeSubDocument: s });
  const missing = DENY.filter((tok) => JSON.stringify(structure).includes(tok));
  if (missing.length) throw new Error(`${s}: the generate route would refuse this draft (${missing.join(', ')})`);
  const r = await new PDFService({ templateManager }).generatePDF(structure, { documentId: 1, userId: 1 });
  const name = `ontario-${s.replace('divorce_', '')}-draft.pdf`;
  copyFileSync(r.filepath, join(outDir, name));
  pdfs[s] = { href: `/drafts/${name}`, pages: r.pages };
}

const recording = { source: SOURCE_COMMIT, recordedAt: new RealDate(FROZEN).toISOString().slice(0, 10), client: PERSONA.client,
  welcome: PERSONA.welcome, pdfs, sections, turns };
const file = join(repo, 'demo', 'documents', 'recording.json');
writeFileSync(file, `${JSON.stringify(recording)}\n`);
console.log(`wrote ${file} (${turns.length} turns) and ${Object.keys(pdfs).length} PDFs; v1 at ${v1}${existsSync(v1) ? '' : ' (gone)'}`);
