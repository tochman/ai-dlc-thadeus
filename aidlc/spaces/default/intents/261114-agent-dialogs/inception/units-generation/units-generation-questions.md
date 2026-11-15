# Units Generation questions: US-0506 agent dialogs

Background: Domain Design approved 13 components (`components.md`). Already settled: one desktop app, so every Unit ships inside the same build; US-0506 ships as one pull request (User Stories Q1); no walking skeleton (team practices). Units that do not depend on each other may be built at the same time, each in its own copy of the project. Which Unit is built first is decided later, in Delivery Planning.

## Q1. [Architect] How should the components be grouped into Units?

A. By part of the event path, 4 Units: (1) channel and hook scripts (ClaudeCodeHook, OpencodePlugin, AgentChannel); (2) events and answers in main (HarnessEventAdapter, AgentEventStore, FallbackQuestionSource, and the PtyManager, IpcRouter and Notifications changes); (3) the dialog and latest-message strip (AgentDialog, LatestMessageStrip); (4) installing (HookInstaller, AgentDialogsSetupUI)
B. One Unit per story (US1.1–US5.1), each touching every component it needs
C. One Unit per harness (Claude Code, opencode) plus one shared Unit
X. Other (please specify)

[Answer]: B
**Mode:** guided

## Q2. [Developer] How fine-grained should the Units be?

A. Coarse: about 4 Units, as in Q1 A
B. Fine: about 8 Units, roughly one per new component (each script, the channel, the adapters, the store, the dialog, the strip, the installer)
C. Middle: about 6 Units, splitting Q1 A's second and third Units in two (adapters apart from the store; dialog apart from the strip and notifications)
X. Other (please specify)

[Answer]: B
**Mode:** guided

## Q3. [Architect] Follow-up to Q1 and Q2: per story, or per component?

Q1 chose one Unit per story (5 Units: US1.1 questions, US2.1 permissions, US3.1 replies, US4.1 install, US5.1 notifications), while Q2 chose about 8 Units, one per new component. Those two cuts conflict. Story Units also share code: US2.1 and US3.1 change the same hook script, adapters, event store and dialog that US1.1 builds, so they must wait for US1.1 and edit the same files after it.

A. Per story, 5 Units, in a chain where each later story builds on US1.1's components (US1.1 is the largest Unit)
B. Per story, but US1.1 split into its parts so the large Unit becomes about 4 smaller ones: about 8 Units in total (channel and scripts; adapters; event store and answers; dialog; then permissions, replies and latest message, install, notifications and settings)
C. Per component, about 8 Units, as Q2 said; the stories are traced across them in the story map
X. Other (please specify)

[Answer]: A
**Mode:** guided
