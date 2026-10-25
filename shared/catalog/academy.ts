/**
 * Music Academy — optional, ordered learning paths.
 *
 * Content rules (see PULSE_SPEC.md → Akademia):
 * - theory must be correct and checkable in the listed sources;
 * - practice means real musical work: listening, singing along, learning a
 *   fragment of an existing song, rhythm and pitch drills — never invented
 *   writing quotas ("napisz 8 wersów…");
 * - learning a fragment of someone else's song is for practice only, never
 *   for releasing as one's own;
 * - vocal exercises are gentle; anything painful stops the exercise.
 */

export type PathKey = 'vocal' | 'theory' | 'flow' | 'writing' | 'analysis';

export interface Practice {
  title: string;
  minutes: number;
  steps: string[];
}

export interface Lesson {
  key: string;
  title: string;
  minutes: number;
  summary: string;
  body: string[];
  terms?: [string, string][];
  practice: Practice[];
  safety?: string;
  sources: string[];
}

export interface LearningPath {
  key: PathKey;
  title: string;
  short: string;
  tone: number;
  description: string;
  lessons: Lesson[];
}

const VOICE_SAFETY = 'Ćwicz bez bólu i bez forsowania. Ból, drapanie albo chrypka po ćwiczeniu = przerwa. Chrypka trwająca ponad 2 tygodnie to powód do wizyty u laryngologa lub foniatry — PULSE nie zastępuje nauczyciela śpiewu ani lekarza.';

export const PATHS: LearningPath[] = [
  {
    key: 'vocal', title: 'Technika wokalna', short: 'Głos', tone: 1,
    description: 'Oddech, rozgrzewka, intonacja, rejestry, emisja i interpretacja — dla kogoś, kto już śpiewa i rapuje, ale chce mieć więcej kontroli i mniej zmęczenia głosu.',
    lessons: [
      {
        key: 'vocal-breath', title: 'Oddech i podparcie', minutes: 20,
        summary: 'Skąd bierze się stabilny dźwięk i długa fraza — bez wciągania brzucha i podnoszenia ramion.',
        body: [
          'Głos to powietrze zamienione w drgania fałdów głosowych. Stabilność dźwięku zależy mniej od tego, ile powietrza nabierzesz, a bardziej od tego, jak równo je wypuszczasz. W pedagogice wokalnej nazywa się to zarządzaniem oddechem; w tradycji włoskiej — appoggio (podparcie).',
          'Praktycznie: wdech jest cichy i niski — rozszerzają się dolne żebra i okolice pasa, ramiona zostają spokojne. Podczas śpiewu klatka piersiowa nie zapada się od razu; żebra „opóźniają” powrót, dzięki czemu powietrze wychodzi równo. To nie jest napinanie brzucha ani spinanie mięśni.',
          'W rapie i melodyjnym rapie fraza bywa długa i gęsta. Problem zwykle nie leży w pojemności płuc, tylko w braku zaplanowanych miejsc na oddech. Dlatego częścią techniki jest decyzja, gdzie w tekście bierzesz powietrze.',
        ],
        terms: [
          ['Appoggio', 'Równowaga mięśni wdechowych i wydechowych podczas śpiewu, która pozwala wydychać powietrze równo.'],
          ['Fraza', 'Odcinek śpiewu lub rapu na jednym oddechu.'],
        ],
        practice: [
          { title: 'Równy wydech na „s”', minutes: 5, steps: [
            'Stań swobodnie, ramiona luźno. Spokojny wdech nosem — poczuj rozszerzenie dolnych żeber.',
            'Wypuszczaj powietrze na syczące „sss”, jak najrówniej, bez skoków głośności.',
            'Licz w myślach sekundy. Nie bij rekordów — chodzi o równość, nie o długość. 4–5 powtórzeń.',
          ] },
          { title: 'Mapa oddechów w znanym utworze', minutes: 15, steps: [
            'Wybierz zwrotkę utworu, który lubisz (np. coś z ulubionych inspiracji) i włącz ją kilka razy.',
            'Zapisz tekst i zaznacz ukośnikiem każde miejsce, w którym wykonawca bierze oddech.',
            'Zaśpiewaj lub zarapuj fragment razem z nagraniem, oddychając dokładnie w tych miejscach.',
            'Zauważ: oddechy często wypadają tuż przed mocnym akcentem, a nie na końcu każdego wersu.',
          ] },
        ],
        safety: VOICE_SAFETY,
        sources: ['miller1986', 'voice-hygiene'],
      },
      {
        key: 'vocal-warmup', title: 'Rozgrzewka ze słomką (SOVT)', minutes: 10,
        summary: 'Krótka, naukowo opisana rozgrzewka, która zmniejsza wysiłek fonacji przed sesją.',
        body: [
          'Ćwiczenia z półprzymkniętym traktem głosowym (ang. semi-occluded vocal tract, SOVT) polegają na wydawaniu dźwięku przez zwężone wyjście — słomkę, zamknięte usta („mmm”), wibrujące wargi. Częściowe zamknięcie podnosi ciśnienie w kanale głosowym, co ułatwia drgania fałdów przy mniejszym wysiłku.',
          'Najlepiej opisana forma to fonacja przez słomkę, rozwijana przez Ingo Titze i National Center for Voice and Speech. Zalecenie NCVS: krótkie serie po 2–5 minut, kilka razy dziennie, z płynnymi glissandami. Badanie kliniczne Kapsner-Smith i in. (2015) dotyczyło terapii — tu używamy tej metody jako łagodnej rozgrzewki.',
          'Rozgrzewka przed nagrywaniem nie musi być długa. Pięć minut słomki i kilka „syren” zrobi więcej niż pół godziny przypadkowych skal.',
        ],
        practice: [
          { title: 'Słomka: glissanda', minutes: 5, steps: [
            'Weź zwykłą słomkę do napojów. Usta szczelnie wokół słomki, policzki się nie wydymają.',
            'Wydaj dźwięk „u” przez słomkę na wygodnej wysokości, 3–4 sekundy.',
            'Rób płynne glissanda: z dołu do góry i z powrotem, w wygodnym zakresie, bez sięgania po skrajne dźwięki.',
            'Zaśpiewaj przez słomkę melodię refrenu, który znasz — potem od razu ten sam fragment bez słomki. Porównaj wysiłek.',
          ] },
          { title: 'Syreny na „ng”', minutes: 3, steps: [
            'Ułóż język jak w końcówce słowa „bank” („ng”) i przesuwaj dźwięk jak syrena, cicho.',
            'Nie pchaj głośności. Jeśli przy przejściu w górę dźwięk „łamie się”, to normalne — wróć do tego w lekcji o rejestrach.',
          ] },
        ],
        safety: VOICE_SAFETY,
        sources: ['ncvs-straw', 'kapsner2015'],
      },
      {
        key: 'vocal-pitch', title: 'Intonacja: trafić w dźwięk', minutes: 25,
        summary: 'Słyszeć, czy jesteś za wysoko czy za nisko, i poprawiać to bez Auto-Tune’a jako protezy.',
        body: [
          'Intonacja to trafianie w wysokość dźwięku. Najczęstsze problemy u osób samouczących się: zjeżdżanie w dół na końcu frazy (spadek podparcia), „podjeżdżanie” do dźwięku od dołu i fałszowanie na skokach melodii.',
          'Ucho uczy się porównując. Dlatego podstawą jest śpiew do stałego odniesienia: burdonu (długo brzmiącego dźwięku podstawowego tonacji) albo pojedynczego dźwięku z klawiatury. Tuner chromatyczny w telefonie pokazuje odchyłkę w centach (1/100 półtonu) — przydatny do sprawdzania, ale nie do śpiewania „na oko”.',
          'Auto-Tune i korekcja wysokości to narzędzia produkcyjne i element estetyki melodyjnego rapu. Działają lepiej, gdy materiał jest blisko celu — im czystsze wykonanie, tym bardziej naturalny efekt.',
        ],
        terms: [
          ['Burdon (dron)', 'Długo trzymany dźwięk lub akord, do którego dopasowujesz śpiew.'],
          ['Cent', 'Setna część półtonu; tunery pokazują odchyłkę w centach.'],
        ],
        practice: [
          { title: 'Śpiew do burdonu', minutes: 10, steps: [
            'Znajdź tonację beatu, na którym pracujesz (lekcja „Skale i tonacje” pomaga) albo wybierz dźwięk A na klawiaturze.',
            'Włącz burdon na tym dźwięku (w DAW: długi dźwięk syntezatora; w sieci są gotowe nagrania „drone”).',
            'Śpiewaj na „u” ten sam dźwięk, potem 3. i 5. stopień skali, wracając zawsze do podstawy. Słuchaj „dudnień” — znikają, gdy trafiasz.',
          ] },
          { title: 'Nagraj i porównaj fragment refrenu', minutes: 15, steps: [
            'Wybierz refren znanego utworu, który dobrze leży w Twojej skali.',
            'Nagraj się a cappella, a potem odsłuchaj razem z oryginałem albo przepuść przez tuner/analizator wysokości w DAW.',
            'Zaznacz 2 miejsca, w których odjeżdżasz najbardziej. Ćwicz tylko te dwa przejścia, wolniej, na „u”, a potem z tekstem.',
          ] },
        ],
        safety: VOICE_SAFETY,
        sources: ['omt', 'ableton-learning'],
      },
      {
        key: 'vocal-registers', title: 'Rejestry i przejścia', minutes: 25,
        summary: 'Dlaczego głos „łamie się” w górze i jak wygładzić przejście bez krzyku.',
        body: [
          'Rejestr to zakres dźwięków o podobnej barwie, wytwarzany podobnym ustawieniem krtani. W praktyce mówi się o rejestrze piersiowym (pełny, mówiony) i głowowym (lżejszy, cieńszy) oraz o brzmieniu mieszanym pomiędzy nimi. Badania nad głosem opisują to jako różne mechanizmy pracy krtani (oznaczane M1 i M2).',
          'Miejsce przejścia (passaggio) jest u każdej osoby trochę inne. „Pęknięcie” głosu nie jest błędem charakteru — to sygnał, że zmienia się mechanizm. Wygładza się je lekkością i małą głośnością, a nie dociskaniem dźwięku piersiowego coraz wyżej, co męczy głos.',
          'W rapie-rocku i emo-rapie efektowne są wysokie, mocne frazy. Bezpieczna droga do nich prowadzi przez stabilny środek skali i lekkie górne dźwięki, a dopiero potem przez dokładanie energii.',
        ],
        terms: [
          ['Passaggio', 'Obszar przejścia między rejestrami.'],
          ['Mix', 'Potoczne określenie brzmienia łączącego cechy rejestru piersiowego i głowowego.'],
        ],
        practice: [
          { title: 'Trel wargowy przez przejście', minutes: 8, steps: [
            'Wibruj wargami („brrr”, jak dziecko udające silnik). Jeśli wargi się nie ruszają, lekko podeprzyj policzki palcami.',
            'Na trelu rób glissando z wygodnego dołu przez miejsce, w którym głos zwykle się łamie, i z powrotem.',
            'Cicho. Celem jest płynność, nie głośność.',
          ] },
          { title: 'Fragment z wysokim refrenem — wersja lekka', minutes: 15, steps: [
            'Wybierz utwór z wysoko śpiewanym refrenem (w rapie-rocku łatwo o taki przykład).',
            'Zaśpiewaj refren o połowę ciszej niż w oryginale i na sylabach „nu” zamiast tekstu.',
            'Dopiero gdy przejście jest płynne, wróć do tekstu, wciąż cicho. Głośność dokładaj stopniowo w kolejnych dniach.',
          ] },
        ],
        safety: VOICE_SAFETY,
        sources: ['henrich2006', 'miller1986'],
      },
      {
        key: 'vocal-diction', title: 'Emisja i dykcja przy mikrofonie', minutes: 20,
        summary: 'Wyraźny tekst w szybkim flow i nośny głos bez krzyczenia.',
        body: [
          'Zrozumiałość tekstu w rapie zależy głównie od spółgłosek: ich wyrazistość niesie rytm. Samogłoski niosą wysokość i barwę — w śpiewanych fragmentach to na nich trzyma się dźwięk.',
          'Nośność to nie głośność. Nośny głos wynika z rezonansu (przednie ułożenie dźwięku, swobodna szczęka) i z dobrego podparcia. Krzyk zwykle oznacza docisk w krtani i szybko męczy.',
          'Przy mikrofonie odległość jest częścią interpretacji: bliżej — intymnie i więcej basu (efekt zbliżeniowy mikrofonów kierunkowych), dalej — więcej powietrza i przestrzeni. Głośne frazy warto odsunąć od mikrofonu zamiast ściszać emocję.',
        ],
        practice: [
          { title: 'Spółgłoski w tempie', minutes: 8, steps: [
            'Weź 4 takty zwrotki, którą znasz na pamięć (własnej albo cudzej do nauki).',
            'Powiedz tekst szeptem w tempie utworu, wyraźnie artykułując spółgłoski — szept nie pozwala „przykryć” ich głosem.',
            'Potem pełnym głosem. Zwykle tekst staje się wyraźniejszy bez dokładania głośności.',
          ] },
          { title: 'Odległość od mikrofonu', minutes: 10, steps: [
            'Nagraj tę samą frazę trzy razy: 5 cm, 15 cm i 30 cm od mikrofonu, z tą samą emocją.',
            'Porównaj barwę i ilość basu. Zdecyduj, która odległość pasuje do zwrotki, a która do refrenu.',
          ] },
        ],
        safety: VOICE_SAFETY,
        sources: ['miller1986', 'connor2018'],
      },
      {
        key: 'vocal-interpretation', title: 'Interpretacja i dynamika', minutes: 25,
        summary: 'Jak sprawić, żeby emocja tekstu była słyszalna w głosie — świadomie, a nie przypadkiem.',
        body: [
          'Interpretacja to decyzje: gdzie ciszej, gdzie mocniej, gdzie głos jest „na powietrzu”, a gdzie twardy; które słowo wydłużyć, gdzie zrobić pauzę. Emocjonalny rap działa dzięki kontrastom — refren mocniejszy od zwrotki, pojedyncze słowo wypowiedziane prawie szeptem.',
          'Chrypka, „brud” i przester w głosie są w rapie-rocku środkiem wyrazu. Ich bezpieczne wykonywanie wymaga techniki, której nie da się rzetelnie nauczyć z aplikacji — jeśli to ważna część brzmienia, warto skonsultować ją z nauczycielem śpiewu. Część tego efektu można też uzyskać produkcyjnie (saturacja, distortion na śladzie).',
          'Dobra praktyka: osobno planuj interpretację leadu, a osobno warstw (dublujących, harmonii, ad-libów). Lead niesie tekst, warstwy — szerokość i energię.',
        ],
        practice: [
          { title: 'Mapa dynamiki cudzego utworu', minutes: 15, steps: [
            'Wybierz utwór, którego emocja Cię przekonuje (np. z inspiracji: Linkin Park, MGK, Opał, Gibbs).',
            'Rozpisz sekcje (zwrotka, refren, bridge) i przy każdej zanotuj: głośność, barwa (powietrze/pełny/twardy), gęstość tekstu.',
            'Znajdź jedno słowo, które jest wyróżnione inaczej niż reszta. Jak to zrobiono?',
          ] },
          { title: 'Trzy interpretacje jednej frazy', minutes: 10, steps: [
            'Weź jedną frazę z tekstu, nad którym już pracujesz (albo z utworu do nauki).',
            'Nagraj ją trzy razy: cicho i blisko mikrofonu; normalnie; z największą energią, na jaką pozwala głos bez bólu.',
            'Wybierz wersję pasującą do znaczenia słów. To ćwiczenie decyzji, nie produkowania nowego tekstu.',
          ] },
        ],
        safety: VOICE_SAFETY,
        sources: ['moore2012', 'miller1986'],
      },
    ],
  },
  {
    key: 'theory', title: 'Teoria muzyki', short: 'Teoria', tone: 2,
    description: 'Rytm, metrum, interwały, tonacje, akordy i forma — tyle teorii, ile realnie pomaga pisać melodie do beatu i rozmawiać z producentem.',
    lessons: [
      {
        key: 'theory-rhythm', title: 'Rytm, metrum i tempo', minutes: 25,
        summary: 'Takt, miara, ćwierćnuty, ósemki, szesnastki i triole — język, którym opisuje się flow.',
        body: [
          'Tempo mierzy się w uderzeniach na minutę (BPM). Metrum mówi, jak uderzenia grupują się w takty. Niemal cały rap i pop jest w metrum 4/4: cztery ćwierćnuty w takcie, akcent na 1 i słabszy na 3; werbel w beacie zwykle wypada na 2 i 4.',
          'Każdą ćwierćnutę dzieli się na dwie ósemki albo cztery szesnastki. Takt 4/4 ma więc 16 pozycji szesnastkowych — to podstawowa „siatka”, na której analizuje się flow. Liczy się je „raz-i-a-i, dwa-i-a-i…” (w angielskiej konwencji „1 e & a”).',
          'Triola dzieli ćwierćnutę na trzy równe części zamiast dwóch lub czterech. „Triplet flow” to rapowanie trzech sylab na każde uderzenie — brzmi „okrągło” i kołysząco, bo na chwilę wychodzi poza siatkę szesnastek.',
          'Tempo bywa mylące: beat 140 BPM w half-time (werbel na 3) odczuwa się jak 70 BPM. To nadal ta sama siatka, tylko inaczej akcentowana.',
        ],
        terms: [
          ['BPM', 'Uderzenia na minutę — tempo.'],
          ['Metrum 4/4', 'Cztery ćwierćnuty w takcie.'],
          ['Triola', 'Trzy równe wartości w miejscu dwóch.'],
          ['Half-time', 'Odczucie tempa o połowę wolniejszego przy tym samym BPM.'],
        ],
        practice: [
          { title: 'Liczenie siatki z beatem', minutes: 10, steps: [
            'Włącz dowolny beat 4/4 i licz na głos „raz-i-a-i, dwa-i-a-i, trzy-i-a-i, cztery-i-a-i”.',
            'Klaszcz tylko na „raz, dwa, trzy, cztery”, potem tylko na „i”, potem na wszystkie szesnastki.',
            'Na koniec klaszcz triolami: „raz-trio-la, dwa-trio-la”. Poczuj, jak różnie to „siedzi” na tym samym beacie.',
          ] },
          { title: 'Tempo i metrum w znanych utworach', minutes: 15, steps: [
            'Wybierz 3 utwory z różnych stron Twojej muzyki (emo-rap, alternatywny rap, rap-rock).',
            'Wystukaj tempo funkcją „tap tempo” w DAW lub aplikacji metronomu.',
            'Sprawdź, gdzie wypada werbel — na 2 i 4 czy na 3 (half-time)? Zanotuj BPM i odczucie tempa.',
          ] },
        ],
        sources: ['omt', 'ableton-learning'],
      },
      {
        key: 'theory-intervals', title: 'Interwały', minutes: 25,
        summary: 'Odległości między dźwiękami — fundament melodii, harmonii i trafiania w dźwięk.',
        body: [
          'Interwał to odległość między dwoma dźwiękami liczona w półtonach (najmniejszy krok na klawiaturze, z klawisza na sąsiedni). Podstawowe interwały: sekunda mała (1 półton), sekunda wielka (2), tercja mała (3), tercja wielka (4), kwarta czysta (5), tryton (6), kwinta czysta (7), seksta mała (8), seksta wielka (9), septyma mała (10), septyma wielka (11), oktawa (12).',
          'Tercja mała i wielka decydują o charakterze akordu: wielka brzmi jaśniej (dur), mała ciemniej (moll). Kwinta i oktawa brzmią „pusto” i stabilnie — dlatego tak często pojawiają się w liniach basu i powerchordach gitarowych w rap-rocku.',
          'Melodie śpiewane składają się głównie z małych kroków (sekundy) i okazjonalnych skoków. Skok przyciąga uwagę — dobrze go postawić na słowie, które ma znaczyć najwięcej.',
        ],
        terms: [
          ['Półton', 'Najmniejsza odległość w systemie równomiernie temperowanym.'],
          ['Dur / moll', 'Tryb jasny (z tercją wielką) i ciemny (z tercją małą).'],
          ['Powerchord', 'Dźwięk podstawowy + kwinta (bez tercji), typowy w gitarze rockowej.'],
        ],
        practice: [
          { title: 'Interwały na klawiaturze i głosem', minutes: 10, steps: [
            'W DAW lub aplikacji z klawiaturą zagraj C, a potem po kolei E (tercja wielka), Eb (tercja mała), G (kwinta), C wyżej (oktawa).',
            'Każdy interwał zaśpiewaj: najpierw dolny dźwięk, potem górny. Sprawdź tunerem.',
          ] },
          { title: 'Trening słuchu', minutes: 15, steps: [
            'Skorzystaj z darmowego treningu rozpoznawania interwałów (np. w musictheory.net albo w aplikacji do treningu słuchu).',
            'Zacznij tylko od trzech: tercja wielka, kwinta, oktawa. Kolejne dodawaj, gdy trafiasz 8/10.',
          ] },
        ],
        sources: ['omt', 'musictheory-net'],
      },
      {
        key: 'theory-keys', title: 'Skale i tonacje', minutes: 30,
        summary: 'Jak znaleźć tonację beatu i które dźwięki „pasują” do melodii.',
        body: [
          'Skala durowa ma układ kroków: cały ton, cały, pół, cały, cały, cały, pół (np. C-D-E-F-G-A-H-C). Skala molowa naturalna: cały, pół, cały, cały, pół, cały, cały (np. A-H-C-D-E-F-G-A). Uwaga na polskie nazewnictwo: polskie „H” to angielskie „B”, a polskie „B” to angielskie „B♭”.',
          'Każda tonacja durowa ma tonację równoległą molową o tych samych dźwiękach: C-dur i a-moll, G-dur i e-moll. Tonacja molowa zaczyna się na szóstym stopniu durowej (a durowa — na trzecim stopniu molowej).',
          'Emocjonalny i melodyjny rap bardzo często jest w molu. Skala molowa harmoniczna ma podwyższony 7. stopień (w a-moll: Gis zamiast G) — daje charakterystyczne, „orientalne” lub dramatyczne napięcie. Pentatonika molowa (5 dźwięków, w a-moll: A-C-D-E-G) to bezpieczny zestaw dźwięków do melodii i ad-libów — trudno nią zafałszować względem beatu.',
          'Tonację beatu znajdziesz trzema sposobami: zapytaj producenta / sprawdź opis, użyj analizatora tonacji w DAW, albo nuć dźwięk, który brzmi jak „dom”, i znajdź go na klawiaturze.',
        ],
        terms: [
          ['Tonacja równoległa', 'Para dur–moll o tych samych dźwiękach (C-dur / a-moll).'],
          ['Pentatonika', 'Skala pięciodźwiękowa; molowa w a: A-C-D-E-G.'],
          ['Tonika', 'Dźwięk „domowy” tonacji.'],
        ],
        practice: [
          { title: 'Znajdź tonację trzech beatów', minutes: 15, steps: [
            'Weź trzy beaty, na których pracujesz albo chcesz pracować.',
            'Dla każdego znajdź tonikę (nucenie + klawiatura), a potem sprawdź analizatorem tonacji. Zanotuj zgodność.',
            'Zapisz tonację w notatkach projektu — przyda się przy nagrywaniu i strojeniu wokalu.',
          ] },
          { title: 'Pentatonika jako melodia na beacie', minutes: 15, steps: [
            'Na beacie w znanej tonacji molowej zagraj na klawiaturze pentatonikę molową w górę i w dół.',
            'Zanuć swobodnie tylko tymi dźwiękami — bez tekstu. To jest „mapa”, po której możesz się poruszać w melodiach.',
          ] },
        ],
        sources: ['omt', 'ableton-learning'],
      },
      {
        key: 'theory-chords', title: 'Akordy i harmonia', minutes: 30,
        summary: 'Trójdźwięki, stopnie tonacji i typowe pętle akordów w emocjonalnym rapie.',
        body: [
          'Trójdźwięk powstaje z dźwięku podstawowego, tercji i kwinty. Durowy: tercja wielka + mała (C-E-G). Molowy: tercja mała + wielka (A-C-E). Zmniejszony: dwie tercje małe (H-D-F).',
          'Z każdego stopnia skali buduje się akord z jej dźwięków. W molu naturalnym kolejne stopnie dają: i (moll), ii° (zmniejszony), III (dur), iv (moll), v (moll), VI (dur), VII (dur). W a-moll: Am, H°, C, Dm, Em, F, G.',
          'Jedna z najczęstszych pętli w emocjonalnym popie i rapie to i–VI–III–VII (w a-moll: Am–F–C–G). Ta sama sekwencja zaczęta od C to w dur I–V–vi–IV — dlatego tak wiele piosenek brzmi „znajomo”.',
          'Melodia brzmi stabilnie, gdy na mocnych częściach taktu trafia w dźwięki aktualnego akordu, a napięcie buduje się dźwiękami spoza akordu, które rozwiązują się krokiem. To prosta zasada, która pomaga pisać refreny, które „siedzą” na beacie.',
        ],
        terms: [
          ['Trójdźwięk', 'Akord z prymy, tercji i kwinty.'],
          ['Stopnie', 'Akordy oznaczane cyframi rzymskimi; wielkie = dur, małe = moll, ° = zmniejszony.'],
          ['Dźwięk akordowy', 'Dźwięk należący do brzmiącego akordu.'],
        ],
        practice: [
          { title: 'Rozpoznaj pętlę akordów', minutes: 15, steps: [
            'Weź beat z wyraźną pętlą (pianino, gitara, pad).',
            'Znajdź na klawiaturze dźwięki basu w każdym takcie — zwykle to podstawy akordów.',
            'Sprawdź, czy pasują do tonacji i jakie to stopnie (np. i–VI–III–VII). Zapisz pętlę w notatkach projektu.',
          ] },
          { title: 'Dźwięki akordowe w znanym refrenie', minutes: 15, steps: [
            'Weź refren, który znasz. Zaśpiewaj tylko pierwsze dźwięki każdego taktu.',
            'Zagraj akord pod nimi — sprawdź, czy to dźwięki akordu. Zwykle tak jest na mocnych miejscach.',
          ] },
        ],
        sources: ['omt', 'perricone2000'],
      },
      {
        key: 'theory-melody', title: 'Melodia: kontur i rytm melodii', minutes: 25,
        summary: 'Co sprawia, że hook zostaje w głowie — kształt, powtórzenie i rytm.',
        body: [
          'Kontur to kształt melodii: wznosi się, opada, faluje, stoi w miejscu. Refren zwykle leży wyżej lub ma szersze skoki niż zwrotka — to daje odczucie „podniesienia” w kulminacji.',
          'Rytm melodii jest równie ważny jak wysokości. Powtarzalny motyw rytmiczny z małą zmianą na końcu (powtórzenie + kontrast) to jeden z najskuteczniejszych sposobów budowania hooka — opisuje to m.in. Jack Perricone w „Melody in Songwriting”.',
          'W melodyjnym rapie granica między rapem a śpiewem jest płynna: frazy rapowane mogą mieć „ukryte” wysokości (np. kończyć się zawsze na tym samym dźwięku). Świadome ustawienie tych wysokości łączy zwrotkę z refrenem.',
        ],
        terms: [
          ['Kontur', 'Ogólny kształt ruchu melodii w górę i w dół.'],
          ['Motyw', 'Krótka, rozpoznawalna komórka melodyczno-rytmiczna.'],
        ],
        practice: [
          { title: 'Narysuj kontur trzech refrenów', minutes: 15, steps: [
            'Wybierz trzy refreny, które pamiętasz po jednym przesłuchaniu.',
            'Dla każdego narysuj linią kształt melodii (w górę / w dół) i zaznacz powtórzenia.',
            'Porównaj z konturem zwrotki tego samego utworu: gdzie refren „idzie wyżej”?',
          ] },
          { title: 'Wysokości w rapowanej zwrotce', minutes: 10, steps: [
            'Posłuchaj rapowanej zwrotki melodyjnego rapera, którego lubisz.',
            'Zanuć tylko końcówki wersów. Czy wracają do tego samego dźwięku? Czy to dźwięk toniki?',
          ] },
        ],
        sources: ['perricone2000', 'omt'],
      },
      {
        key: 'theory-form', title: 'Forma utworu', minutes: 20,
        summary: 'Intro, zwrotka, pre-chorus, refren, bridge — i dlaczego liczy się takty.',
        body: [
          'Forma to kolejność sekcji. Typowy utwór rapowy: intro, zwrotka 16 taktów, refren 8 taktów, zwrotka, refren, czasem bridge i outro. W emo-rapie i pop-punkowym rapie zwrotki bywają krótsze (8–12 taktów), a refren pojawia się szybciej.',
          'Pre-chorus to krótka sekcja przed refrenem, która buduje napięcie (zmiana akordów, rytmu albo gęstości tekstu). Bridge (most) przynosi kontrast: inne akordy, inna energia, często inny punkt widzenia w tekście.',
          'Liczenie taktów to nie biurokracja: pozwala dogadać się z producentem, planować aranżację i zauważyć, że zwrotka jest za długa, zanim nagrasz całość.',
        ],
        practice: [
          { title: 'Mapa formy z czasami', minutes: 20, steps: [
            'Wybierz utwór z Twoich inspiracji i włącz go z widocznym czasem.',
            'Zapisz każdą sekcję z czasem startu (np. 0:00 intro, 0:12 zwrotka…) i policz jej takty.',
            'Porównaj z utworem, nad którym pracujesz. Czy proporcje są podobne? Czy refren nie przychodzi za późno?',
          ] },
        ],
        sources: ['omt', 'moore2012'],
      },
    ],
  },
  {
    key: 'flow', title: 'Flow i frazowanie', short: 'Flow', tone: 3,
    description: 'Jak sylaby układają się na beacie: siatka, akcenty, rymy, triole, pauzy i zmiany flow — opisane językiem badań nad rapem.',
    lessons: [
      {
        key: 'flow-grid', title: 'Siatka szesnastek', minutes: 30,
        summary: 'Zapisz flow tak, jak robią to badacze rapu — i zobacz rzeczy, których nie słychać od razu.',
        body: [
          'Badacze flow (m.in. Kyle Adams i Mitchell Ohriner) opisują wers jako rozmieszczenie sylab na 16 pozycjach szesnastkowych taktu 4/4. Każdy takt to wiersz siatki; w kratkach wpisujesz sylaby, a akcentowane zaznaczasz.',
          'Taki zapis pokazuje, czy flow jest „na beacie” (akcenty na 1, 2, 3, 4), czy przesunięty (akcenty na „i” albo „a”), gdzie są pauzy i jak gęsto rapujesz (ile kratek jest zajętych).',
          'To narzędzie do nauki z cudzych zwrotek i do świadomej pracy nad własnymi. Uczysz się fragmentu cudzego utworu, żeby zrozumieć technikę — nie żeby go publikować.',
        ],
        terms: [
          ['Siatka 16', 'Takt 4/4 podzielony na 16 szesnastek.'],
          ['Gęstość', 'Liczba sylab na takt.'],
        ],
        practice: [
          { title: 'Transkrypcja 4 taktów', minutes: 30, steps: [
            'Wybierz 4 takty zwrotki rapera, którego flow Cię interesuje.',
            'Narysuj 4 wiersze po 16 kratek (albo użyj arkusza). Zwolnij nagranie w DAW lub odtwarzaczu (np. 75%).',
            'Wpisz sylaby w kratki, akcentowane pogrub. Potem zarapuj fragment razem z nagraniem, patrząc na siatkę.',
            'Zanotuj jedną obserwację: gdzie są akcenty? Czy wers zaczyna się na „raz”, czy przed nim?',
          ] },
        ],
        sources: ['adams2009', 'ohriner2019'],
      },
      {
        key: 'flow-accents', title: 'Akcenty na beacie i poza nim', minutes: 25,
        summary: 'Przesunięcie akcentu o jedną szesnastkę zmienia charakter całego wersu.',
        body: [
          'Polski ma stały akcent na przedostatniej sylabie słowa (z wyjątkami). Gdy akcent słowa trafia w mocną część taktu, wers brzmi pewnie i „równo”. Gdy trafia na słabą szesnastkę, powstaje synkopa — napięcie, „bujanie”.',
          'Adams pokazuje, że w rapie kluczowe jest to, gdzie wypadają akcentowane sylaby względem metrum. Dobrzy raperzy świadomie mieszają oba podejścia: równe akcenty dla jasności, przesunięte dla napięcia.',
          'Uwaga na wymuszanie akcentu: przesunięcie akcentu słowa na niewłaściwą sylabę, żeby „wcisnąć” je w rytm, słychać od razu. Lepiej zmienić słowo lub miejsce w takcie.',
        ],
        practice: [
          { title: 'Ten sam wers, dwa położenia', minutes: 15, steps: [
            'Weź jeden wers, który już masz (z tekstu w toku lub z nauczonego fragmentu).',
            'Zarapuj go tak, by pierwsza akcentowana sylaba wypadła na „raz”. Potem tak, by wypadła na „i” po raz.',
            'Nagraj obie wersje i posłuchaj na beacie. Która pasuje do znaczenia wersu?',
          ] },
          { title: 'Synkopy u inspiracji', minutes: 10, steps: [
            'W zwrotce, którą transkrybujesz, zaznacz wszystkie akcenty poza 1–2–3–4.',
            'Czy pojawiają się w konkretnym miejscu (np. zawsze w 3. takcie)? To często celowa konstrukcja.',
          ] },
        ],
        sources: ['adams2009', 'ohriner2019'],
      },
      {
        key: 'flow-rhyme', title: 'Rym w siatce: gdzie, a nie tylko czy', minutes: 25,
        summary: 'Rym końcowy, wewnętrzny i wielosylabowy — i jak położenie rymu buduje rytm.',
        body: [
          'Rym to nie tylko brzmienie końcówek. Adams opisuje, że położenie rymów w takcie tworzy własny rytm: rymy co takt na „cztery” dają przewidywalność, rymy w środku taktu — zaskoczenie.',
          'Rym wewnętrzny pojawia się wewnątrz wersu. Rym wielosylabowy (np. rymowanie dwóch–trzech sylab naraz) zagęszcza brzmienie i podkreśla technikę. W polskim rapie częste są rymy niedokładne (asonanse — zgodne samogłoski), które brzmią naturalniej niż wymuszone rymy dokładne.',
          'Rym podkreśla słowo. Jeśli najważniejsze słowo w wersie nie jest rymem ani akcentem, łatwo je przegapić.',
        ],
        terms: [
          ['Asonans', 'Zgodność samogłosek bez zgodności spółgłosek (rym niedokładny).'],
          ['Rym wielosylabowy', 'Rym obejmujący kilka sylab.'],
        ],
        practice: [
          { title: 'Mapa rymów w siatce', minutes: 15, steps: [
            'Na transkrypcji z lekcji „Siatka szesnastek” oznacz kolorami grupy rymujących się sylab.',
            'Zobacz, w których kratkach wypadają. Czy jest wzór (np. kratka 13 w każdym takcie)?',
          ] },
          { title: 'Najważniejsze słowo', minutes: 10, steps: [
            'W tekście, nad którym pracujesz, podkreśl w każdym wersie słowo, które niesie znaczenie.',
            'Sprawdź, czy wypada na akcencie lub rymie. Jeśli nie — zanotuj, czy chcesz to zmienić. Bez przymusu pisania nowych wersów.',
          ] },
        ],
        sources: ['adams2009', 'bradley2009'],
      },
      {
        key: 'flow-syntax', title: 'Składnia kontra takt', minutes: 20,
        summary: 'Zdanie, które kończy się razem z taktem, i zdanie, które przez niego przechodzi.',
        body: [
          'Adams wskazuje zgodność składni z metrum jako jedną z technik flow: zdanie może kończyć się razem z taktem (spokój, czytelność) albo przechodzić przez granicę taktu (przerzutnia, ang. enjambment) — co daje pęd i poczucie nieprzerwanej myśli.',
          'Emocjonalny storytelling często korzysta z przerzutni w momentach napięcia, a z równych, zamkniętych wersów w refrenie, który ma być łatwy do zapamiętania.',
        ],
        practice: [
          { title: 'Znajdź przerzutnie', minutes: 20, steps: [
            'W dwóch zwrotkach różnych raperów zaznacz miejsca, w których zdanie przechodzi przez granicę taktu.',
            'Porównaj: który raper robi to częściej? Jak to wpływa na odczucie tempa?',
          ] },
        ],
        sources: ['adams2009'],
      },
      {
        key: 'flow-triplets', title: 'Triplet flow i zmiany flow', minutes: 25,
        summary: 'Trzy sylaby na uderzenie i przełączanie między siatkami w obrębie zwrotki.',
        body: [
          'Triplet flow to grupowanie sylab po trzy na ćwierćnutę. Na tle beatu w szesnastkach tworzy lekkie „tarcie” rytmiczne. W siatce 16 nie da się go zapisać dokładnie — dlatego badacze używają osobnej siatki 12 (triolowej) na takt.',
          'Zmiana flow w środku zwrotki (np. z gęstych szesnastek na triole, albo z ciągłego rapu na rapowanie z pauzami) jest jednym z najmocniejszych narzędzi utrzymania uwagi. Ohriner opisuje, jak raperzy budują rozpoznawalny „rytmiczny głos” z takich wyborów.',
          'Pauza to też flow. Jeden takt ciszy po gęstej frazie podkreśla następne słowo bardziej niż każde zagęszczenie.',
        ],
        practice: [
          { title: 'Triolowe liczenie z beatem', minutes: 10, steps: [
            'Na beacie ok. 70–80 BPM (lub half-time 140–160) licz „raz-trio-la, dwa-trio-la…”.',
            'Wypowiadaj na triolach dowolne trzysylabowe słowa. Potem przełączaj co takt: takt szesnastek, takt trioli.',
          ] },
          { title: 'Zmiany flow u inspiracji', minutes: 15, steps: [
            'Przesłuchaj zwrotkę ulubionego rapera i zaznacz czasy, w których zmienia flow.',
            'Opisz jednym zdaniem każdą zmianę (np. „gęściej”, „triole”, „pauzy”). Ile ich jest w 16 taktach?',
          ] },
        ],
        sources: ['ohriner2019', 'adams2009', 'edwards2009'],
      },
      {
        key: 'flow-breath', title: 'Oddech, pauzy i wykonanie flow', minutes: 20,
        summary: 'Flow zapisany na papierze to dopiero połowa — druga to wykonanie bez zadyszki.',
        body: [
          'Gęsta zwrotka bez zaplanowanych oddechów kończy się „zjedzonymi” sylabami i zjeżdżaniem tempa. Zaplanuj oddechy na pauzach i w miejscach przerzutni — tam, gdzie słuchacz i tak oczekuje oddechu.',
          'Nagrywanie w częściach (punch-in) jest normalną praktyką studyjną, ale jeśli zwrotka ma być wykonywana na żywo, warto, by dała się zarapować w całości.',
        ],
        practice: [
          { title: 'Zwrotka do nauki w całości', minutes: 20, steps: [
            'Weź 8 taktów cudzej zwrotki, którą lubisz, i naucz się jej na pamięć (tylko do ćwiczenia).',
            'Zaznacz oddechy wykonawcy (jak w lekcji „Oddech i podparcie”).',
            'Zarapuj razem z nagraniem, potem sam na instrumentalu w zwolnionym tempie, potem w oryginalnym.',
          ] },
        ],
        safety: VOICE_SAFETY,
        sources: ['ohriner2019', 'miller1986'],
      },
    ],
  },
  {
    key: 'writing', title: 'Songwriting', short: 'Tekst', tone: 4,
    description: 'Obraz, metafora, symbol, narracja, emocja i konstrukcja refrenu. Bez zadań „napisz X wersów” — nauka przez analizę i pracę nad tym, co i tak tworzysz.',
    lessons: [
      {
        key: 'writing-image', title: 'Obraz zamiast deklaracji', minutes: 20,
        summary: '„Pokaż, nie mów” — dlaczego konkretny szczegół działa mocniej niż nazwa emocji.',
        body: [
          'Wers „jest mi smutno” informuje. Wers z konkretnym obrazem (zimna herbata na parapecie o czwartej rano) pozwala słuchaczowi poczuć to samo bez nazywania emocji. Pat Pattison nazywa pracę z detalami zmysłowymi „object writing”.',
          'Konkret to zmysły: co widać, słychać, czuć w dotyku, zapachu, smaku; gdzie i kiedy to się dzieje. Melancholijny rap jest mocny wtedy, gdy emocja jest „przypięta” do miejsc i rzeczy.',
          'Nie każdy wers musi być obrazem. Działa kontrast: obrazowe zwrotki i prostsza, bezpośrednia fraza w refrenie.',
        ],
        terms: [
          ['Obraz', 'Konkretny, zmysłowy szczegół w tekście.'],
          ['Deklaracja', 'Bezpośrednie nazwanie emocji lub myśli.'],
        ],
        practice: [
          { title: 'Policz obrazy u inspiracji', minutes: 10, steps: [
            'Weź tekst zwrotki, która Cię porusza. Podkreśl na zielono obrazy (konkret zmysłowy), na niebiesko deklaracje.',
            'Jakie są proporcje? Gdzie stoi najmocniejszy obraz — na początku, w środku, na końcu?',
          ] },
          { title: 'Notatnik zmysłów (opcjonalnie, w ciągu dnia)', minutes: 10, steps: [
            'Gdy coś Cię uderzy w ciągu dnia — dźwięk, światło, zapach — zapisz to jednym zdaniem w notatkach projektu.',
            'To zbiór materiału, nie zadanie. Wracasz do niego, gdy siadasz do tekstu przy beacie.',
          ] },
        ],
        sources: ['pattison-wbl', 'pattison1991'],
      },
      {
        key: 'writing-metaphor', title: 'Metafora, porównanie, symbol', minutes: 25,
        summary: 'Trzy narzędzia przenoszenia znaczenia — i jak nie wpaść w banał.',
        body: [
          'Porównanie mówi „jak”: „serce jak pusty pokój”. Metafora utożsamia: „serce to pusty pokój”. Symbol to obraz, który powraca w tekście i z czasem zaczyna znaczyć więcej niż on sam (np. zamknięte drzwi wracające w każdej zwrotce).',
          'Metafora rozbudowana (ciągła) prowadzi jeden obraz przez kilka wersów lub cały utwór. Daje spójność, ale wymaga konsekwencji — mieszanie obrazów („tonę w ogniu”) zwykle brzmi przypadkowo.',
          'Banał to metafora, którą słyszeliśmy tyle razy, że przestała działać („złamane serce”). Odświeżasz ją konkretem albo odwróceniem perspektywy.',
        ],
        terms: [
          ['Metafora', 'Utożsamienie dwóch rzeczy bez „jak”.'],
          ['Symbol', 'Powracający obraz o rosnącym znaczeniu.'],
        ],
        practice: [
          { title: 'Znajdź symbol w albumie', minutes: 25, steps: [
            'Weź album lub kilka utworów jednego artysty, którego lubisz.',
            'Wypisz obrazy, które wracają (kolory, miejsca, przedmioty, pogoda).',
            'Zastanów się, co znaczą w kontekście całości. Czy w Twoich tekstach są obrazy, które już wracają?',
          ] },
        ],
        sources: ['pattison-wbl', 'bradley2009'],
      },
      {
        key: 'writing-story', title: 'Narracja i punkt widzenia', minutes: 25,
        summary: 'Kto mówi, do kogo i kiedy — trzy decyzje, które porządkują tekst.',
        body: [
          'Punkt widzenia: pierwsza osoba (ja) daje intymność, druga (ty) — konfrontację lub list do kogoś, trzecia (on/ona/oni) — dystans i opowieść. Zmiana osoby w trakcie utworu powinna być świadoma.',
          'Czas: teraźniejszy wciąga w scenę, przeszły pozwala na refleksję. Storytelling w rapie często łączy scenę w teraźniejszości z refrenem, który komentuje ją z dystansu.',
          'Struktura opowieści może iść za formą utworu: zwrotka 1 — sytuacja, zwrotka 2 — zmiana lub konsekwencja, bridge — zwrot. Refren zostaje stały, ale jego znaczenie przesuwa się, bo słuchacz wie więcej.',
        ],
        practice: [
          { title: 'Rozbiór narracji', minutes: 25, steps: [
            'Wybierz utwór storytellingowy, który lubisz.',
            'Dla każdej sekcji zapisz: kto mówi, do kogo, w jakim czasie, co się zmienia.',
            'Czy refren znaczy na końcu coś innego niż na początku? Dlaczego?',
          ] },
        ],
        sources: ['pattison1991', 'moore2012'],
      },
      {
        key: 'writing-prosody', title: 'Prozodia: forma, która znaczy', minutes: 25,
        summary: 'Gdy rytm, melodia i długość wersów wspierają to, o czym jest tekst.',
        body: [
          'Pattison używa słowa „prozodia” w szerokim sensie: zgodność wszystkich elementów utworu z jego znaczeniem. Tekst o niepokoju może mieć nieregularne długości wersów; tekst o stabilności — równe, zamknięte frazy.',
          'Prozodia w wąskim sensie to zgodność akcentów słów z akcentami muzyki. Wymuszony akcent („ko-CHAM” zamiast „KO-cham”) słychać od razu i osłabia emocję.',
          'Ten sam tekst może brzmieć bezpiecznie albo niepokojąco zależnie od tego, czy kończy się na dźwięku toniki, czy „zawisa”.',
        ],
        practice: [
          { title: 'Akcenty słów w refrenie', minutes: 15, steps: [
            'Weź refren, nad którym pracujesz, albo cudzy do nauki. Zapisz go, podkreślając akcentowane sylaby słów.',
            'Zaśpiewaj z beatem i sprawdź, czy akcenty słów pokrywają się z mocnymi miejscami melodii.',
            'Zanotuj miejsca niezgodne — to kandydaci do poprawki, nie obowiązek.',
          ] },
          { title: 'Forma a treść', minutes: 10, steps: [
            'W ulubionym utworze poszukaj jednego miejsca, gdzie forma „gra” z treścią (np. pauza po słowie „cisza”).',
            'Opisz to w notatce — to katalog technik do świadomego użycia.',
          ] },
        ],
        sources: ['pattison1991', 'perricone2000'],
      },
      {
        key: 'writing-chorus', title: 'Konstrukcja refrenu', minutes: 30,
        summary: 'Tytuł, powtórzenie, kontrast ze zwrotką i miejsce na najważniejsze słowo.',
        body: [
          'Refren jest centrum utworu: zwykle zawiera tytuł lub główną myśl, powtarza się bez zmian (lub z małą zmianą) i jest prostszy niż zwrotki — mniej słów, dłuższe dźwięki, wyraźniejsza melodia.',
          'Najmocniejsze pozycje w refrenie to pierwsza i ostatnia linijka. Tam najczęściej stoi tytuł. Kontrast ze zwrotką (wyżej, szerzej, inny rytm, mniej sylab) sprawia, że słuchacz czuje wejście refrenu nawet bez zmiany beatu.',
          'Linkin Park to dobry przykład kontrastu sekcji: rapowane zwrotki i śpiewany refren w wielu utworach zespołu. Ten sam mechanizm (zmiana sposobu wykonania między zwrotką a refrenem) jest typowy dla emo-rapu.',
        ],
        practice: [
          { title: 'Anatomia trzech refrenów', minutes: 20, steps: [
            'Wybierz trzy refreny z inspiracji (np. rap-rock, emo-rap, polski melodyjny rap).',
            'Dla każdego zapisz: gdzie stoi tytuł, ile razy się powtarza, ile sylab na takt w porównaniu do zwrotki, czy melodia jest wyżej.',
            'Zapisz wspólne cechy. To Twoja „lista kontrolna” refrenu.',
          ] },
          { title: 'Sprawdź swój refren tą listą', minutes: 10, steps: [
            'Jeśli masz refren w toku, porównaj go z listą. Zanotuj jedną rzecz do zmiany albo zostaw bez zmian — decyzja należy do Ciebie.',
          ] },
        ],
        sources: ['perricone2000', 'pattison1991'],
      },
      {
        key: 'writing-voice', title: 'Własny język', minutes: 20,
        summary: 'Jak inspiracje zamieniać w swój styl zamiast w kopię.',
        body: [
          'Własny język tekstu bierze się z własnego słownika (słowa, których używasz naturalnie), własnych tematów i powracających obrazów. Inspiracje uczą techniki; treść i słownik powinny być Twoje.',
          'Dobra zasada: z inspiracji przejmuj „jak” (technikę: przerzutnia, symbol, kontrast refrenu), nigdy „co” (konkretne frazy, obrazy, melodię).',
          'Mieszanie wpływów (np. polski melodyjny rap + rap-rock + emo) jest naturalną drogą do odrębnego brzmienia — byle świadomie wiedzieć, co z czego bierzesz.',
        ],
        practice: [
          { title: 'Słownik własny vs cudzy', minutes: 20, steps: [
            'Przejrzyj swoje ostatnie teksty i wypisz słowa i obrazy, które powtarzasz.',
            'Zaznacz te, które naprawdę są Twoje (z Twojego życia, miejsc, mowy), i te, które brzmią jak zapożyczenie.',
            'Zostaw notatkę w profilu stylu — PULSE pokaże ją Towarzyszowi jako kontekst.',
          ] },
        ],
        sources: ['pattison-wbl', 'moore2012'],
      },
    ],
  },
  {
    key: 'analysis', title: 'Analiza utworów', short: 'Analiza', tone: 5,
    description: 'Aktywne słuchanie: forma, warstwy wokalu, produkcja i tekst — żeby uczyć się technik z ulubionej muzyki bez kopiowania jej.',
    lessons: [
      {
        key: 'analysis-listening', title: 'Aktywne słuchanie warstw', minutes: 25,
        summary: 'Słuchaj utworu kilka razy, za każdym razem skupiając się na jednej warstwie.',
        body: [
          'Allan F. Moore proponuje patrzeć na nagranie jak na przestrzeń: co jest z przodu, co z tyłu, co wysoko, co nisko, co po bokach. Taka „mapa brzmienia” pokazuje, jak zbudowano emocję utworu.',
          'Słuchanie warstwami: raz tylko bas i perkusja, raz tylko wokal prowadzący, raz tylko wszystko „za” wokalem (pady, gitary, efekty). Za każdym razem zauważasz inne decyzje twórców.',
        ],
        practice: [
          { title: 'Cztery przesłuchania jednego utworu', minutes: 25, steps: [
            'Wybierz utwór, który chcesz zrozumieć. Słuchawki zamiast głośnika telefonu.',
            '1) tylko rytm i bas; 2) tylko wokal prowadzący; 3) tło i efekty; 4) całość — co się zmienia między sekcjami.',
            'Po każdym przesłuchaniu jedno zdanie notatki.',
          ] },
        ],
        sources: ['moore2012'],
      },
      {
        key: 'analysis-vocals', title: 'Warstwy wokalu w produkcji', minutes: 25,
        summary: 'Lead, dublujące, harmonie, ad-liby, efekty — jak zbudowany jest wokal w nowoczesnym rapie.',
        body: [
          'W nowoczesnym rapie i emo-rapie wokal to zwykle kilka warstw: główny (lead) na środku, dublujące (te same słowa zaśpiewane ponownie) dla grubości, harmonie (inne dźwięki tej samej frazy), ad-liby (krótkie okrzyki, komentarze między frazami), czasem wokale tła i efekty (delay, pogłos, przester).',
          'Często refren ma więcej warstw niż zwrotka — to jeden ze sposobów na „wybuch” refrenu bez zmiany beatu. Dublujące bywają rozstawione na boki, a lead zostaje w środku.',
          'Rozpoznanie tej struktury pomaga planować nagrania: wiesz, ile i jakich śladów nagrać w sesji.',
        ],
        terms: [
          ['Double', 'Powtórzone nagranie tej samej partii, dla grubości.'],
          ['Ad-lib', 'Krótkie wtrącenia wokalne między frazami.'],
        ],
        practice: [
          { title: 'Mapa wokali refrenu', minutes: 25, steps: [
            'Wybierz refren z inspiracji. Słuchaj w słuchawkach.',
            'Zanotuj: czy jest double? Harmonie (wyżej/niżej)? Ad-liby — gdzie i jakie? Co jest po bokach, co w środku?',
            'Porównaj ze zwrotką. Zapisz „przepis” na warstwy — przyda się w planowaniu Twojej sesji nagraniowej.',
          ] },
        ],
        sources: ['moore2012'],
      },
      {
        key: 'analysis-lyrics', title: 'Analiza tekstu i persony', minutes: 25,
        summary: 'Kto jest „ja” w piosence i jak tekst buduje tę postać.',
        body: [
          'Moore odróżnia wykonawcę od persony — postaci, która mówi w utworze. Persona może być bliska autorowi albo celowo przerysowana. W emocjonalnym rapie granica bywa cienka, co daje siłę, ale warto wiedzieć, kiedy jest świadomym wyborem.',
          'Analiza tekstu: temat, punkt widzenia, obrazy, symbole, zwrot w bridge’u, relacja refrenu do zwrotek. To te same narzędzia co w ścieżce Songwriting, tylko użyte do czytania.',
        ],
        practice: [
          { title: 'Persona w trzech utworach', minutes: 25, steps: [
            'Wybierz trzy utwory jednego artysty z różnych okresów.',
            'Opisz personę w każdym: kim jest, czego chce, do kogo mówi.',
            'Czy persona się zmienia? Jak zmiana brzmienia idzie w parze ze zmianą persony?',
          ] },
        ],
        sources: ['moore2012', 'bradley2009'],
      },
      {
        key: 'analysis-influence', title: 'Uczyć się z wpływów, nie kopiować', minutes: 20,
        summary: 'Granica między inspiracją a kopią — technicznie i etycznie.',
        body: [
          'Uczenie się przez naśladowanie jest normalną częścią nauki muzyki: transkrybujesz zwrotkę, śpiewasz refren, uczysz się fragmentu. Granica przebiega przy publikacji: cudza melodia, tekst albo charakterystyczny fragment w Twoim utworze to już nie inspiracja.',
          'Bezpieczne przenoszenie: weź jedną technikę (np. przerzutnia przed refrenem, double tylko na ostatnim słowie frazy, triole w 3. takcie) i zastosuj ją na własnym materiale. Mieszaj techniki z kilku źródeł.',
          'Sample i interpolacje w produkcji wymagają zgód właścicieli praw — to temat prawny, w którym PULSE nie doradza.',
        ],
        practice: [
          { title: 'Katalog technik', minutes: 20, steps: [
            'Z analiz, które już zrobiono w Akademii, wypisz techniki (nie fragmenty!) w formie: „technika — skąd — jak brzmi”.',
            'Zaznacz jedną, którą chcesz wypróbować przy najbliższej sesji. Bez terminu i bez obowiązku.',
          ] },
        ],
        sources: ['moore2012', 'adams2009'],
      },
      {
        key: 'analysis-structure', title: 'Rozbiór całego utworu', minutes: 40,
        summary: 'Łączysz wszystko: forma, harmonia, flow, wokal, tekst — na jednym utworze.',
        body: [
          'Pełna analiza to zebranie wcześniejszych narzędzi w jednym miejscu. Nie musi być długa: jedna strona notatek, która mówi, dlaczego ten utwór działa.',
          'Schemat: forma z czasami → tempo i tonacja → pętla akordów → flow zwrotki (siatka 4 taktów) → warstwy wokalu w refrenie → temat, persona i główny obraz tekstu → jedna technika do przeniesienia.',
        ],
        practice: [
          { title: 'Jedna strona o jednym utworze', minutes: 40, steps: [
            'Wybierz utwór z inspiracji, który chcesz zrozumieć najlepiej.',
            'Przejdź schemat z lekcji punkt po punkcie. Każdy punkt — 1–3 zdania.',
            'Zapisz notatkę w lekcji. Możesz do niej wracać i porównywać kolejne analizy.',
          ] },
        ],
        sources: ['moore2012', 'omt', 'adams2009'],
      },
    ],
  },
];

export const PATH_BY_KEY = Object.fromEntries(PATHS.map((p) => [p.key, p])) as Record<PathKey, LearningPath>;
export const LESSON_BY_KEY: Record<string, Lesson & { path: PathKey; index: number }> = Object.fromEntries(
  PATHS.flatMap((p) => p.lessons.map((l, index) => [l.key, { ...l, path: p.key, index }])),
);
export const ALL_LESSONS = PATHS.flatMap((p) => p.lessons.map((l) => LESSON_BY_KEY[l.key]));
