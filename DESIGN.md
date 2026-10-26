# PULSE — design system

## Wersja 4 — „Lakier” (obecna)
Koncept: osobiste studio nocą. Lakierowana czerń płyty, grafit sprzętu, światło lampy nad gramofonem. Motywy muzyczne pełnią funkcję, nie dekorują: **winyl jest timerem**, rowki to tygodnie, diody VU to sesje tygodnia, „playhead” to teraz w planie, pady to dni miesiąca.

**Paleta** (`src/styles/tokens.css`, nazwy zmiennych zachowane z v1–v3, więc każdy ekran dziedziczy):
| Nazwa | Hex | Rola |
|---|---|---|
| Lakier `--ink-0` | `#09080C` | tło |
| Grafit `--ink-1…4` | `#121116` → `#2C2935` | arkusze, kontrolki, wciśnięcie |
| Rowek `--line` | `#1F1D26` | linie list |
| Papier etykiety `--text` | `#EEEAF4` (+ `#AAA4B8`, `#7B7689`) | tekst |
| Ultrafiolet `--violet` | `#8B6CFF` | to, co żywe i klikalne: akcja, postęp, „teraz” |
| Wskazówka VU `--vu` | `#E9B872` | nauka, dni chronione, przekroczony zamiar, pauza |

**Typografia:** Bodoni Moda (didona jak z okładki płyty; z osią optical size) dla tytułów ekranów, nagłówka dnia, timera, liczb i tytułów książek — nigdy poniżej ~20 px. Onest dla całego interfejsu i treści. Bez wersalików w etykietach, bez monospace, cyfry timera w stałej szerokości (`TimerDigits`), żeby nie skakały.

**Fotografia:** 9 zdjęć (studio nocą, mikrofon, klawisze, słuchawki, pisanie nocą, konsoleta, zaparowana szyba, regał z książkami, gramofon) w `public/photos/`, wszystkie przepuszczone przez ten sam duotone (lakier → ultrafiolet → papier, 14% oryginalnego koloru, lekkie ziarno), żeby brzmiały jak jedna sesja zdjęciowa, a nie stock. Zdjęcie Start można zamienić w Profilu na generowane miasto nocą albo własne zdjęcie (tylko na urządzeniu). Źródła i licencje — niżej.

**Promienie:** 4 (tagi, kalendarz) · 12 (kontrolki) · 18 (wyróżniona powierzchnia) · 26 (arkusze) · koło (płyty, przyciski transportu).

**Komponenty sygnaturowe:**
- `Turntable` (`src/ui/Turntable.tsx`): talerz obraca się z prawdziwą prędkością 33⅓ obr./min (1,8 s/obrót) z bezwładnością (Web Animations, rozpędzanie 0,7 s, wybieg 1,3 s); ramię prowadzi igłę od zewnętrznego rowka do wybiegu wraz z postępem do zamierzonej długości, przy pauzie się unosi; po przekroczeniu zamiaru łuk zmienia kolor na VU; odbicia stoją, gdy płyta się kręci; nadruk etykiety i znaczniki stroboskopu pokazują ruch. Dotknięcie płyty = pauza/wznowienie. Ten sam egzemplarz na Twórz animuje start (czas liczy się od dotknięcia).
- `slab` — główna akcja aplikacji (Start, Skupienie): płyta na fioletowej płycie przycisku.
- Klawisze długości z „lampką”, przełącznik segmentowy z przesuwanym suwakiem, przełącznik sprzętowy.
- Lampka zakładki: krótka ultrafioletowa linia jak podświetlony kanał na mikserze; zakładka Twórz to mała płyta, która kręci się w trakcie sesji.

**Ruch** (tokeny: 120 ms nacisk · 220 ms zmiana stanu · 420 ms wejście · 460 ms arkusz · 1,8 s obrót): jeden zorchestrowany moment na ekranie (wejście zdjęcia Start, rysowanie rowków rytmu, kolejne ścieżki Akademii), reszta odpowiada na dotyk (wciśnięcie, arkusz, przesunięcie suwaka, ruch igły, potrząśnięcie złej odpowiedzi w quizie). Przejścia ekranów przez View Transitions. `prefers-reduced-motion`: bez obrotów, przejść i animacji wejścia.

**Responsywność:** testowane 320 / 375 / 390 / 430 px (E2E pilnuje braku poziomego przewijania na 17 ekranach w trzech szerokościach); safe areas w nagłówkach, pasku i arkuszach; `100dvh/svh`; pola ≥ 16 px; `scroll-padding-bottom` pod pasek zakładek; elementy siatek z `min-width: 0`.

**Pliki stylów:** `tokens` → `base` (ziarno, typografia) → `ui` (komponenty) → `app` (powłoka, pasek, przejścia) → obszary: `create` (gramofon, Twórz, sesja, projekty), `today`, `plan`, `learn` (Akademia, quiz, Biblioteka), `rest` (Ty, Rytm, Skupienie, Towarzysz, Samopoczucie, Profil, logowanie, onboarding).

**Źródła zdjęć** (licencje pozwalają na użycie komercyjne i modyfikację bez przypisania; zdjęcia są przetworzone):
- Pexels (Pexels License): mikrofon `31050644`, konsoleta nocą `1436141`, gramofon `5118434`.
- Burst by Shopify (licencja Burst): `studying-alone` (studio nocą), `close-up-piano-keyboard-keys`, `black-and-white-black-headphones`, `introspective-journaling`, `foggy-window`, `antique-books-on-shelves`.


## Wersja 3 — „płyta” (historyczna)
Koncept: tydzień to rowki płyty, sesja to obracający się krążek. Jeden znak rozpoznawczy na ekran, reszta cicha.
- **Pierścień rytmu** (`src/ui/Rhythm.tsx`, ekran Dziś): 4 tygodnie jako 4 rowki (zewnętrzny = ten tydzień, poniedziałek u góry). Każdy łuk to dzień; jasność = realny czas muzyki, piasek = dzień chroniony (choroba/urlop/wolne), błękit = plan. Rysuje się raz po starcie aplikacji (jedyna animacja nie wywołana akcją).
- **Krążek startu** (Twórz) i **krążek sesji**: winyl z rowkami; obraca się tylko, gdy czas biegnie (stop przy pauzie), łuk postępu do wybranej długości; po przekroczeniu zamiaru łuk zmienia kolor na piaskowy (bez alarmu). Ikona Twórz w pasku to mała płyta, która kręci się podczas trwającej sesji.
- **Nawigacja:** Dziś · Plan · Twórz · Nauka · Ty. Przejścia View Transitions: zakładki przesuwają się w kierunku zakładki, szczegóły wjeżdżają z prawej; pasek zakładek wyłączony z animacji.
- **Kolor:** granat nocy jak w v2; fiolet tylko dla „na żywo” i postępu; nowy akcent **piasek `#E8C39A`** dla nauki, bezpieczeństwa głosu i dni chronionych; 8 tonów (`--tone-0…7`) dla workflow, ścieżek i okładek. Przycisk główny prawie płaski, bez poświaty; aktywny segment szary, nie fioletowy.
- **Typografia:** Unbounded dla tytułów i liczb, Onest dla treści; lekcje 17 px, interlinia 1.62, ≤ 62 znaki.
- **Okładki projektów:** zdjęcie użytkownika albo generowana „koperta” z rowkami w tonie projektu.
- Ograniczony ruch: `prefers-reduced-motion` wyłącza obrót płyt, rysowanie pierścienia i przejścia.


## Wersja 2 (na podstawie referencji użytkownika)
Kierunek: nocne studio — sylwetka artysty w kapturze ze słuchawkami przy monitorze z DAW, miasto za oknem, fioletowa poświata. W odróżnieniu od referencji (ilustracje AI) scena jest **generowana kodem** (`src/ui/NightScene.tsx`): panorama miasta jest unikalna dla konta (seed = id użytkownika), niebo zmienia się z porą dnia (świt / dzień / zmierzch / noc), do wyboru „zawsze noc”, „deszcz” albo własne zdjęcie przechowywane tylko na urządzeniu. Scena występuje na Start, Twórz (bez postaci — puste biurko czeka), w sesji (przygaszona) i w Profilu.
- Okładki ćwiczeń i projektów: generowane fale w barwie obszaru (`Cover`), książki: typograficzne okładki (`BookCover`) — bez zdjęć stockowych.
- Karty „szkło nocy” z delikatnym fioletowym gradientem u góry; przyciski główne z gradientem i poświatą; aktywne zakładki i segmenty wypełnione fioletem.
- Sesja: kafelki typów, timer z animowaną falą (canvas, statyczna przy reduced motion), sterowanie −10 min / pauza / zakończ.
- Zamiast cytatu motywacyjnego na Start: pierwsze zdanie **Twojej wizji** z Profilu.
- Świadome odstępstwa od referencji: brak udawanego blokowania aplikacji (uczciwa karta w Ustawieniach), procenty w mapie rocznej i Promocji liczone z danych.

## Koncepcja (v1)
**Puls jako struktura, nie dekoracja.** Jedynym „głośnym” elementem jest linia pulsu: na Start to rytm tygodnia (każdy wyskok to realny czas twórczy danego dnia, przerywane wyskoki to plan, przyciemnione pola to dni chronione), w sesji — bijący znacznik timera, w marce — znak przy logotypie. Wszystko inne jest ciche: głęboki granat, typografia, cienkie linie podziału.

Aplikacja ma przypominać studyjne narzędzie pracy o północy, a nie dashboard SaaS: listy z liniami zamiast siatek identycznych kart, jedna wyróżniona powierzchnia na ekran (najważniejsza rzecz teraz), fiolet tylko dla akcji i postępu.

## Kolor (`src/styles/tokens.css`)
| Token | Hex | Rola |
|---|---|---|
| `--ink-0` | `#05070F` | tło aplikacji (granatowa czerń, nie szarość) |
| `--ink-1/2/3` | `#0A0F1E` / `#10172B` / `#19213C` | powierzchnie, arkusze, kontrolki |
| `--line` | `#1D2645` | linie podziału list |
| `--text` / `--text-2` / `--text-3` | `#EEF0FA` / `#A5ACCA` / `#6D7598` | tekst główny / pomocniczy / trzeciorzędny |
| `--violet` | `#8E6BFF` | Electric Violet — akcja główna, postęp, twórczość |
| `--blue` | `#4CB6FF` | Pulse Blue — czas, plan, wolne okna, lektury |
| `--ok` / `--warn` / `--danger` | `#49D5A4` / `#FFB648` / `#FF5D73` | zrobione / konflikt, przeciążenie / choroba, usuwanie |

Kategorie kalendarza (`--k-*`): praca — łupek (`#7B86AD`, życie, nie wróg), muzyka — fiolet, trening — jasny fiolet, czytanie — błękit, promocja — bursztyn, relacje/prywatne — róż, ruch — zieleń, odpoczynek — indygo. Stały grafik rysowany jest kreskowaniem, by odróżnić go od pojedynczych wydarzeń.

Kontrast: `--text-2` na `--ink-0` ≈ 8:1, `--text-3` używany tylko do informacji drugorzędnych (≈ 4.3:1, rozmiar ≥ 12px).

## Typografia
- **Unbounded** (variable, self-hosted) — tytuły ekranów, nagłówek dnia, timer, liczby na wykresach. Szeroka, rytmiczna — charakter marki.
- **Onest** (variable, self-hosted) — cały tekst interfejsu. Pełne wsparcie polskich znaków.
- Skala: 12 / 13 / 16 / 17 / 20 / 25 / 31 / 44 px. Treść ≥ 16px w polach (brak zoomu iOS). Liczby `tabular-nums`.
- Bez etykiet wersalikami, bez tracked-out eyebrow, bez monospace jako „ozdoby danych”.
- Czasy w tekście z twardą spacją (`3 h`), żeby nie łamały się w nagłówkach.

## Odstępy, promienie, głębia
- Siatka 4px (`--s-1…--s-12`), margines boczny 20px, maks. szerokość treści 640px.
- Promienie według hierarchii: 6 (bloki kalendarza, tagi), 10 (przyciski, pola), 14 (callouty), 22 (wyróżniona powierzchnia, arkusze).
- Głębia: światło od góry (`--edge` — 1px wewnętrzny highlight) i ciemny cień tylko dla elementów pływających (arkusze, toasty). Bez szarych cieni pod kartami, bez szkła poza paskiem nawigacji.

## Ruch (`--ease-out`, 140/220/420 ms)
- Jeden zorchestrowany moment na ekranie: rysowanie linii pulsu na Start i na ekranie logowania.
- Ruch odpowiadający na akcję: arkusz wysuwa się z dołu, toast unosi się, przycisk lekko się wciska (`scale .97`), kropka sesji „bije”.
- `prefers-reduced-motion`: wszystkie animacje wyłączone, linia rysowana od razu.

## Komponenty (`src/ui/kit.tsx`, `src/styles/ui.css`)
Button (primary/secondary/ghost/quiet/danger; sm/md/lg), IconButton (44×44), Sheet (bottom sheet, focus na dialogu, Esc, tło zamyka), Segmented, Chip (aria-pressed), Field/Toggle (switch), Row (lista z linią), Meter, Empty, Toast z akcją „Cofnij”, Confirm. Ikony: własny zestaw 24px, kreska 1.75 (`src/ui/Icon.tsx`).

## Wzorce
- **Ekran = tytuł + jedna wyróżniona rzecz + listy.** Sekcje opisane krótkim nagłówkiem w zdaniu.
- **Uczciwe stany:** puste („Pierwsza zapisana sesja pojawi się tutaj”), offline (ikona synchronizacji z licznikiem zmian), niedostępne integracje (callout z powodem), propozycje (podgląd → Zastosuj/Odrzuć → Cofnij w historii).
- **Dotyk:** min. 44px, akcje główne w dolnej połowie ekranu, pasek zakładek z wyróżnionym „Twórz”.
- **iPhone:** `viewport-fit=cover`, safe-area w nagłówkach, pasku i arkuszach, `100dvh`, pola ≥16px.
- **Copy:** neutralne płciowo, konkretne czasowniki („Zapisz sesję”, „Zastosuj”), błędy mówią co się stało i co zrobić.

## Ekrany
Start (odpowiedź na „co dziś, kiedy mam czas, jak zacząć”) · Plan (dzień: oś czasu z wolnymi oknami; tydzień: pasy obciążenia; miesiąc: mapa intensywności) · Twórz (Creative Flow, sesja pełnoekranowa, zapis rezultatu) · Rozwój (5 obszarów, ćwiczenia, biblioteka, styl, statystyki) · Kariera (Roadmapa 365, cele, Promotion Academy, premiery) · Mentor (pełny ekran, dostęp z nagłówka Start) · Pulse Care · Ustawienia · Projekty.
