# Integrationstester — EPIC-04 US-0404

Underlag: `construction/code-generation/code-summary.md` och `inception/requirements-analysis/requirements.md`.

Testerna körs i riktig Electron, med sandlådade inställningar och ett låtsasskal (`tests/.tmp/shots/`, git-ignorerat):

1. **`menu.cjs`:** menyns innehåll, Stäng projekt via menyn, helskärmsknappen, bocken i menyn och det sparade läget. Skriptet stänger sedan fönstret i helskärm.
2. **`menu.cjs after`:** kontrollerar att appen startar i helskärm, växlar tillbaka och visar vilka menyposter som är avstängda utan projekt.
3. **`bt.cjs`:** regression för layouten och bildfrekvensen från designlyftet.

Manuellt på Linux vid releasens röktest: menyraden är dold och visas med `Alt`, `F11` växlar helskärm och `Ctrl+W` stänger projektet.
