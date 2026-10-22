import type { Sections } from './engine';

// The pagination half of components/app/DocumentPreview.js (c34b131), ported to TypeScript: the same
// section orders, flattening, height estimates and keep-together rule, so the demo pages break where
// the product's did. `measure` is the product's canvas text measurement (DocumentPreview.tsx). One
// addition: the Application's filer block (name, address lines), which the PDF prints first and v1's
// editor preview left out, so the preview and the download match.
export type Block = { type: string; content: string; keepWithNext?: boolean; isLastFact?: boolean };
export type Page = { content: Block[]; pageNumber: number };
export type Measure = (text: string, fontSize: number, maxWidth: number, pre?: boolean) => number;

export const PAGE = { width: 8.5, marginLeft: 1, marginRight: 1, lineHeight: 24, fontSize: 16 };
const CONTINUATION_MARKER_HEIGHT = 36;
const MAX_PAGE_HEIGHT = 850;
const ORDERS: Record<string, string[]> = {
  divorce_petition: ['filerBlock', 'header', 'venue', 'caseCaption', 'title', 'parties', 'jurisdiction', 'marriageInfo', 'grounds',
    'childrenInfo', 'propertyInfo', 'reliefRequested', 'verification', 'signatureBlock', 'footer'],
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

function flatten(sections: Sections, docType: string): Block[] {
  const out: Block[] = [];
  for (const key of ORDERS[docType] ?? ORDERS.divorce_petition) {
    const raw = sections[key];
    if (!raw) continue;
    if (typeof raw === 'string') { out.push({ type: key, content: raw }); continue; }
    const s = raw as Sec;
    if (key === 'filerBlock') out.push({ type: 'filerBlock', content: ((s as { lines?: string[] }).lines ?? []).join('\n') });
    else if (key === 'caseCaption') out.push({ type: 'caseCaption', content: s.formatted || s.content || '' });
    else if (key === 'signatureBlock') out.push({ type: 'signature', content: s.formatted || s.content || '' });
    else if (s.title && (s.items || s.text)) {
      out.push({ type: 'section-title', content: s.title, keepWithNext: true });
      if (Array.isArray(s.items)) {
        const next = makeSectionPrefixer(s.items);
        for (const it of s.items) out.push({ type: it.type === 'relief_item' ? 'relief_item' : 'paragraph', content: `${next(it)}${it.content || ''}` });
      } else if (s.text) {
        out.push({ type: s.type === 'verification' || key === 'verification' ? 'verification' : s.text.includes('\n') ? 'preformatted-text' : 'paragraph', content: s.text });
      }
    } else if (s.formatted) out.push({ type: key, content: s.formatted });
    else if (s.content) out.push({ type: s.type || key, content: s.content });
    else if (typeof s.text === 'string') out.push({ type: s.type || key, content: s.text });
  }
  return out;
}

function height(b: Block, m: Measure, following = false): number {
  const w = (PAGE.width - PAGE.marginLeft - PAGE.marginRight) * 96;
  const t = b.content || '';
  const f = PAGE.fontSize;
  switch (b.type) {
    case 'header': return 40;
    case 'venue': return 24 * Math.max(1, t.split('\n').length) + 16;
    case 'title': return 80;
    case 'caseCaption': return m(t, f, w, true) + 38;
    case 'filerBlock': return m(t, f, w, true) + 24;
    case 'signature': return m(t, f, w, true) + 30;
    case 'verification': return m(t, f, w, true) + PAGE.lineHeight * 2;
    case 'preformatted-text': return m(t, f, w, true) + PAGE.lineHeight;
    case 'section-title': return following ? m(t, f, w) + PAGE.lineHeight : m(t, f, w) + PAGE.lineHeight * 2;
    case 'relief_item': return m(t, f, w - 48) + 10;
    default: return m(t, f, w) + (following ? PAGE.lineHeight : 30);
  }
}

export function paginate(sections: Sections | undefined, docType: string, m: Measure): Page[] {
  if (!sections) return [{ content: [], pageNumber: 1 }];
  const all = flatten(sections, docType);
  const pages: Page[] = [];
  let cur: Block[] = [];
  let h = 0;
  const flush = () => { pages.push({ content: cur, pageNumber: pages.length + 1 }); cur = []; h = 0; };
  all.forEach((b, idx) => {
    const bh = height(b, m);
    if (b.keepWithNext && idx < all.length - 1) {
      let together = bh;
      for (let i = idx + 1; i < all.length; i++) {
        together += height(all[i], m, true);
        if (!all[i].keepWithNext) break;
      }
      if (h + together > MAX_PAGE_HEIGHT && cur.length > 0) {
        if (b.isLastFact) { cur.push({ type: 'continuation', content: '(Continued on next page)' }); h += CONTINUATION_MARKER_HEIGHT; }
        flush();
      }
    } else if (h + bh > MAX_PAGE_HEIGHT && cur.length > 0 && !all[idx - 1]?.keepWithNext) {
      flush();
    }
    cur.push(b);
    h += bh;
  });
  if (cur.length) flush();
  return pages.length ? pages : [{ content: [], pageNumber: 1 }];
}
