# Delivery Planning Questions: EPIC-14 Spec Kit

A **Bolt** is one build pass over a piece of the work, ending in something that runs. These points are already settled and are not asked again:
- **Build order:** value first (ideation D8).
- **Bolt size:** one Bolt per Unit, one pull request per story (team practice, Units Q1).
- **Parallel work:** allowed where the dependency graph permits (Units Q2).
- **No thin first slice:** no walking skeleton (team practice: off).
- **Owner:** every Bolt is built by the developer agent, since Team Formation did not run.
- **Outside dependencies:** the Spec Kit test project, which needs `specify` installed, and the licence check before the release.

## Q1: Which order should the Bolts follow?

Value first has one snag. The next-command offer (U5) needs the feature reader (U6), so U6 has to come before U5.

A. U1 → U2 and U3 → U4 → U6 → U5 → U10 → U9 → U7 → U8. This is value first, with U6 moved ahead of U5. The success measure (start a first feature from the app) is met after U5.
B. Risk first: U1 → U6 → U5 → U9 → U10 → U3 → U2 → U4 → U7 → U8. This builds the file parsing and the token source early, since they are the least known.
X. Other (please specify)

[Answer]: A

## Q2: How should Construction run the Units?

A. One Unit at a time. Each Unit's design, code and checkpoint are done before the next starts. This matches "story by story".
B. Stage by stage across the Units, with independent Units built in parallel (for example U2 and U3, or U9 and U10). This is faster, but several branches are open at once.
X. Other (please specify)

[Answer]: A
