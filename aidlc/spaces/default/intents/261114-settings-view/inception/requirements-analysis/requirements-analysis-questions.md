# Requirements Analysis — Questions

Work: **US-0405 Settings view with native file pickers** (EPIC-04), first story in the v0.2.3 release plan (`docs/releases/0.2.3.md`).

The story already fixes most of the shape: a settings view in the content frame, in the LCARS style, reached from the left arm and the app menu (`Cmd/Ctrl+,`), with sections **Verktyg**, **Utseende**, **Projekt** and **Om**; tool paths chosen with native dialogs and validated before saving; settings in the app's own `settings.json` through `sanitize()`; nothing written into a project. These questions cover what the story leaves open.

---

## Q1. [product owner] What happens to the existing "Inställningar" dialog?

Today `AppSettingsDialog` holds four settings: Animationer (Full / Dämpad / Av), Frågor från Claude (Popup och notis / Bara popup / Av), Ljud vid notis (På / Av) and Språk. The story says each setting must end up in one place, but does not say whether that dialog disappears.

**A.** The dialog is removed. All four settings are shown in the new view, and nothing opens the old dialog any more.
**B.** The dialog stays as it is and the view only adds Verktyg, Projekt and Om, so those four settings live in two places.
**C.** The dialog stays as a shortcut that opens the view at the matching section (the `Cmd/Ctrl+,` menu item and the left-arm button both land in the view).
**D.** The dialog is removed except for Frågor från Claude and Ljud vid notis, which are ALREADY covered by Q2 below.
**X.** Other (please specify)

[Answer]: A. The dialog is removed

---

## Q2. [product owner] Where do the question-alert and notification-sound settings live?

US-0505 added "Frågor från Claude: Popup och notis / Bara popup / Av" and "Ljud vid notis: På / Av". The story's four sections do not mention them, and they are about the agent's questions rather than the app's look.

**A.** Under **Utseende**, together with Animationer, Helskärm vid start and Språk (four settings, no fifth section).
**B.** In a fifth section of their own, **Aviseringar** (question alerts and sound).
**C.** Under **Projekt**, because they are about what the agent asks in a project.
**D.** They are not part of this story and stay in a small dialog for now.
**X.** Other (please specify)

[Answer]: A. Under Utseende

---

## Q3. [developer] What happens when a tool path changes while a terminal tab is running?

The story says a chosen path is used everywhere the app starts `aidlc` or `claude`, and that the shell path is chosen the same way. Today the agent tab is a running pty in the project root, and a project can be busy ("Arbetar") while the person changes the path.

**A.** The new path applies to the next start of that tool only. Running sessions are left alone, and the view says so in one line next to the field.
**B.** The new path applies at once: the affected agent or shell tab is restarted, and if it is "Arbetar" the person is asked first.
**C.** Nothing restarts by itself; after saving, the view offers a "Starta om fliken" action beside the field.
**D.** The path is saved, but it only takes effect after the app is restarted.
**X.** Other (please specify)

[Answer]: A. Next start only

---

## Q4. [product owner] How much per-project configuration moves into the view?

The story's **Projekt** section is listed as: the default folder for "Öppna projekt…", the list of recently opened projects with removal, and a link to each open project's Projektinställningar. Projektinställningar today holds the feature-docs setting (Automatiskt / Visa / Dölj, plus the features path) and, since US-0801, the agent-terminal harness choice.

**A.** Exactly as the story lists it: default folder, recent projects, and a link to Projektinställningar. The per-project settings stay in that dialog.
**B.** As A, and the agent-terminal harness choice (US-0801) also appears in the view for the active project, so the harness has one obvious home.
**C.** As A, and both the harness choice and the feature-docs setting appear in the view, so Projektinställningar only remains for anything project-specific that is left.
**D.** Everything per project moves into the view and Projektinställningar is removed.
**X.** Other (please specify)

[Answer]: A. Exactly as listed
