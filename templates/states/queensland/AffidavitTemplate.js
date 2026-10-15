// templates/states/queensland/AffidavitTemplate.js
// Queensland affidavit template — legally compliant with Oaths Act 1867 (Qld)
'use strict';

const BaseAffidavitTemplate = require('../../core/BaseAffidavitTemplate');
const { placeholder } = require('../../core/placeholders');
const { caseNumberOrBlank } = require('../../core/blanks');

class QueenslandAffidavitTemplate extends BaseAffidavitTemplate {
  constructor() {
    super();
    this.metadata = require('./metadata.json');
    this.state = this.metadata.stateCode;
    this.stateName = this.metadata.stateName;
    this.countryCode = 'AU';

    // Australian terminology (see templates/core/terminology.js): divorce is
    // federal (FCFCOA) — the caption is the court-name line + registry; parties
    // are Applicant/Respondent (Family Law Act 1975 (Cth)). No "STATE OF"/
    // "COUNTY OF" caption lines and no "X County" body phrasing.
    this.terminology = {
      ...this.terminology,
      jurisdictionLabel: null,
      districtLabel: null,
      districtStyle: 'plain',
      jurisdictionTerm: 'State',
      districtTerm: 'Registry',
      districtPlaceholder: placeholder('REGISTRY'),
      filerLabel: 'Applicant',
      responderLabel: 'Respondent',
      selfRepresentedLabel: 'Self-Represented',
    };
    this.requiredFields = this.metadata.requiredFields;
    this.sections.perjuryStatement = false;
    this.formatting = { fontSize: '12pt', fontFamily: 'Times New Roman', lineHeight: '1.5', margin: '2.54cm', paperSize: 'A4' };
  }

  generateHeader() { return 'QUEENSLAND'; }

  generateVenue(county) {
    const location = (county || placeholder('CITY/LOCALITY')).toUpperCase();
    return `AT ${location}`;
  }

  generateCaseCaption(affidavitData) {
    const court = affidavitData.court || affidavitData.courtName || 'FEDERAL CIRCUIT AND FAMILY COURT OF AUSTRALIA';
    const location = (affidavitData.county || affidavitData.city || placeholder('LOCATION')).toUpperCase();
    const fileNo = caseNumberOrBlank(affidavitData.caseNumber);
    const applicant = affidavitData.plaintiff || affidavitData.petitionerName || placeholder('APPLICANT NAME');
    const respondent = affidavitData.defendant || affidavitData.respondentName || placeholder('RESPONDENT NAME');

    const formatted = `${court.toUpperCase()}\nREGISTRY: ${location}\n\nFile Number: ${fileNo}\n\n${applicant.toUpperCase()}\nApplicant\n\n— and —\n\n${respondent.toUpperCase()}\nRespondent`;

    return { courtName: court, caseNumber: affidavitData.caseNumber, plaintiff: applicant, defendant: respondent, formatted };
  }

  performStateSpecificValidation(affidavitData) {
    const errors = [];
    const warnings = [];
    if (!affidavitData.county && !affidavitData.city) errors.push('City or locality is required for Queensland affidavits.');
    return { errors, warnings };
  }

  generateNotaryBlock(affidavitData) {
    const city = affidavitData.county || affidavitData.city || '_______________';
    return (
      `Sworn/Affirmed at ${city},\n` +
      `in Queensland,\n` +
      `on the _____ day of _________________, _______.\n\n` +
      `Before me:\n\n` +
      `________________________________\n` +
      `${placeholder('Name')}\n` +
      `Justice of the Peace / Solicitor / Commissioner for Declarations`
    );
  }
}

module.exports = QueenslandAffidavitTemplate;
