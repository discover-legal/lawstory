// One shape for both sample walkthroughs: each step shows any of turns, facts, findings and a document.
export type Turn = { who: 'assistant' | 'client'; text: string };
/** A structured fact with the client's own words it came from (provenance), or null when never stated. */
export type Fact = { field: string; value: string | null; quote: string | null };
/** exact / tolerant: matched in the source text; excluded: no match, so it never reaches the memo. */
export type Finding = { claim: string; quote: string; source: string; check: 'exact' | 'tolerant' | 'excluded' };
export type Block = { kind: 'heading' | 'para' | 'note'; text: string };
export type Step = { title: string; summary: string; turns?: Turn[]; facts?: Fact[]; findings?: Finding[];
  doc?: { title: string; blocks: Block[] } };
export type Sample = { slug: string; title: string; lede: string; disclosure: string; steps: Step[] };
