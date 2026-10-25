import type { SkillCategory } from '../schema';

export interface CatalogBook {
  key: string;
  title: string;
  author: string;
  topic: string;
  /** Approximate length; used only to suggest a flexible deadline. */
  pages: number;
  kind: 'craft' | 'poetry' | 'creativity' | 'business';
  categories: SkillCategory[];
  learning_goal: string;
  why: string;
  practice: string;
  /** Polish edition is known to exist. */
  pl?: boolean;
}

/** Curated, real titles. Reasons are written for this artist's stated direction. */
export const BOOKS: CatalogBook[] = [
  {
    key: 'pattison-wbl', title: 'Writing Better Lyrics', author: 'Pat Pattison', topic: 'Konstrukcja tekstu, obraz, prozodia',
    pages: 260, kind: 'craft', categories: ['songwriting', 'melody'],
    learning_goal: 'Pisać obrazem zamiast deklaracji, panować nad długością fraz i zgodnością akcentów z melodią.',
    why: 'Najbardziej praktyczny podręcznik obrazu i prozodii; ćwiczenia od razu przekładają się na pisanie do beatu.',
    practice: 'Wybierz rozdział o „object writing” i zrób sesję: 10 minut obrazu zmysłowego, potem 8 wersów na beacie z najlepszych fragmentów.',
  },
  {
    key: 'bradley-rhymes', title: 'Book of Rhymes: The Poetics of Hip Hop', author: 'Adam Bradley', topic: 'Poetyka rapu: rytm, rym, styl',
    pages: 240, kind: 'craft', categories: ['flow', 'songwriting', 'analysis'],
    learning_goal: 'Rozumieć rap jako poezję: rytm, rodzaje rymów, gra słów, storytelling.',
    why: 'Daje język do opisu flow i rymu — przydatny przy rozbiorach technik bez kopiowania wykonania.',
    practice: 'Po rozdziale o rytmie zrób ćwiczenie „Rozbiór techniki, nie kopia” na własnym beacie.',
  },
  {
    key: 'edwards-howtorap', title: 'How to Rap', author: 'Paul Edwards', topic: 'Flow, pisanie, wykonanie — z wypowiedzi raperów',
    pages: 340, kind: 'craft', categories: ['flow', 'songwriting'],
    learning_goal: 'Poznać metody pracy wielu raperów: pisanie, flow, nagrywanie.',
    why: 'Zbiór realnych metod — dobre źródło alternatyw, gdy jedno podejście do flow przestaje działać.',
    practice: 'Wybierz jedną opisaną metodę pisania flow i zastosuj ją w ćwiczeniu „Dwa warianty flow”.',
  },
  {
    key: 'tweedy-onesong', title: 'How to Write One Song', author: 'Jeff Tweedy', topic: 'Proces pisania piosenki, nawyk',
    pages: 180, kind: 'creativity', categories: ['songwriting', 'melody'],
    learning_goal: 'Zbudować nawyk kończenia jednej piosenki zamiast zbierania fragmentów.',
    why: 'Krótka i praktyczna; skupia się na regularnym pisaniu bez czekania na wenę.',
    practice: 'Po lekturze przeprowadź sesję „Łuk całego utworu” i doprowadź szkic do etapu demo w Projektach.',
  },
  {
    key: 'rubin-creative-act', title: 'The Creative Act: A Way of Being', author: 'Rick Rubin', topic: 'Postawa twórcza, uważność, proces',
    pages: 430, kind: 'creativity', categories: ['analysis'], pl: true,
    learning_goal: 'Rozwijać uważność na inspirację i decyzje twórcze.',
    why: 'Dobra lektura na okres zmęczenia rutyną — czytaj w małych porcjach, rozdziały są krótkie.',
    practice: 'Po kilku rozdziałach zrób sesję „Inspiracja”: zbierz 5 obserwacji z dnia i zamień jedną w 8 wersów.',
  },
  {
    key: 'kleon-steal', title: 'Steal Like an Artist', author: 'Austin Kleon', topic: 'Wpływy, własny styl',
    pages: 160, kind: 'creativity', categories: ['analysis'], pl: true,
    learning_goal: 'Odróżniać czerpanie technik od kopiowania i świadomie budować własny styl z wpływów.',
    why: 'Wspiera główną zasadę PULSE: wydobywać techniki z inspiracji, nie kopiować artystów.',
    practice: 'Rozpisz swoją „genealogię”: 5 inspiracji i jedną technikę od każdej, potem ćwiczenie „Polowanie na obrazy”.',
  },
  {
    key: 'king-onwriting', title: 'Pamiętnik rzemieślnika (On Writing)', author: 'Stephen King', topic: 'Warsztat pisarski, redakcja',
    pages: 320, kind: 'craft', categories: ['songwriting'], pl: true,
    learning_goal: 'Redagować bez litości i pisać regularnie.',
    why: 'Część o redakcji wprost wspiera ćwiczenie „Wytnij 30%”.',
    practice: 'Po części o redakcji zrób „Redakcja: wytnij 30%” na swoim najdłuższym szkicu.',
  },
  {
    key: 'rilke-letters', title: 'Listy do młodego poety', author: 'Rainer Maria Rilke', topic: 'Twórczość, samotność, autentyczność',
    pages: 100, kind: 'poetry', categories: ['songwriting'], pl: true,
    learning_goal: 'Zbudować wewnętrzne powody tworzenia niezależne od oceny innych.',
    why: 'Krótka, refleksyjna — pasuje do melancholijnego, osobistego pisania.',
    practice: 'Napisz 8 wersów jako list do siebie sprzed roku, na wolnym beacie.',
  },
  {
    key: 'szymborska-wybor', title: 'Wiersze wybrane', author: 'Wisława Szymborska', topic: 'Poezja: precyzja, ironia, obraz',
    pages: 250, kind: 'poetry', categories: ['songwriting'], pl: true,
    learning_goal: 'Uczyć się precyzji słowa i zaskakującej puenty.',
    why: 'Mistrzostwo puenty i konkretu — dobre do ćwiczeń „Puenta z przygotowaniem”.',
    practice: 'Wybierz jeden wiersz, nazwij mechanizm puenty i użyj go w 4 wersach na beacie.',
  },
  {
    key: 'poswiatowska-wybor', title: 'Wiersze wybrane', author: 'Halina Poświatowska', topic: 'Poezja: intensywność emocji, ciało, czas',
    pages: 200, kind: 'poetry', categories: ['songwriting', 'melody'], pl: true,
    learning_goal: 'Wyrażać intensywną emocję prostym, obrazowym językiem.',
    why: 'Emocjonalna intensywność bez patosu — bliska melancholijnemu kierunkowi.',
    practice: 'Ćwiczenie „Emocja bez nazywania emocji” z obrazem zaczerpniętym z jednego wiersza.',
  },
  {
    key: 'herbert-cogito', title: 'Pan Cogito', author: 'Zbigniew Herbert', topic: 'Poezja: postawa, symbol, persona',
    pages: 120, kind: 'poetry', categories: ['songwriting'], pl: true,
    learning_goal: 'Budować personę i symbol w tekście.',
    why: 'Uczy pisania przez postać — przydatne w ćwiczeniu zmiany perspektywy.',
    practice: 'Ćwiczenie „Ta sama historia z dwóch stron”, gdzie druga perspektywa to wymyślona persona.',
  },
  {
    key: 'mckee-story', title: 'Story', author: 'Robert McKee', topic: 'Struktura opowieści, zwrot akcji',
    pages: 470, kind: 'craft', categories: ['songwriting', 'analysis'], pl: true,
    learning_goal: 'Rozumieć mechanikę zwrotu i zmiany wartości w historii.',
    why: 'Obszerna — warto czytać wybrane rozdziały o scenie i zwrocie, nie całość naraz.',
    practice: 'Po rozdziale o scenie zrób „Mapa narracji”, a potem „Łuk całego utworu”.',
  },
  {
    key: 'senior-mixing', title: 'Mixing Secrets for the Small Studio', author: 'Mike Senior', topic: 'Miks w domowym studiu',
    pages: 380, kind: 'craft', categories: ['production'],
    learning_goal: 'Podstawy świadomego miksu i odsłuchu referencyjnego w domowych warunkach.',
    why: 'Praktyczna, bez sprzętowego fetyszu; wspiera ćwiczenia odsłuchu referencyjnego i łańcucha wokalu.',
    practice: 'Po rozdziale o balansie zrób „Odsłuch referencyjny” na swoim ostatnim demie.',
  },
  {
    key: 'desantis-making', title: 'Making Music: 74 Creative Strategies for Electronic Music Producers', author: 'Dennis DeSantis', topic: 'Strategie produkcyjne, blokady twórcze',
    pages: 300, kind: 'creativity', categories: ['production'],
    learning_goal: 'Mieć zestaw strategii na start, utknięcie i kończenie utworu.',
    why: 'Krótkie rozdziały-problemy — idealne do sięgania, gdy szkic stoi w miejscu.',
    practice: 'Wybierz strategię o kończeniu utworów i zastosuj ją w ćwiczeniu „Domknij demo”.',
  },
  {
    key: 'herstand-newbiz', title: 'How to Make It in the New Music Business', author: 'Ari Herstand', topic: 'Kariera niezależnego artysty',
    pages: 600, kind: 'business', categories: [],
    learning_goal: 'Rozumieć realia wydań, dystrybucji i budowania publiczności jako niezależny artysta.',
    why: 'Najbardziej aktualny przewodnik po karierze bez wytwórni — czytaj rozdziałami, gdy zbliża się premiera.',
    practice: 'Po rozdziale o wydaniach rozpisz w Karierze plan premiery najbliższego utworu.',
  },
  {
    key: 'passman-allyouneed', title: 'All You Need to Know About the Music Business', author: 'Donald S. Passman', topic: 'Prawa, umowy, tantiemy',
    pages: 560, kind: 'business', categories: [],
    learning_goal: 'Rozumieć podstawy praw autorskich, umów i tantiem.',
    why: 'Przydatna przed pierwszymi współpracami i umowami — nie trzeba czytać całości od razu.',
    practice: 'Zanotuj 5 pytań, które musisz zadać przed pierwszą współpracą, i dodaj je do zadania w Karierze.',
  },
];

export const BOOK_BY_KEY: Record<string, CatalogBook> = Object.fromEntries(BOOKS.map((b) => [b.key, b]));
