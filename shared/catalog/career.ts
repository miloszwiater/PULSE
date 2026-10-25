/** Promotion Academy curriculum and Roadmap 365 templates. */

export type ArtistStage = 'foundation' | 'catalog' | 'release' | 'growth';

export const STAGE_LABEL: Record<ArtistStage, string> = {
  foundation: 'Brak gotowych utworów — budujesz fundamenty',
  catalog: 'Masz dema — budujesz katalog',
  release: 'Masz utwór gotowy do wydania',
  growth: 'Masz wydane utwory — rozwijasz publiczność',
};

export interface PromoLesson {
  key: string;
  module: number;
  title: string;
  idea: string;
  task: string;
  channel: string;
  /** Lowest artist stage at which the task makes sense. */
  min_stage: ArtistStage;
}

export const PROMO_MODULES = [
  { n: 1, title: 'Marketing muzyczny i kampanie' },
  { n: 2, title: 'Social media i pokazywanie procesu' },
  { n: 3, title: 'Strategia wydań' },
  { n: 4, title: 'Słuchacze, społeczność, współprace' },
  { n: 5, title: 'Analiza wyników' },
] as const;

export const PROMO_LESSONS: PromoLesson[] = [
  { key: 'm1-identity', module: 1, min_stage: 'foundation', channel: 'Tożsamość',
    title: 'Jedno zdanie o Tobie jako artyście',
    idea: 'Promocja zaczyna się od spójnego przekazu: kim jesteś, jak brzmisz, o czym piszesz. Bez tego każdy post jest przypadkowy.',
    task: 'Zapisz jedno zdanie opisu artysty i trzy słowa-klucze estetyki. Sprawdź, czy pasują do Twoich ostatnich szkiców.' },
  { key: 'm1-audience', module: 1, min_stage: 'foundation', channel: 'Strategia',
    title: 'Kto ma tego słuchać',
    idea: 'Kampania bez określonego słuchacza to strzelanie na ślepo. Opisz konkretną osobę, nie „wszystkich”.',
    task: 'Opisz słuchacza: wiek, czego słucha, gdzie odkrywa muzykę. Wypisz 5 artystów, których słucha.' },
  { key: 'm1-campaign', module: 1, min_stage: 'release', channel: 'Strategia',
    title: 'Plan kampanii w 4 tygodniach',
    idea: 'Kampania to sekwencja: zapowiedź, budowanie, premiera, podtrzymanie. Każdy etap ma inny cel.',
    task: 'Rozpisz 4 tygodnie wokół premiery: po jednym celu i dwóch działaniach na tydzień.' },

  { key: 'm2-visual', module: 2, min_stage: 'foundation', channel: 'Instagram',
    title: 'Spójny wizerunek profilu',
    idea: 'Zanim zaczniesz publikować regularnie, profil powinien mówić to samo co muzyka.',
    task: 'Ujednolić zdjęcie, bio i 3 pierwsze widoczne posty z jednym słowem-kluczem estetyki.' },
  { key: 'm2-process', module: 2, min_stage: 'catalog', channel: 'TikTok / Reels',
    title: 'Pokaż proces, nie tylko efekt',
    idea: 'Fragmenty pracy przy beacie, szkic wersu, zmiana flow — to treści, które budują relację bez gotowego utworu.',
    task: 'Nagraj 30-sekundowy fragment z sesji (ekran FL + szkic wokalu) i zapisz go jako materiał do publikacji. Publikacja tylko po Twojej decyzji.' },
  { key: 'm2-series', module: 2, min_stage: 'catalog', channel: 'TikTok / Reels',
    title: 'Seria zamiast pojedynczych postów',
    idea: 'Powtarzalny format (np. „8 wersów na jednym beacie”) jest łatwiejszy do utrzymania i rozpoznawalny.',
    task: 'Zaprojektuj format serii: tytuł, długość, stały element. Przygotuj 3 odcinki zanim opublikujesz pierwszy.' },
  { key: 'm2-youtube', module: 2, min_stage: 'release', channel: 'YouTube',
    title: 'Kanał YouTube jako archiwum',
    idea: 'YouTube to miejsce na pełne utwory, visualizery i kulisy; działa dłużej niż krótkie formy.',
    task: 'Przygotuj prosty visualizer lub lyric video do gotowego utworu.' },

  { key: 'm3-readiness', module: 3, min_stage: 'release', channel: 'Wydanie',
    title: 'Lista gotowości do premiery',
    idea: 'Utwór gotowy do wydania to nie tylko miks: master, okładka, metadane, prawa, materiały promocyjne.',
    task: 'Sprawdź listę: master, okładka 3000×3000, tytuł i autorzy, ISRC (dystrybutor), tekst, 3 materiały promocyjne.' },
  { key: 'm3-distribution', module: 3, min_stage: 'release', channel: 'Wydanie',
    title: 'Wybór dystrybucji',
    idea: 'Dystrybutor dostarcza utwór do serwisów. Porównaj model opłat, prowizję i czas dostarczenia.',
    task: 'Porównaj dwóch dystrybutorów pod kątem kosztu rocznego, prowizji i terminu. Zapisz wybór z powodem.' },
  { key: 'm3-pitch', module: 3, min_stage: 'release', channel: 'Spotify',
    title: 'Zgłoszenie do redakcji playlist',
    idea: 'Spotify for Artists pozwala zgłosić niewydany utwór do redakcji — trzeba to zrobić z wyprzedzeniem przed premierą.',
    task: 'Zaplanuj premierę co najmniej 3–4 tygodnie do przodu i przygotuj opis utworu do zgłoszenia.' },
  { key: 'm3-after', module: 3, min_stage: 'growth', channel: 'Wydanie',
    title: 'Plan po premierze',
    idea: 'Większość utworów potrzebuje kilku tygodni podtrzymania: nowe formy treści, wersje, kulisy.',
    task: 'Rozpisz 6 działań na 3 tygodnie po premierze (kulisy, fragment tekstu, wersja akustyczna, reakcje).' },

  { key: 'm4-community', module: 4, min_stage: 'catalog', channel: 'Społeczność',
    title: 'Pierwsze 100 osób',
    idea: 'Na początku liczy się relacja z małą grupą: odpowiadanie, rozmowy, pokazywanie się w podobnych środowiskach.',
    task: 'Odpowiedz na komentarze i znajdź 5 twórców o podobnym klimacie; zostaw merytoryczną reakcję pod ich pracą.' },
  { key: 'm4-collab', module: 4, min_stage: 'catalog', channel: 'Współprace',
    title: 'Współpraca z producentem lub wokalistą',
    idea: 'Współpraca poszerza publiczność obu stron i uczy pracy z kimś innym niż Ty.',
    task: 'Wybierz 3 potencjalnych współpracowników i napisz konkretną propozycję do jednego (wysłanie — Twoja decyzja).' },
  { key: 'm4-live', module: 4, min_stage: 'growth', channel: 'Koncerty',
    title: 'Pierwszy występ',
    idea: 'Open mic lub mały koncert to test materiału i źródło kontaktów.',
    task: 'Znajdź 2 open mic lub małe koncerty w okolicy i przygotuj 10-minutowy set.' },

  { key: 'm5-metrics', module: 5, min_stage: 'growth', channel: 'Analiza',
    title: 'Co mierzyć po publikacji',
    idea: 'Liczby z platform mówią, co działa: zapisy, udostępnienia i dokończenia mówią więcej niż wyświetlenia.',
    task: 'Po 7 dniach od publikacji zapisz: wyświetlenia, zapisy, udostępnienia, % obejrzeń do końca. Porównaj z poprzednią publikacją.' },
  { key: 'm5-review', module: 5, min_stage: 'catalog', channel: 'Analiza',
    title: 'Wnioski zamiast wrażeń',
    idea: 'Po każdej serii publikacji zapisz jeden wniosek i jedną zmianę na następny raz.',
    task: 'Przejrzyj ostatnie 5 publikacji (jeśli są). Zapisz, który format zadziałał najlepiej i dlaczego tak sądzisz.' },
];

export const PROMO_BY_KEY: Record<string, PromoLesson> = Object.fromEntries(PROMO_LESSONS.map((l) => [l.key, l]));

export const PHASES = [
  { n: 1, months: '1–3', title: 'Fundamenty', focus: 'Regularność, diagnoza umiejętności, podstawy treningów.' },
  { n: 2, months: '4–6', title: 'Warsztat', focus: 'Songwriting, flow, melodyka, ekspresja, własny styl.' },
  { n: 3, months: '7–9', title: 'Twórczość i publikacje', focus: 'Kończenie utworów, przygotowanie premier, pierwsza publiczność.' },
  { n: 4, months: '10–12', title: 'Kariera', focus: 'Rezultaty, kolejne wydania, współprace, strategia na kolejny rok.' },
] as const;

export interface MilestoneTemplate {
  key: string;
  phase: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  /** Optional automatic evidence check performed by shared/roadmap.ts */
  check?: 'kept_weeks_4' | 'all_categories_tried' | 'first_demo' | 'three_demos' | 'book_read' | 'first_release' | 'promo_5' | 'finished_3';
}

export const MILESTONE_TEMPLATES: MilestoneTemplate[] = [
  { key: 'p1-rhythm', phase: 1, check: 'kept_weeks_4', title: '4 tygodnie utrzymanej regularności', description: 'Cztery tygodnie, w których zrealizowano dostosowany cel sesji (tygodnie chroniące — choroba, urlop — się nie liczą ani nie psują).' },
  { key: 'p1-diagnosis', phase: 1, check: 'all_categories_tried', title: 'Diagnoza wszystkich 5 obszarów', description: 'Co najmniej jedno ukończone ćwiczenie w każdej kategorii, z oceną trudności.' },
  { key: 'p1-first-demo', phase: 1, check: 'first_demo', title: 'Pierwsze demo w PULSE', description: 'Jedna sesja zakończona rezultatem „demo” lub projekt na etapie demo.' },
  { key: 'p2-book', phase: 2, check: 'book_read', title: 'Przeczytana pierwsza książka warsztatowa', description: 'Z ćwiczeniem praktycznym wykonanym po lekturze.' },
  { key: 'p2-style', phase: 2, title: 'Opis własnego stylu', description: 'Spisane: tematy, techniki, brzmienie, czego świadomie unikasz. Do aktualizacji w profilu.' },
  { key: 'p2-three-demos', phase: 2, check: 'three_demos', title: 'Trzy dema', description: 'Trzy projekty co najmniej na etapie demo.' },
  { key: 'p3-finished', phase: 3, check: 'finished_3', title: 'Trzy utwory gotowe', description: 'Projekty na etapie „gotowy” lub „wydany”.' },
  { key: 'p3-release', phase: 3, check: 'first_release', title: 'Pierwsza premiera', description: 'Projekt oznaczony jako wydany, z planem premiery w Karierze.' },
  { key: 'p3-promo', phase: 3, check: 'promo_5', title: '5 zrealizowanych działań promocyjnych', description: 'Zadania z Promotion Academy oznaczone jako wykonane.' },
  { key: 'p4-second-release', phase: 4, title: 'Kolejne wydanie', description: 'Drugi wydany utwór lub EP.' },
  { key: 'p4-collab', phase: 4, title: 'Współpraca', description: 'Zrealizowana współpraca z innym twórcą.' },
  { key: 'p4-next-year', phase: 4, title: 'Strategia na kolejny rok', description: 'Spisane wnioski z roku i cele na następny.' },
];
