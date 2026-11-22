// US-1101 FR3.3, US-1103, US-1102: retakes the README screenshots (docs/screenshots/intents.png, timeline.png, cost.png,
// features.png, releases.png, configuration.png) and the animated docs/screenshots/demo.gif from the built app, against
// invented demo projects, so no real project names, branches or costs show. Needs ffmpeg for the GIF.
// Usage: npm run screenshots (builds with electron-vite first, then runs this file as Electron's main script).
//
// Isolation: everything lives in tests/.tmp/screenshots (gitignored). appData points there before the app's main
// module loads, so the app's userData, settings, recent projects and single-instance lock are its own and the
// person's real app is never read or changed. The terminal tabs run a stub shell that only prints a prompt, so no
// agent CLI starts. splash.png is left alone.
const { app, BrowserWindow } = require('electron');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORK = path.join(ROOT, 'tests/.tmp/screenshots');
const OUT = path.join(ROOT, 'docs/screenshots');
const SIZE = { width: 1600, height: 969 }; // the README images' size
const WINDOW = { width: 1440, height: 872 }; // same aspect; captured at the display's scale, then resized to SIZE
const NOW = Date.UTC(2026, 10, 14, 15, 0, 0);

// ---------- the invented demo projects ----------

const PHASES = [
  ['INITIALIZATION', ['workspace-scaffold', 'workspace-detection', 'state-init']],
  ['IDEATION', ['intent-capture']],
  ['INCEPTION', ['reverse-engineering', 'requirements-analysis', 'user-stories']],
  ['CONSTRUCTION', ['functional-design', 'code-generation', 'build-and-test']],
  ['OPERATION', ['deployment-pipeline', 'deployment-execution', 'observability-setup']]
];
const SCOPES = {
  express: [
    'workspace-scaffold',
    'workspace-detection',
    'state-init',
    'reverse-engineering',
    'requirements-analysis',
    'code-generation',
    'build-and-test',
    'deployment-pipeline',
    'deployment-execution'
  ],
  bugfix: [
    'workspace-scaffold',
    'workspace-detection',
    'state-init',
    'reverse-engineering',
    'requirements-analysis',
    'code-generation',
    'build-and-test',
    'deployment-execution'
  ]
};
SCOPES.feature = [...SCOPES.express.slice(0, 5), 'user-stories', 'functional-design', ...SCOPES.express.slice(5)];
const AGENT = {
  'reverse-engineering': 'aidlc-developer-agent',
  'requirements-analysis': 'aidlc-product-agent',
  'user-stories': 'aidlc-product-agent',
  'functional-design': 'aidlc-architect-agent',
  'code-generation': 'aidlc-developer-agent',
  'build-and-test': 'aidlc-quality-agent',
  'deployment-pipeline': 'aidlc-pipeline-deploy-agent',
  'deployment-execution': 'aidlc-pipeline-deploy-agent'
};
// Rough per-stage weight of the invented cost, so the bars and tables look like a real run.
const WEIGHT = {
  'reverse-engineering': 5,
  'requirements-analysis': 1,
  'user-stories': 1,
  'functional-design': 2,
  'code-generation': 6,
  'build-and-test': 2,
  'deployment-pipeline': 1,
  'deployment-execution': 1
};

const DEMO_APP = [
  {
    day: 3,
    slug: 'note-editor',
    scope: 'feature',
    usd: 18.4,
    text: 'US-0101 to US-0103 from docs/features/epic-01-note-editor.md: a Markdown note editor with autosave and a word count.'
  },
  {
    day: 4,
    slug: 'tags-and-search',
    scope: 'feature',
    usd: 22.9,
    text: 'US-0201 and US-0202 from docs/features/epic-02-organise.md: tags on notes and a search across titles, text and tags.'
  },
  {
    day: 6,
    slug: 'sync-conflict-fix',
    scope: 'bugfix',
    usd: 6.3,
    text: 'Bugfix: two devices editing the same note offline lose one of the edits when they sync. Keep both versions and ask.'
  },
  {
    day: 7,
    slug: 'offline-mode',
    scope: 'express',
    usd: 11.8,
    text: 'US-0401 from docs/features/epic-04-offline-and-export.md: notes stay readable and editable without a connection.'
  },
  {
    day: 9,
    slug: 'export-markdown',
    scope: 'express',
    usd: 7.2,
    text: 'US-0402 from docs/features/epic-04-offline-and-export.md: export a notebook as a folder of Markdown files.'
  },
  {
    day: 11,
    slug: 'shared-notebooks',
    scope: 'feature',
    usd: 14.6,
    active: true,
    upTo: 'deployment-execution',
    text: 'US-0301 from docs/features/epic-03-sharing.md: share a notebook with other people, with read or edit access, and show who changed what. Branch feat/US-0301-shared-notebooks.'
  }
];
const DEMO_API = [{ day: 8, slug: 'rate-limits', scope: 'express', usd: 4.1, text: 'Rate limits per API key, with a clear error and a Retry-After header.' }];

const EPICS = [
  {
    file: 'epic-01-note-editor.md',
    id: 'EPIC-01',
    title: 'Note Editor',
    intro: 'Write notes in Markdown, with autosave, so nothing is ever lost.',
    stories: [
      ['US-0101', 'Write a note in Markdown', 'done', 'v1.0.0'],
      ['US-0102', 'Autosave while typing', 'done', 'v1.0.0'],
      ['US-0103', 'Word count per note', 'done', 'v1.1.0']
    ]
  },
  {
    file: 'epic-02-organise.md',
    id: 'EPIC-02',
    title: 'Organise',
    intro: 'Find any note again: tags, search and pinned notes.',
    stories: [
      ['US-0201', 'Tag notes', 'done', 'v1.1.0'],
      ['US-0202', 'Search titles, text and tags', 'done', 'v1.1.0'],
      ['US-0203', 'Pin notes to the top', 'planned', 'v1.3.0']
    ]
  },
  {
    file: 'epic-03-sharing.md',
    id: 'EPIC-03',
    title: 'Sharing',
    intro: 'Work on notebooks together, with clear access rights.',
    stories: [
      ['US-0301', 'Share a notebook', 'progress', 'v1.2.0'],
      ['US-0302', 'Comments on a note', 'planned', 'v1.2.0']
    ]
  },
  {
    file: 'epic-04-offline-and-export.md',
    id: 'EPIC-04',
    title: 'Offline & Export',
    intro: 'Your notes are yours: they work offline and leave in plain files.',
    stories: [
      ['US-0401', 'Offline mode', 'done', 'v1.2.0'],
      ['US-0402', 'Export as Markdown', 'done', 'v1.2.0']
    ]
  }
];
const MARK = { done: '✅ Done', progress: '🚧 In progress', planned: '📋 Planned' };
const TAGGED = ['v1.0.0', 'v1.1.0']; // released; v1.2.0 and v1.3.0 are planned (US-1103: the Releases view)
/** A story's status text with its release: "✅ Released in v1.1.0" or "📋 Planned, for v1.3.0". */
const markOf = (s, v) => (TAGGED.includes(v) ? `✅ Released in ${v}` : `${MARK[s]}, for ${v}`);

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const hex = (s, n) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h.toString(16).padStart(8, '0').repeat(4).slice(0, n);
};
const uuidOf = (slug) => {
  const h = hex(slug, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-7${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

/** One intent's stages with start/end times; the active one stops at `upTo`, which is still running. */
function stagesOf(intent) {
  const list = SCOPES[intent.scope];
  const last = intent.upTo ? list.indexOf(intent.upTo) : list.length - 1;
  const start = Date.UTC(2026, 10, intent.day, 9, 0, 0);
  return list.slice(0, last + 1).map((slug, i) => ({
    slug,
    agent: AGENT[slug] ?? 'orchestrator',
    start: start + i * 14 * 60000,
    end: intent.upTo && i === last ? null : start + (i + 1) * 14 * 60000 - 60000
  }));
}

function stateMd(intent, stages) {
  const exec = new Set(SCOPES[intent.scope]);
  const done = new Set(stages.filter((s) => s.end).map((s) => s.slug));
  const running = stages.find((s) => !s.end)?.slug;
  const box = (slug) => (done.has(slug) ? '[x]' : slug === running ? '[-]' : '[ ]');
  const phaseOf = (slug) => PHASES.find(([, l]) => l.includes(slug))[0];
  const phaseStatus = ([, list]) => {
    const inScope = list.filter((s) => exec.has(s));
    if (!inScope.length) return 'Skipped';
    if (inScope.every((s) => done.has(s))) return 'Verified';
    return inScope.some((s) => done.has(s) || s === running) ? 'Active' : 'Pending';
  };
  const last = stages[stages.length - 1];
  const listing = PHASES.map(
    ([name, list]) => `### ${name} PHASE\n${list.map((s) => `- ${box(s)} ${s} — ${exec.has(s) ? 'EXECUTE' : 'SKIP'}`).join('\n')}`
  ).join('\n\n');
  return `# AI-DLC State Tracking

## Project Information
- **Project**: ${intent.text}
- **Project Description Source**: project-description.json
- **Project Type**: Brownfield
- **Scope**: ${intent.scope}
- **Start Date**: ${iso(stages[0].start)}
- **State Version**: 8
- **Active Agent**: ${running ? AGENT[running] : 'orchestrator'}

## Scope Configuration
- **Depth**: ${intent.scope === 'feature' ? 'Standard' : 'Minimal'}
- **Test Strategy**: ${intent.scope === 'feature' ? 'Standard' : 'Minimal'}

## Phase Progress
${PHASES.map((p) => `- **${p[0][0] + p[0].slice(1).toLowerCase()}**: ${phaseStatus(p)}`).join('\n')}

## Stage Progress

${listing}

## Current Status
- **Lifecycle Phase**: ${phaseOf(last.slug)}
- **Current Stage**: ${last.slug}
- **Next Stage**: ${running ? (SCOPES[intent.scope][SCOPES[intent.scope].indexOf(running) + 1] ?? 'none') : 'none'}
- **Status**: ${running ? 'In Progress' : 'Completed'}
- **Last Updated**: ${iso(last.end ?? last.start)}
`;
}

function auditMd(intent, stages) {
  const ev = [];
  const add = (title, ms, fields) =>
    ev.push(
      `## ${title}\n**Timestamp**: ${iso(ms)}\n${Object.entries(fields)
        .map(([k, v]) => `**${k}**: ${v}`)
        .join('\n')}\n`
    );
  add('Workflow Start', stages[0].start, { Event: 'WORKFLOW_STARTED', Scope: intent.scope, Request: `/aidlc ${intent.text}` });
  for (const s of stages) {
    add('Stage Start', s.start, { Event: 'STAGE_STARTED', Stage: s.slug, Agent: s.agent });
    if (s.agent === 'orchestrator') {
      if (s.end) add('Stage Completion', s.end, { Event: 'STAGE_COMPLETED', Stage: s.slug });
      continue;
    }
    add('Subagent Dispatched', s.start + 60000, { Event: 'SUBAGENT_DISPATCHED', Stage: s.slug, Agent: s.agent });
    if (!s.end) continue;
    add('Subagent Completed', s.end - 5 * 60000, { Event: 'SUBAGENT_COMPLETED', Stage: s.slug, Agent: s.agent });
    add('Sensor Passed', s.end - 4 * 60000, { Event: 'SENSOR_PASSED', Stage: s.slug, Sensor: 'required-sections' });
    add('Gate Opened', s.end - 3 * 60000, { Event: 'STAGE_AWAITING_APPROVAL', Stage: s.slug });
    add('Gate Approved', s.end - 30000, { Event: 'GATE_APPROVED', Stage: s.slug, 'User Input': 'Approve' });
    add('Stage Completion', s.end, { Event: 'STAGE_COMPLETED', Stage: s.slug });
  }
  return `# AI-DLC Audit Log\n\n${ev.join('\n---\n\n')}`;
}

function graphJson(intent, stages) {
  return JSON.stringify(
    {
      workflow_id: iso(stages[0].start),
      scope: intent.scope,
      started_at: iso(stages[0].start),
      stages: stages.map((s) => ({
        stage_slug: s.slug,
        started_at: iso(s.start),
        completed_at: s.end ? iso(s.end) : null,
        agent: s.agent,
        sensor_firings: [],
        outcome: s.end ? 'approved' : 'pending'
      }))
    },
    null,
    2
  );
}

// ---------- the invented usage ledger ----------

const zero = () => ({ tokens: { input: 0, output: 0, cacheCreate5m: 0, cacheCreate1h: 0, cacheRead: 0 }, usd: 0 });
function addTo(map, key, usd) {
  const n = (map[key] ??= zero());
  const k = usd * 1e5; // invented token counts in proportion to the cost
  n.tokens.input += Math.round(k * 0.02);
  n.tokens.output += Math.round(k * 0.12);
  n.tokens.cacheCreate5m += Math.round(k * 0.3);
  n.tokens.cacheRead += Math.round(k * 28);
  n.usd = Math.round((n.usd + usd) * 100) / 100;
}

function ledgerJson(intents) {
  const ledger = { schemaVersion: 3, totals: zero(), byStage: {}, byModel: {}, byAgent: {}, workflows: {}, cursors: {} };
  for (const intent of intents) {
    const wf = { totals: zero(), byStage: {}, byModel: {}, byAgent: {}, sessions: {} };
    const paid = intent.stages.filter((s) => WEIGHT[s.slug]);
    const sum = paid.reduce((a, s) => a + WEIGHT[s.slug], 0);
    for (const s of paid) {
      const usd = (intent.usd * WEIGHT[s.slug]) / sum;
      const st = (wf.byStage[s.slug] ??= { totals: zero(), byModel: {}, byAgent: {} });
      const split = [
        ['opus-5-5', s.agent, usd * 0.62],
        ['opus-5-5', 'main', usd * 0.33],
        ['sonnet-5-5', s.agent, usd * 0.05]
      ];
      for (const [model, agent, part] of split) {
        for (const [map, key] of [
          [st.byModel, model],
          [st.byAgent, agent],
          [wf.byModel, model],
          [wf.byAgent, agent],
          [ledger.byModel, model],
          [ledger.byAgent, agent]
        ])
          addTo(map, key, part);
        addTo(st, 'totals', part);
        addTo(wf, 'totals', part);
        addTo(ledger, 'totals', part);
        addTo((ledger.byStage[s.slug] ??= { totals: zero() }), 'totals', part);
      }
    }
    ledger.workflows[`intent:${uuidOf(intent.slug)}`] = wf;
  }
  return JSON.stringify(ledger, null, 2);
}

function featuresDocs(root) {
  const rows = EPICS.map((e) => {
    const marks = e.stories.map(([id, , s]) => `${MARK[s].split(' ')[0]} ${id}`).join(' · ');
    return `| [${e.id}](features/${e.file}) | ${e.title}: ${e.intro.replace(/\.$/, '').toLowerCase()} | ${marks} |`;
  });
  write(
    path.join(root, 'docs/FEATURES.md'),
    `# Demo App — Features\n\nOverview of all epics. Each epic has its own file under [features/](features/).\n\n| Epic | Topic | Status |\n|------|-------|--------|\n${rows.join('\n')}\n\n## Story numbering\n\n\`US-XXYY\`: \`XX\` = epic, \`YY\` = story.\n`
  );
  for (const e of EPICS) {
    const stories = e.stories.map(
      ([id, title, s, v]) => `**${id}: ${title}** ${markOf(s, v)}
- As a **note taker**, in order to **keep my thoughts in order**, I would like to **${title.toLowerCase()}**.
- **Epic:** ${e.id}
- **Priority:** ${s === 'planned' ? 'Medium' : 'High'}
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [${s === 'done' ? 'x' : ' '}] **Given** a note, **when** I ${title.toLowerCase()}, **then** the change is saved at once
  - [${s === 'done' ? 'x' : ' '}] **Given** no connection, **when** I ${title.toLowerCase()}, **then** it syncs later
- **Dependencies:** None
`
    );
    const status = e.stories
      .map(([id, , s, v]) => {
        const m = markOf(s, v);
        return `${m.split(' ')[0]} ${id} ${m.split(' ').slice(1).join(' ').toLowerCase()}`;
      })
      .join('. ');
    write(
      path.join(root, 'docs/features', e.file),
      `# ${e.id}: ${e.title}\n\n> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).\n\n---\n\n> ${e.intro}\n\n**Stories:** ${e.stories.map(([id]) => id).join(', ')}\n\n**Status (2026-11-14):** ${status}.\n\n---\n\n## User Stories\n\n${stories.join('\n')}`
    );
  }
  const slice = (v) =>
    EPICS.flatMap((e) =>
      e.stories.filter((st) => st[3] === v).map(([id, title, s]) => `| ${id} | ${e.id.slice(5)} | ${title} | High | Medium | — | ${MARK[s]} |`)
    );
  write(
    path.join(root, 'docs/releases/1.2.0.md'),
    `# Release plan v1.2.0\n\n**Theme:** Notes that work anywhere, and with others.\n\n## The v1.2.0 slice\n\n| Story | Epic | Title | Priority | Complexity | Depends on | Status |\n|-------|------|-------|----------|------------|------------|--------|\n${slice('v1.2.0').join('\n')}\n`
  );
}

function makeProject(root, intents, branch, withFeatures) {
  const base = path.join(root, 'aidlc/spaces/default/intents');
  write(path.join(root, 'aidlc/active-space'), 'default\n');
  const index = [];
  for (const intent of intents) {
    const dirName = `2611${String(intent.day).padStart(2, '0')}-${intent.slug}`;
    const stages = stagesOf(intent);
    intent.stages = stages;
    const dir = path.join(base, dirName);
    write(path.join(dir, 'aidlc-state.md'), stateMd(intent, stages));
    write(path.join(dir, 'project-description.json'), `${JSON.stringify(intent.text)}\n`);
    write(path.join(dir, 'audit/demo-host.md'), auditMd(intent, stages));
    write(path.join(dir, 'runtime-graph.json'), graphJson(intent, stages));
    index.push({
      uuid: uuidOf(intent.slug),
      slug: intent.slug,
      dirName,
      scope: intent.scope,
      status: intent.active ? 'in-flight' : 'complete',
      request: hex(intent.text, 8)
    });
    if (intent.active) write(path.join(base, 'active-intent'), `${dirName}\n`);
  }
  write(path.join(base, 'intents.json'), `${JSON.stringify(index, null, 2)}\n`);
  write(path.join(root, 'aidlc/.aidlc-sessions/usage-ledger.json'), ledgerJson(intents));
  write(path.join(root, 'README.md'), `# ${path.basename(root)}\n\nAn invented project for the T.H.A.D.E.U.S. screenshots.\n`);
  // The story lifecycle rule (US-0603), so the app shows no "rule missing" notice above the views.
  write(
    path.join(root, 'aidlc/spaces/default/memory/project.md'),
    '# Project-Level Rules\n\n## Corrections\n\n- ALWAYS keep the story status markers current: 📋 Planned, 🚧 In progress, ✅ Done. (story-lifecycle: releases v1)\n'
  );
  if (withFeatures) featuresDocs(root);
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=Demo', '-c', 'user.email=demo@example.com', '-c', 'commit.gpgsign=false', ...args], {
      cwd: root,
      env: { ...process.env, GIT_AUTHOR_DATE: iso(NOW), GIT_COMMITTER_DATE: iso(NOW) },
      stdio: 'ignore'
    });
  git('init', '-q', '-b', branch);
  git('add', '-A');
  git('commit', '-q', '-m', 'Demo project');
  if (withFeatures) for (const v of TAGGED) git('tag', v);
}

function prepare() {
  fs.rmSync(WORK, { recursive: true, force: true });
  const appRoot = path.join(WORK, 'projects/demo-app');
  const apiRoot = path.join(WORK, 'projects/demo-api');
  makeProject(appRoot, DEMO_APP, 'feat/US-0301-shared-notebooks', true);
  makeProject(apiRoot, DEMO_API, 'main', false);
  // The terminal tabs' shell: prints a prompt and waits, so no login profile and no agent CLI ever run.
  const stub = path.join(WORK, 'bin/demo-shell');
  write(stub, '#!/bin/sh\n[ "$1" = "--version" ] && { echo "1.0.0 (demo)"; exit 0; }\nprintf \'%s $ \' "${PWD##*/}"\nexec cat >/dev/null\n');
  fs.chmodSync(stub, 0o755);
  const profile = path.join(WORK, 'profile');
  const project = { featureDocs: 'show', featuresPath: 'docs/FEATURES.md', harness: 'claude' };
  write(
    path.join(profile, 'aidlc-dash/settings.json'),
    JSON.stringify(
      {
        openProjects: [appRoot, apiRoot],
        recentProjects: [appRoot, apiRoot],
        activeProject: appRoot,
        language: 'en',
        animations: 'off',
        questionAlerts: 'off',
        replyAlerts: 'off',
        notificationSound: false,
        toolPaths: { shell: stub, claude: stub },
        updates: { lastCheckMs: Date.now(), deleteAfterInstall: true },
        projectSettings: { [appRoot]: project, [apiRoot]: project }
      },
      null,
      2
    )
  );
  return profile;
}

// ---------- driving the app ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function drive(win) {
  const js = (code) => win.webContents.executeJavaScript(code, true);
  const waitFor = async (selector, ms = 20000) => {
    for (const end = Date.now() + ms; Date.now() < end; await sleep(200)) {
      if (await js(`!!document.querySelector(${JSON.stringify(selector)})`)) return;
    }
    throw new Error(`Timed out waiting for ${selector}`);
  };
  const click = async (selector, text) => {
    await waitFor(selector);
    const ok = await js(`(() => {
      const all = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const el = ${text ? `all.find((e) => e.textContent.includes(${JSON.stringify(text)}))` : 'all[0]'};
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (!ok) throw new Error(`Nothing to click: ${selector} ${text ?? ''}`);
    await sleep(800);
  };
  const shot = async (name) => {
    // The hooks notice comes back per view; hide it again (US-1103: clean shots).
    await js(`document.querySelector('[data-testid="agent-hooks-strip-dismiss"]')?.click()`);
    await sleep(1500);
    const image = (await win.webContents.capturePage()).resize({ ...SIZE, quality: 'best' });
    fs.writeFileSync(path.join(OUT, name), image.toPNG());
    console.log(`docs/screenshots/${name}`);
  };

  // US-1102: frames for the README's animated GIF, taken the whole run through (about 5 a second).
  const frames = path.join(WORK, 'frames');
  fs.mkdirSync(frames, { recursive: true });
  let n = 0;
  let recording = true;
  const recorder = (async () => {
    while (recording) {
      const image = (await win.webContents.capturePage()).resize({ width: 960, quality: 'good' });
      fs.writeFileSync(path.join(frames, `${String(n++).padStart(4, '0')}.png`), image.toPNG());
      await sleep(200);
    }
  })();

  await waitFor('[data-testid="intent-list-row"]');
  // The demo projects have no agent hooks installed; hide that notice for this run (it is not saved).
  await click('[data-testid="agent-hooks-strip-dismiss"]');
  await click('[data-testid="intent-list-row"]', 'shared-notebooks');
  await click('[data-testid="intent-detail-tab-pipeline"]');
  await shot('intents.png');
  await click('[data-testid="intent-detail-tab-timeline"]');
  await shot('timeline.png');
  await click('[data-testid="intent-detail-tab-pipeline"]');
  await click('[data-testid="arm-cost"]');
  await shot('cost.png');
  await click('[data-testid="arm-cost"]'); // closed again
  await click('[data-testid="project-view-switch-features"]');
  await click('[data-testid="features-view-epic"]', 'Sharing');
  await shot('features.png');
  await click('[data-testid="features-view-tab-releases"]');
  await click('[data-testid="features-view-release"]', 'v1.2.0');
  await shot('releases.png');
  await click('[data-testid="project-view-switch-config"]');
  await shot('configuration.png');
  await click('[data-testid="project-view-switch-intents"]');
  await sleep(1500);

  recording = false;
  await recorder;
  // 1.6× speed, 10 frames a second, one shared palette: about 12 s, kept under 5 MB.
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    '5',
    '-i',
    path.join(frames, '%04d.png'),
    '-vf',
    'setpts=PTS/1.6,fps=10,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    path.join(OUT, 'demo.gif')
  ]);
  console.log('docs/screenshots/demo.gif');
}

const profile = prepare();
app.setPath('appData', profile); // before the app's main module sets userData from it
delete process.env.ELECTRON_RENDERER_URL; // the built renderer, never a dev server
for (const key of Object.keys(process.env)) if (key.startsWith('THADEUS_')) delete process.env[key];
require(path.join(ROOT, 'out/main/index.js'));

app.whenReady().then(async () => {
  // ponytail: waits on fixed sleeps after each click; poll for the view's data if a shot ever comes out half-drawn.
  let win;
  for (let i = 0; i < 100 && !win; i++, await sleep(100)) win = BrowserWindow.getAllWindows()[0];
  if (!win) throw new Error('The app window did not open');
  win.setFullScreen(false);
  win.setContentSize(WINDOW.width, WINDOW.height);
  await new Promise((r) => (win.webContents.isLoading() ? win.webContents.once('did-finish-load', r) : r()));
  try {
    await drive(win);
    app.exit(0);
  } catch (err) {
    console.error('Screenshots failed:', err.message);
    app.exit(1);
  }
});
