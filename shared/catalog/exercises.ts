import type { SkillCategory } from '../schema';

export interface Exercise {
  id: string;
  category: SkillCategory;
  level: 1 | 2 | 3 | 4;
  /** Exercises sharing a method are interchangeable when one keeps failing. */
  method: string;
  title: string;
  goal: string;
  steps: string[];
  minutes: number;
  done_when: string;
  output: string;
  needs_beat: boolean;
}

export const CATEGORY_LABEL: Record<SkillCategory, string> = {
  songwriting: 'Songwriting i storytelling',
  flow: 'Flow i rytmika',
  melody: 'Melodyka i interpretacja',
  production: 'Produkcja i aranżacja',
  analysis: 'Analiza muzyki',
};

export const CATEGORY_SHORT: Record<SkillCategory, string> = {
  songwriting: 'Tekst',
  flow: 'Flow',
  melody: 'Melodia',
  production: 'Produkcja',
  analysis: 'Analiza',
};

export const LEVEL_LABEL: Record<number, string> = {
  1: 'Fundamenty',
  2: 'Warsztat',
  3: 'Świadoma technika',
  4: 'Domykanie',
};

export const EXERCISES: Exercise[] = [
  // ── Songwriting ─────────────────────────────────────────────
  {
    id: 'sw-image-shift', category: 'songwriting', level: 1, method: 'scene', minutes: 45, needs_beat: true,
    title: 'Zmiana obrazu w 8 wersach',
    goal: 'Nauczyć się prowadzić historię ruchem obrazu, a nie deklaracją emocji.',
    steps: [
      'Otwórz własny beat w FL Studio i zapętl 8 taktów.',
      'Wybierz jedną konkretną scenę: miejsce, porę dnia, jeden przedmiot.',
      'Wersy 1–4: opisz scenę na początku. Wersy 5–8: ten sam obraz po zmianie — coś się stało, ale tego nie nazywasz.',
      'Nagraj szkic na dowolnym mikrofonie, bez poprawiania.',
      'Odsłuchaj: czy ktoś obcy zauważy zmianę bez wyjaśnienia?',
    ],
    done_when: '8 wersów napisanych do beatu i jeden nagrany szkic.',
    output: 'Szkic zwrotki z wyraźną zmianą obrazu.',
  },
  {
    id: 'sw-concrete-nouns', category: 'songwriting', level: 1, method: 'scene', minutes: 40, needs_beat: true,
    title: 'Emocja bez nazywania emocji',
    goal: 'Zastąpić abstrakcyjne słowa („smutek”, „ból”) konkretem, który słuchacz zobaczy.',
    steps: [
      'Wybierz jedno uczucie, ale nie wolno Ci go nazwać w tekście.',
      'Na beacie napisz 8 wersów wyłącznie z przedmiotów, gestów, dźwięków i miejsc.',
      'Podkreśl każde słowo abstrakcyjne i zamień je na rzecz, którą da się sfotografować.',
      'Nagraj szkic i zapisz, który obraz niesie emocję najmocniej.',
    ],
    done_when: '8 wersów bez nazwanej emocji, nagrany szkic.',
    output: 'Fragment zwrotki zbudowany na konkretach.',
  },
  {
    id: 'sw-punchline-setup', category: 'songwriting', level: 2, method: 'punchline', minutes: 45, needs_beat: true,
    title: 'Puenta z przygotowaniem',
    goal: 'Budować oczekiwanie przez 3 wersy i odwracać je w czwartym.',
    steps: [
      'Na beacie napisz 3 wersy, które budują jedno założenie lub obraz.',
      'Napisz 3 różne wersy-puenty, które zmieniają znaczenie poprzednich.',
      'Zarapuj wszystkie trzy warianty i wybierz ten, który działa bez tłumaczenia.',
      'Powtórz cykl jeszcze raz z innym obrazem.',
    ],
    done_when: 'Dwa czterowiersze z wybraną puentą, nagrane.',
    output: 'Dwie puenty gotowe do użycia w utworze.',
  },
  {
    id: 'sw-one-metaphor-hook', category: 'songwriting', level: 2, method: 'metaphor', minutes: 60, needs_beat: true,
    title: 'Refren na jednej metaforze',
    goal: 'Rozwinąć jedną metaforę konsekwentnie zamiast listy niezwiązanych obrazów.',
    steps: [
      'Wybierz jedną metaforę przewodnią (np. „dom jako statek, który tonie”).',
      'Wypisz 10 słów z jej świata (dla statku: kadłub, kotwica, przechył…).',
      'Na beacie zbuduj refren 4–8 wersów, w którym każdy obraz należy do tego świata.',
      'Sprawdź każdy wers: czy wychodzi poza metaforę? Jeśli tak — przepisz.',
      'Nagraj refren w dwóch tempach frazowania.',
    ],
    done_when: 'Refren 4–8 wersów spójny z jedną metaforą, nagrany.',
    output: 'Refren gotowy do dalszej pracy.',
  },
  {
    id: 'sw-pov-switch', category: 'songwriting', level: 2, method: 'scene', minutes: 60, needs_beat: true,
    title: 'Ta sama historia z dwóch stron',
    goal: 'Pogłębić narrację przez zmianę perspektywy.',
    steps: [
      'Zwrotka 1 (8 wersów): historia z Twojej perspektywy.',
      'Zwrotka 2 (8 wersów): ta sama sytuacja oczami drugiej osoby albo przedmiotu z zwrotki 1.',
      'Zachowaj jeden wspólny szczegół w obu zwrotkach — niech znaczy coś innego.',
      'Nagraj obie zwrotki na tym samym beacie.',
    ],
    done_when: 'Dwie zwrotki po 8 wersów z jednym wspólnym szczegółem.',
    output: 'Dwie zwrotki do jednego utworu.',
  },
  {
    id: 'sw-motif-callback', category: 'songwriting', level: 3, method: 'metaphor', minutes: 60, needs_beat: true,
    title: 'Motyw powracający',
    goal: 'Domykać utwór obrazem, który wraca z nowym znaczeniem.',
    steps: [
      'Weź istniejący szkic lub zacznij nowy na własnym beacie.',
      'Wybierz obraz z pierwszego wersu utworu.',
      'Napisz ostatni wers utworu tak, aby ten sam obraz wrócił, ale znaczył coś innego.',
      'Sprawdź, czy środek utworu uzasadnia tę zmianę — dopisz 2–4 wersy, jeśli nie.',
    ],
    done_when: 'Pierwszy i ostatni wers połączone motywem, uzasadnionym w środku.',
    output: 'Utwór z klamrą narracyjną.',
  },
  {
    id: 'sw-full-arc', category: 'songwriting', level: 3, method: 'structure', minutes: 90, needs_beat: true,
    title: 'Łuk całego utworu',
    goal: 'Planować historię na poziomie utworu, nie pojedynczych wersów.',
    steps: [
      'Zanim napiszesz tekst: w jednym zdaniu zapisz, co się zmienia od początku do końca.',
      'Rozpisz: zwrotka 1 = sytuacja, refren = sedno, zwrotka 2 = konsekwencja lub zwrot.',
      'Napisz refren tak, by po zwrotce 2 brzmiał inaczej niż po zwrotce 1.',
      'Napisz pełną zwrotkę 1 i refren na beacie, zwrotkę 2 rozpisz w punktach.',
      'Nagraj zwrotkę 1 i refren.',
    ],
    done_when: 'Zdanie-oś utworu, zwrotka 1, refren i plan zwrotki 2.',
    output: 'Szkielet całego utworu.',
  },
  {
    id: 'sw-cut-30', category: 'songwriting', level: 4, method: 'editing', minutes: 60, needs_beat: true,
    title: 'Redakcja: wytnij 30%',
    goal: 'Nauczyć się skracać i zastępować ogólniki konkretem.',
    steps: [
      'Weź istniejącą zwrotkę lub cały szkic.',
      'Zaznacz wersy, które tylko wypełniają takt albo powtarzają myśl — wytnij ok. 30%.',
      'Każdy ogólnik („serce”, „ból”, „noc”) zastąp konkretem albo usuń.',
      'Nagraj starą i nową wersję na tym samym beacie i porównaj.',
    ],
    done_when: 'Nowa wersja nagrana obok starej.',
    output: 'Zredagowana zwrotka.',
  },

  // ── Flow ────────────────────────────────────────────────────
  {
    id: 'fl-accent-map', category: 'flow', level: 1, method: 'accents', minutes: 40, needs_beat: true,
    title: 'Mapa akcentów',
    goal: 'Świadomie kłaść akcentowane sylaby na werbel i stopę.',
    steps: [
      'Zapętl 4 takty własnego beatu, zaznacz, gdzie wpada werbel.',
      'Napisz lub weź 4 wersy i podkreśl w nich akcentowane sylaby.',
      'Ułóż frazę tak, aby najważniejsze sylaby padały na werbel.',
      'Nagraj, potem nagraj wersję z akcentami celowo przesuniętymi o pół uderzenia — porównaj.',
    ],
    done_when: 'Dwa nagrania tych samych 4 wersów z różnym położeniem akcentów.',
    output: 'Świadomie ułożone 4 takty.',
  },
  {
    id: 'fl-pauses', category: 'flow', level: 1, method: 'space', minutes: 35, needs_beat: true,
    title: 'Pauza jako narzędzie',
    goal: 'Używać ciszy do budowania napięcia przed ważnym słowem.',
    steps: [
      'Na 8 taktach beatu zacznij co drugi wers „po jedynce”, nie na raz.',
      'Przed najważniejszym wersem zostaw pełne uderzenie ciszy.',
      'Nagraj wersję gęstą (bez pauz) i wersję z pauzami.',
      'Zapisz, gdzie pauza najbardziej podbiła znaczenie.',
    ],
    done_when: 'Dwie nagrane wersje: gęsta i z pauzami.',
    output: 'Fragment z celowo rozmieszczonymi pauzami.',
  },
  {
    id: 'fl-two-variants', category: 'flow', level: 2, method: 'accents', minutes: 50, needs_beat: true,
    title: 'Dwa warianty flow jednego tekstu',
    goal: 'Zobaczyć, jak rozmieszczenie akcentów i pauz zmienia emocję.',
    steps: [
      'Weź 8 wersów, które już masz, i ten sam beat.',
      'Wariant A: flow gęsty, akcenty na werbel, mało pauz.',
      'Wariant B: inne rozmieszczenie akcentów, dłuższe pauzy, wersy zaczynane w innych miejscach taktu.',
      'Nagraj oba i zapisz, który lepiej niesie emocję i dlaczego.',
    ],
    done_when: 'Dwa nagrane warianty i jedno zdanie wniosku.',
    output: 'Wybrany wariant flow do utworu.',
  },
  {
    id: 'fl-triplet-switch', category: 'flow', level: 2, method: 'subdivision', minutes: 50, needs_beat: true,
    title: 'Przełączenie na triolę',
    goal: 'Opanować zmianę podziału rytmicznego w środku zwrotki.',
    steps: [
      'Na 8 taktach: takty 1–4 w szesnastkach, takty 5–6 w triolach, 7–8 powrót.',
      'Zmiana podziału musi wypaść na słowie, które coś znaczy.',
      'Ćwicz najpierw na „ta-ta” bez tekstu, potem z tekstem.',
      'Nagraj trzy podejścia, wybierz najczystsze.',
    ],
    done_when: '8 taktów z płynnym przełączeniem, nagrane.',
    output: 'Fragment ze zmianą podziału.',
  },
  {
    id: 'fl-half-double', category: 'flow', level: 2, method: 'subdivision', minutes: 40, needs_beat: true,
    title: 'Half-time i double-time',
    goal: 'Poszerzyć zakres tempa frazowania na tym samym beacie.',
    steps: [
      'Weź 4 wersy i jeden beat.',
      'Nagraj je w odczuciu half-time (frazy rozciągnięte, dużo miejsca).',
      'Nagraj je w double-time (dwa razy gęściej, ta sama treść + dopisane sylaby).',
      'Zapisz, w którym miejscu utworu każda wersja miałaby sens.',
    ],
    done_when: 'Dwa nagrania i notatka o zastosowaniu.',
    output: 'Dwie wersje tempa frazowania.',
  },
  {
    id: 'fl-deconstruct', category: 'flow', level: 3, method: 'transcription', minutes: 75, needs_beat: true,
    title: 'Rozbiór techniki, nie kopia',
    goal: 'Przenieść technikę rytmiczną z cudzego utworu na własny tekst i inny beat.',
    steps: [
      'Wybierz 4 takty z utworu, którego flow podziwiasz.',
      'Rozpisz sylaby na siatce szesnastek: gdzie akcenty, gdzie pauzy, gdzie rymy.',
      'Nazwij technikę jednym zdaniem (np. „rym wewnętrzny na 3 i ciszy przed 1”).',
      'Zastosuj tę technikę we własnych 4 wersach na innym beacie — bez naśladowania barwy i charakterystycznego wykonania.',
      'Nagraj swoją wersję.',
    ],
    done_when: 'Rozpisana siatka, nazwana technika, nagrane własne 4 takty.',
    output: 'Nowa technika w Twoim własnym wykonaniu.',
  },
  {
    id: 'fl-multis', category: 'flow', level: 3, method: 'rhyme', minutes: 60, needs_beat: true,
    title: 'Rymy wielosylabowe w środku wersu',
    goal: 'Budować spójność brzmieniową nie tylko na końcu wersu.',
    steps: [
      'Wybierz dwa słowa z rymem 3+ sylabowym.',
      'Napisz 8 wersów, w których rym pojawia się także w środku wersu, nie tylko na końcu.',
      'Sprawdź, czy sens nie ucierpiał przez rym — jeśli tak, przepisz.',
      'Nagraj na beacie.',
    ],
    done_when: '8 wersów z wewnętrznymi rymami wielosylabowymi, nagrane.',
    output: 'Fragment o gęstej strukturze rymów.',
  },
  {
    id: 'fl-pattern-break', category: 'flow', level: 4, method: 'space', minutes: 60, needs_beat: true,
    title: 'Ustal wzór i złam go',
    goal: 'Używać łamania schematu do podkreślenia sensu.',
    steps: [
      'Przez 3 wersy utrzymaj powtarzalny wzór rytmiczny.',
      'W 4. wersie złam go (pauza, zmiana podziału, przesunięcie) dokładnie na słowie-kluczu.',
      'Rozwiń to na 16 taktów, łamiąc wzór najwyżej 3 razy.',
      'Nagraj i oceń, czy każde złamanie ma powód.',
    ],
    done_when: '16 taktów z maksymalnie 3 celowymi złamaniami wzoru.',
    output: 'Zwrotka z kontrolowaną dynamiką rytmu.',
  },

  // ── Melody ──────────────────────────────────────────────────
  {
    id: 'me-hum-first', category: 'melody', level: 1, method: 'topline', minutes: 40, needs_beat: true,
    title: 'Melodia przed słowami',
    goal: 'Oddzielić szukanie melodii od pisania tekstu.',
    steps: [
      'Zapętl sekcję refrenu na beacie.',
      'Nagraj 5 pomysłów melodii po ok. 30 sekund — nucenie, „la-la”, sylaby bez sensu.',
      'Wybierz jeden pomysł i dopisz do niego słowa, zachowując rytm i kształt melodii.',
      'Nagraj wersję ze słowami.',
    ],
    done_when: '5 nagranych pomysłów i jeden refren ze słowami.',
    output: 'Melodia refrenu z pierwszym tekstem.',
  },
  {
    id: 'me-range', category: 'melody', level: 1, method: 'contrast', minutes: 35, needs_beat: true,
    title: 'Kontrast wysokości',
    goal: 'Odróżnić refren od zwrotki samą melodią.',
    steps: [
      'Zaśpiewaj lub zarapuj fragment zwrotki w niskim, wygodnym rejestrze.',
      'Refren zbuduj tak, by zaczynał się wyraźnie wyżej albo miał szerszy zakres.',
      'Nagraj przejście zwrotka → refren i sprawdź, czy kontrast słychać bez beatu.',
    ],
    done_when: 'Nagrane przejście zwrotka → refren z czytelnym kontrastem.',
    output: 'Szkic przejścia do refrenu.',
  },
  {
    id: 'me-hook-contrast', category: 'melody', level: 2, method: 'contrast', minutes: 60, needs_beat: true,
    title: 'Refren z kontrastem względem zwrotki',
    goal: 'Zbudować refren 4–8 wersów z jednym motywem przewodnim i melodycznym kontrastem.',
    steps: [
      'Ustal motyw przewodni refrenu jednym zdaniem.',
      'Zwrotka: gęściej, niżej, krótsze nuty. Refren: dłuższe samogłoski, wyżej, mniej słów.',
      'Napisz refren 4–8 wersów do beatu, powtarzając frazę-hook co najmniej dwa razy.',
      'Nagraj zwrotkę (choćby 4 wersy) + refren, porównaj energię.',
    ],
    done_when: 'Refren 4–8 wersów nagrany w kontekście zwrotki.',
    output: 'Refren gotowy do demo.',
  },
  {
    id: 'me-emotion-takes', category: 'melody', level: 2, method: 'interpretation', minutes: 40, needs_beat: true,
    title: 'Trzy emocje jednego fragmentu',
    goal: 'Poszerzyć zakres interpretacji tego samego tekstu.',
    steps: [
      'Weź 4 wersy, które już masz.',
      'Nagraj je trzy razy: zmęczenie, gniew, czułość.',
      'Zmieniaj dynamikę, tempo frazy, długość samogłosek — nie tylko głośność.',
      'Wybierz wersję, która najlepiej pasuje do treści, i zapisz dlaczego.',
    ],
    done_when: 'Trzy nagrane interpretacje i wybór z uzasadnieniem.',
    output: 'Świadomie wybrana interpretacja.',
  },
  {
    id: 'me-pitch-check', category: 'melody', level: 2, method: 'interpretation', minutes: 35, needs_beat: true,
    title: 'Kontrola intonacji',
    goal: 'Wyłapać miejsca, w których melodia się rozjeżdża.',
    steps: [
      'Nagraj refren trzy razy pod rząd.',
      'Odsłuchaj z beatem, a potem bez niego. Zaznacz momenty rozjazdu.',
      'Jeśli masz w DAW analizę wysokości (np. edytor pitch), użyj jej do potwierdzenia, nie do korekty.',
      'Przećwicz trudne miejsca wolniej i nagraj ponownie.',
    ],
    done_when: 'Lista problematycznych miejsc i poprawione nagranie.',
    output: 'Czystszy take refrenu.',
  },
  {
    id: 'me-guitar-topline', category: 'melody', level: 3, method: 'topline', minutes: 60, needs_beat: true,
    title: 'Topline na gitarowy beat',
    goal: 'Zbudować melodyjny refren w klimacie gitarowego, emocjonalnego rapu — po swojemu.',
    steps: [
      'Wybierz własny beat z gitarą jako motywem.',
      'Oprzyj melodię refrenu na długich, otwartych samogłoskach i rytmie gitary.',
      'Dograj dubel oktawę niżej albo szept pod refrenem.',
      'Porównaj z punktem odniesienia tylko pod kątem energii — nie kopiuj melodii.',
    ],
    done_when: 'Refren z dublem nagrany na gitarowym beacie.',
    output: 'Melodyjny refren z warstwą wokalną.',
  },
  {
    id: 'me-texture', category: 'melody', level: 3, method: 'interpretation', minutes: 45, needs_beat: true,
    title: 'Eksperyment z barwą',
    goal: 'Użyć zmiany barwy jako akcentu znaczeniowego.',
    steps: [
      'Wybierz jedno słowo lub frazę w utworze, która ma największy ciężar.',
      'Nagraj ją w 3 barwach: szept, pełny głos, falset/head voice lub przester.',
      'Zostaw tylko jedno miejsce z inną barwą — kontrast ma być rzadki.',
    ],
    done_when: 'Trzy warianty barwy i jeden wybrany w utworze.',
    output: 'Akcent barwowy w utworze.',
  },
  {
    id: 'me-prechorus', category: 'melody', level: 4, method: 'contrast', minutes: 60, needs_beat: true,
    title: 'Przedrefren jako napięcie',
    goal: 'Prowadzić słuchacza do refrenu rosnącą linią melodyczną.',
    steps: [
      'Między zwrotką a refrenem dopisz 2–4 wersy przedrefrenu.',
      'Melodia rośnie lub rytm się zagęszcza; ostatnie uderzenie przed refrenem zostaw puste.',
      'Nagraj zwrotka → przedrefren → refren i sprawdź, czy refren „ląduje” mocniej niż bez przedrefrenu.',
    ],
    done_when: 'Nagrane przejście z przedrefrenem i bez niego.',
    output: 'Przedrefren w utworze.',
  },

  // ── Production ──────────────────────────────────────────────
  {
    id: 'pr-structure-map', category: 'production', level: 1, method: 'arrangement', minutes: 45, needs_beat: true,
    title: 'Mapa struktury',
    goal: 'Zamienić pętlę w utwór z sekcjami.',
    steps: [
      'Rozpisz strukturę w taktach: intro, zwrotka, refren, zwrotka, refren, bridge, outro.',
      'Ułóż ją w playliście FL Studio.',
      'Każda sekcja ma różnić się od poprzedniej co najmniej jednym elementem.',
      'Wyeksportuj szybki bounce.',
    ],
    done_when: 'Pełna struktura w DAW, każda sekcja różna.',
    output: 'Aranżacja gotowa pod wokal.',
  },
  {
    id: 'pr-subtraction', category: 'production', level: 1, method: 'arrangement', minutes: 40, needs_beat: true,
    title: 'Aranżacja przez odejmowanie',
    goal: 'Robić miejsce na wokal zamiast dokładać elementy.',
    steps: [
      'W zwrotce wycisz 1–2 elementy, które konkurują z wokalem.',
      'W refrenie przywróć je albo dodaj jeden nowy.',
      'Porównaj z wersją pełną w każdej sekcji.',
    ],
    done_when: 'Zwrotka i refren różnią się gęstością.',
    output: 'Czytelniejsza aranżacja.',
  },
  {
    id: 'pr-transitions', category: 'production', level: 2, method: 'transitions', minutes: 50, needs_beat: true,
    title: 'Cztery przejścia',
    goal: 'Mieć zestaw sprawdzonych przejść między sekcjami.',
    steps: [
      'Przygotuj 4 przejścia zwrotka → refren: fill perkusyjny, riser/reverse, takt ciszy, filtr.',
      'Przetestuj każde w utworze.',
      'Zostaw jedno, zapisz pozostałe jako szablony.',
    ],
    done_when: '4 przygotowane przejścia, jedno użyte.',
    output: 'Biblioteka przejść.',
  },
  {
    id: 'pr-energy-curve', category: 'production', level: 2, method: 'dynamics', minutes: 45, needs_beat: true,
    title: 'Krzywa energii',
    goal: 'Projektować dynamikę całego utworu.',
    steps: [
      'Oceń energię każdej sekcji w skali 1–10 i narysuj krzywą.',
      'Drugi refren powinien mieć więcej energii niż pierwszy — dodaj element, który to zrobi.',
      'Sprawdź, czy bridge daje oddech przed finałem.',
    ],
    done_when: 'Krzywa energii zapisana, aranżacja dopasowana.',
    output: 'Utwór z przemyślaną dynamiką.',
  },
  {
    id: 'pr-guitar-layer', category: 'production', level: 2, method: 'arrangement', minutes: 60, needs_beat: true,
    title: 'Gitara jako motyw przewodni',
    goal: 'Zbudować charakter brzmienia wokół jednego instrumentu.',
    steps: [
      'Dodaj gitarę (nagraną, sample lub wtyczka) jako główny motyw.',
      'Zrób dwie ścieżki tej samej partii i rozłóż je w panoramie.',
      'W zwrotce uprość partię, w refrenie zagraj pełniej.',
    ],
    done_when: 'Motyw gitarowy w dwóch wersjach (zwrotka/refren).',
    output: 'Beat z gitarowym charakterem.',
  },
  {
    id: 'pr-reference', category: 'production', level: 3, method: 'dynamics', minutes: 45, needs_beat: true,
    title: 'Odsłuch referencyjny',
    goal: 'Ocenić balans szkicu na tle utworu odniesienia.',
    steps: [
      'Wstaw utwór referencyjny do projektu, wyrównaj głośność ze swoim szkicem.',
      'Porównaj: głośność wokalu względem beatu, ilość dołu, przestrzeń.',
      'Zapisz 3 wnioski i popraw jeden.',
    ],
    done_when: '3 zapisane wnioski i jedna wprowadzona poprawka.',
    output: 'Lepiej zbalansowany szkic.',
  },
  {
    id: 'pr-vocal-chain', category: 'production', level: 3, method: 'mixing', minutes: 60, needs_beat: true,
    title: 'Świadomy łańcuch wokalu',
    goal: 'Każdy procesor na wokalu ma mieć konkretny powód.',
    steps: [
      'Na ścieżce wokalu: filtr dolnoprzepustowy usuwający dudnienie, kompresja dla stabilności, de-esser.',
      'Reverb i delay ustaw jako wysyłki, nie inserty.',
      'Przy każdym procesorze zapisz jednym zdaniem, co słyszysz po włączeniu.',
      'Zapisz łańcuch jako preset.',
    ],
    done_when: 'Preset łańcucha wokalu z opisem powodów.',
    output: 'Własny punkt startowy miksu wokalu.',
  },
  {
    id: 'pr-finish-demo', category: 'production', level: 4, method: 'finishing', minutes: 120, needs_beat: true,
    title: 'Domknij demo',
    goal: 'Zamienić szkic w odsłuchiwalne demo.',
    steps: [
      'Wybierz jeden szkic z największym potencjałem.',
      'Dokończ strukturę i nagraj brakujące wokale — bez szukania perfekcji.',
      'Zrób prosty miks: poziomy, panorama, podstawowe efekty.',
      'Wyeksportuj demo i odsłuchaj je następnego dnia w innym miejscu.',
    ],
    done_when: 'Wyeksportowany plik demo całego utworu.',
    output: 'Kompletne demo.',
  },

  // ── Analysis ────────────────────────────────────────────────
  {
    id: 'an-structure-listen', category: 'analysis', level: 1, method: 'structure', minutes: 30, needs_beat: false,
    title: 'Słuchanie struktury',
    goal: 'Rozpoznawać budowę utworu ze słuchu.',
    steps: [
      'Wybierz utwór z gatunku, który tworzysz.',
      'Rozpisz sekcje z czasem i liczbą taktów.',
      'Zanotuj, co dokładnie zmienia się przy wejściu refrenu.',
      'Zastosuj jedną obserwację w najbliższej sesji na własnym beacie.',
    ],
    done_when: 'Rozpisana struktura i jedna obserwacja do zastosowania.',
    output: 'Notatka analityczna.',
  },
  {
    id: 'an-image-hunt', category: 'analysis', level: 1, method: 'lyrics', minutes: 45, needs_beat: true,
    title: 'Polowanie na obrazy',
    goal: 'Zrozumieć, jak dobrzy autorzy budują obraz w tekście.',
    steps: [
      'Weź tekst utworu, który cenisz za pisanie (np. Opał, Gibbs).',
      'Znajdź 5 obrazów i opisz funkcję każdego jednym zdaniem.',
      'Nazwij technikę, która je łączy.',
      'Na własnym beacie napisz 4 wersy tą techniką — z własną treścią.',
    ],
    done_when: '5 opisanych obrazów i 4 własne wersy.',
    output: 'Nowa technika obrazowania w praktyce.',
  },
  {
    id: 'an-story-map', category: 'analysis', level: 2, method: 'lyrics', minutes: 45, needs_beat: false,
    title: 'Mapa narracji',
    goal: 'Rozumieć, jak budowane jest napięcie w historii utworu.',
    steps: [
      'Wybierz utwór opowiadający historię.',
      'Zapisz: punkt wyjścia, zwrot, zakończenie — z cytatem wersu dla każdego.',
      'Opisz, jak autor opóźnia lub odsłania informację.',
      'Zastosuj ten sam schemat do szkicu własnej historii (w punktach).',
    ],
    done_when: 'Mapa narracji + plan własnej historii.',
    output: 'Szkielet narracji.',
  },
  {
    id: 'an-hook-anatomy', category: 'analysis', level: 2, method: 'structure', minutes: 50, needs_beat: true,
    title: 'Anatomia refrenu',
    goal: 'Rozłożyć skuteczny refren na mierzalne elementy.',
    steps: [
      'Wybierz refren, który zapada w pamięć.',
      'Zmierz: długość fraz, liczbę powtórzeń hooka, najwyższą nutę, słowo-klucz.',
      'Napisz własny refren z tą samą anatomią i zupełnie inną treścią.',
      'Nagraj go na własnym beacie.',
    ],
    done_when: 'Rozpisana anatomia i nagrany własny refren.',
    output: 'Refren zbudowany świadomie.',
  },
  {
    id: 'an-production-moves', category: 'analysis', level: 3, method: 'production', minutes: 45, needs_beat: true,
    title: 'Decyzje produkcyjne',
    goal: 'Przenosić rozwiązania aranżacyjne, a nie brzmienia.',
    steps: [
      'Wybierz utwór z gitarowym, emocjonalnym brzmieniem.',
      'Wypisz 5 decyzji aranżacyjnych (wejścia, wycofania, kontrasty) i dlaczego działają.',
      'Jedną z nich zastosuj we własnym beacie.',
    ],
    done_when: '5 decyzji opisanych, jedna wdrożona.',
    output: 'Rozwiązanie aranżacyjne we własnym beacie.',
  },
  {
    id: 'an-own-catalog', category: 'analysis', level: 3, method: 'self', minutes: 40, needs_beat: false,
    title: 'Analiza własnego katalogu',
    goal: 'Zauważyć własne powtarzające się nawyki.',
    steps: [
      'Przesłuchaj 3 własne szkice pod rząd.',
      'Zapisz, co się powtarza: tempa, tematy, rymy, rozpoczęcia wersów.',
      'Wybierz jeden nawyk do świadomej zmiany w następnej sesji.',
    ],
    done_when: 'Lista nawyków i jeden wybrany do zmiany.',
    output: 'Cel na następną sesję.',
  },
  {
    id: 'an-reading-to-beat', category: 'analysis', level: 2, method: 'self', minutes: 45, needs_beat: true,
    title: 'Z lektury na beat',
    goal: 'Zamienić przeczytaną technikę w praktykę muzyczną.',
    steps: [
      'Wybierz jedną technikę lub myśl z ostatnio czytanej książki.',
      'Zapisz ją jednym zdaniem jako regułę.',
      'Na własnym beacie napisz 8 wersów, które ją stosują.',
      'Nagraj i oceń, czy reguła coś zmieniła.',
    ],
    done_when: 'Reguła zapisana, 8 wersów nagranych.',
    output: 'Technika z książki w Twoim tekście.',
  },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
