# Story Map: EPIC-14 Spec Kit

| Story | Unit ID | Directory |
|---|---|---|
| US1.1 | U1 | u1-framework-views |
| US1.2 | U2 | u2-framework-file |
| US2.1 | U3 | u3-speckit-setup |
| US2.2 | U4 | u4-framework-choice |
| US2.3 | U8 | u8-framework-switch |
| US3.1 | U5 | u5-speckit-commands |
| US4.1 | U6 | u6-speckit-features |
| US4.2 | U7 | u7-constitution |
| US5.1 | U9 | u9-feature-token-log |
| US5.2 | U10 | u10-speckit-agent-status |

## Cross-cutting

NFR1 (`t()` in sv/en), NFR2 (LCARS), NFR3 (no writes in `.specify/` or `specs/`) and NFR8 (TDD, coverage, lint) apply in every Unit. They are covered in each Unit's own tests, not owned by one Unit.

## Implementation order within each Unit

Test first, then in this order:
1. main-process logic (parsers, detection, exec);
2. IPC channel and preload;
3. renderer view;
4. `sv`/`en` keys.

## Coverage

All ten stories are assigned, and each Unit has exactly one story. No story spans more than one Unit.
