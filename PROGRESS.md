# PULSE — stan prac

Ostatnia aktualizacja: 25.10.2026 (sesja 1).

## Podsumowanie
Działająca PWA ze wszystkimi modułami ze specyfikacji, trwałymi danymi (D1 + IndexedDB, offline), deterministycznym silnikiem planowania i dyscypliny, mentorem AI po stronie serwera oraz testami (53 jednostkowe, 9 E2E). **Wdrożona:** https://pulse.milosz-wiater.workers.dev (Worker `pulse`, baza D1 `pulse`, region WEUR, cron co 15 min, sekrety: SIGNUP_CODE, VAPID_*). Kod na GitHubie w gałęzi `claude/pulse-pwa-app-5avvc0`. Na tym samym koncie działa niezależna aplikacja `falling-cell-91e6` (+ D1 `zero_push_notifications`) — nie dotykać.

## Moduły
| Moduł | Stan | Uwagi |
|---|---|---|
| Fundament: Vite/React/TS, Worker (Hono), D1, migracje | gotowe | `migrations/0001–0003` |
| Autoryzacja (pierwsze konto, potem kod zaproszenia), sesje cookie, rate limiting | gotowe | |
| Synchronizacja local-first, outbox, idempotencja, offline | gotowe | zweryfikowane E2E i na buildzie produkcyjnym (offline → kolejka → sync) |
| PWA: manifest, ikony, service worker, instalacja iOS, safe-area | gotowe | precache tylko latin/latin-ext fontów |
| Onboarding (profil, brzmienie, samoocena, praca, rytm, start 365) | gotowe | |
| Start (co dziś / kiedy mam czas / jak zacząć, rytm tygodnia, Care, mentor) | gotowe | |
| Smart Planner: dzień/tydzień/miesiąc, grafik stały + wyjątki, status dnia, plan tygodnia z uzasadnieniem, konflikty → propozycja → zastosuj/odrzuć/cofnij, historia zmian | gotowe | brak przeciągania bloków (zmiana przez edycję) |
| Creative Flow + sesja (timer z timestampów, pauzy, tryb skupienia z wake lock, notatka, projekt) | gotowe | blokowanie aplikacji iOS: niemożliwe w PWA (opisane w UI) |
| Zakończenie sesji: rezultat, ocena ćwiczenia, etap projektu, energia, pokrycie planu bez dublowania, korekta czasu w dół, sesja ręczna | gotowe | |
| Discipline Engine: cel tygodniowy skorygowany o dni chronione, seria tygodni, metodologia w UI | gotowe | |
| Music Training: 38 ćwiczeń w 5 obszarach × 4 poziomy, progresja, zmiana metody, rekomendacje, planowanie ćwiczenia w realne okno | gotowe | |
| Biblioteka: statusy (z pominięciem „Kupiona”), termin orientacyjny, postęp opcjonalny, ćwiczenie po lekturze, rekomendacje „dlaczego teraz” | gotowe | 16 realnych pozycji w katalogu |
| Styl artysty: opis stylu, inspiracje, techniki, samoocena, zgoda na analizę fragmentów | gotowe | |
| Statystyki: okresy, mianowniki, tygodnie, obszary, rezultaty, raport tygodnia i miesiąca, „jak liczymy” | gotowe | |
| Kariera: Roadmapa 365 (dowody z danych, własne kamienie, „Zaplanuj krok”), cele z miarą automatyczną/ręczną, Promotion Academy (16 lekcji, bramkowanie etapem), plan premiery | gotowe | PULSE niczego nie publikuje |
| Pulse Care: sygnały, choroba na N dni, koniec choroby, historia, prywatność, reakcja planu | gotowe | |
| Mentor AI: czat, kontekst z danych, narzędzia → walidowane propozycje, karty ćwiczeń/książek, przegląd tygodnia i miesiąca, obserwacje regułowe bez AI | gotowe w kodzie, **niezweryfikowane z prawdziwym modelem** | wymaga `ANTHROPIC_API_KEY`; bez klucza UI pokazuje uczciwy stan (test E2E) |
| Powiadomienia Web Push (VAPID, szyfrowanie RFC 8291, cron co 15 min, cisza w pracy) | gotowe w kodzie, dostarczenie **niezweryfikowane** | wymaga kluczy VAPID i instalacji na iPhonie; szyfrowanie potwierdzone testem odszyfrowania |
| Ustawienia, eksport danych JSON, wylogowanie z ostrzeżeniem o niewysłanych zmianach | gotowe | |

## Testy
- `npm test` — 53 testy: scenariusze planera (10 h pracy, dzień wolny, nagła zmiana, brak kumulacji, choroba, czas prywatny), timer, brak podwójnego liczenia, regularność, zgodność schematu z migracjami, polityka przypomnień, szyfrowanie push, walidacja propozycji mentora.
- `npm run test:e2e` — 9 scenariuszy w przeglądarce: pełny przepływ sesji, timer po „zablokowaniu”/restarcie, 5 h demo pokrywa plan, podwójny zapis, serwer nie przyjmuje zawyżonego czasu, trwałość po reinstalacji, brak klucza AI, choroba, brak overflow na 375 px (18 ekranów).
- Audyt wizualny: zrzuty iPhone 13 wszystkich ekranów i stanów interakcji (`scripts/shots.mjs`, `scripts/qa-*.mjs`).
- Nie przetestowano: prawdziwy Safari/iOS (środowisko ma tylko Chromium), realne wywołania modelu AI, realne dostarczenie push.

## Znane ograniczenia / dług
- Pola daty/godziny używają natywnych kontrolek (format zależy od języka urządzenia — na iPhonie z pl-PL będzie 24 h).
- Brak przeciągania bloków w osi dnia; przenoszenie przez edycję lub propozycje.
- Konflikty edycji z dwóch urządzeń: LWW na poziomie wiersza.
- Bundle JS ~560 kB (bez dzielenia na chunki); cache'owany przez SW.

## Do zrobienia przez właściciela
1. Założyć pierwsze konto na https://pulse.milosz-wiater.workers.dev (rejestracja otwarta tylko dla pierwszego użytkownika) i dodać do ekranu początkowego iPhone'a.
2. Opcjonalnie: `ANTHROPIC_API_KEY` jako sekret Workera `pulse` (mentor AI).
3. Usunąć/odnowić token Cloudflare wklejony w czacie.

Ponowne wdrożenie: `CLOUDFLARE_API_TOKEN=… npm run deploy` (account_id i database_id są w `wrangler.jsonc`), nowe migracje: `npm run db:migrate:remote`.

## Następny krok
Po uzyskaniu dostępu: wdrożyć (ARCHITECTURE.md → Wdrożenie), założyć konto na iPhonie, dodać do ekranu początkowego, przejść test akceptacyjny na urządzeniu (timer po blokadzie, powiadomienia, klawiatura w arkuszach). Potem: przeciąganie bloków w planie, dzielenie bundla, test mentora na realnym modelu i dostrojenie promptu.
