# Personas (US-0513)

## P1. Dana the developer (primary)
- **Role:** developer who runs many intents in THADEUS, often with an agent working in a terminal tab.
- **Goals:** see only the work that still matters; archive finished intents in one go; get one back when it is needed.
- **Pain points:** 64 intents in the list, 63 of them complete; archiving today means one typed command per intent; changed files nobody committed.
- **Tech comfort:** high. **Frequency:** daily; archives now and then.

## P2. Sam in another clone
- **Role:** teammate, or Dana on a second machine, who pulls the same project.
- **Goals:** see the same list after a pull; keep cost, velocity and delivery figures whole; have CI still know what is delivered.
- **Pain points:** an `active-intent` file that names an intent someone else archived; figures that drop when intents leave the list.
- **Tech comfort:** high. **Frequency:** daily.

## Non-human actor
- **An agent in a terminal** can archive or unarchive too. It is not a persona: its changes are ones the app must show.

**Priority:** P1 first; P2 sees the result of what P1 does.
