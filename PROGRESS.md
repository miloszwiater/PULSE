# PULSE — stan prac

Ostatnia aktualizacja: 25.10.2026 (sesja 2 — przebudowa v3).

## Podsumowanie
v3 zmienia filozofię: PULSE pilnuje regularności, nie kreatywności; bez terminu 365 dni, bez kariery i promocji w UI. Główna funkcja to Creative Workflow (start jednym dotknięciem, własne workflow, zapis bez formularza). Doszły: Akademia (5 ścieżek, 29 lekcji ze źródłami), książki z nowymi statusami, projekty z utworami, tekstami i okładkami, ekran Skupienia (uczciwie o iOS), Rytm (przerwy i powroty), Towarzysz rozumiejący zwykłe wiadomości bez AI. Nowy design „płyta”. **Wdrożona:** https://pulse.milosz-wiater.workers.dev (Worker `pulse`, D1 `pulse`). Gałąź `claude/pulse-pwa-app-5avvc0`. Na koncie działa niezależna aplikacja `falling-cell-91e6` (+ D1 `zero_push_notifications`) — nie dotykać.

## Moduły
| Moduł | Stan | Uwagi |
|---|---|---|
| Fundament, autoryzacja, sync local-first, PWA | gotowe | migracje `0001–0005` (0005 addytywna) |
| Dziś: pierścień rytmu, „teraz”, rozmowa z Towarzyszem, samopoczucie, obserwacje | gotowe | |
| Creative Workflow: szybki start, długości, własne workflow, sesja-płyta, pauza, skupienie (wake lock + skrót iOS), zapis bez formularza, auto-zaliczanie planu z cofnięciem, historia, sesje dopisane | gotowe | |
| Planer: grafik + wyjątki, plan tygodnia i miesiąca, tryb powrotu, lżejszy dzień po długiej sesji, bloki nauki, konflikty, zamykanie starych bloków bez kary | gotowe | propozycje wymagają akceptacji |
| Towarzysz: lokalne intencje (praca, przełożenie, energia, choroba, wena, nauka, powrót, wolne, plan) + AI po stronie serwera | gotowe | AI wymaga `ANTHROPIC_API_KEY` |
| Akademia: ścieżki, lekcje, praktyka, bezpieczeństwo głosu, źródła z flagą weryfikacji, notatki, start/wstrzymanie/ukończenie/powrót | gotowe | treści w `shared/catalog/academy.ts` |
| Książki: rekomendacje do ścieżek, statusy, elastyczny termin, następna po ukończeniu | gotowe | 6 pozycji zweryfikowanych bibliograficznie, reszta oznaczona |
| Projekty: singiel/EP/album/kolekcja, okładka (zdjęcie lub generowana), utwory, kolejność, teksty, notatki | gotowe | okładka ≤ 200 kB, synchronizowana |
| Skupienie: lista rozpraszaczy, skrót iOS, bloki dnia, instrukcje Czasu przed ekranem | gotowe | blokowanie aplikacji niemożliwe w PWA (opisane) |
| Rytm: mapa dni, tygodnie, przerwy i powroty, realizacja planu, nauka, książki | gotowe | |
| Przypomnienia: max 2/dobę, cisza w pracy, przypomnienie o powrocie | gotowe w kodzie | dostarczenie push niezweryfikowane na iPhonie |

## Testy
- `npm test` — 82 testy (w tym nowe: intencje Towarzysza na przykładach z briefu, zmiana 12 h → przełożenie muzyki, choroba, tryb powrotu, długa sesja, bloki nauki, plan miesiąca, „czas był” vs „ciężki dzień”, kompletność Akademii i brak sztucznych zadań, rekomendacje książek, brak tekstów w kontekście AI).
- `npm run test:e2e` — 11 scenariuszy: sesja jednym dotknięciem z pauzą, własne workflow, timer po restarcie, auto-zaliczenie planu bez podwójnego czasu, idempotencja, serwer przelicza czas, **dane v2 po aktualizacji**, trwałość po reinstalacji (lekcja, książka, projekt z utworem), Towarzysz bez AI (propozycja → zastosowanie), choroba, brak overflow na 375 px (17 ekranów).
- Audyt wizualny: `scripts/qa-v3.mjs` (zrzuty iPhone 13 wszystkich ekranów i stanów).
- Nie przetestowano: prawdziwy Safari/iOS, realne wywołania AI, realne push, uruchamianie skrótów iOS.

## Znane ograniczenia
- Wymaga uprawnień/infrastruktury: AI (`ANTHROPIC_API_KEY` jako sekret Workera), push (instalacja PWA na iOS 16.4+), prawdziwe blokowanie aplikacji (natywna aplikacja iOS + Family Controls + Apple Developer Program).
- Źródła oznaczone „do sprawdzenia” warto zweryfikować przed traktowaniem jako pewne.
- Brak przeciągania bloków w planie; LWW przy edycji z dwóch urządzeń.

## Do zrobienia przez właściciela
1. Opcjonalnie: `ANTHROPIC_API_KEY` jako sekret Workera `pulse`.
2. Usunąć/odnowić token Cloudflare użyty przy wdrożeniu.

Ponowne wdrożenie: `CLOUDFLARE_API_TOKEN=… npm run db:migrate:remote && CLOUDFLARE_API_TOKEN=… npm run deploy`.
