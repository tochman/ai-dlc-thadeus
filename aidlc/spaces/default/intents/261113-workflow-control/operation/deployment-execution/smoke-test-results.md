# Röktest — EPIC-05

Underlag: `construction/build-and-test/test-results.md`.

Röktestet kördes i riktig Electron med samma kod som i PR #6:

| Kontroll | Resultat |
|----------|----------|
| Fortsätt-knappar i visinv | Visas, t.ex. "Fortsätt vid Code Generation (steg 6 av 10)" |
| Claude-fliken | Startar, och status växlar mellan "ledig" och "arbetar" |
| Git-status och hämtning i aidlc-dash | Fungerar. `../package.json` avvisas |
| Förhandsvisning av uppsättning i en tom mapp | create=360, conflict=0, och Note visas |
| Automatisk växling av vy | `project:detected` kommer när `aidlc/spaces/default` skapas |
| Konsolfel | 0 |

De paketerade dmg- och deb-filerna röktestas när v0.2.0 släpps. Då ska det kontrolleras särskilt att claude-fliken startar i den installerade Mac-appen.
