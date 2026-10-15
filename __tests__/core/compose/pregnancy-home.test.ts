/**
 * @jest-environment node
 *
 * The pregnancy averment and the matrimonial-home claim. "Neither party is
 * pregnant" is dispositive: it renders only from the `not_pregnant`
 * confirmation; a recorded yes renders the fact; silence is a blank. The
 * home-possession prayer item appears only on the user's explicit request.
 * Structural assertions only (block kinds, supportedBy, blank fields).
 */
import { createComposer } from '@/core/compose';
import type { DocumentTree } from '@/core/compose';
import type { JurisdictionProfile } from '@/core/jurisdictions/types';
import type { CaseFile } from '@/core/model/types';
import { DISPOSITIVE_CLAUSES } from '@/core/compose/types';
import { ON, blanksFor, blocksOfKind, caseFile, composeIntel, confirmed, mustSection, stated } from './_helpers';

async function petition(file: CaseFile, jurisdiction: JurisdictionProfile = ON): Promise<DocumentTree> {
  return createComposer({ intelligence: composeIntel() }).compose({ file, jurisdiction, kind: 'divorce_petition' });
}

function childrenParagraphSupports(tree: DocumentTree): string[][] {
  return blocksOfKind(mustSection(tree, 'children'), 'paragraph').map((p) => p.supportedBy);
}

describe('pregnancy averment', () => {
  it('silence → a pregnancy blank, no paragraph resting on not_pregnant', async () => {
    const tree = await petition(caseFile());
    expect(blanksFor(tree, 'pregnancy')).toHaveLength(1);
    expect(childrenParagraphSupports(tree).some((ids) => ids.includes('not_pregnant'))).toBe(false);
  });

  it('the not_pregnant confirmation → a paragraph supported by exactly that key, no blank', async () => {
    const tree = await petition(caseFile({ confirmations: { not_pregnant: confirmed('neither of us is pregnant') } }));
    expect(blanksFor(tree, 'pregnancy')).toHaveLength(0);
    expect(childrenParagraphSupports(tree)).toContainEqual(['not_pregnant']);
  });

  it('a recorded yes → a paragraph supported by the field, no blank', async () => {
    const tree = await petition(caseFile({ fields: { eitherPartyPregnant: stated(true, 'I am pregnant') } }));
    expect(blanksFor(tree, 'pregnancy')).toHaveLength(0);
    expect(childrenParagraphSupports(tree)).toContainEqual(['eitherPartyPregnant']);
  });

  it('is registered as a dispositive clause', () => {
    expect(DISPOSITIVE_CLAUSES.neither_party_pregnant).toBe('not_pregnant');
  });
});

describe('matrimonial-home claim', () => {
  const reliefItems = (tree: DocumentTree): number => blocksOfKind(mustSection(tree, 'relief'), 'list')[0].items.length;

  it('adds exactly one prayer item only when requested', async () => {
    const without = await petition(caseFile());
    const withHome = await petition(caseFile({ fields: { matrimonialHomePossessionRequested: stated(true, 'I want to stay in the house') } }));
    const declined = await petition(caseFile({ fields: { matrimonialHomePossessionRequested: stated(false, 'no') } }));
    expect(reliefItems(withHome)).toBe(reliefItems(without) + 1);
    expect(reliefItems(declined)).toBe(reliefItems(without));
  });
});
