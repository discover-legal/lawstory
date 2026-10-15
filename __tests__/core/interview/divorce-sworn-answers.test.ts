/** @jest-environment node */
/**
 * The three interview answers that fill sworn-statement blanks: pregnancy
 * (a yes is a field; a no is the dispositive `not_pregnant` confirmation),
 * the user's representation, and the matrimonial-home claim. Structural
 * assertions on the definition and the legacy bridge only.
 */
import { getDivorceDefinition } from '@/core/interview/definitions/divorce';
import { toAffidavitData, toCaseFile } from '@/core/adapters/legacy';
import { CONFIRMATION_KEYS } from '@/core/interview/schema';
import { jurisdictionStub } from '../helpers/scripted';

describe('divorce definition — sworn-statement answers', () => {
  const def = getDivorceDefinition(jurisdictionStub('ON'));
  const target = (key: string): string | undefined => def.fields.find((f) => f.key === key)?.target;

  test('fields exist with the v1 targets the drafts read', () => {
    expect(target('either_party_pregnant')).toBe('eitherPartyPregnant');
    expect(target('user_representation')).toBe('petitionerRepresentation');
    expect(target('matrimonial_home_possession_requested')).toBe('matrimonialHomePossessionRequested');
  });

  test('CHILDREN may elicit the not_pregnant confirmation, and it is a known key', () => {
    const children = def.phases.find((p) => p.id === 'CHILDREN');
    expect(children?.confirmations).toEqual(expect.arrayContaining(['no_children', 'not_pregnant']));
    expect(CONFIRMATION_KEYS).toContain('not_pregnant');
  });
});

describe('legacy bridge — not_pregnant', () => {
  test('notPregnantConfirmed ↔ the not_pregnant confirmation, both ways', () => {
    const file = toCaseFile({ notPregnantConfirmed: true }, { id: 'd', userId: 'u' });
    expect(file.confirmations.not_pregnant).toBeDefined();
    expect(file.fields.notPregnantConfirmed).toBeUndefined();
    expect(toAffidavitData(file).notPregnantConfirmed).toBe(true);
  });
});
