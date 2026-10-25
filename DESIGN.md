# PULSE — design system

## Koncepcja
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
