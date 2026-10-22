import recording from '@/demo/documents/recording.json';
import type { Break } from './paginate';

// The recorded engine: stands in for the two API calls the v1 editor made (POST /api/chat and
// POST /api/documents/preview, c34b131) with answers read from demo/documents/recording.json.
// Pure and synchronous: no network, no storage. The visitor's text only selects a recorded turn.
export type Section = Record<string, unknown>;
export type Sections = Record<string, Section | string>;
export type Fact = { content: string; category?: string; quote?: string };
export type DemoDoc = {
  documentType?: string; state?: string; county?: string; phase?: string; caseNumber?: string;
  petitionerFirstName?: string; petitionerLastName?: string; petitionerName?: string;
  respondentFirstName?: string; respondentLastName?: string; respondentName?: string; affiantName?: string;
  marriageDate?: string; separationDate?: string; requiredDocuments?: string[]; facts: Fact[];
};
export type SubDocument = 'divorce_petition' | 'divorce_decree';
type Turn = { say: string; topics: string[]; reply: string; doc: DemoDoc; preview: Record<SubDocument, Record<string, number>>;
  breaks: Record<SubDocument, Break[]> };
export type Phase = { id: string; name: string };
type Recording = { source: string; recordedAt: string; client: string; welcome: string; sections: Section[];
  pdfs: Record<SubDocument, { href: string; pages: number }>; phases: Phase[]; turns: Turn[] };

export const REC = recording as unknown as Recording;
export const TURNS = REC.turns.length;
export const EMPTY_DOC: DemoDoc = { documentType: 'divorce_package', state: 'ON', facts: [] };
/** Ontario's names for the two drafts (the v1 package called them Petition and Decree). */
export const DOC_NAME: Record<SubDocument, string> = { divorce_petition: 'Application', divorce_decree: 'Divorce Order' };
export const PROVINCE: Record<string, string> = { ON: 'Ontario' };

/** The interview phase at `step` (every interview starts in the first) and the recorded phase list. */
export const phaseAt = (step: number) => {
  const i = step === 0 ? 0 : REC.phases.findIndex((p) => p.id === REC.turns[step - 1].doc.phase);
  return { index: i, phase: REC.phases[i] ?? null, total: REC.phases.length, done: step >= TURNS };
};

export type Outcome = 'played' | 'out_of_order' | 'off_script' | 'finished';
export type ChatResult = { response: string; step: number; affidavitData: DemoDoc; newFacts: Fact[]; outcome: Outcome };

const norm = (s: string) => ` ${s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
/** How many of a recorded turn's topic words start a word in the visitor's text. */
export const score = (text: string, topics: string[]) => topics.filter((t) => norm(text).includes(` ${t}`)).length;

/** The recorded state after `step` turns (0 = nothing said yet). */
export const docAt = (step: number): DemoDoc => (step === 0 ? EMPTY_DOC : REC.turns[step - 1].doc);
/** The question the recording is waiting on at `step`. */
export const questionAt = (step: number) => (step === 0 ? REC.welcome : REC.turns[step - 1].reply);
export const suggestionAt = (step: number): string | null => REC.turns[step]?.say ?? null;

/** One chat turn: nearest recorded answer for the next step, else the recorded question again with a note. */
export function chatTurn(message: string, step: number): ChatResult {
  const here = docAt(step);
  if (step >= TURNS) {
    return { response: 'The recorded interview is complete. Open the preview to read the drafts or download them as PDFs, or press Reset to start again.',
      step, affidavitData: here, newFacts: [], outcome: 'finished' };
  }
  const turn = REC.turns[step];
  if (score(message, turn.topics) > 0) {
    const doc = turn.doc;
    return { response: turn.reply, step: step + 1, affidavitData: doc, newFacts: doc.facts.slice(here.facts.length), outcome: 'played' };
  }
  const later = REC.turns.slice(step + 1).some((t) => score(message, t.topics) >= 2);
  const note = later
    ? 'This is a recorded demo, so it follows the recorded interview in order. We will get to that; first, the recorded question:'
    : 'This is a recorded demo, so it can only follow the recorded interview with a fictional client. Answer in your own words or use the suggested reply. The recorded question:';
  return { response: `${note}\n\n${questionAt(step)}`, step, affidavitData: here, newFacts: [], outcome: later ? 'out_of_order' : 'off_script' };
}

/** The rendered draft (the v1 Ontario templates' `sections`) for a step and sub-document, with the blocks
 * that start each page of its PDF (record.mjs), or null before any. */
export function previewAt(step: number, sub: SubDocument): { sections: Sections; breaks: Break[] } | null {
  if (step === 0) return null;
  const { preview, breaks } = REC.turns[step - 1];
  return { sections: Object.fromEntries(Object.entries(preview[sub]).map(([k, i]) => [k, REC.sections[i] as Section | string])), breaks: breaks[sub] };
}
