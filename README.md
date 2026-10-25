# PULSE

Osobisty system rozwoju kariery muzycznej — mobilna PWA na iPhone'a. 365 dni: plan dopasowany do pracy i odpoczynku, sesje twórcze liczone uczciwie, treningi do beatu, mentor oparty na danych.

- Specyfikacja: [`PULSE_SPEC.md`](PULSE_SPEC.md)
- Design: [`DESIGN.md`](DESIGN.md)
- Architektura i wdrożenie: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Stan prac: [`PROGRESS.md`](PROGRESS.md)

## Uruchomienie lokalne
```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev            # http://localhost:5173
npm test               # testy jednostkowe
npm run test:e2e       # testy E2E (Playwright, Chromium)
```
