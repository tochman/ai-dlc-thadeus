# Code Summary: US-0405 Inställningar som vy med inbyggda filväljare

## Vad som byggts

- **En vy i innehållsramen** i stället för den gamla dialogen: Inställningar i vänsterarmen, appmenyn (`Cmd/Ctrl+,`) och menyvalet öppnar samma `SettingsView`, som är `aria-current` i armen, tar över rubriken och fokuseras vid öppning. Stänger man den (knapp eller Esc) kommer den vy man såg tillbaka. Projektpanelerna ligger kvar monterade men `hidden`, så terminaler och watchers överlever.
- **Verktyg:** tre rader (AI-DLC CLI, Claude Code CLI, Skal) med sparad sökväg först, sedan automatisk sökväg, källa (`Egen sökväg` / `Hittad automatiskt`) och version från `--version`. `Välj…` öppnar den inbyggda filväljaren och sparar bara efter att main godkänt filen; `Återställ` finns bara när en egen sökväg är sparad. En rad säger att en ändrad sökväg gäller nästa start.
- **Utseende:** Animationer (Full / Dämpad / Av), Helskärm vid start, Språk / Language, Frågor från AI-DLC (Popup och notis / Bara popup / Av) och Ljud vid notis (På / Av) — samma val som förut.
- **Projekt:** standardmapp för `Öppna projekt…` med mappväljare och återställning, senaste projekt med namngiven borttagningsknapp per rad, och en namngiven knapp per öppet projekt som öppnar dess Projektinställningar.
- **Om:** appversion, AI-DLC-version (eller orsaken till att den inte hittades), Auctum-symbolen och två knappar med fasta nycklar (`repo`, `features`).
- **Sparade sökvägar används överallt:** `aidlc` och `claude` startas via `toolPath()` i `models.js`, `setup.js`, `aidlcConfig.js`, `harness.js` och `pty.js`, och terminalens skal via `shellPath()`. Sökvägarna appliceras från settings vid start, vid varje `settings:get`/`settings:set`, vid spara/återställ av ett verktyg och vid `pty:spawn`.

## Filer

- **Nya:**
  - `src/main/tools.js` — `TOOL_IDS`, `setToolPaths`, `toolPath`, `isStoredPath`, `defaultShell`, `shellPath`, `resolveOnPath`, `probeTool`, `getTools`, `validateTool`. Ingen `electron`-import, så terminal- och main-testerna kan ladda modulen.
  - `src/renderer/SettingsView.jsx` — vyn med sektionerna Verktyg, Utseende, Projekt och Om, samt `saveLanguage` (flyttad hit).
  - `tests/main/tools.test.js` — 3 tester (sparad vs automatisk sökväg och skal från `$SHELL`, `--version` som inte svarar, `validateTool`).
  - `tests/renderer/SettingsView.test.jsx` — 8 tester (sektioner och de fem inställningarna, fokus, språkbyte, verktygsrader före och efter kontroll, välj/spara/återställ, etiketter, standardmapp/senaste/projektknapp, Om, stängning).
- **Ändrade:**
  - `src/main/settings.js` — `toolPaths` och `defaultProjectFolder` i `sanitize()` (endast icke-tomma absoluta strängar utan NUL), `isStoredPath` delas med `tools.js`, `TOOL_IDS` exporteras.
  - `src/main/models.js`, `src/main/setup.js`, `src/main/aidlcConfig.js`, `src/main/harness.js` — `toolPath('aidlc')` respektive `toolPath(cli)`.
  - `src/main/pty.js` — agenten startas via `toolPath(entry.cli)` med `-l -i -c` och citattehantering (`shellCommand`) så att en sökväg med mellanslag eller citattecken fungerar; skalet via `shellPath()`.
  - `src/main/ipc.js` — `tools:info|pick|save|reset`, `settings:pickDefaultFolder`, `settings:clearDefaultFolder`, `app:info`, `app:openExternal` (endast `repo`, `features`, `docs`), `defaultPath` i `project:pick`, `toolPaths` till `spawnSession`, `setToolPaths` i settings- och verktygshanterarna.
  - `src/main/index.js` — `setToolPaths(settings.toolPaths)` före första kommandot.
  - `src/preload/index.js` — namngivna funktioner `getTools`, `pickTool`, `saveTool`, `resetTool`, `pickDefaultFolder`, `clearDefaultFolder`, `getAppInfo`, `openExternal` (ingen generisk `invoke`).
  - `src/renderer/App.jsx` — `appSettingsOpen` blir vyns öppna-läge, `aria-current` i armen, rubrik, `hidden` panes, `recent`-state med `removeRecent`, `saveStartFullscreen`, och Projekt-knappen som stänger vyn först.
  - `src/renderer/theme.css` — `.settings-view`, `.settings-view-head`, `.settings-section`, `.settings-tool*`, `.settings-folder`, `.settings-list`, `.settings-about*`, alla på befintliga tokens (inga färglitteraler utanför `:root`); sektionerna återanvänder `.config-section`, fälten `.field`, `.settings-group`, `.lcars-radio-group`, `.btn` och `.lcars-select`.
  - `src/shared/locales/sv.json`, `src/shared/locales/en.json` — `settings.sections.*`, `settings.tools.*`, `settings.fullscreenLabel`, `settings.defaultFolder.*`, `settings.recent.*`, `settings.openProjects.*`, `settings.about.*` samt `errors.unknownTool|toolPathInvalid|toolMissing|toolNotExecutable|toolVersionFailed|toolNoVersion|toolNotOnPath|unknownExternal`.
  - `tests/main/settings.test.js` — ett nytt fall för `toolPaths`/`defaultProjectFolder`.
  - `tests/main/pty.test.js` — ett nytt fall: sparade `claude`- och skal-sökvägar används, annars dagens `claude` och `$SHELL`.
  - `tests/renderer/AppShell.test.jsx` — utökad `mockBridge`, vyn öppnas från arm, meny och stängs tillbaka, `aria-current`, rubrik, pane `hidden`, och motion-radion sparas fortfarande.
- **Borttagna:** `src/renderer/AppSettingsDialog.jsx` och `tests/renderer/AppSettingsDialog.test.jsx` (FR6.1).
- **Planen:** stegen 1–12 i `code-generation-plan.md` är avbockade.

## Beslut och avvikelser från planen

1. **Steg 8 utan egna `ipc.js`-tester.** `ipc.js` kräver Electron och kan inte laddas under Vitest — samma konvention som resten av repot. Hanterarna är tunna över `tools.js` (testat i `tools.test.js`), och bryggan testas via renderertesterna mot de namngivna funktionerna i `preload/index.js`. Inget sken-ramverk för Electron infördes.
2. **`traceability.json` skrivs inte här.** Enligt uppdraget genererar orkestratorn den; denna sammanfattning är den enda artefakten från steg 12.
3. **Epic-filen och `docs/FEATURES.md` lämnas orörda.** Enligt projektmandatet uppdateras storyns status, acceptanskriterier, epicens statusrad och `FEATURES.md` i Deployment Execution — inte i Code Generation.
4. **`exec.js` ändrades inte.** Planens sammanfattning nämnde filen; `tools.js` återanvänder i stället dess befintliga `loginPath` och `runFixed`.
5. **`TOOL_IDS` bor i `tools.js`** och re-exporteras av `settings.js`, eftersom `tools.js` (till skillnad från `settings.js`) inte importerar `electron`.
6. **"Helskärm vid start" får egen renderer-state (`startFullscreen`)** som läses från `settings.fullscreen` vid start. Värdet skrivs till samma nyckel som US-0404 redan sparar (A2: en inställning, ett hem), men checkboxen läser inte huvudets live-läge, så etiketten inte kan hamna i otakt med fönstrets faktiska läge.
7. **En sökväg med mellanslag eller citattecken** skickas till agentens `-l -i -c` som ett single-quotat argument; en olöst `claude` lämnas orörd. Detta ligger i `pty.js` och testas indirekt (befintliga pty-fall).
8. **Verktygsraderna visar den sparade sökvägen direkt** (`settings.toolPaths`) och fyller på med `getTools()` efteråt, så vyn aldrig står tom medan `--version` körs (NFR4).

## Testkörningar

- **Avgränsat kommando** (exakt som i `unit-test-instructions.md`):
  `npx vitest run tests/main/tools.test.js tests/main/settings.test.js tests/main/pty.test.js tests/main/i18nKeys.test.js tests/renderer/SettingsView.test.jsx tests/renderer/AppShell.test.jsx`
  → `Test Files  6 passed (6)` / `Tests  36 passed (36)`
- **Hela sviten:** `npm test` → `Test Files  45 passed (45)` / `Tests  224 passed (224)`
- **Syntaxkontroll** med esbuild (skriver inget) på `src/main/ipc.js`, `index.js`, `tools.js`, `settings.js`, `src/preload/index.js`, `src/renderer/App.jsx` och `SettingsView.jsx`: alla parsar.
- Inga befintliga tester är ändrade till svagare påståenden, hoppade över eller borttagna för att få grönt; `AppSettingsDialog.test.jsx` togs bort tillsammans med sin komponent och ersattes av `SettingsView.test.jsx`.

## Inte testat

- **`ipc.js`-hanterarna och `preload`-bryggan** (se beslut 1). Bygget och syntaxkontrollen täcker deras syntax; den underliggande logiken är testad i `tools.js`, `settings.js` och `pty.js`.
- **`electron-vite build`** kördes inte i detta steg, eftersom det skriver byggartefakter; syntaxkontrollen ovan är den kontroll som gjorts.
- **Riktiga inbyggda dialoger** (`dialog.showOpenDialog`) och riktiga `--version`-körningar mot installerade binärer kräver appen och testas manuellt i Build and Test.
- **`toolPaths` i `harness.js`/`setup.js`/`models.js`/`aidlcConfig.js`** har ingen egen enhetstest som heter just de filerna; de använder samma `toolPath()` som `pty.js`-testet och `tools.test.js` täcker.

## Antaganden kvar

- **`$SHELL` finns** i appens miljö; annars faller `defaultShell()` tillbaka på `/bin/zsh` (macOS) eller `/bin/bash`.
- **`--version` är det enda versionskommandot** för alla tre verktygen, med 10 s tidsgräns via `runFixed` (C2).
