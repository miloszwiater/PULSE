# PULSE — stan prac

Ostatnia aktualizacja: 26.10.2026 (redesign v4 „Lakier”).

## Podsumowanie
v3 zmienia filozofię: PULSE pilnuje regularności, nie kreatywności; bez terminu 365 dni, bez kariery i promocji w UI. Główna funkcja to Creative Workflow (start jednym dotknięciem, własne workflow, zapis bez formularza). Doszły: Akademia (5 ścieżek, 29 lekcji ze źródłami), książki z nowymi statusami, projekty z utworami, tekstami i okładkami, ekran Skupienia (uczciwie o iOS), Rytm (przerwy i powroty), Towarzysz rozumiejący zwykłe wiadomości bez AI. Nowy design „płyta”. **Wdrożona:** https://pulse.milosz-wiater.workers.dev (Worker `pulse`, D1 `pulse`). Gałąź `claude/pulse-pwa-app-5avvc0`. Na koncie działa niezależna aplikacja `falling-cell-91e6` (+ D1 `zero_push_notifications`) — nie dotykać.

## Moduły
| Moduł | Stan | Uwagi |
|---|---|---|
| Fundament, autoryzacja, sync local-first, PWA | gotowe | migracje `0001–0006` (0005 i 0006 addytywne) |
| Dziś: pierścień rytmu, „teraz”, rozmowa z Towarzyszem, samopoczucie, obserwacje | gotowe | |
| Creative Workflow: szybki start, długości, własne workflow, sesja-płyta, pauza, skupienie (wake lock + skrót iOS), zapis bez formularza, auto-zaliczanie planu z cofnięciem, historia, sesje dopisane | gotowe | |
| Planer: grafik + wyjątki, plan tygodnia i miesiąca, tryb powrotu, lżejszy dzień po długiej sesji, bloki nauki, konflikty, zamykanie starych bloków bez kary | gotowe | propozycje wymagają akceptacji |
| Towarzysz: lokalne intencje (praca, przełożenie, energia, choroba, wena, nauka, powrót, wolne, plan) + AI po stronie serwera | gotowe | AI wymaga `ANTHROPIC_API_KEY` |
| Akademia: ścieżki, lekcje, praktyka, bezpieczeństwo głosu, źródła z flagą weryfikacji, notatki, start/wstrzymanie/ukończenie/powrót | gotowe | treści w `shared/catalog/academy.ts` |
| Biblioteka Rozwoju Artystycznego: 115 książek, wyszukiwarka i filtry, rekomendacje z różnicowaniem, statusy (Zaproponowana … Odrzucona), pytania po ukończeniu, elastyczne terminy, bloki czytania, doradca literacki w Towarzyszu | gotowe lokalnie, **niewdrożone** (patrz niżej) | szczegóły w sekcji Biblioteka |
| Projekty: singiel/EP/album/kolekcja, okładka (zdjęcie lub generowana), utwory, kolejność, teksty, notatki | gotowe | okładka ≤ 200 kB, synchronizowana |
| Skupienie: lista rozpraszaczy, skrót iOS, bloki dnia, instrukcje Czasu przed ekranem | gotowe | blokowanie aplikacji niemożliwe w PWA (opisane) |
| Rytm: mapa dni, tygodnie, przerwy i powroty, realizacja planu, nauka, książki | gotowe | |
| Przypomnienia: max 2/dobę, cisza w pracy, przypomnienie o powrocie | gotowe w kodzie | dostarczenie push niezweryfikowane na iPhonie |

## Reset planowania (25.10.2026)
Zmiana koncepcji unieważniła stare plany, więc dane planowania jednego konta produkcyjnego zostały wyczyszczone skryptem `scripts/reset-planning.mjs` (próba → `--apply`, tylko jeden `--user`, soft-delete, idempotentny). Przed resetem pełny eksport bazy poza repozytorium.
- **Usunięte:** 3 zadania starego planera (z `exercise_id`, m.in. „Zmiana obrazu w 8 wersach”), 3 propozycje planu (planer/konflikt/AI), 1 wymiana z Towarzyszem zawierająca kartę propozycji.
- **Zachowane:** sesje, ćwiczenia i poziomy, projekty i teksty, postęp nauki, książki, grafik (stałe bloki, wyjątki, wydarzenia „Praca”, prywatne), statusy dni, samopoczucie, profil, ustawienia, konto, subskrypcje push.
- **Zabezpieczenie przed powrotem:** AI może dodać tylko blok „Czas na muzykę” (tytuł zawsze nadaje PULSE, brak `exercise_id`) albo regenerację; planer generuje wyłącznie swobodne bloki muzyki i opcjonalną naukę z Akademii.
- **Nowy start:** gdy w planie nie ma przyszłej muzyki ani nauki, Dziś i Plan pokazują „Ułóż nowy plan” (grafik pracy, pobudka/sen, rytm, długość sesji, nauka) → propozycja do końca miesiąca do zatwierdzenia.

## Redesign v4 „Lakier” (26.10.2026)
Nowa identyfikacja całej aplikacji (DESIGN.md → Wersja 4): lakierowana czerń i grafit, ultrafiolet tylko dla tego, co żywe, wskazówka VU dla nauki i dni chronionych, Bodoni Moda + Onest, 9 zdjęć w jednym duotonie, ziarno.
- **Winylowy timer** (`src/ui/Turntable.tsx`): prawdziwe 33⅓ obr./min z bezwładnością, ramię z igłą prowadzone postępem, uniesione w pauzie, łuk VU po przekroczeniu zamiaru, dotknięcie płyty = pauza/wznowienie. Czas nadal wyłącznie z timestampów. Naprawiony przy okazji błąd: przy starcie z animacją czas liczył się dopiero po animacji — teraz od dotknięcia.
- **Ekrany:** Start (zdjęcie, nagłówek, „następny blok” i przycisk-płyta nad zgięciem, potem rytm), Twórz (gramofon, klawisze długości z lampką), Sesja (lampa nad deckiem, transport), Zapisane, Plan (pasek tygodnia, oś z „playheadem”, grafik kreskowany, taśma tygodnia, pady miesiąca), Akademia (okładki-zdjęcia ścieżek, segmenty postępu, lekcja z inicjałem, **quiz „Sprawdź się”** z pojęć lekcji — odpowiedzi poprawne z konstrukcji, nic nie jest zapisywane), Biblioteka, Projekty (skrzynka okładek z wysuwającą się płytą), Towarzysz, Ty, Rytm (tygodnie jako diody VU), Skupienie (zdjęcie + start sesji ze skupieniem), Samopoczucie, Profil, Ustawienia, logowanie, onboarding, arkusze.
- **Layout:** stare `screens.css`/`v3.css` (warstwy po trzech redesignach) usunięte i zastąpione plikami per obszar; naprawione: przycisk blokowy z długą etykietą wypychał lekcję poza ekran przy 320 px, poświata decku powodowała poziome przewijanie, bloki w planie nie miały kolorów kategorii, pigułka sesji dublowała deck na Twórz.
- **PWA:** zdjęcia w precache (offline); nowa wersja, która zainstalowała się w tle, jest stosowana przy następnym uruchomieniu; sprawdzanie aktualizacji przy każdym powrocie aplikacji na pierwszy plan (iOS rzadko zamyka aplikacje z ekranu początkowego).
- **Weryfikacja:** zrzuty wszystkich ekranów i stanów (`scripts/qa-v4.mjs`, `qa-session.mjs`, `qa-library.mjs`) na 320/375/390/430 px, brak błędów konsoli.
- **Nie wdrożone:** w tej sesji brak tokena Cloudflare. Wdrożenie: `CLOUDFLARE_API_TOKEN=… npm run db:migrate:remote && CLOUDFLARE_API_TOKEN=… npm run deploy` (migracja 0006 z Biblioteki też czeka). Bez zmian w danych — redesign nie dotyka bazy.
- **Nie przetestowano:** prawdziwy Safari/iOS (Chromium z viewportem iPhone), wydajność animacji na starszym iPhonie.

## Biblioteka Rozwoju Artystycznego (26.10.2026)
**Zakres.** Katalog 115 książek (`shared/catalog/library/*`): poezja polska (13) i światowa (12), powieść psychologiczna (15), egzystencjalizm (10), proza współczesna (11), język i obraz (8), opowiadanie historii (3), filozofia (9), psychologia (8), twórczość (8), pisanie piosenek (6), biografie artystów (7), teoria/głos/produkcja (5). Rekomendacje, statusy, terminy i bloki czytania: `shared/domain/library.ts`. UI: `src/screens/learn/BooksScreen.tsx` i `BookSheets.tsx` (półka / polecane / katalog). Towarzysz: lokalna intencja „książka” i „przesuń termin”, a przy dostępnym AI — doradca literacki (`recommend_book`, `shift_book_deadlines`).

**Jak weryfikowano.** 142 kandydatów; dla 131 sprawdzano w wyszukiwarce autora, tytuł i polskie wydanie; 17 odrzucono po sprawdzeniu (brak potwierdzenia), 3 kolejne pominięto jako drugą pozycję tego samego autora; reszta weszła z dokładnie tym, co potwierdzono. Pozycje ze starego katalogu zostały (kluczami), także te, których nie dało się potwierdzić — z flagą. Poprawiono m.in. polskie tytuły (Patti Smith → „Poniedziałkowe dzieci”, Fromm → „O sztuce miłości”, Levitin → „Zasłuchany mózg”, Eliot, Lorca) i wcześniejsze błędne założenia starego katalogu (Rubin, McKee, Kleon nie mają potwierdzonego polskiego wydania). Status wydania polskiego: 23 polskie oryginały, 74 z potwierdzonym polskim wydaniem, 5 niepotwierdzonych, 5 „brak”, 8 „nie sprawdzano”.
- **16 pozycji ma flagę „część danych do sprawdzenia”** (np. wydawca polskiego wydania, polski tytuł z serwisu czytelniczego, dostępność): Poświatowska (wybór), Herbert „Pan Cogito”, Stachura, Plath „Ariel”, Carson, Vuong, Eco, McKee, Jung, Csikszentmihalyi, Catmull, Kleon, Dylan, Davis, Gordon, Cave. Aplikacja pokazuje, czego brakuje.
- **Potwierdzano istnienie wydania, nie aktualną dostępność w księgarniach** — i tak jest to napisane w arkuszu książki.

**Czego nie sprawdzono (uczciwie).**
- Opisy, umiejętności, trudność i „dlaczego dla Ciebie” to moje streszczenia: bez spoilerów i oparte na wiedzy o książkach, ale tylko dane bibliograficzne były potwierdzane w źródłach — nikt tu tych książek nie czytał od deski do deski. Warto przejrzeć opisy pod kątem własnego odbioru.
- Liczba stron w katalogu to szacunek służący tylko do oceny czasu czytania; w aplikacji nie jest podawana jako fakt (tylko „ok. N h, szacunek”).
- Rekomendacje lokalne to heurystyka (wagi umiejętności + profil + oceny + różnicowanie), nie „rozumienie literatury”. Jakość doradztwa AI nie była sprawdzana na prawdziwym kluczu API.
- Brak przeglądarki Safari/iOS; testy na Chromium z viewportem iPhone 13.

**Wdrożenie.** W tej sesji nie było tokena Cloudflare (wrangler nie jest zalogowany), więc zmiana **nie jest wdrożona**. Aby ją wdrożyć: `CLOUDFLARE_API_TOKEN=… npm run db:migrate:remote` (dodaje 5 kolumn do `books`, addytywnie) a potem `CLOUDFLARE_API_TOKEN=… npm run deploy`. Kolejność ma znaczenie: najpierw migracja, potem Worker. Dane zapisane przed zmianą nie wymagają żadnej konwersji.

## Testy
- `npm test` — 136 testów (+ quiz Akademii). Wcześniej 135 testów (83 poprzednich + 52 dla Biblioteki: integralność katalogu, brak zadań pisarskich, zgodność ze starymi kluczami, statusy i dane sprzed zmiany, duplikaty, różnicowanie i uczenie się z ocen, wyszukiwanie, terminy, bloki czytania, Towarzysz). Poprzednio: 83 testy (w tym nowe: intencje Towarzysza na przykładach z briefu, zmiana 12 h → przełożenie muzyki, choroba, tryb powrotu, długa sesja, bloki nauki, plan miesiąca, „czas był” vs „ciężki dzień”, kompletność Akademii i brak sztucznych zadań, rekomendacje książek, brak tekstów w kontekście AI).
- `npm run test:e2e` — 15 scenariuszy (+ płyta kręci się tylko, gdy czas biegnie, i igła idzie za postępem; overflow sprawdzany na 320/375/430 px). Wcześniej 14 scenariuszy (nowe: Biblioteka od wyszukiwania do oceny i następnej książki, odrzucenie i duplikaty; przesunięcie terminu przez Towarzysza dopiero po „Zastosuj”; pominięcie pytań). Poprzednio: 12 scenariuszy (w tym reset planowania na lokalnej bazie: stare znika z dnia/miesiąca, nie wraca po odświeżeniu, historia i projekty zostają): sesja jednym dotknięciem z pauzą, własne workflow, timer po restarcie, auto-zaliczenie planu bez podwójnego czasu, idempotencja, serwer przelicza czas, **dane v2 po aktualizacji**, trwałość po reinstalacji (lekcja, książka, projekt z utworem), Towarzysz bez AI (propozycja → zastosowanie), choroba, brak overflow na 375 px (17 ekranów).
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
