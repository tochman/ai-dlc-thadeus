import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProjectView from './ProjectView.jsx';
import AuctumMark from './AuctumMark.jsx';
import Splash from './Splash.jsx';
import SettingsView, { SETTINGS_TABS, saveLanguage } from './SettingsView.jsx';
import { withSlots } from './format.js';
import DocsDialog from './DocsDialog.jsx';
import AboutDialog from './AboutDialog.jsx';
import AgentDialog from './AgentDialog.jsx';
import { HealthLine, HealthPanel, HealthStatus, useHealth } from './HealthCheck.jsx'; // US-0805
import UpdateNotice, { openUpdateDialog } from './UpdateNotice.jsx';
import { Block, Changed, Frame, Pill, SegBar, useEntrance } from './Lcars.jsx';
import Tooltip from './Tooltip.jsx';
import { APP_NAME } from '../shared/appName.js';
import { selectableHarness } from '../shared/harnesses.js';
import { byPager, isSettled } from '../shared/agentOrder.js';
import { alertPlan } from '../shared/alertPlan.js';

const NOTICE_MS = 5000; // US-0506 u2 K11: how long the hand-back notice stays
import { dirtyFiles } from './editor/EditorContext.jsx';
import { sectionsFor, shownViews } from '../shared/frameworkViews.js';

const bridge = window.bridge;

/** US-1401: the arm's foot, the intent count for AI-DLC and the feature count for Spec Kit (0 until U6 reports it). */
function footLabel(framework, meta, t) {
  if (framework === 'aidlc') return t('app.intentCount', { n: meta.intentCount ?? 0 });
  if (framework === 'speckit') return t('app.featureCount', { n: meta.featureCount ?? 0 });
  return 'Auctum';
}
/** US-0050 item 8: the arm's intent or feature count, glowing once when it changes; keyed by project, so a switch does not. */
const liveCount = (projectId, n) =>
  n == null ? (
    n
  ) : (
    <Changed key={projectId} value={n}>
      {n}
    </Changed>
  );
// The view and, for Features and Configuration, the section chosen in the arm (US-0012).
const UI_DEFAULT = { view: 'intents', configSection: 'docs', aidlcTab: 'settings', featuresTab: 'epics', teamSection: 'refresh' };
const TEAM_SECTIONS = ['refresh', 'machines']; // the team view's sections under its arm block (US-1201 AC-3)
/** US-0905: Plans is a sub-view of Configuration › AI-DLC, so a link or menu item asking for the old Plans view lands there. */
const movePlans = (change) => (change.view === 'plans' ? { ...change, view: 'config', configSection: 'aidlc', aidlcTab: 'plans' } : change);

function errorText(err) {
  return String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

/** The saved "Animationer" choice, or Dämpad when the OS asks for reduced motion, else Full (FR4.2). */
export function motionMode(saved) {
  if (saved) return saved;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'reduced' : 'full';
}

/**
 * A labelled block in the left arm (US-0417): a square block with its state strip at the left edge and a figure top
 * left. The current one is light with black text (selection is brightness).
 */
function ArmBlock({ current = false, tone = 'mid', size, figure, strip, children, ...rest }) {
  return (
    <Block
      as="button"
      tone={current || tone === 'mid' ? undefined : tone}
      size={size}
      selected={current}
      figure={figure}
      strip={strip}
      aria-current={current ? 'page' : undefined}
      {...rest}
    >
      {children}
    </Block>
  );
}

/** A view's sections, indented under its block in the arm: the one way to pick a section anywhere (US-0012). */
function ArmSubtabs({ label, ids, current, labelOf, onPick, testIdPrefix }) {
  return (
    <div className="arm-subtabs" role="group" aria-label={label}>
      {ids.map((id, i) => (
        <ArmBlock key={id} size="sub" tone={i % 2 ? 'dark' : 'mid'} current={current === id} onClick={() => onPick(id)} data-testid={`${testIdPrefix}-${id}`}>
          {labelOf(id)}
        </ArmBlock>
      ))}
    </div>
  );
}

export default function App() {
  const { t } = useTranslation(); // a language switch re-renders the whole app, state kept (EPIC-07 NFR3)
  const [tabs, setTabs] = useState([]); // { projectId, root, name, detection }
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState(null);
  const [restored, setRestored] = useState(false);
  const [settingsView, setSettingsView] = useState(false); // "Inställningar" shows in the content frame, not a dialog (US-0405 FR1.1)
  const [settingsTab, setSettingsTab] = useState('tools'); // the tab shown in it, saved as settingsTab (US-0410 FR5.1)
  const [startFullscreen, setStartFullscreen] = useState(false); // the saved "Helskärm vid start", apart from the live mode below
  const [recent, setRecent] = useState([]); // the "Senaste projekt" list, also kept in recentRef for saving
  const [animations, setAnimations] = useState(null); // saved choice; null means the default applies
  const [language, setLanguage] = useState('auto'); // saved "Språk / Language" choice (EPIC-07 FR4.1)
  const [ui, setUi] = useState({}); // projectId -> {view}: the one view the arm has selected per project
  const [meta, setMeta] = useState({}); // projectId -> {showFeatures, intentCount, harness}, reported by ProjectView
  const [branch, setBranch] = useState(null);
  const [fullscreen, setFullscreen] = useState(false); // the window's real mode, from main (US-0404 FR1.2)
  const [terminalCommand, setTerminalCommand] = useState(null); // {seq, action, projectId} from the Terminal menu
  const [docs, setDocs] = useState(null); // {name, content} of the docs/README.md shown from Hjälp
  const [editRequest, setEditRequest] = useState(null); // {seq, projectId, rel}: "Redigera" in the docs dialog (US-1001)
  const [alertSettings, setAlertSettings] = useState({}); // {questionAlerts, replyAlerts, notificationSound} as saved (US-0505, US-0506 u5)
  const [questions, setQuestions] = useState([]); // waiting questions of every open project, from main (FR1.4)
  const [agentEvents, setAgentEvents] = useState({}); // projectId -> AgentEvent[] from main, hook and audit (US-0506 C4)
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupFocus, setPopupFocus] = useState(null); // {id} named by a clicked notification (FR3.2)
  // ponytail: one notice at a time and no app-wide toast component (US-0506 u2 K11); replace it with u5's notice if
  // one is built, or queue notices if two can ever arrive within NOTICE_MS.
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);
  const recentRef = useRef([]);
  const menuCommandRef = useRef(null);
  const [updateCheck, setUpdateCheck] = useState(0); // "Sök efter uppdatering…" bumps it (US-0407)
  const [aboutOpen, setAboutOpen] = useState(false); // "Om T.H.A.D.E.U.S." from the menu (US-0408)
  const seenQuestionsRef = useRef(new Set());
  const alertSettingsRef = useRef(alertSettings);
  alertSettingsRef.current = alertSettings;
  const motion = motionMode(animations);

  // Before paint, so the first frame already runs in the chosen mode (FR4.2).
  useLayoutEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);

  const openPath = useCallback(async (dir) => {
    const info = await bridge.openProject(dir);
    setTabs((t) => [...t, info]);
    setActiveId(info.projectId);
    recentRef.current = [info.root, ...recentRef.current.filter((p) => p !== info.root)].slice(0, 10);
    setRecent(recentRef.current);
    return info;
  }, []);

  // US-0043: an error line in the current language, from effects that must not rerun when the language changes.
  const showError = useEffectEvent((key, values) => setError(t(key, values)));

  // Reopen the tabs from the last session (FR1.5).
  useEffect(() => {
    (async () => {
      try {
        const s = await bridge.getSettings();
        recentRef.current = s.recentProjects;
        setRecent(s.recentProjects ?? []);
        setAnimations(s.animations ?? null);
        setStartFullscreen(s.fullscreen === true); // "Helskärm vid start" is the mode main saved at exit (US-0404)
        setLanguage(s.language ?? 'auto');
        setSettingsTab(SETTINGS_TABS.includes(s.settingsTab) ? s.settingsTab : 'tools'); // the first time: Tools (US-0410 FR5.1)
        setAlertSettings({ questionAlerts: s.questionAlerts, replyAlerts: s.replyAlerts, notificationSound: s.notificationSound });
        const failed = [];
        let activeInfo = null;
        for (const dir of s.openProjects) {
          try {
            const info = await openPath(dir);
            if (info.root === s.activeProject) activeInfo = info;
          } catch (err) {
            failed.push(`${dir}: ${errorText(err)}`);
          }
        }
        if (activeInfo) setActiveId(activeInfo.projectId);
        if (failed.length) showError('app.reopenFailed', { list: failed.join('; ') });
      } catch (err) {
        showError('app.settingsReadFailed', { error: errorText(err) });
      } finally {
        setRestored(true);
      }
    })();
  }, [openPath]);

  // A folder that got AI-DLC set up switches to the project view in the same tab (FR4.6).
  useEffect(
    () => bridge.onProjectDetected(({ projectId, detection }) => setTabs((t) => t.map((tab) => (tab.projectId === projectId ? { ...tab, detection } : tab)))),
    []
  );

  // Persist open tabs after every change, but only once the restore has finished.
  useEffect(() => {
    if (!restored) return;
    const active = tabs.find((t) => t.projectId === activeId);
    bridge
      .setSettings({
        openProjects: tabs.map((t) => t.root),
        recentProjects: recentRef.current,
        activeProject: active?.root ?? null
      })
      .catch((err) => showError('app.settingsSaveFailed', { error: errorText(err) }));
  }, [tabs, activeId, restored]);

  // The branch in the header. Read-only; it is only a label, so a failure just leaves it out. It is read again
  // when HEAD changes, also from a switch outside the app (US-0015).
  useEffect(() => {
    setBranch(null);
    if (!activeId || !bridge.getGitStatus) return undefined;
    let cancelled = false;
    const read = () =>
      bridge
        .getGitStatus(activeId)
        .then((s) => !cancelled && setBranch(s?.isRepo ? (s.branch ?? null) : null))
        .catch((err) => console.warn('Grenen kunde inte läsas:', errorText(err)));
    read();
    const off = bridge.onGitHeadChanged?.((c) => {
      if (c.projectId === activeId) read();
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, [activeId]);

  const reportMeta = useCallback((projectId, partial) => setMeta((m) => ({ ...m, [projectId]: { ...m[projectId], ...partial } })), []);
  const setUiOf = useCallback((projectId, change) => setUi((u) => ({ ...u, [projectId]: { ...UI_DEFAULT, ...u[projectId], ...movePlans(change) } })), []);

  // The label follows the real mode, also when it changes from the menu, the shortcut or macOS' green button.
  useEffect(() => {
    bridge
      .isFullscreen()
      .then((on) => setFullscreen(on === true))
      .catch((err) => console.warn('Helskärmsläget kunde inte läsas:', errorText(err)));
    return bridge.onFullscreen((on) => setFullscreen(on === true));
  }, []);

  // Waiting questions (US-0505): kept for the "asking" marks on the intents. The dialog itself shows main's agent
  // events (US-0506), which hold these questions as audit events while a project has no hook session.
  useEffect(() => {
    const receive = (list) => {
      if (Array.isArray(list)) setQuestions(list);
    };
    bridge
      .listQuestions?.()
      .then(receive)
      .catch((err) => console.warn('Väntande frågor kunde inte läsas:', errorText(err)));
    return bridge.onQuestions?.(receive);
  }, []);

  // Agent events (US-0506 u1 C4): the list per open project, then main's pushes. Only an event not seen before and
  // not waiting since the start opens the dialog (US-0505 FR1.4), and only when alertPlan says so for its kind
  // (US-0506 u5 D2): questions and permissions follow questionAlerts, replies replyAlerts.
  // US-0045 AC2 (was US-0031 FR1, FR3): a new page shows when it arrives, whether the dialog is closed or open; the
  // dialog's page guard (GUARD_MS) keeps a keystroke meant for the old page from answering it. Of several new pages the
  // newest arrival wins (ties in pager order), also across pushes from several projects before the next render.
  const newestRef = useRef(null);
  const newest = (a, b) => {
    if (!a) return b;
    const d = b.arrivedAtMs - a.arrivedAtMs;
    return d > 0 || (d === 0 && byPager(b, a) < 0) ? b : a;
  };
  const receiveAgentEvents = useCallback((projectId, events) => {
    if (typeof projectId !== 'string' || !Array.isArray(events)) return;
    const seen = seenQuestionsRef.current;
    const fresh = events.filter((e) => !e.early && (e.state === 'shown' || e.state === 'timedOut') && !seen.has(e.eventId));
    for (const e of events) seen.add(e.eventId);
    setAgentEvents((m) => ({ ...m, [projectId]: events }));
    const opening = fresh.filter((e) => alertPlan(e.kind, alertSettingsRef.current, true).open);
    if (!opening.length) return;
    const before = newestRef.current;
    newestRef.current = opening.reduce(newest, before);
    // A new page older than the one shown last (one listed late) opens the dialog without moving the page being read.
    if (newestRef.current !== before) setPopupFocus({ id: newestRef.current.eventId });
    setPopupOpen(true);
  }, []);
  useEffect(() => bridge.agentEvents?.onChanged(({ projectId, events }) => receiveAgentEvents(projectId, events)), [receiveAgentEvents]);
  const listedRef = useRef(new Set());
  useEffect(() => {
    for (const { projectId } of tabs) {
      if (listedRef.current.has(projectId) || !bridge.agentEvents) continue;
      listedRef.current.add(projectId);
      bridge.agentEvents
        .list(projectId)
        .then((events) => receiveAgentEvents(projectId, events))
        .catch((err) => console.warn('Agentens frågor kunde inte läsas:', errorText(err)));
    }
  }, [tabs, receiveAgentEvents]);

  // Main decides on notifications and needs to know which project is shown (FR3.1).
  useEffect(() => {
    bridge.setActiveProject?.(activeId).catch((err) => console.warn('Aktivt projekt kunde inte skickas:', errorText(err)));
  }, [activeId]);

  // The open projects' events in pager order (US-0506 u2 BR5.12: questions and permissions before replies, then
  // arrival), new ones before those that waited from the start (FR2.2, BR2.1).
  // The dialog closes by itself once none of the events that opened it is left (FR2.4).
  // US-0506 u3: byPager puts replies after questions and permissions (BR6.8); a queued or dismissed reply is not in the
  // pager (K4, BR6.14).
  const dialogEvents = tabs
    .flatMap((tab) => agentEvents[tab.projectId] ?? [])
    .filter((e) => !(e.kind === 'reply' && (e.state === 'queued' || e.state === 'dismissed')))
    .sort(byPager);
  const popupEvents = [...dialogEvents.filter((e) => !e.early), ...dialogEvents.filter((e) => e.early)];
  const hasNewQuestion = dialogEvents.some((e) => !e.early && !isSettled(e)); // US-0031 FR4: settled pages hold nothing open
  useEffect(() => {
    if (!hasNewQuestion) setPopupOpen(false);
  }, [hasNewQuestion]);

  function closePopup() {
    setPopupOpen(false);
    setPopupFocus(null);
  }
  /** The latest-message strip's Answer (US-0506 u3 K11, PD11): main shows the dismissed reply again, then the dialog
   *  opens on it. */
  function openReply(eventId) {
    bridge.agentEvents
      ?.reopen(eventId)
      .then(() => {
        setPopupFocus({ id: eventId });
        setPopupOpen(true);
      })
      .catch((err) => console.warn('Meddelandet kunde inte öppnas igen:', errorText(err)));
  }
  // US-0506 u5 D6, SD53: a clicked notification names an event. Its project is shown; an open event opens the dialog
  // on its page, a dismissed reply is reopened, anything else (gone, or a bad payload) opens nothing.
  const agentEventsRef = useRef(agentEvents);
  agentEventsRef.current = agentEvents;
  const onEventFocus = useRef(null);
  onEventFocus.current = (payload) => {
    const id = payload?.eventId;
    if (typeof id !== 'string' || !id || id.length > 64) return;
    const ev = Object.values(agentEventsRef.current)
      .flat()
      .find((e) => e.eventId === id);
    if (!ev) return;
    setSettingsView(false);
    setActiveId(ev.projectId);
    if (ev.kind === 'reply' && ev.state === 'dismissed') openReply(id);
    else if (ev.state !== 'ended' && ev.state !== 'stale') {
      setPopupFocus({ id });
      setPopupOpen(true);
    }
  };
  useEffect(() => bridge.agentEvents?.onFocus?.((payload) => onEventFocus.current(payload)), []);
  /** "Svara i terminalen": that project, its agent tab open and focused (FR2.3). Sets projectId directly, since
   *  runTerminal reads the active project from this render (developer scan, finding 6). */
  function answerInAgent(q) {
    closePopup();
    setActiveId(q.projectId);
    setTerminalCommand((c) => ({ seq: (c?.seq ?? 0) + 1, action: 'agent', projectId: q.projectId }));
  }
  /** US-0213 FR3.2: a handoff choice goes to the event's own agent tab without switching views. Resolves { ok, reason? }. */
  function sendHandoff(event, choice, { onWaiting } = {}) {
    return new Promise((reply) =>
      setTerminalCommand((c) => ({ seq: (c?.seq ?? 0) + 1, action: 'handoff', projectId: event.projectId, event, choice, onWaiting, reply }))
    );
  }
  /** The popup's answer: `text` goes to that project's agent tab without switching views. Resolves {ok, error}. */
  function sendAnswer(q, answer) {
    return new Promise((reply) =>
      setTerminalCommand((c) => ({ seq: (c?.seq ?? 0) + 1, action: 'answer', projectId: q.projectId, question: q, answer, reply }))
    );
  }
  async function saveAlertSettings(partial) {
    setAlertSettings((s) => ({ ...s, ...partial }));
    await bridge.setSettings(partial); // a failure is shown in the dialog
  }

  // Closing the window or quitting: main waits for this answer, asked only while an editor has unsaved changes (US-1001).
  useEffect(
    () =>
      bridge.onConfirmClose?.(() => {
        const unsaved = dirtyFiles();
        const ok = !unsaved.length || window.confirm(t('editor.quitDirty', { files: unsaved.join(', ') }));
        bridge.confirmClose(ok).catch((err) => console.error('Close answer failed:', errorText(err)));
      }),
    [t]
  );

  // Every menu command runs the same named function as the arm's button (US-0404 FR2.4); unknown ones are ignored.
  useEffect(() => bridge.onMenuCommand((payload) => menuCommandRef.current?.(payload)), []);

  async function openProject() {
    setError(null);
    try {
      const dir = await bridge.pickProject();
      if (!dir) return;
      const existing = tabs.find((t) => t.root === dir);
      if (existing) setActiveId(existing.projectId);
      else await openPath(dir);
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function closeTab(projectId) {
    const unsaved = dirtyFiles(projectId);
    if (unsaved.length && !window.confirm(t('editor.closeProjectDirty', { files: unsaved.join(', ') }))) return; // US-1001
    const rest = tabs.filter((t) => t.projectId !== projectId);
    setTabs(rest);
    if (activeId === projectId) setActiveId(rest[rest.length - 1]?.projectId ?? null);
    try {
      await bridge.closeProject(projectId);
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function saveAnimations(next) {
    setAnimations(next);
    await bridge.setSettings({ animations: next }); // a failure is shown in the view
  }
  async function changeLanguage(next) {
    setLanguage(next);
    await saveLanguage(next); // a failure is shown in the view
  }
  /** "Helskärm vid start" (US-0404 A2): the key main saves at exit, kept apart from the live mode the header shows. */
  async function saveStartFullscreen(on) {
    setStartFullscreen(on);
    await bridge.setSettings({ fullscreen: on });
  }
  /** Drops one recent project from the list the view shows and the next save writes (US-0405 FR4.2). */
  async function removeRecent(dir) {
    recentRef.current = recentRef.current.filter((p) => p !== dir);
    setRecent(recentRef.current);
    await bridge.setSettings({ recentProjects: recentRef.current });
  }

  const active = tabs.find((t) => t.projectId === activeId) ?? null;
  const activeUi = active ? { ...UI_DEFAULT, ...ui[active.projectId] } : UI_DEFAULT;
  const activeMeta = (active && meta[active.projectId]) || {};
  // US-1401 FR1.2: one value, the framework, and the shared views table decide the arm (AC1.1.5).
  const framework = active?.detection.framework ?? null;
  const health = useHealth({ ready: restored, framework }); // US-0805: the one scan, after the tabs are restored
  const showFeatures = activeMeta.showFeatures === true;
  // One view at a time. Features needs the feature docs (US-0901 FR1.1); a view not offered falls back to the default (R-01).
  const views = shownViews(active?.detection.views, showFeatures);
  const offers = (id) => views.includes(id);
  const defaultView = active?.detection.defaultView ?? 'intents';
  const view = offers(activeUi.view) ? activeUi.view : defaultView;
  const firstLabel = { intents: t('app.intents'), specs: t('app.specs') }[defaultView] ?? t('app.setup');
  // A project with no framework yet shows AI-DLC's views disabled, as before US-1401; a Spec Kit one does not show them.
  const armShows = (id) => offers(id) || framework === null;
  const viewLabel =
    {
      features: t('app.features'),
      config: t('app.config'),
      editor: t('app.editor'),
      cost: t('app.cost'),
      velocity: t('app.velocity'),
      github: t('app.github')
    }[view] ?? firstLabel;

  // Named actions shared by the left arm and the app menu (US-0404 FR2.4).
  function closeActiveProject() {
    if (activeId) closeTab(activeId); // nothing open: Cmd/Ctrl+W does nothing (FR2.6)
  }
  /** A view block in the arm also leaves Settings, which has no Close button (US-0012). */
  function showView(next, extra) {
    if (!active) return;
    setSettingsView(false);
    setUiOf(active.projectId, { view: next, ...extra });
  }
  const openAppSettings = () => setSettingsView(true);
  /** A Settings tab from the rail: shown at once and remembered for the next start (US-0410 FR1.2, FR5.1). */
  function chooseSettingsTab(id) {
    setSettingsTab(id);
    bridge.setSettings({ settingsTab: id }).catch((err) => setError(t('app.settingsSaveFailed', { error: errorText(err) })));
  }
  /** "Settings › Tools" in the terminal panel's sign-in line (US-0804 FR4.1). */
  function openToolSettings() {
    chooseSettingsTab('tools');
    openAppSettings();
  }
  /** A project's own settings are its Configuration view (US-0012): ⚙, the menu and Settings › Project all go there. */
  function openProjectSettings(projectId) {
    if (!projectId) return;
    setSettingsView(false);
    setActiveId(projectId);
    setUiOf(projectId, { view: 'config', configSection: 'docs' });
  }
  function runTerminal(action) {
    if (active) setTerminalCommand((c) => ({ seq: (c?.seq ?? 0) + 1, action, projectId: active.projectId }));
  }
  /** US-0504 FR1.3, FR2.3: Settings closes so the person sees the command in the active project's shell tab and presses Enter. */
  function typeInActiveShell(text) {
    if (!active || !text) return;
    setSettingsView(false);
    setTerminalCommand((c) => ({ seq: (c?.seq ?? 0) + 1, action: 'type', text, projectId: active.projectId }));
  }
  /** The project's docs/README.md when it has one, else AI-DLC's web page (FR2.1 Hjälp, Q2). */
  async function openDocs() {
    if (active) {
      try {
        setDocs({ name: active.name, projectId: active.projectId, content: await bridge.readFile(active.projectId, 'docs/README.md') });
        return;
      } catch (err) {
        console.info('Ingen docs/README.md i projektet, öppnar AI-DLC:s webbsida:', errorText(err));
      }
    }
    bridge.openDocsUrl().catch((err) => setError(t('app.browserFailed', { error: errorText(err) })));
  }
  const pick = (value, allowed, fn) => allowed.includes(value) && fn(value);
  const menuCommands = {
    openProject: () => openProject(),
    closeProject: () => closeActiveProject(),
    projectSettings: () => openProjectSettings(activeId),
    appSettings: () => openAppSettings(),
    view: ({ view: v }) => pick(v, ['intents', 'features', 'config', 'plans', 'editor'], showView),
    panel: ({ panel }) => pick(panel, ['cost', 'github'].filter(offers), showView), // Kostnad and Github are views too
    terminal: ({ action }) => pick(action, ['agent', 'shell', 'restart'], runTerminal),
    docs: () => openDocs(),
    checkUpdate: () => setUpdateCheck((n) => n + 1),
    about: () => setAboutOpen(true)
  };
  menuCommandRef.current = (payload) => {
    if (typeof payload?.command === 'string' && Object.hasOwn(menuCommands, payload.command)) menuCommands[payload.command](payload);
  };

  // Main enables and hides menu items from this (FR2.5).
  const hasProject = active !== null;
  useEffect(() => {
    bridge.sendMenuState({ hasProject, framework, showFeatures }).catch((err) => console.warn('Menyläget kunde inte skickas:', errorText(err)));
  }, [hasProject, framework, showFeatures]);

  function toggleFullscreen() {
    bridge.toggleFullscreen().catch((err) => setError(t('app.fullscreenFailed', { error: errorText(err) })));
  }

  // US-0417: Esc leaves Settings wherever the focus is, back to the view shown before; an open dialog keeps its Esc.
  useEffect(() => {
    if (!settingsView) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open]')) return;
      setSettingsView(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsView]);

  // US-0417: the shared entrance runs each time a view is entered (a project, a view or Settings), never on a refresh.
  const entering = useEntrance(settingsView ? 'settings' : `${activeId}:${view}`);
  const backLabel = active ? t('app.backTo', { view: viewLabel }) : t('app.back');

  return (
    <div className={`app${fullscreen ? ' is-fullscreen' : ''}`}>
      <Splash ready={restored} />
      <header className="app-header">
        {/* US-0417: today's corner block in slate, the amber mark and the name (the mark's one home). */}
        <div className="app-brand" data-testid="app-brand">
          <AuctumMark size={46} className="app-mark" />
          <span className="app-brand-text">{APP_NAME}</span>
        </div>
        <div className="app-header-main">
          {/* US-0417: the window title heads the 30 px bar, the branch is its sub-label, Full screen its last segment;
              while Settings is open its way back sits before it (US-0012: controls live in the bar). */}
          <SegBar
            as="h1"
            level="window"
            title={
              settingsView ? (
                t('app.settings')
              ) : active ? (
                <>
                  {active.name}{' '}
                  <span className="app-title-sep" aria-hidden="true">
                    •
                  </span>{' '}
                  {viewLabel}
                </>
              ) : (
                t('app.noProject')
              )
            }
            sub={
              branch && (
                <>
                  <span className="app-meta-label">{t('app.branch')}</span>{' '}
                  <Tooltip text={branch} focusable>
                    <span className="app-branch">{branch === 'HEAD' ? t('app.detached') : branch}</span>
                  </Tooltip>
                </>
              )
            }
            trailing={
              <>
                {settingsView && (
                  <Pill onClick={() => setSettingsView(false)} data-testid="settings-back">
                    {backLabel}
                  </Pill>
                )}
                <Pill tone={fullscreen ? 'notice' : undefined} aria-pressed={fullscreen} onClick={toggleFullscreen} data-testid="fullscreen-toggle">
                  {fullscreen ? t('app.leaveFullscreen') : t('app.fullscreen')}
                </Pill>
              </>
            }
          />
          <span className="app-title-rule" aria-hidden="true" />
        </div>
      </header>

      <nav className="app-arm" aria-label={t('app.armLabel')} data-testid="project-tabs">
        {tabs.map((tab) => {
          const on = tab.projectId === activeId;
          return (
            <div key={tab.projectId} className={`arm-project ${on ? 'is-active' : ''}`}>
              <Tooltip text={tab.root}>
                <button
                  className={`lcars-block ${on ? 'lcars-block--light' : 'lcars-block--dark'}`}
                  aria-current={on ? 'true' : undefined}
                  onClick={() => setActiveId(tab.projectId)}
                  data-testid="project-tabs-tab"
                >
                  <span className="lcars-label">{tab.name}</span>
                </button>
              </Tooltip>
              <span className="arm-tools">
                <Tooltip text={t('app.projectSettingsFor', { name: tab.name })}>
                  <button
                    className="arm-tool"
                    aria-label={t('app.projectSettingsFor', { name: tab.name })}
                    onClick={() => openProjectSettings(tab.projectId)}
                    data-testid="project-settings-open"
                  >
                    ⚙
                  </button>
                </Tooltip>
                <Tooltip text={t('app.closeProject', { name: tab.name })}>
                  <button
                    className="arm-tool"
                    aria-label={t('app.closeProject', { name: tab.name })}
                    onClick={() => closeTab(tab.projectId)}
                    data-testid="project-tabs-close"
                  >
                    ×
                  </button>
                </Tooltip>
              </span>
            </div>
          );
        })}
        <button className="lcars-block lcars-block--sm lcars-block--deep" onClick={openProject} data-testid="project-tabs-add">
          {t('app.open')}
        </button>
        <span className="arm-spacer" aria-hidden="true" />
        {active && (
          <>
            {/* US-0417: the count as the block's figure, a live strip while an agent works. US-1401: the framework's default view. */}
            <ArmBlock
              current={!settingsView && view === defaultView}
              figure={liveCount(activeId, { aidlc: activeMeta.intentCount, speckit: activeMeta.featureCount }[framework])}
              strip={activeMeta.busy ? 'live' : undefined}
              onClick={() => showView(defaultView)}
              data-testid={`project-view-switch-${defaultView}`}
            >
              {firstLabel}
            </ArmBlock>
            {offers('features') && (
              <ArmBlock current={!settingsView && view === 'features'} onClick={() => showView('features')} data-testid="project-view-switch-features">
                {t('app.features')}
              </ArmBlock>
            )}
            {!settingsView && view === 'features' && activeMeta.delivery !== 'continuous' && (
              <ArmSubtabs
                label={t('features.releases.title')}
                ids={['epics', 'releases']}
                current={activeUi.featuresTab}
                labelOf={(id) => (id === 'epics' ? t('features.epics') : t('features.releases.title'))}
                onPick={(id) => showView('features', { featuresTab: id })}
                testIdPrefix="features-view-tab"
              />
            )}
            <ArmBlock current={!settingsView && view === 'config'} onClick={() => showView('config')} data-testid="project-view-switch-config">
              {t('app.config')}
            </ArmBlock>
            {!settingsView && view === 'config' && (
              <ArmSubtabs
                label={t('app.config')}
                ids={sectionsFor(framework)}
                current={sectionsFor(framework).includes(activeUi.configSection) ? activeUi.configSection : 'docs'}
                labelOf={(id) => t(`settings.project.sections.${id}`)}
                onPick={(id) => showView('config', { configSection: id })}
                testIdPrefix="config-section"
              />
            )}
            <ArmBlock current={!settingsView && view === 'editor'} onClick={() => showView('editor')} data-testid="project-view-switch-editor">
              {t('app.editor')}
            </ArmBlock>
            {armShows('cost') && (
              <ArmBlock current={!settingsView && view === 'cost'} disabled={!offers('cost')} onClick={() => showView('cost')} data-testid="arm-cost">
                {t('app.cost')}
              </ArmBlock>
            )}
            {/* US-0303 FR3.5: the project's velocity, beside Cost. */}
            {armShows('velocity') && (
              <ArmBlock
                current={!settingsView && view === 'velocity'}
                disabled={!offers('velocity')}
                onClick={() => showView('velocity')}
                data-testid="arm-velocity"
              >
                {t('app.velocity')}
              </ArmBlock>
            )}
            {armShows('github') && (
              <ArmBlock
                tone="dark"
                current={!settingsView && view === 'github'}
                disabled={!offers('github')}
                onClick={() => showView('github')}
                data-testid="arm-github"
              >
                {t('app.github')}
              </ArmBlock>
            )}
            {offers('github') && !settingsView && view === 'github' && (
              <ArmSubtabs
                label={t('app.github')}
                ids={TEAM_SECTIONS}
                current={activeUi.teamSection}
                labelOf={(id) => t(`team.sections.${id}`)}
                onPick={(id) => showView('github', { teamSection: id })}
                testIdPrefix="team-section"
              />
            )}
          </>
        )}
        <ArmBlock tone="dark" current={settingsView} onClick={openAppSettings} data-testid="app-settings-open">
          {t('app.settings')}
        </ArmBlock>
        {/* The Settings tabs, only while Settings is open (US-0410 FR1.1–FR1.3). */}
        {settingsView && (
          <ArmSubtabs
            label={t('settings.tabsLabel')}
            ids={SETTINGS_TABS}
            current={settingsTab}
            labelOf={(id) => t(`settings.sections.${id}`)}
            onPick={chooseSettingsTab}
            testIdPrefix="app-settings-tab"
          />
        )}
        {/* US-0417: the mark has one home (the brand corner), so the arm's foot block carries only its label. */}
        <div className="arm-foot">
          <span className="arm-foot-label">{footLabel(framework, activeMeta, t)}</span>
        </div>
      </nav>

      {error && (
        <div className="banner banner-error app-error" role="alert">
          <span>{error}</span>
          <button className="btn" onClick={() => setError(null)} data-testid="app-error-dismiss">
            {t('common.close')}
          </button>
        </div>
      )}

      <main className={`app-main${entering ? ' is-entering' : ''}`}>
        {tabs.length === 0 && restored && !settingsView && (
          <div className="empty-state">
            <Frame>
              <AuctumMark size={96} className="empty-state-mark" />
              <h2>{t('app.emptyTitle')}</h2>
              <p>{withSlots('app.emptyText', { path: <code>aidlc/spaces/</code> })}</p>
              <button className="btn btn-accent" onClick={openProject} data-testid="empty-state-open">
                {t('app.openProject')}
              </button>
              <HealthPanel health={health} />
            </Frame>
          </div>
        )}
        {/* One view at a time in the content frame (US-0405 FR1.1); closing it returns to the view that was shown. */}
        {settingsView && (
          <SettingsView
            onCheckUpdates={openUpdateDialog /* US-0416: Tools' "Check for updates" opens the Update dialog (US-0417) */}
            onClose={() => setSettingsView(false)}
            tab={settingsTab}
            animations={motion}
            onAnimations={saveAnimations}
            fullscreen={startFullscreen}
            onFullscreen={saveStartFullscreen}
            language={language}
            onLanguage={changeLanguage}
            questionAlerts={alertSettings.questionAlerts ?? 'popup-notify'}
            replyAlerts={alertSettings.replyAlerts ?? 'dialog-notify'}
            notificationSound={alertSettings.notificationSound !== false}
            onAlertSettings={saveAlertSettings}
            recentProjects={recent}
            onRemoveRecent={removeRecent}
            projects={tabs.map((tab) => ({ projectId: tab.projectId, name: tab.name }))}
            onProjectSettings={openProjectSettings}
            activeProjectId={active?.projectId ?? null}
            terminal={active ? { type: (_tab, text) => typeInActiveShell(text), anyBusy: () => activeMeta.busy === true } : null}
            lastIntentChangeAt={activeMeta.lastIntentChangeAt ?? null}
            onToolsChanged={health.refresh}
          />
        )}
        {/* Every tab stays mounted so its terminals and watchers survive tab switches (FR8.4). */}
        {tabs.map((tab) => {
          const tabUi = { ...UI_DEFAULT, ...ui[tab.projectId] };
          return (
            <div key={tab.projectId} className="project-pane" hidden={settingsView || tab.projectId !== activeId}>
              <ProjectView
                project={tab}
                visible={!settingsView && tab.projectId === activeId}
                view={tabUi.view}
                section={tabUi.configSection}
                aidlcTab={tabUi.aidlcTab}
                teamSection={tabUi.teamSection}
                featuresTab={tabUi.featuresTab}
                onView={(v, extra) => setUiOf(tab.projectId, { view: v, ...extra })}
                onMeta={reportMeta}
                terminalCommand={terminalCommand}
                editRequest={editRequest}
                onOpenReply={openReply}
                onOpenTools={openToolSettings}
                banner={tab.projectId === activeId ? <HealthLine health={health} /> : null}
                askingIntents={questions.filter((q) => !q.early && q.projectId === tab.projectId).map((q) => q.intent)}
              />
            </div>
          );
        })}
      </main>

      <DocsDialog
        doc={docs}
        onClose={() => setDocs(null)}
        onEdit={
          docs?.projectId
            ? () => {
                setEditRequest((r) => ({ seq: (r?.seq ?? 0) + 1, projectId: docs.projectId, rel: 'docs/README.md' }));
                setDocs(null);
              }
            : undefined
        }
      />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <UpdateNotice busy={Object.values(meta).some((m) => m?.busy)} checkRequest={updateCheck} />
      <AgentDialog
        open={popupOpen}
        events={popupEvents}
        focus={popupFocus}
        harnessOf={(projectId) => selectableHarness(meta[projectId]?.harness)}
        projectNameOf={(projectId) => tabs.find((tab) => tab.projectId === projectId)?.name ?? ''}
        showProject={tabs.length > 1} // US-0046: name the project on each page when several are open
        onAuditSend={sendAnswer}
        onHandoff={sendHandoff}
        onOpenTerminal={answerInAgent}
        onClose={closePopup}
        onNotice={setNotice}
      />
      <HealthStatus health={health} />
      {notice && (
        <p className="app-notice" role="status" data-testid="app-notice">
          {notice}
        </p>
      )}
    </div>
  );
}
