# PULSE — zasady pracy

PULSE to mobilna PWA (iPhone), która pomaga utrzymać muzykę jako regularną część życia: czas na tworzenie obok pracy, rytm bez presji, powroty po przerwach, opcjonalna nauka. Pilnuje regularności, nie kreatywności — nie mówi, co tworzyć. Specyfikacja produktu: `PULSE_SPEC.md`. Design: `DESIGN.md`. Architektura: `ARCHITECTURE.md`. Stan prac: `PROGRESS.md` (aktualizuj po każdym etapie).

## Stack
- Klient: React 19 + TypeScript, Vite 8, własny design system (bez bibliotek UI), Zustand, IndexedDB (idb-keyval), vite-plugin-pwa (injectManifest, `src/sw.ts`).
- Serwer: Cloudflare Worker (Hono) w `worker/`, baza Cloudflare D1, migracje w `migrations/`.
- Wspólna logika domenowa (planer, metryki, workflow, akademia, towarzysz, insighty): `shared/` — czysty TS, bez DOM i bez Workers API, testowany vitestem. Treści Akademii: `shared/catalog/academy.ts` + źródła `shared/catalog/sources.ts`.
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
- Żadnych sztucznych zadań twórczych („napisz 8 wersów”), żadnych wymaganych formularzy po sesji, żadnych ocen muzyki. Teoria w Akademii musi być poprawna; źródło niesprawdzone oznacz `verified: false`.
- Towarzysz: lokalny silnik (`shared/domain/companion.ts`) najpierw; AI tylko przez serwer. Teksty utworów nigdy nie trafiają do kontekstu AI.
- `node scripts/reset-planning.mjs --user <id> [--remote] [--apply]` — jednorazowy reset przestarzałych danych planowania jednego użytkownika (najpierw eksport bazy; domyślnie próba bez zmian).
- `node scripts/qa-v4.mjs <dir>` — audyt v4: logowanie, arkusze, 17 ekranów × 4 szerokości (320–430) z wykrywaniem poziomego przepełnienia; `node scripts/qa-session.mjs <dir>` — gramofon: start, pauza, deck w tle, zapis.
- Design v4 (DESIGN.md): fiolet tylko dla tego, co żywe/klikalne; VU (amber) dla nauki, dni chronionych i pauzy; Bodoni Moda ≥ 20 px; nowe zdjęcia tylko po przepuszczeniu przez ten sam duotone i z licencją bez wymogu przypisania (wpisz źródło w DESIGN.md).
- `node scripts/qa-library.mjs <dir>` — zrzuty Biblioteki (polecane, arkusz książki, półka, katalog) i kontrola przepełnienia poziomego.
- Biblioteka: nowa pozycja w `shared/catalog/library/*` tylko po sprawdzeniu autora, tytułu i wydania polskiego w źródle; czego nie potwierdzono, to `v: '…opis braku…'` i `pl: 'unconfirmed'|'none'|'unchecked'`. Żadnych zadań pisarskich w opisach i refleksjach (pilnuje `tests/library.test.ts`). Stare klucze katalogu nie znikają (zapisane książki wskazują na `catalog_key`).
- Audyt na bogatych danych w WebKit: `scripts/seed-qa.ts` + `scripts/qa-rich.mjs <dir> webkit <szerokość>`; `scripts/qa-safe.mjs` — safe-area. Testuj na takich danych, nie na pustym koncie.
- `node scripts/qa-v3.mjs <dir>` — przejście głównych przepływów ze zrzutami (po `shots.mjs` + `onboard.mjs`).
- Model AI domyślnie `claude-opus-5-5` (zmienna `AI_MODEL`); nie wpisuj identyfikatorów modeli do commitów.
