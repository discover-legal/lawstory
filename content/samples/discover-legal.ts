import type { Sample } from './types';

// A SCRIPTED sample in the style of the v2 engine's output (facts carry the client's quote; a missing
// fact renders as a blank with a Draft note, never as an invented allegation). The client is fictional.
export const documentsSample: Sample = {
  slug: 'discover-legal',
  title: 'discover.legal Documents: sample walkthrough',
  lede: 'Follow a fictional Ontario client from a short interview to structured facts and a draft excerpt.',
  disclosure: 'Sample walkthrough: a fictional client and scripted output in the style of the product. It is not legal advice and not a live product. There is nothing to type here and nothing is saved.',
  steps: [
    { title: 'The interview begins', summary: 'The assistant asks one question at a time, in plain language.',
      turns: [
        { who: 'assistant', text: 'Hello. I will help you organize the facts for an Ontario divorce. What is your full legal name, and which city do you live in?' },
        { who: 'client', text: 'Dana Elise Morrow. I live in Ottawa.' },
        { who: 'assistant', text: 'Thank you, Dana. What is your spouse\'s full legal name, and when and where did you marry?' },
        { who: 'client', text: 'Christopher Morrow. We got married in Kingston on June 16, 2012.' },
      ] },
    { title: 'Separation and children', summary: 'Dates are checked, not guessed. A vague answer gets a follow-up question.',
      turns: [
        { who: 'assistant', text: 'When did you and Christopher separate?' },
        { who: 'client', text: 'Early 2025, I think February.' },
        { who: 'assistant', text: 'Do you know the exact date? If not, the first of February 2025 can be marked as approximate.' },
        { who: 'client', text: 'He moved out on February 1, 2025.' },
        { who: 'assistant', text: 'Do you have children together?' },
        { who: 'client', text: 'One son, he is 9. He lives with me and sees his dad every second weekend.' },
      ] },
    { title: 'Structured facts', summary: 'Each fact keeps the words it came from. Anything never stated stays empty.',
      facts: [
        { field: 'Applicant', value: 'Dana Elise Morrow', quote: 'Dana Elise Morrow' },
        { field: 'Municipality', value: 'Ottawa, Ontario', quote: 'I live in Ottawa' },
        { field: 'Respondent', value: 'Christopher Morrow', quote: 'Christopher Morrow' },
        { field: 'Marriage', value: '2012-06-16, Kingston, Ontario', quote: 'married in Kingston on June 16, 2012' },
        { field: 'Separation', value: '2025-02-01', quote: 'He moved out on February 1, 2025' },
        { field: 'Child', value: 'One child, age 9, lives with the applicant', quote: 'One son, he is 9. He lives with me' },
        { field: 'Spousal support', value: null, quote: null },
        { field: 'Court file number', value: null, quote: null },
      ] },
    { title: 'Rules before drafting', summary: 'Code applies the rules; the model only supplies wording.',
      doc: { title: 'Checks run on the facts', blocks: [
        { kind: 'para', text: 'One year of separation (Divorce Act, s. 8(2)(a)): separated 2025-02-01, more than twelve months before the draft date, so the ground can be pleaded as satisfied.' },
        { kind: 'para', text: 'Spousal support was never discussed. Silence is not a waiver, so the draft leaves it blank instead of stating that support is waived.' },
        { kind: 'para', text: 'Ontario vocabulary: Applicant and Respondent, decision-making responsibility and parenting time (Divorce Act, ss. 16.1 to 16.3), Court File Number.' },
      ] } },
    { title: 'Draft excerpt', summary: 'An Application (General), Form 8, style excerpt. File on the official Ontario form; use the draft as source material.',
      doc: { title: 'DRAFT: Application (General), excerpt', blocks: [
        { kind: 'heading', text: 'ONTARIO Superior Court of Justice, Family Court, at Ottawa' },
        { kind: 'note', text: 'Draft note: Court File Number is blank. The court assigns it when the application is issued.' },
        { kind: 'para', text: '1. The Applicant, Dana Elise Morrow, and the Respondent, Christopher Morrow, were married on June 16, 2012 in Kingston, Ontario.' },
        { kind: 'para', text: '2. The parties separated on February 1, 2025 and have lived separate and apart since then. There is no reasonable prospect of reconciliation.' },
        { kind: 'para', text: '3. The Applicant claims a divorce on the ground that the parties have lived separate and apart for at least one year (Divorce Act, s. 8(2)(a)).' },
        { kind: 'para', text: '4. There is one child of the marriage, age 9, who lives with the Applicant. The Respondent has parenting time every second weekend.' },
        { kind: 'note', text: 'Draft note: spousal support was not discussed. Decide whether to claim it before you file; nothing is assumed.' },
      ] } },
  ],
};
