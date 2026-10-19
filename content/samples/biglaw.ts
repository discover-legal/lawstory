import type { Sample } from './types';

// A SCRIPTED sample of a BigLaw run: fictional matter, documents and parties. It shows the evidence
// rules (quotes checked against the source; unverified findings excluded and disclosed).
export const biglawSample: Sample = {
  slug: 'biglaw',
  title: 'BigLaw: sample matter',
  lede: 'A fictional employment matter, from the task to verified findings and a memo with an Evidence Note.',
  disclosure: 'Sample walkthrough: a fictional matter and scripted output in the style of BigLaw. It is not legal advice and not a live run. There is nothing to type here and nothing is saved.',
  steps: [
    { title: 'The matter', summary: 'A small firm opens a matter and adds two documents.',
      doc: { title: 'Matter M-0142: Harbourline Logistics Inc. (fictional)', blocks: [
        { kind: 'para', text: 'Client: Harbourline Logistics Inc., an Ontario employer. Question: can it end the employment of a warehouse supervisor without cause under her written agreement?' },
        { kind: 'para', text: 'Documents: Employment Agreement (2021), Employee Handbook (2023). Every search in the task is confined to these two documents.' },
      ] } },
    { title: 'The task', summary: 'The lawyer submits one instruction; BigLaw recruits the agents.',
      turns: [
        { who: 'client', text: 'Review the termination provisions in the agreement and handbook. Identify any clause that could make the without-cause termination clause unenforceable in Ontario.' },
        { who: 'assistant', text: 'Task accepted. Jurisdiction CA-ON. Agents: employment-law analyst, contract reader, citation checker. Two rounds, then debate and verification on every finding.' },
      ] },
    { title: 'Findings, checked', summary: 'Every quote is matched against the source text before a finding can be used.',
      findings: [
        { claim: 'The without-cause clause limits notice to the statutory minimum.', check: 'exact', source: 'Employment Agreement, s. 9.2',
          quote: 'the Company may terminate your employment without cause by providing only the minimum notice required by the Employment Standards Act, 2000' },
        { claim: 'The for-cause clause allows termination with no notice for any breach of policy.', check: 'tolerant', source: 'Employment Agreement, s. 9.1',
          quote: 'for any breach of Company policy, without notice or pay in lieu of notice' },
        { claim: 'The handbook promises two weeks\' notice for every termination.', check: 'excluded', source: 'Employee Handbook (no matching passage)',
          quote: 'all employees receive two weeks\' notice of termination' },
      ] },
    { title: 'Memo excerpt', summary: 'Only verified findings reach the memo; the rest are disclosed, not hidden.',
      doc: { title: 'DRAFT memo: termination provisions (excerpt)', blocks: [
        { kind: 'para', text: 'Section 9.1 permits dismissal without notice "for any breach of Company policy". That standard is broader than the wilful misconduct the Employment Standards Act, 2000 requires before notice can be withheld.' },
        { kind: 'para', text: 'Ontario courts read termination provisions together; one provision that falls below the statute can make the without-cause clause in s. 9.2 unenforceable (Waksdale v Swegon North America Inc, 2020 ONCA 391). A lawyer should confirm this before advising the client.' },
        { kind: 'note', text: 'Evidence Note: 1 of 3 findings was excluded because its quote could not be found in the source documents (Employee Handbook, notice). It was not used in this memo.' },
      ] } },
  ],
};
