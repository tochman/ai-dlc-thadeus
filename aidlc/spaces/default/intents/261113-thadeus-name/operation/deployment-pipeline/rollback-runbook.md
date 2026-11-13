# Återställning — EPIC-04 US-0406

Underlag: `deployment-strategy.md`.

- **Före en release:** reverta merge-committen (`git revert -m 1 <sha>`) och öppna en PR.
- **Efter en release:** återställningen kräver en ny version med det gamla appId och paketnamnet. Det är bättre att rätta framåt.
