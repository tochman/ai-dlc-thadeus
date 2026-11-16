# Code Summary: US-1201 teamsamarbete (med US-1202)

Alla 23 stegen i planen byggdes test först, och varje Red-körning föll innan koden skrevs.

- **Tester:** `npx vitest run tests/` ger 129 filer och 1544 tester, alla gröna. Före bygget var det 122 filer och 1484 tester.
- **Täckning:** 91,63 % radtäckning.
- **ESLint:** 0 fel och 25 varningar, alla `react-hooks/exhaustive-deps`. En är ny, i testharnessen i `EditorPanel.test.jsx:78`.
- **Prettier:** rent.
- **Gren:** `feat/US-1201`, omdöpt från `docs/US-1201`.

## Filer

- **Nya i main:**
  - `src/main/platforms/detect.js`, `github.js`, `gitlab.js`, `bitbucket.js` och `index.js`
  - `src/main/credentials.js`
  - `src/main/teamActivity.js`
- **Nya vyer:** `src/renderer/CollisionPanel.jsx`, `MachinesView.jsx` och `StoryComments.jsx`.
- **Ändrade:**
  - `src/main/git.js`, `ipc.js`, `tools.js` (nytt verktyg `glab`) och `src/preload/index.js`
  - `src/renderer/RefreshPanel.jsx`, `IntentDetail.jsx`, `ProjectView.jsx`, `App.jsx`, `SettingsView.jsx`, `editor/EditorPanel.jsx` och `theme.css`
  - `src/shared/locales/sv.json` och `en.json`
  - `docs/features/epic-12-team-collaboration.md` (granskningen av GitHub-panelen; US-1202 sammanslagen) och `docs/FEATURES.md`
- **Tester:**
  - Nya: `platforms`, `credentials`, `teamActivity`, `storyComments`, `CollisionPanel`, `MachinesView` och `StoryComments`, samt fixturer i `tests/fixtures/platforms/`.
  - Utökade: `git`, `ipc`, `preload`, `RefreshPanel`, `SettingsView`, `EditorPanel` och `ProjectView`.
  - Ändrade för att följa det nya beteendet: `toolCards` och `settings` (sex verktyg i stället för fem), `fileWrite` (`credentials.js` får skriva atomiskt) och `AppShell` (armens nya underblock).

## Viktiga beslut

- **Plattformsfel:** fel blir ett `PlatformError` med en kod (`cli-missing`, `not-logged-in`, `no-credentials`, `timeout`, `failed`, `unknown-platform`). IPC skickar det som ett värde, inte som ett kast. Tidsgränsen är 15 s för både CLI-anrop och `fetch`.
- **Bitbucket-uppgifter:**
  - Main läser dem själv vid varje anrop; de når aldrig renderern.
  - Bryggan har bara `status`, `save` och `clear`, och svarar `{set}`.
  - De sparas krypterat (`safeStorage`) med läge 0600 i `userData`, aldrig i projektet.
- **Krockkontroll:** `predictConflicts` kör `git merge-tree --write-tree --name-only --no-messages`, och exit-kod 1 betyder krock. Testet visar att HEAD, status och stash är orörda efteråt.
- **Mergeanteckning:** main skriver inget. `team:mergeNote` ger sökvägen och mallen, och editorn lägger in avsnittet som osparad text som du sparar själv.
- **Placering:** "Datorer" är en underflik under Github-blocket i armen. "Kommentarer" är en ny flik i intentvyn.

## Genvägar (`ponytail:`)

- **Bara första sidan:** API:erna läser bara första sidan, 50 pull requests och 100 filer.
- **Story på två datorer:** en story räknas som pågående på två datorer om två värdar har skrivit till en pågående intent. Det kan ge falsklarm när arbete har flyttats mellan datorer.

## Avvikelser och öppna saker

- **Armens etikett:** blocket i armen heter fortfarande "Github". Bara panelen byter namn efter plattformen, vilket är vad AC-5 kräver.
- **Ingen länk:** pull requests går inte att öppna från appen, eftersom `app:openExternal` bara tar fasta nycklar. Panelen visar nummer och titel.
- **Ingen `Recovery:`-knapp:** det finns ingen knapp som skriver en `Recovery:`-anteckning i terminalen. Den var valfri.
- **Utan audit-shards:** intents som saknar audit-shards syns inte under "Datorer".

## Inte körda här

Allt mot riktiga plattformar och den byggda appen är oprövat: tester mot GitHub, GitLab och Bitbucket och mot macOS nyckelring. Testerna stubbar `gh`, `glab`, `fetch` och `safeStorage`. Det här ska kontrolleras för hand i `.dmg`:
- att panelen heter "Uppdatera från GitHub";
- krockvarningen mot en riktig pull request;
- att Bitbucket-uppgifterna sparas i nyckelringen;
- att mergeanteckningen öppnas i editorn.

Krockkontrollen kräver git 2.38 eller senare; lokalt finns 2.45.
