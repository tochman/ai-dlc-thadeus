# Integrationstester — EPIC-04 US-0406

Underlag: `requirements.md`.

1. Kör `./node_modules/.bin/electron tests/.tmp/shots/name.cjs`. Kontrollera titlar, meny, sidhuvud och startskärm vid 1100 × 800 och 2560 × 1440.
2. Kör `npm run build` och läs `Info.plist` med PlistBuddy: `se.auctum.thadeus` och `THADEUS`.
3. Ladda ner deb-paketet från CI. Kontrollera `ar x` och `control` (`Package`, `Replaces`, `Conflicts`) samt `.desktop`.
