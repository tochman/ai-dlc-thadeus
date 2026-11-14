// Fixed tables for the AI-DLC settings the app can change (EPIC-09 US-0902, US-0904). Pure, so main checks a
// change against the same entries the renderer offers. Nothing outside these tables reaches `aidlc` (NFR4).
// Flags and values were read from `aidlc config <section> --help` and `aidlc engine config --help` (aidlc 2.x).

/** `--project | --local | --global`, chosen explicitly where the command takes a write target. */
export const WHERE = ['project', 'local', 'global'];
const ON_OFF = ['on', 'off'];

/**
 * Project defaults. `section` is the `aidlc config <section>` command, `flag` its option, `values` or `pattern`
 * the accepted value, and `where` the write targets the command takes (none for providers and project).
 */
export const PROJECT_SETTINGS = {
  defaultScope: { section: 'flags', flag: '--default-scope', pattern: /^[a-z0-9][a-z0-9-]{0,63}$/, where: WHERE },
  swarm: { section: 'flags', flag: '--swarm', values: ON_OFF, where: WHERE },
  provider: { section: 'providers', flag: '--provider', values: ['current', 'amazon-bedrock', 'other'], where: [] },
  region: { section: 'providers', flag: '--region', pattern: /^[a-z]{2}(-[a-z]+)+-\d{1,2}$/, where: [] },
  plugins: { section: 'project', flag: '--plugins', pattern: /^(all|[a-z0-9][a-z0-9-]*(,[a-z0-9][a-z0-9-]*)*)$/, where: [] }
};

const LEVELS = ['Minimal', 'Standard', 'Comprehensive'];

/** The active work's settings, `aidlc engine config set <key> <value>`, with each key's accepted values. */
export const ACTIVE_SETTINGS = {
  depth: LEVELS,
  'test-strategy': LEVELS,
  review: ['adversarial', 'advisory', 'none'],
  'guard-policy': ['strict', 'relaxed', 'off'],
  sensors: ON_OFF,
  learnings: ON_OFF,
  'summary-confirmation': ON_OFF,
  'plan-approval': ON_OFF,
  collaborators: ON_OFF
};

/** The checks a person can turn off, by their switch (the guard table in .claude/CLAUDE.md). */
export const GUARD_SWITCHES = [
  'AIDLC_DISABLE_PLAN_APPROVAL_GUARD',
  'AIDLC_DISABLE_REVIEW_FREEZE_HOOK',
  'AIDLC_DISABLE_REVIEWER_SCOPE_HOOK',
  'AIDLC_DISABLE_SUMMARY_CONFIRMATION',
  'AIDLC_SKIP_SUMMARY_CONFIRMATION_GUARD',
  'AIDLC_SKIP_HUMAN_PRESENCE_GUARD',
  'AIDLC_SKIP_ARTIFACT_GUARD',
  'AIDLC_SKIP_REVISION_BACKSTOP',
  'AIDLC_DISABLE_ENSEMBLE_EVIDENCE'
];
/** A bypass is recorded for only me or for this machine; turning a check back on takes no target. */
export const GUARD_OFF_WHERE = ['local', 'global'];

/** The Guard Policy lock in a memory file (tier 2); `none` removes the Mode line. */
export const GUARD_LOCK_LAYERS = ['org', 'team', 'project'];
export const GUARD_LOCK_MODES = ['strict', 'relaxed', 'off', 'none'];

// Models and effort (US-0904).
export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
export const PRESETS = ['thorough', 'balanced', 'minimal'];
export const GROUPS = ['deciding', 'reviewing', 'writing-up'];
export const MODEL_WHERE = ['project', 'local'];
export const CLAUDE_MODELS = ['inherit', 'opus', 'sonnet', 'haiku'];
/** The effort a harness really runs for a chosen one, where it differs (`aidlc`: "opencode clamps xhigh to high"). */
export const APPLIED_EFFORT = { claude: {}, opencode: { xhigh: 'high' } };
