# Requirements Analysis Questions — US-1302 Savings hints

## Q1. [Product owner] Where should the hints appear?
The story says "the app points out spend"; it does not say where. US-1301 put rework in the project cost panel and the intent's cost tab.

A. A "Savings" section in the project cost panel (all hints), plus the hints for one intent in that intent's cost tab
B. Only in the project cost panel
C. Their own sub-block under the cost arm, beside the cost panel
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] Which intents do the hints look at?
69 intents are now archived. The "usual" numbers (median turns, usual cache share) need history to be fair.

A. Usual numbers from every intent, archived ones included; hints shown only for intents that are not archived
B. Everything, archived intents included, for both the usual numbers and the hints
C. Only intents that are not archived, for both
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] When is a stage a candidate for a lighter model?
The story: "a top-tier model, small output, rarely rejected". Each needs a number.

A. Top tier = the dearest model family in the price table (Opus today); small output = the stage's output tokens below the project's median for that stage; rarely rejected = at most 1 rejection in 10 runs; at least 3 runs of that stage
B. As A, but the thresholds can be changed in the project's settings
C. As A, but at least 5 runs of the stage before any hint
X. Other (please specify)

[Answer]: A

## Q4. [Developer] Which lighter model does the hint suggest, and how is the saving worked out?

A. The next cheaper family in the price table (Opus to Sonnet, Sonnet to Haiku); the saving is the stage's recorded tokens repriced at that model's rates, per run on average and in total
B. Always the cheapest model in the table
X. Other (please specify)

[Answer]: A

## Q5. [Product owner] When is a run's cache-read share "low"?
A run here is one intent. Its cache-read share is cache reads divided by all its input-side tokens.

A. At least 20 percentage points below the project's median share
B. Below half of the project's median share
C. In the lowest tenth of the project's intents
X. Other (please specify)

[Answer]: A

## Q6. [Product owner] When does a stage need "many more turns" than usual?
A turn is one model call, counted from the transcript calls inside the stage's window (as US-1301 already does).

A. At least twice the median of that same stage across the project's intents, once the stage has at least 5 earlier runs
B. At least three times the median, same minimum
X. Other (please specify)

[Answer]: A

## Q7. [Product owner] What does "dismiss" hide, and for how long?
The dismissals are kept in the project's `.thadeus/` folder, so every clone sees them.

A. That one hint (its kind plus its intent or stage); it stays hidden; a "show dismissed" link brings them back
B. Every hint of that kind for the project
C. Both: dismiss one hint, or turn off a whole kind
X. Other (please specify)

[Answer]: A
