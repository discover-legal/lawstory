import type { Sections } from './engine';

// The flattening half of components/app/DocumentPreview.js (c34b131), ported to TypeScript: the same
// section orders and flattening, plus the Application's filer block (the PDF prints it first; v1's
// preview left it out) and sub-list items ("(a) …", type *_item) as their own indented blocks. Page
// breaks are not estimated here: record.mjs renders each recorded draft to PDF and stores the blocks
// that start each PDF page, so the preview has exactly the PDF's pages.
export type Block = { type: string; content: string; bold?: boolean; split?: 'head' | 'tail' };
export type Page = { content: Block[]; pageNumber: number };

const ORDERS: Record<string, string[]> = {
  divorce_petition: ['filerBlock', 'header', 'venue', 'caseCaption', 'title', 'parties', 'jurisdiction', 'marriageInfo', 'grounds',
    'childrenInfo', 'propertyInfo', 'reliefRequested', 'signatureBlock', 'verification', 'footer'], // the PDF signs before the jurat
  divorce_decree: ['header', 'venue', 'caseCaption', 'title', 'appearances', 'jurisdiction', 'dissolution', 'propertyDivision',
    'debtAllocation', 'childCustody', 'childSupport', 'spousalSupport', 'nameChange', 'finalOrders', 'judgmentBlock', 'signatureBlock', 'footer'],
};

type Item = { content?: string; type?: string; number?: number | null; letter?: string };
type Sec = { title?: string; items?: Item[]; text?: string; type?: string; formatted?: string; content?: string };

// utils/sectionNumbering.js makeSectionPrefixer (c34b131).
const isBulletOrSubItem = (it: Item) => /^[•○▪◦●–-]\s/.test(String(it.content ?? '').trim()) || /_item$/.test(it.type ?? '')
  || /^\s*\d+[.)]\s/.test(String(it.content ?? ''));
function makeSectionPrefixer(items: Item[]) {
  const numbered = items.some((it) => it && (it.letter || it.number != null));
  let auto = 0;
  return (it: Item) => {
    if (it.letter) return `${it.letter}. `;
    if (it.number != null) return `${it.number}. `;
    if (numbered || isBulletOrSubItem(it)) return '';
    auto += 1;
    return `${auto}. `;
  };
}

// Block types follow services/pdfService.js's layout (DocumentPreview.tsx styles each as the PDF draws it):
// num = "N. " hanging paragraph, prose = first-line-indented paragraph, sub = indented sub-list entry; a
// `d`-suffixed type is the decree's tighter item spacing; `bold` = the decree's operative "order" items.
export function flatten(sections: Sections, docType: string): Block[] {
  const out: Block[] = [];
  const decree = docType === 'divorce_decree';
  for (const key of ORDERS[docType] ?? ORDERS.divorce_petition) {
    const raw = sections[key];
    if (!raw) continue;
    if (typeof raw === 'string') { out.push({ type: key, content: raw }); continue; }
    const s = raw as Sec;
    if (key === 'filerBlock') out.push({ type: 'filerBlock', content: ((s as { lines?: string[] }).lines ?? []).join('\n') });
    else if (key === 'caseCaption') out.push({ type: 'caseCaption', content: s.formatted || s.content || '' });
    else if (key === 'signatureBlock') out.push({ type: 'signature', content: s.formatted || s.content || '' });
    else if (s.title && (s.items || s.text)) {
      out.push({ type: 'section-title', content: s.title });
      if (Array.isArray(s.items)) {
        const next = makeSectionPrefixer(s.items);
        for (const it of s.items) {
          const content = it.content || '';
          const bold = decree && it.type === 'order';
          if (key === 'reliefRequested') {
            out.push(it.letter ? { type: 'relief_item', content: `(${it.letter}) ${content}` }
              : { type: it.type === 'relief_intro' ? 'relief_intro' : 'relief_more', content });
          } else if (!decree && /_item$/.test(it.type ?? '')) out.push({ type: 'sub', content });
          else {
            const label = next(it);
            out.push({ type: `${label ? 'num' : 'prose'}${decree ? '-d' : ''}`, content: `${label}${content}`, bold });
          }
        }
      } else if (s.text) {
        // One block per paragraph: the PDF indents the first line of each.
        for (const para of s.text.split(/\n\s*\n/)) out.push({ type: 'prose', content: para });
      }
    } else if (s.formatted) out.push({ type: key, content: s.formatted });
    else if (s.content) out.push({ type: s.type || key, content: s.content });
    else if (typeof s.text === 'string') out.push({ type: s.type || key, content: s.text });
  }
  return out;
}

/** A page break recorded from the PDF: before block `i`, or after its first `words` words when the PDF carries
 * the paragraph over (the rest continues the next page without its first-line indent). */
export type Break = [i: number, words: number];

/** The draft's blocks split into pages at the recorded `breaks`. */
export function paginate(sections: Sections | undefined, docType: string, breaks: Break[]): Page[] {
  const all = sections ? flatten(sections, docType) : [];
  const pages: Block[][] = [[]];
  let from = 0;
  for (const [i, w] of breaks) {
    pages[pages.length - 1].push(...all.slice(from, i));
    from = i;
    if (w > 0) {
      const cut = all[i].content.match(new RegExp(`^(?:\\s*\\S+){${w}}`))?.[0] ?? all[i].content;
      pages[pages.length - 1].push({ ...all[i], content: cut, split: 'head' });
      all[i] = { ...all[i], content: all[i].content.slice(cut.length).trimStart(), split: 'tail' };
    }
    pages.push([]);
  }
  pages[pages.length - 1].push(...all.slice(from));
  return pages.map((content, n) => ({ content, pageNumber: n + 1 }));
}
