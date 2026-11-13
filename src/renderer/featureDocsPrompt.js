// The request typed into the claude tab to set up feature docs (EPIC-06 FR4.4, FR4.5). The app writes no
// files itself (FR4.6): Claude does the work in the visible terminal once the person presses Enter.
// One line, since a newline in the terminal would send it.

const FORMAT =
  'Skapa feature-beskrivningar för det här projektet utifrån det som redan finns (README, kod, dokumentation): ' +
  'docs/FEATURES.md med en kort inledning och en tabell med en rad per epic (länk, ämne, status), ' +
  'och en fil per epic i docs/features/epic-XX-<slug>.md med en beskrivning, en rad **Stories:**, en rad **Status (datum):** ' +
  'och storys som **US-XXYY: Titel** <status> följt av As a / in order to / I would like to, Epic, Priority, Complexity, ' +
  'Acceptance Criteria som kryssrutor i formen Given/When/Then, Notes och Dependencies. ' +
  'Statusmarkörer: 📋 Planned, 🚧 In progress / built not released, ✅ Done. Ordna epics efter ämne, inte efter release. ';

const RULE =
  'Lägg också till en projektregel genom AI-DLC:s eget sätt att spara regler, inte genom att redigera minnesfilerna direkt: ' +
  'nytt arbete beskrivs som storys i rätt epic-fil, och status och acceptanskriterier uppdateras när arbetet byggs och släpps.';

/** @param {{exists: boolean, path?: string}} opts exists: the overview is already there, so only the rule is added */
export function featureDocsPrompt({ exists, path = 'docs/FEATURES.md' }) {
  if (exists) return `Projektet har redan feature-beskrivningar i ${path} (en översikt och en fil per epic). ${RULE}`;
  return FORMAT + RULE;
}
