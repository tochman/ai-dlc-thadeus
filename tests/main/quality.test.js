// US-1305 FR1.1–FR1.7, NFR2: an intent's quality signals, counted purely from its audit events, its test-results.md and
// its review files.
import { describe, expect, it } from 'vitest';
import { qualityOf } from '../../src/main/parsers/quality.js';

const ev = (event, fields = {}) => ({ timeMs: 0, event, fields });
const EVENTS = [
  ev('GATE_REJECTED', { Stage: 'requirements-analysis' }),
  ev('GATE_APPROVED', { Stage: 'requirements-analysis' }),
  ev('GATE_REJECTED', { Stage: 'requirements-analysis' }),
  ev('GATE_REJECTED', { Stage: 'code-generation' }),
  ev('SENSOR_FAILED', { 'Stage slug': 'code-generation' })
];

const TEST_RESULTS = `# Test results

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| NFR1 | req | x | y | z | build-and-test | Not Met |

## Loop-Back Log

### Loop-back 1 — 2026-11-13T16:20:16Z

Fixed the menu.

### Loop-back 2 — 2026-11-13T17:00:00Z

Fixed it again.

## Target Verification Matrix (after loop-back 2)

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| NFR1 | req | x | y | z | build-and-test | Met |
| NFR2 | req | x | — | — | build-and-test | Unverified |

## Efter merge med main (2026-11-16T11:40:14Z)

One clash.
`;

const REVIEW = `## Review

**Verdict:** NOT-READY

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | req.md | Not testable. | Name it. | Fixed |
| R-02 | Minor | req.md | Unclear. | Say it. | resolved |
| R-03 | Minor | req.md | Missing case. | Add it. | New |

### Summary

Mostly fine.
`;

const full = () => qualityOf({ events: EVENTS, testResults: TEST_RESULTS, reviews: [REVIEW] });

describe('qualityOf (US-1305 FR1)', () => {
  it('counts revision cycles per stage and in total from GATE_REJECTED (FR1.1)', () => {
    expect(full().revisions).toEqual({ total: 3, byStage: { 'requirements-analysis': 2, 'code-generation': 1 } });
  });

  it('gives zero revision cycles, not null, when the audit has no rejection (FR1.1)', () => {
    expect(qualityOf({ events: [], testResults: null, reviews: [] }).revisions).toEqual({ total: 0, byStage: {} });
  });

  it('counts the Loop-back entries under the Loop-Back Log only (FR1.2)', () => {
    expect(full().loopBacks).toBe(2);
    const outside = '## Failures\n\n### Loop-back 9\n\n## Loop-Back Log\n\n### Loop-back 1\n';
    expect(qualityOf({ events: [], testResults: outside, reviews: [] }).loopBacks).toBe(1);
  });

  it('counts findings per severity, Fixed and resolved in any case as fixed, the rest open (FR1.3)', () => {
    expect(full().findings).toEqual({ bySeverity: { Major: 1, Minor: 2 }, open: 1, fixed: 2 });
  });

  it('adds the findings of every review file (FR1.3)', () => {
    const q = qualityOf({ events: [], testResults: null, reviews: [REVIEW, REVIEW.replace('| New |', '| FIXED |')] });
    expect(q.findings).toEqual({ bySeverity: { Major: 2, Minor: 4 }, open: 1, fixed: 5 });
  });

  it('skips malformed table rows and a review without a findings table (FR1.3)', () => {
    const broken = REVIEW.replace('| R-03 | Minor | req.md | Missing case. | Add it. | New |', '| R-03 | Minor | half a row');
    const q = qualityOf({ events: [], testResults: null, reviews: [broken, '## Review\n\nNo findings.\n'] });
    expect(q.findings).toEqual({ bySeverity: { Major: 1, Minor: 1 }, open: 0, fixed: 2 });
  });

  it('counts failed runs: each loop-back, one for an open final matrix verdict, each SENSOR_FAILED (FR1.4)', () => {
    expect(full().failedRuns).toBe(2 + 1 + 1);
  });

  it('reads only the final matrix: a Not Met fixed by a later matrix adds nothing (FR1.4)', () => {
    const fixed = TEST_RESULTS.replace('| Unverified |', '| Met |');
    expect(qualityOf({ events: [], testResults: fixed, reviews: [] }).failedRuns).toBe(2);
  });

  it('counts both post-merge headings, in English and Swedish (FR1.5)', () => {
    expect(full().postMerge).toBe(1);
    const both = `${TEST_RESULTS}\n## After merge with main\n\nAnother.\n`;
    expect(qualityOf({ events: [], testResults: both, reviews: [] }).postMerge).toBe(2);
  });

  it('gives the trouble count as the sum of the present parts (FR1.6)', () => {
    // revisions 3 + loop-backs 2 + open findings 1 + failed runs 4 + post-merge 1
    expect(full().trouble).toBe(11);
  });

  it('gives null, never 0, for the parts whose source is missing, and leaves them out of trouble (FR1.7)', () => {
    const q = qualityOf({ events: EVENTS, testResults: null, reviews: [] });
    expect(q.loopBacks).toBeNull();
    expect(q.failedRuns).toBeNull();
    expect(q.postMerge).toBeNull();
    expect(q.findings).toBeNull();
    expect(q.trouble).toBe(3);
    expect(qualityOf({ events: undefined, testResults: undefined, reviews: undefined }).findings).toBeNull();
  });

  it('gives zero, not null, when a present test-results.md has no loop-back, open verdict or merge heading (FR1.7)', () => {
    const q = qualityOf({ events: [], testResults: '# Test results\n\nAll green.\n', reviews: [] });
    expect([q.loopBacks, q.failedRuns, q.postMerge]).toEqual([0, 0, 0]);
  });
});
