# Risk and Sequencing Rationale: EPIC-14 Spec Kit

A **Bolt** is one build pass over a piece of the work, ending in something that runs.

**Heuristic: value first (Cohn).** This was decided at ideation (D8) and confirmed here (Q1 = A). The Bolts that reach the success measure come first: set up a Spec Kit project from the app and start its first feature. These are U1, U2, U3, U4, U6 and U5. The "Should" stories follow. No formal scoring model (such as WSJF) was used, since one person decides and the order follows from the success measure.

**One change from the ideation order.** The ideation put the commands (U5) before the features (U6). U5 depends on U6's feature reader in the dependency graph, so U6 comes first. This follows the graph and costs no value, because the success measure is still met at Bolt 6.

**Risks taken early:**
- **R1, breaking AI-DLC.** U1 goes first and keeps the full suite green.
- **R2, Spec Kit file formats.** The test project is made before U6, and the reader names what it cannot read.
- **R3, the token source** (session records per harness). This is open until U9. If it slips, U9 can ship the project-wide bucket first.

**Taken later:** U8 (switch) goes last. It is the most destructive-looking flow, and it reuses U3, U4 and U2.

**Topological check.** Every Bolt comes after all the Units it depends on (`unit-of-work-dependency.md`). The order U3 before U4 and U6 before U5, U9 and U10 respects every edge.
