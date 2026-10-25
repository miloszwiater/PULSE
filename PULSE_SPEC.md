# PULSE — specyfikacja produktu

## Wersja 3 (obowiązuje) — „PULSE pilnuje regularności, nie kreatywności”

Wersja 3 zastępuje wszędzie tam, gdzie się różni, opis z wersji 1 poniżej (zachowanego jako historia decyzji).

- **Bez terminu końcowego.** Nie ma programu 365 dni, roadmapy kariery, promocji ani celów biznesowych. PULSE nie jest menedżerem kariery ani marketingu i nie mówi, jaką muzykę tworzyć.
- **Creative Workflow (najważniejsza funkcja).** Jedno dotknięcie na zakładce Twórz uruchamia sesję; opcjonalnie długość (bez limitu / 25 / 45 / 60 / 90 / 120 min — tylko zamiar) i tryb skupienia. Własne workflow: nazwa, preferowana długość, skupienie, kolor, przypomnienie dla siebie. Pauza/wznowienie/zakończenie; czas wyłącznie z timestampów. „Zakończ” zapisuje od razu — bez formularza, kategorii i wymaganego rezultatu; notatka opcjonalna. Sesja automatycznie zalicza zaplanowany na ten sam dzień blok muzyki (z „Cofnij”). Sesje dopisywane ręcznie, historia z edycją notatki i usuwaniem (z cofnięciem).
- **Planowanie.** Grafik pracy (stały + wyjątki + pojedyncze zmiany), dojazdy, sen, życie prywatne, energia, historia. Plan tygodnia i miesiąca jako propozycja do akceptacji. Rytm tygodniowy (zachęta, nie wymóg). Długa sesja (≥3 h) → następny dzień lżejszy i liczy się podwójnie przy planowaniu (nie w regularności). Tryb powrotu po ≥7 dniach przerwy: najwyżej 2 krótkie sesje, bez nadrabiania; stare niezamknięte bloki można zamknąć bez kary. Pominięte bloki rozróżniane na „ciężki dzień / gorsze samopoczucie” i „czas był” — bez oceniania, z praktyczną radą (krótszy start). Nic nie jest usuwane ani nadpisywane bez zgody.
- **Towarzysz.** Rozumie zwykłe wiadomości po polsku lokalnie, bez AI (praca/zmiana godzin, przełożenie muzyki, brak energii, choroba na N dni, wena, nauka, powrót, dzień wolny, plan tygodnia/miesiąca) i zamienia je w propozycje do zatwierdzenia. Z kluczem AI trudniejsze wiadomości trafiają do Claude po stronie serwera. Choroba = powód, nie porażka; zmęczenie = najpierw woda, jedzenie, sen; bez diagnoz.
- **Akademia (opcjonalna).** 5 ścieżek: technika wokalna, teoria muzyki, flow i frazowanie, songwriting, analiza utworów (29 lekcji). Każda lekcja: wyjaśnienie, pojęcia, praktyka oparta na realnej muzyce (słuchanie, nauka fragmentu, rytm, intonacja, analiza) — nigdy sztuczne limity w stylu „napisz 8 wersów”; bezpieczeństwo głosu; źródła oznaczone „sprawdzone” / „do sprawdzenia” (`shared/catalog/sources.ts`). Ścieżki: zacznij, wstrzymaj, wznów, ukończ, wracaj. Postęp = lekcje oznaczone jako ukończone, nie czas.
- **Książki.** Prawdziwe tytuły dopasowane do ścieżek w toku; statusy Polecona → Kupiona → W trakcie czytania → Ukończona (+ Odłożona, Rezygnuję); brak procentów; termin orientacyjny i elastyczny; po ukończeniu propozycja kolejnej.
- **Projekty (opcjonalne).** Singiel/EP/album/kolekcja: nazwa, okładka (własne zdjęcie, kompresowane, synchronizowane — albo generowana), utwory z kolejnością, tekstami i notatkami. Bez zarządzania produkcją. Teksty nigdy nie trafiają do AI.
- **Skupienie.** Uczciwie: PWA nie może blokować aplikacji na iOS. PULSE trzyma ekran włączony w sesji, uruchamia skrót iOS użytkownika (`shortcuts://run-shortcut`), prowadzi przez Czas przed ekranem (Przestój, limity, kod) i Skupienie. Natywne blokowanie wymagałoby aplikacji iOS z Family Controls.
- **Statystyki (Rytm).** Mapa dni z muzyką, tygodnie w rytmie, przerwy i powroty, realizacja planu, sesje spontaniczne, postęp ścieżek, ukończone książki. Przypomnienia: najwyżej 2 na dobę, cisza w pracy, jedno spokojne przypomnienie o powrocie.

---

# Wersja 1 (historia)

Źródło: „PULSE — Master Brief dla Claude Code”, wersja 1.0, 25 października 2026, część B (pełna specyfikacja funkcji). Część A (polecenie wykonawcze) jest streszczona w `CLAUDE.md`.

## B0. Tożsamość, obietnica i filozofia

**PULSE — Twój osobisty system rozwoju kariery muzycznej.** Rok świadomego rozwoju — **365 dni**, które budują umiejętności, systematyczność, katalog utworów, własny styl i realne podstawy kariery artystycznej.

PULSE nie jest zwykłą listą zadań, kalendarzem, odtwarzaczem muzyki, biblioteką beatów ani uproszczoną aplikacją „habit tracker”. To połączenie **dyscypliny, inteligencji i elastyczności**:
- **Dyscyplina:** systematyczne tworzenie, również gdy chwilowo brakuje motywacji.
- **Inteligencja:** jasne uzasadnienie, czego uczyć się i dlaczego, na podstawie rzeczywistych danych.
- **Elastyczność:** miejsce na pracę zarobkową, relacje, odpoczynek, chorobę i spontaniczną wenę.

Główna zasada: **Nie musisz tworzyć codziennie. Musisz tworzyć konsekwentnie.** Aplikacja ma pomagać stawać się lepszym artystą, nie zamieniać sztuki w bezduszną tabelę. Nie gwarantuje sukcesu po roku; pomaga stworzyć warunki do mierzalnego rozwoju.

Docelowo interfejs po polsku, z architekturą gotową na lokalizację. Pierwsza wersja może być prywatnym narzędziem jednego artysty, ale model danych powinien bezpiecznie wspierać rozdzielenie kont, jeżeli produkt się rozwinie.

## B1. AI Mentor — mózg aplikacji

Mentor poznaje: gatunki i brzmienia, inspiracje, mocne/słabe strony, cele, dostępność, godziny pracy, historię sesji i treningów, książki, raportowane rezultaty, energię, motywację i sposób tworzenia. Nie jest chatbotem z generowanymi komplementami, tylko asystentem pomagającym podejmować konkretne decyzje.

Funkcje:
- Spersonalizowane, praktyczne rekomendacje treningów i proporcji pracy.
- Analiza nierównomiernego rozwoju; np. jeśli dużo ćwiczono flow, ale nie kończono utworów — zaproponuj tydzień skupiony na pełnym demie.
- Wykrywanie regularnie pomijanych kategorii i proponowanie alternatywnych metod treningu.
- Dobór lektur oraz łączenie ich z ćwiczeniami muzycznymi.
- Propozycje adaptacji harmonogramu i realistycznych tygodniowych celów.
- Podsumowania tygodniowe i miesięczne oparte na historii.
- Konwersacja naturalnym językiem, zrozumienie np. „wróciłem z pracy i jestem wykończony”.
- Rozróżnienie konkretnej obserwacji od hipotezy i subiektywnej opinii.

AI proponuje — użytkownik zachowuje kontrolę. Nie może udawać analizy audio, tekstu, poziomu umiejętności ani poprawy jakości, jeśli nie ma podstaw. Nie pisze automatycznie całych tekstów zamiast użytkownika.

## B2. Smart Planner — harmonogram życia

Trzy pełne widoki: **Dzień** (godziny), **Tydzień** (sesje i obciążenie), **Miesiąc** (cele, rozkład, obciążenie). Użytkownik może wprowadzać: zmiany w pracy i dojazdy; sesje muzyczne; ćwiczenia, czytanie i rozwój; aktywność promocyjną; sprawy prywatne, relacje, spotkania; aktywność fizyczną; sen, odpoczynek i regenerację.

Planer nie wypełnia każdej wolnej minuty. Uwzględnia bufor, energię, odpoczynek oraz realny czas, który pozostaje po obowiązkach. Przy 10 godzinach pracy planuje co najwyżej lekką sesję, gdy ma to sens, lub odpoczynek. W wolny dzień może proponować dłuższe tworzenie. Gdy użytkownik wyznaczy czas prywatny albo dzień wolny, nie narzuca obowiązków.

Po zmianie grafiku system ocenia priorytet, zależności i realną dostępność. Nie przenosi mechanicznie wszystkich zaległości na jutro. Proponuje skrócenie, zastąpienie lub przeniesienie mniej ważnego ćwiczenia. Ważne zmiany możliwe do podglądu, akceptacji i cofnięcia.

## B3. Discipline Engine — konsekwencja bez presji

Cele mają charakter tygodniowy: rozsądna liczba sesji i konkretnych rezultatów, nie konieczność codziennego logowania. Funkcje: adaptacyjne przypomnienia, monitorowanie realizacji, tygodnie konsekwencji, elastyczne cele, okresy regeneracji, motywacyjne podsumowania bez infantylnego chwalenia.

Seria regularności **nie powinna znikać przez jedno opuszczone popołudnie**. Urlop, zaplanowany odpoczynek, choroba lub ciężka praca nie są domyślnie „porażką”. Pokazuj metodę obliczania metryk i nie mieszaj liczby logowań z realną twórczością.

Tryb skupienia: sesja bez rozpraszaczy, opcjonalne przypomnienia i działania możliwe w PWA; docelowo natywne blokowanie wybranych aplikacji przez dostępne API iOS, w granicach zgód i ograniczeń systemu. Ważne komunikaty i bezpieczeństwo muszą pozostać dostępne zgodnie z możliwościami platformy. Nie gwarantuj nieodwracalnej blokady.

## B4. Creative Flow — wena ponad rutynę

Spontaniczne rozpoczęcie sesji bez harmonogramu ma być kluczową akcją (widoczny CTA). Rodzaje: tworzenie muzyki, nagrywanie, pisanie do beatu, flow, inspiracja, eksperyment, produkcja. Użytkownik wybiera lub szybko pomija kategorię, uruchamia timer, może pauzować, zakończyć i podać rezultat.

Przykład: użytkownik trafia na beat i tworzy przez 5 godzin. PULSE zapisuje realny czas oraz deklarowany rezultat (np. demo), uwzględnia tę pracę w statystykach i proponuje korektę tygodnia. Jeżeli sesja już realizuje planowany cel, podobne zadanie zostaje oznaczone jako pokryte, skrócone lub zastąpione — **bez podwójnego naliczania** i bez wymagania ponownej pracy.

Nie wymaga przesyłania audio. Użytkownik może opcjonalnie powiązać sesję z utworem, notatką lub projektem.

## B5. Music Training — realny rozwój muzyczny

To nie zbiór haseł „poćwicz pisanie”. Każde ćwiczenie ma konkretną metodę: cel, instrukcję, przybliżony czas, poziom, warunek ukończenia, rezultat, możliwość oceny trudności i feedback. Program ma progresję i reaguje na historię.

Kategorie:
- **Songwriting/storytelling:** metafory, narracja, zwrotki, refreny, puenty, przesłanie, spójność historii.
- **Flow/rytmika:** akcentowanie, pauzy, podziały rytmiczne, zmiany tempa frazowania i rytmu.
- **Melodyka/interpretacja:** melodie refrenów, intonacja, kontrast emocji, ekspresja, eksperyment z barwą.
- **Produkcja/aranżacja:** struktura, przejścia, dynamika, instrumentacja, podstawy świadomego brzmienia.
- **Analiza muzyki:** słuchanie i rozpoznawanie rozwiązań artystycznych, przekładanie wniosków na własne utwory.

**Nadrzędna zasada: teksty tworzone przede wszystkim na beatach, w DAW/przy komputerze.** Żadnych obowiązkowych codziennych ćwiczeń pisania „na sucho”. Krótkie spontaniczne notatki lub wersy w telefonie są opcjonalne.

Przykładowe realne zadania:
1. Otwórz własny beat. Napisz 8 wersów jednej historii, dbając o zmianę obrazu między początkiem i końcem; nagraj szkic.
2. Do tego samego beatu opracuj dwa warianty flow z innym rozmieszczeniem akcentów i pauz; zapisz, który lepiej niesie emocję.
3. Zbuduj 4–8 wersowy refren z jednym motywem przewodnim i melodycznym kontrastem względem zwrotki.
4. Wybierz fragment istniejącego utworu, rozłóż jego rytmikę na akcenty/pauzy, odtwórz technikę bez kopiowania charakterystycznego wykonania i przenieś ją na własny tekst oraz inny beat.
5. Po ćwiczeniu metafor stwórz refren, który konsekwentnie rozwija jedną metaforę zamiast listy niezwiązanych obrazów.

Jeśli ćwiczenie jest za łatwe, zwiększaj trudność; jeśli problem powraca — wracaj do fundamentów i zmieniaj metodę. Nie oceniać jakości na podstawie samego czasu.

## B6. Artist Development — własna tożsamość artystyczna

PULSE pomaga rozwijać autentyczny styl. Obecne inspiracje/założenia użytkownika: melancholijny i emocjonalny rap; gitarowe brzmienia w klimacie MGK i Linkin Park; teksty obrazowe, symboliczne, osobiste i refleksyjne; melodyjne refreny i przekaz; Opał i Gibbs jako punkty odniesienia dla jakości pisania oraz storytellingu.

Aplikacja nie ma uczyć kopiowania konkretnego artysty. Ma wydobywać techniki (obrazowanie, puenta, narracja, rytm, kontrast emocjonalny) i rozwijać własny charakter twórczy użytkownika. Może analizować **wyłącznie dostarczone przez użytkownika fragmenty**, opcjonalnie i za zgodą; wskazywać mocne/słabe strony z niepewnością i proponować zadania. Nie wydawać obiektywnych wyroków o sztuce.

## B7. Biblioteka książek, poezji i warsztatu

Mentor rekomenduje książki i poezję rozwijające wyobraźnię, pisanie, storytelling, analizę muzyki i kreatywność, z wyjaśnieniem **dlaczego konkretnie teraz**. Przykład: *Writing Better Lyrics* — Pat Pattison w kontekście obrazu i konstrukcji tekstu.

Statusy: **Planowana → Kupiona → Czytam → Przeczytana** (możliwość pominięcia kroku zakupu); osobne opcje odłożenia/zrezygnowania. Dla pozycji: autor, temat, cel nauki, sugerowany elastyczny termin, status, opcjonalny deklarowany postęp, notatki i ćwiczenie praktyczne po lekturze.

AI dobiera termin do objętości, czasu użytkownika i grafiku. Nie wymaga codziennego raportowania stron, nie udaje znajomości dokładnego postępu, nie nakłada kar po przekroczeniu terminu. Po przeczytaniu proponuje praktyczne ćwiczenie na beacie. Czytanie pomaga tworzyć muzykę, nie zastępuje muzyki.

## B8. Promotion Academy — rozwój kariery i publiczności

Program nauki: 1) marketing muzyczny i planowanie kampanii; 2) social media/content: TikTok, Instagram, YouTube, historia i prezentacja procesu twórczego; 3) strategia wydań: przygotowanie premier, dystrybucja, materiały, działania po premierze; 4) budowanie słuchaczy, społeczności i współprac; 5) analiza wyników publikacji i wyciąganie wniosków.

Promocja powinna rosnąć wraz z etapem rozwoju artysty. Jeśli brak gotowych utworów, skup się na podstawach i spójnym wizerunku zamiast wymagania codziennego publikowania. Jeśli użytkownik przygotowuje singiel, zaproponuj plan premiery z realnymi zadaniami, ale nie publikuj nic bez zatwierdzenia.

## B9. Pulse Care — energia i dobrostan

Szybkie sygnały: **Mam energię / Brak energii / Jestem chory / Jestem przeciążony**, plus naturalna rozmowa. Reakcja: zmniejszenie obciążenia, propozycja odpoczynku albo lekkiej sesji, realistyczna korekta celów. Przykład: „wróciłem z pracy i jestem wykończony” → najpierw regeneracja; ewentualny lekki trening tylko jako opcja.

Jeśli użytkownik zgłasza chorobę na kilka dni, dostosuj harmonogram i metryki bez automatycznej kary. Nie wymuszaj raportowania zdrowia, nie diagnozuj i nie zastępuj lekarza. Dane samopoczucia traktuj z należytą prywatnością.

## B10. Roadmap 365 — roczny program

Orientacyjne fazy, adaptowane do rzeczywistego progresu:
- **Miesiące 1–3 — Fundamenty:** regularność, diagnoza umiejętności, podstawy treningów.
- **Miesiące 4–6 — Warsztat:** songwriting, flow, melodyka, ekspresja, własny styl.
- **Miesiące 7–9 — Twórczość i publikacje:** kończenie utworów, przygotowanie premier, pierwszy rozwój publiczności.
- **Miesiące 10–12 — Kariera:** rezultaty, kolejne wydania, współprace, strategia na kolejny rok.

Fazy nie są sztywnym kalendarzem. Użytkownik dodaje własne cele, także poza muzyką, np. finansowe lub organizacyjne. Kamienie milowe rozkładają się na wykonalne kroki w planie. Roadmapa pokazuje rzeczywisty stan, a nie przyznaje osiągnięć za samo upłynięcie czasu.

## B11. Projects & Ideas — lekka organizacja muzyki

Nie buduj DAW ani biblioteki plików audio. Moduł może zawierać: tytuł utworu, roboczą nazwę, opis, etap (pomysł/szkic/demo/nagranie/miks/gotowy/wydany), notatki, inspiracje, datę ostatniej pracy, opcjonalną okładkę/link do pliku poza aplikacją. Powiązanie z sesjami i celami. Nie wymagaj przesyłania sesji FL Studio.

Jeśli kiedykolwiek powstanie analiza audio, ma być osobną opcjonalną funkcją z jawnie określoną wiarygodnością, nie fundamentem aplikacji.

## B12. Analytics — uczciwe statystyki

Przykładowe wskaźniki: łączny rzeczywisty czas twórczy w okresie; zrealizowane sesje i zobowiązania z jasnym mianownikiem; realizacja realnego planu tygodnia (nie arbitralny wynik AI); tygodnie utrzymanej regularności; trenowane umiejętności i ich częstotliwość; zakończone dema/utwory/cele; ukończone lektury i działania promocyjne.

Tygodniowy raport: wykonane, rozwijane umiejętności, napotkane przeszkody, realistyczna zmiana na kolejny tydzień. Raport miesięczny uwzględnia twórczość, pracę, regenerację i cele. **Godziny ćwiczeń to ilość pracy, a nie dowód wzrostu jakości.** Ocena jakości tylko z dostępnych materiałów lub deklaracji użytkownika.

## B13. Relacje, praca i równowaga

Czas z rodziną, partnerem/partnerką, znajomymi, hobby, sen, sport i odpoczynek to pełnoprawne elementy życia, nie „przeszkody”. Aplikacja nie powinna zajmować całej wolnej przestrzeni aktywnościami rozwojowymi. Gdy sobota jest prywatna, zaproponuj inne terminy tylko gdy są realne i nie naruszają regeneracji. Priorytetem jest rok utrzymywalnego postępu, a nie dwa tygodnie maksymalnej intensywności.

## B14. Szczegółowy UX i ekrany

**Start / Today:** dzisiejszy stan i energia (opcjonalnie), blok czasu, najważniejsza sesja, CTA „Rozpocznij sesję”, przycisk „Creative Flow”, zwięzły tygodniowy progres, jedna sensowna rada mentora. Bez ściany widgetów.

**Plan:** dzień/tydzień/miesiąc; odróżniaj pracę, regenerację, muzykę, książki, promocję; dodawanie i przenoszenie wydarzeń, widoczne konflikty, propozycje zmian, podgląd i cofnięcie.

**Twórz:** szybkie uruchomienie planowanej lub spontanicznej sesji, timer, typ aktywności, powiązanie z projektem, zakończenie i wynik; konkretne treningi do beatu; nie odciągaj od FL Studio.

**Rozwój:** ścieżki umiejętności, ćwiczenia, poziomy, biblioteka, rozwój stylu, wnioski z sesji.

**Kariera:** promocja, roadmapa 365, cele, nadchodzące premiery i praktyczne zadania dopasowane do etapu.

**Mentor:** dyskretny dostęp, rozmowa, obserwacje z dowodami, propozycje działań wymagające akceptacji; nie traktuj mentora jako ekranu z losowymi cytatami motywacyjnymi.

**Pulse Care, statystyki, ustawienia, projekty:** w logicznej architekturze informacji, nie wszystko na Home.

Przykładowy dzień — rano: grafik, priorytet, dostępny czas, plan, opcjonalne samopoczucie. W pracy: minimum powiadomień. Po pracy: realna regeneracja. Tworzenie: konkretne ćwiczenie lub swobodna sesja do własnego beatu w FL Studio. Po sesji: krótki zapis rezultatu i aktualizacja tygodnia. Wieczorem: opcjonalnie lektura, notatka, odpoczynek — bez „odhaczania” wszystkiego.

## B15. Co PULSE świadomie NIE robi

Nie jest Spotify, streamingiem, magazynem beatów ani DAW. Nie zmusza do pisania na sucho. Nie wymaga ręcznego logowania każdej minuty ani raportowania stron. Nie zabiera kontroli nad muzyką i nie generuje utworów zamiast artysty. Nie diagnozuje chorób. Nie udaje działania niedostępnych funkcji iOS. Nie mierzy jakości sztuki arbitralnym procentem. Nie obiecuje sukcesu po 365 dniach. Nie traktuje odpoczynku czy pracy zarobkowej jako porażki.

## B16. Ostateczne priorytety

1. **Systematyczność.** 2. **Inteligentny plan.** 3. **Rozwój artystyczny.** 4. **AI Mentor.** 5. **Budowanie kariery.** Element, który nie wspiera tych celów, nie zajmuje ważnego miejsca w interfejsie.

**Wizja końcowa:** po roku użytkownik jest bardziej świadomym i systematycznym artystą, który rzeczywiście ćwiczył, tworzył, kończył muzykę, poznawał techniki, czytał z sensem i stawiał konkretne kroki zawodowe — nie osobą z 365 zielonymi kratkami w kalendarzu.

## Obowiązkowe scenariusze testowe (z części A8)

- 10-godzinna zmiana: planer nie planuje długich treningów.
- Dzień wolny: plan nie wstawia obowiązków muzycznych.
- Nagła zmiana pracy: konflikt widoczny, sensowne przeniesienie bez kumulowania zaległości.
- Spontaniczne 5 h + demo: liczy się jako postęp, podobne zaplanowane zadanie nie jest dublowane.
- Choroba: harmonogram proponuje odpoczynek, regularność nie jest karana.
- Zapis sesji dwa razy nie podwaja czasu ani statystyk.
- Timer działa po zablokowaniu telefonu i powrocie do PWA.
- Postępy, statusy książek i projekty zostają po ponownym uruchomieniu.
- Brak udostępnionego tekstu: AI nie twierdzi, że zna jego jakość.
- Brak API AI: uczciwy stan integracji, reszta działa.
- Brak overflow, nieczytelnych elementów i martwych przycisków na typowym iPhonie.
