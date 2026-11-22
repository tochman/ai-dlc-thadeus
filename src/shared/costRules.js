// THADEUS cost rule pack (US-0212). The marked block the app keeps in each space's memory files (FR2.1), the
// shipped pack (FR4.1–FR4.4, English, at most 8 lines and 800 characters: NFR2) and the clash keyword pairs
// checked against team.md and org.md (FR6.1). Shared by main (the writer) and the renderer (the editor). US-0032 adds
// the one-committer rule for feature docs on `main`.

export const COST_RULES_START = '<!-- thadeus:cost-rules:start -->';
export const COST_RULES_END = '<!-- thadeus:cost-rules:end -->';

/** The files the pack writes to, relative to `aidlc/spaces/<space>/memory/` without `.md` (FR3.1). */
export const COST_RULES_TARGETS = ['project', 'phases/construction'];

/** Every file the writer may touch (NFR1): project.md and the phase files. */
export const COST_RULES_FILES = ['project', 'phases/ideation', 'phases/inception', 'phases/construction', 'phases/operation'];

/** The shipped pack, per target. */
export const COST_RULES_PACK = {
  project: [
    'ALWAYS have the main session delegate reading and writing source code to the developer agent and keep only its short report.',
    'ALWAYS report back from an agent in a few lines, without file dumps.',
    'NEVER read `node_modules`, lock files, `dist`/`build` output or large logs.',
    // US-0032 AC1: one committer for feature docs on main (the app, US-0608); story branches commit their own.
    'On `main`, NEVER commit `docs/FEATURES.md`, `docs/features/` or `docs/releases/`; THADEUS commits and pushes them.',
    // US-0609 FR3.7: the app's own data reaches every clone.
    '`.thadeus/` is committed and never git-ignored; THADEUS commits and pushes it.'
  ],
  'phases/construction': ['ALWAYS run only the test being worked on during the TDD loop; run the full suite once before Build and Test is approved.']
};

/**
 * Keyword pairs that clash (FR6.1): a pack line with one side next to a team or org rule with the other. Matched
 * case-insensitively, both ways round.
 */
export const COST_RULES_CLASHES = [
  ['only the test being worked on', 'full suite'],
  ['only the test being worked on', 'suite green'],
  ['only the test being worked on', 'run all tests'],
  ['delegate reading and writing source code', 'main session reads']
];
