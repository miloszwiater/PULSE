# PULSE — zasady pracy

PULSE to mobilna PWA (iPhone) — osobisty system rozwoju kariery muzycznej na 365 dni. Specyfikacja produktu: `PULSE_SPEC.md`. Design: `DESIGN.md`. Architektura: `ARCHITECTURE.md`. Stan prac: `PROGRESS.md` (aktualizuj po każdym etapie).

## Stack
- Klient: React 19 + TypeScript, Vite 8, własny design system (bez bibliotek UI), Zustand, IndexedDB (idb-keyval), vite-plugin-pwa (injectManifest, `src/sw.ts`).
- Serwer: Cloudflare Worker (Hono) w `worker/`, baza Cloudflare D1, migracje w `migrations/`.
- Wspólna logika domenowa (planer, metryki, trening, insighty, roadmapa): `shared/` — czysty TS, bez DOM i bez Workers API, testowany vitestem.
- Mentor AI: `@anthropic-ai/sdk` wyłącznie po stronie Workera; klucz `ANTHROPIC_API_KEY` jako secret.

## Komendy
- `npm run dev` — Vite + Worker + lokalne D1 (najpierw `npm run db:migrate:local`). Lokalne sekrety: `.dev.vars` (wzór: `.dev.vars.example`).
- `npm test` — testy jednostkowe (vitest, `tests/`).
- `npm run test:e2e` — Playwright (`e2e/`), Chromium z viewportem iPhone 13; wymaga `.dev.vars` z `SIGNUP_CODE=dev-invite` i `RATE_LIMIT_OFF=1`.
- `npm run typecheck`, `npm run lint`, `npm run build`.
- `node scripts/shots.mjs <dir> /plan /tworz …` — zrzuty ekranów do audytu wizualnego (`scripts/onboard.mjs` przechodzi onboarding).
- Wdrożenie: patrz `ARCHITECTURE.md` → Wdrożenie.

## Reguły
- Logika (planowanie, liczenie, progresja) w `shared/domain` — nigdy w komponentach. AI nie zastępuje reguł: AI tylko proponuje, propozycje są walidowane i wymagają akceptacji.
- Każdy zapis przez `commit()` w `src/data/store.ts` (walidacja schematem, outbox z `op_id`, idempotencja po stronie serwera). Nie dodawaj zapisów omijających outbox.
- Nowa encja/pole: `shared/schema.ts` + nowa migracja SQL (nigdy nie edytuj zastosowanych migracji) — test `tests/schema.test.ts` pilnuje zgodności.
- Czas sesji wyłącznie z timestampów (`activeSeconds`), nigdy z licznika JS. Serwer przelicza czas zakończonej sesji.
- Żadnych atrap: funkcja bez backendu/klucza pokazuje uczciwy stan („nie skonfigurowano”), nie udaje działania.
- Copy po polsku, w formach neutralnych płciowo (bez „zrobiłeś/zrobiłaś”, bez „sam(a)”).
- Selektory Zustand zwracające nowe tablice owijaj w `useShallow` (inaczej pętla renderów).
- iOS: nie obiecuj blokowania aplikacji ani dokładnych godzin powiadomień.
- Model AI domyślnie `claude-opus-5-5` (zmienna `AI_MODEL`); nie wpisuj identyfikatorów modeli do commitów.
