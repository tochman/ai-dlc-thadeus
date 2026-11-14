# Deployment Execution – frågor (v0.2.3)

Underlag: i Deployment Pipeline bestämde du att taggen `v0.2.3` väntar tills alla småfixar är på plats. I EPIC-00 är US-0001, US-0002, US-0003 och US-0005 ✅ Klar. US-0004, där ett svar i popupen ska nå agenten en gång, är 📋 Planerad och har komplexitet Medium. Pipelinen behöver inga AWS-uppgifter, ingen databasmigrering och inga beroende tjänster.

## Q1. [Releaseingenjör] Ska US-0004 med i v0.2.3 innan vi taggar?

A. Ja, bygg US-0004 först. Taggen väntar tills den är klar.
B. Nej, flytta US-0004 till v0.2.4. Det som är klart nu släpps.
X. Other (please specify)

[Answer]: A

## Q2. [Releaseingenjör] När ska releasen göras?

Releasen innebär att arbetet committas på `release/v0.2.3`, branchen pushas och en PR öppnas mot `main`. Efter merge sätts taggen `v0.2.3`, och då publicerar workflowet releasen.

A. Nu, så snart småfixarna i Q1 är klara: jag committar, pushar och öppnar PR:en.
B. Vänta: jag förbereder allt lokalt, men inget pushas förrän du säger till.
X. Other (please specify)

[Answer]: A
