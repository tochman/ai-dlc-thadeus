# Requirements Analysis Questions — US-1305 Quality signals next to cost

## Q1. [Product] Where should the quality signals appear?

The cost per intent lives in the intent list and the Cost tab (US-0209, US-1301), and the cost per release in Features › Releases (US-1303). The delivery figures per release are in Velocity › Delivery (US-1304).

A. In the existing cost places: quality figures beside each intent's cost (Cost tab and intent detail), beside each release's cost (Features › Releases), and the cost-and-quality chart in the project Cost view
B. One new "Quality" section in the Velocity view, with a table per intent, a table per release and the chart
C. Both: a short quality line beside each cost, and the full tables and chart in one Quality section
X. Other (please specify)

[Answer]: A

## Q2. [Developer] Where should review findings come from?

The audit says only that a review ran and its verdict (READY or NOT-READY). The findings themselves (R-01, R-02, ..., with a status) are in the review files `<stage>/reviews/review-NN.md` in 15 places, and in the engine's own review records under `.aidlc-engine/`, which git does not keep (so other clones do not have them).

A. The committed `reviews/review-NN.md` files: count the findings per severity, and count those whose status says fixed or resolved
B. Only the audit verdicts: count NOT-READY reviews per stage
C. Both: findings from the review files where they exist, else the NOT-READY count from the audit
X. Other (please specify)

[Answer]: A

## Q3. [Developer] What counts as a failed test run?

The audit has no event for a test run. What is written down: `construction/build-and-test/test-results.md` (a failures section, the Target Verification Matrix with `Not Met` / `Unverified`, the `## Loop-Back Log`), and `SENSOR_FAILED` / `ERROR_LOGGED` events in the audit.

A. From `test-results.md`: one per Loop-Back Log entry, plus one when the final matrix still has a `Not Met` or `Unverified` row
B. Only the Loop-Back Log entries (each one is a failed Build and Test that went back to Code Generation)
C. A plus the audit's `SENSOR_FAILED` events
X. Other (please specify)

[Answer]: C

## Q4. [Product] Which heading marks a post-merge finding?

The story names "Efter merge med main"; the project rule (written later, in English) names a section "After merge with main" in `test-results.md`. Older intents may use either.

A. Count either heading, as one finding per section
B. Only "After merge with main"
X. Other (please specify)

[Answer]: A

## Q5. [Product] What should the cost-and-quality chart look like?

It should make an expensive and troubled intent stand out.

A. A scatter plot: cost on one axis, a trouble count on the other (revision cycles + loop-backs + open review findings + failed runs + post-merge findings); each dot is an intent, with its name on hover and in a table for screen readers
B. Paired bars per intent, cost and trouble count side by side, sorted by cost
C. The intent table sorted by cost, with a trouble count column and a mark when both are in the top quarter
X. Other (please specify)

[Answer]: A

## Q6. [Product] What should the per-release quality show?

US-1304 already finds a release's fix stories (the `- **Fault in:** vX.Y.Z` line) and whether GitHub marks it a prerelease, in Velocity › Delivery.

A. Reuse US-1304's figures: beside each release's cost, the number of fix stories that name it (with their IDs) and "prerelease" when GitHub marks it
B. A plus the sum of the release's intents' quality figures (revision cycles, loop-backs, findings)
X. Other (please specify)

[Answer]: A
