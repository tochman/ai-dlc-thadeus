# Personas

## P1. The developer who reads the cost view (primary)

- **Role:** a developer or lead running AI-DLC intents in their own projects. They pay for the tokens.
- **Goals:** know what each intent really cost, including intents recorded months ago, and compare stories and models fairly (the v0.2.9 theme: less waste).
- **Pain points:** the figures inherit AI-DLC's price errors (`sonnet-5-5` cache reads billed at twice the price; `fable-5-2` and `haiku-5-5` shown as "pris saknas"), so the cheapest model can look the most expensive. They cannot tell which figure to trust.
- **Context:** they open THADEUS from the Dock, not from a shell. They may keep their own `AIDLC_MODEL_RATES` file for negotiated prices.

There is a single persona. A team lead reading figures across machines (the per-machine cost tab) shares the same goals and needs no separate stories.
