# Cross-Unit Traceability: US-0029 release row move

**Verdict:** PASS. No Units; every requirement is covered and none is left uncovered.

| ID | Requirement | Owning stage | Target |
|---|---|---|---|
| FR1 | A moved story's row leaves the old plan file and joins the new one | code-generation | `src/main/releases.js` (`dropPlanRow`), `tests/main/releasesPlan.test.js` |
| FR2 | An old file left with no rows is the heading only | code-generation | `src/main/parsers/releases.js` (`removePlanRows`) |
| FR3 | A file changed since it was read is not overwritten | code-generation | `src/main/releases.js` (`writeFileSafe` with `expectHash`), `tests/main/fileWrite.test.js` |
| FR4 | A test fails without the fix; the suite stays green | build-and-test | `tests/main/releasesPlan.test.js`, full suite 1883/1883 |
