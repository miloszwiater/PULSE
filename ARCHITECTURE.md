# PULSE — architektura

## Przegląd
```
iPhone (PWA, Safari standalone)
 ├─ React UI (src/screens, src/ui)
 ├─ Store local-first (src/data/store.ts) ── IndexedDB: wiersze, outbox, kursor
 ├─ Service worker (src/sw.ts): precache powłoki, nawigacja offline, Web Push
 └─ shared/domain (planer, metryki, trening, insighty, roadmapa) ← ten sam kod co na serwerze
        │  HTTPS, cookie sesji (HttpOnly, SameSite=Strict) + nagłówek x-pulse
Cloudflare Worker (worker/, Hono)
 ├─ /api/auth   rejestracja (pierwsze konto lub kod zaproszenia), logowanie, wylogowanie
 ├─ /api/sync   POST: idempotentne operacje (op_id) · GET ?since=: zmiany od kursora
 ├─ /api/mentor status, chat (Claude przez @anthropic-ai/sdk, narzędzia → propozycje)
 ├─ /api/push   konfiguracja VAPID, subskrypcje, test
 └─ cron */15   przypomnienia (shared/domain/reminders.ts) → Web Push (RFC 8291/8292)
Cloudflare D1 (migrations/)
```

## Model danych (`shared/schema.ts`, `migrations/`)
Każda tabela użytkownika ma klucz `(user_id, id)`, `updated_at` (LWW), `deleted_at` (miękkie usuwanie — historia nie ginie), `srv_ts` (kursor synchronizacji).

| Encja | Po co |
|---|---|
| `profile` | profil, preferencje muzyczne, styl, rytm dnia, cele tygodnia, priorytety, zgody, przypomnienia |
| `routines` + `routine_exceptions` | stały grafik (praca, dojazdy, sport…) i wyjątki na konkretne dni |
| `day_states` | status dnia: wolne od planu / choroba / urlop / przeciążenie |
| `events` | kalendarz; statusy: planned, done, partial, skipped, moved (`moved_to`), excused, covered (`session_id`), cancelled |
| `sessions` | sesje twórcze; pauzy jako przedziały timestampów; rezultat, energia, powiązania z wydarzeniem/projektem/ćwiczeniem |
| `attempts` | próby ćwiczeń z oceną trudności (id `at_<session>` — jedna na sesję) |
| `skill_levels` | poziom 1–4 w pięciu obszarach |
| `projects` | utwory: etapy, notatki, link zewnętrzny, data premiery |
| `goals` | cele z miarą automatyczną lub ręczną |
| `milestones` | Roadmapa 365 (szablon + własne), dowody liczone z danych |
| `books` | półka: statusy (suggested/planned/bought/reading/read/paused/dropped), termin orientacyjny, `started_at`/`finished_at`, opcjonalne `rating`/`clarity`/`direction` (migracja `0006_library.sql`, addytywna) |
| `promo_tasks` | zadania Promotion Academy i planu premiery |
| `care` | sygnały samopoczucia (choroba z zakresem dat) |
| `mentor_messages` | rozmowa z mentorem + karty (ćwiczenie/książka/propozycja) |
| `proposals` | propozycje zmian (planer, konflikty, mentor): lista zmian before/after, status, cofanie |
| `op_log` | dziennik zmian + rejestr idempotencji |
| `users`, `auth_sessions`, `rate_limits`, `push_subscriptions`, `notification_log` | konta i infrastruktura |

### v3 (migracja `0005_workflow_academy.sql`, tylko addytywna)
- `workflows` — zapisane sposoby startu sesji; `learning` — postęp Akademii (wiersz ścieżki i wiersze lekcji, id = klucz z katalogu); `songs` — utwory w projektach (tekst, notatki, kolejność).
- Nowe kolumny: `sessions.workflow_id/target_minutes`, `events.lesson_key`, `projects.kind/cover_data/tone`, `profile.focus_apps/focus_shortcut/focus_blocks/learning_per_week/music_style`.
- Stare dane zostają nietknięte (cele, roadmapa, promocja, ćwiczenia v1 nadal są w bazie i eksporcie, tylko nie w UI). Klient przy starcie przepuszcza wiersze z IndexedDB przez schemat (`upgradeRows`), więc stare wiersze dostają domyślne wartości nowych pól.

## Synchronizacja i idempotencja
1. `commit()` waliduje wiersz schematem, zapisuje lokalnie, natychmiast utrwala w IndexedDB i dokłada operację `{op_id, entity, action, id, data}` do outboxu (nowsza operacja na tym samym wierszu zastępuje niewysłaną).
2. Pętla sync: wysyła outbox partiami → serwer pomija `op_id` widziane wcześniej (`duplicate`), stosuje upsert tylko gdy `updated_at` jest nowsze (`stale` w przeciwnym razie), wszystko w jednym `D1.batch`.
3. Pobranie zmian `since = kursor − 2 s` (nakładka chroni przed wyścigiem), scalanie LWW; wiersze z niewysłanymi zmianami lokalnymi wygrywają.
4. Offline: aplikacja działa na danych lokalnych; zmiany czekają w outboxie (licznik w nagłówku Start).

Gwarancje: ten sam zapis wysłany dwukrotnie nie podwaja niczego; zakończenie sesji to zapis wierszy o stałych id; serwer przelicza `active_seconds` zakończonej sesji z timestampów (klient nie może zawyżyć czasu).

## Reguły domenowe (`shared/domain`)
- **Pojemność dnia** (`day.ts`): status dnia (wpis lub Pulse Care) → praca+dojazdy → tryb `none | light | normal | long` i limit minut; wolne okna liczone po buforach (60 min regeneracji po pracy, 15 min wokół obowiązków, start po pobudce, koniec przed snem).
  - wolne/choroba/urlop → brak planu · przeciążenie, brak energii, ≥10 h pracy → maks. 30 min, opcjonalnie · ≥7 h → 75 min · praca → 120 min · bez pracy → 180 min.
- **Plan tygodnia** (`planner.ts`): planuje tylko brakującą liczbę sesji do celu skorygowanego o dni chronione, max jedna sesja dziennie, rozkłada (kara za sąsiednie dni, za długi czas prywatny), dni „lekkie” tylko w ostateczności; treść z rekomendacji ćwiczeń i aktywnych projektów; każdy dzień ma uzasadnienie.
- **Konflikty**: kolizja z obowiązkiem, status dnia, przeciążenie. Rozwiązanie: ten sam dzień (ewentualnie skrócone) → najbliższy dzień z realną pojemnością i bez innej sesji (max jedno przeniesienie na dzień) → usprawiedliwienie. Choroba usprawiedliwia wszystko poza priorytetem „Ważne”.
- **Pokrycie** (`sessions.ts`): sesja spontaniczna proponuje oznaczenie podobnych zadań z tygodnia jako `covered` (budżet: jedno zadanie na rozpoczętą godzinę pracy); czas liczy się raz — wyłącznie z sesji.
- **Regularność** (`metrics.ts`): tydzień utrzymany, gdy sesje (≥10 min) ≥ cel × (dni niechronione / 7); tydzień w całości chroniony jest neutralny.
- **Progresja** (`training.ts`): 2× „za łatwe” → wyższy poziom; 2× „za trudne”/nieukończone → zmiana metody; 3× → powrót poziom niżej.
- **Insighty** (`insights.ts`): reguły z dowodami (brak domykania, zaniedbane priorytety, powtarzane pomijanie, nierówny rozkład, przeciążenie, lektura bez praktyki, progresja, długa przerwa). To baza dla mentora AI i działa bez AI.

## Towarzysz (`shared/domain/companion.ts`, `src/screens/CompanionScreen.tsx`, `worker/mentor.ts`)
Najpierw lokalny silnik intencji (polskie wyrażenia dat, godzin, dni) → odpowiedź + propozycja (`Proposal`) zapisywana jak każda inna i stosowana dopiero po „Zastosuj”. Nierozpoznane wiadomości idą do `/api/mentor/chat` (jeśli jest klucz), z nowym promptem i narzędziem `recommend_lesson`.

## Mentor AI (`worker/mentor.ts`)
- System prompt (stały, cache'owany) + katalog ćwiczeń i książek; kontekst danych budowany per wiadomość przez `shared/domain/mentorContext.ts` (fakty, nie wnioski).
- Książki: katalog w `shared/catalog/library/*` (115 pozycji, status wydania polskiego, flaga `verified`), logika w `shared/domain/library.ts` (statusy, rozpoznawanie duplikatów, szacowanie czasu i terminu, gusty z ocen, rekomendacje z różnicowaniem, następna po ukończonej, wyszukiwarka, propozycje przesunięcia terminów i bloków czytania, opcjonalna refleksja). Worker: narzędzia `recommend_book` (odrzuca pozycje już na półce) i `shift_book_deadlines`; stan półki i ocen w kontekście, katalog w cache'owanym prompcie.
- Narzędzia: `propose_plan_changes` (walidowane: tylko istniejące wydarzenia rozwoju, nie rusza pracy/relacji, sprawdza kolizje i pojemność), `recommend_exercise`, `recommend_book`. Wynik: wiadomość + karty + propozycje `pending` do akceptacji.
- Idempotencja po `message_id`, limit 40 wiadomości/h na użytkownika, fallback serwerowy przy odmowie, wysiłek `low` (koszt). Brak klucza → `503 not_configured`, UI pokazuje uczciwy stan.
- Koszt orientacyjny: kontekst ~4–6 tys. tokenów + odpowiedź ~0,5–1 tys.; przy cenniku Opus 5.5 ($4/$20 za 1M) ≈ 2–4 centy za wiadomość; system prompt z cache.

## Bezpieczeństwo
PBKDF2-SHA256 (100k), token sesji 256 bit (w bazie tylko SHA-256), cookie HttpOnly+Secure+SameSite=Strict, wymagany nagłówek `x-pulse` dla mutacji (CSRF), rate limiting logowania/rejestracji/mentora, rejestracja zamknięta po pierwszym koncie (dalej kod zaproszenia `SIGNUP_CODE`), walidacja zod wszystkich wejść, dane rozdzielone `user_id` w każdym zapytaniu, sekrety tylko w Workerze.

## Ograniczenia platformy (iOS)
- Blokowanie innych aplikacji: niemożliwe w PWA (wymaga natywnego Screen Time API / FamilyControls). Tryb skupienia = wake lock + uproszczony ekran + wskazówka trybu Skupienie iOS.
- Web Push na iOS 16.4+ tylko po dodaniu do ekranu początkowego i zgodzie; czas dostarczenia zależy od systemu.
- Timer nie działa „w tle” — i nie musi: czas wynika z timestampów.

## Wdrożenie (Cloudflare)
Wymaga konta Cloudflare i tokena API (Workers + D1). Kroki:
```bash
npx wrangler login                      # lub CLOUDFLARE_API_TOKEN
npx wrangler d1 create pulse            # wpisz database_id do wrangler.jsonc
npm run db:migrate:remote
npx wrangler secret put SIGNUP_CODE     # kod zaproszenia dla kolejnych kont
npx wrangler secret put ANTHROPIC_API_KEY   # opcjonalnie — mentor AI
node scripts/vapid.mjs                  # opcjonalnie — klucze push; potem:
npx wrangler secret put VAPID_PUBLIC_KEY && npx wrangler secret put VAPID_PRIVATE_KEY && npx wrangler secret put VAPID_SUBJECT
npm run deploy                          # build + wrangler deploy (Worker + statyczne zasoby)
```
Pierwsze konto zakładasz od razu po wdrożeniu (rejestracja jest otwarta tylko dla pierwszego użytkownika). Plan Free Cloudflare wystarcza (Workers, D1, Cron).
