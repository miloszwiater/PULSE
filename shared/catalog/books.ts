import type { PathKey } from './academy';

export interface CatalogBook {
  key: string;
  title: string;
  author: string;
  topic: string;
  /** Approximate length; used only to suggest a flexible deadline. */
  pages: number;
  kind: 'craft' | 'poetry' | 'creativity' | 'voice' | 'theory' | 'business';
  /** Academy paths this book deepens. */
  paths: PathKey[];
  learning_goal: string;
  why: string;
  /** How the book connects to real work — never a writing quota. */
  practice: string;
  /** Polish edition is known to exist. */
  pl?: boolean;
  /** Bibliographic details re-checked while writing (see shared/catalog/sources.ts). */
  verified: boolean;
  /** Kept for existing library entries, no longer recommended (PULSE is not a career manager). */
  retired?: boolean;
}

/** Curated, real titles. Reasons are written for this artist's direction: emotional melodic rap, alternative rap, rap-rock. */
export const BOOKS: CatalogBook[] = [
  {
    key: 'miller-structure', title: 'The Structure of Singing', author: 'Richard Miller', topic: 'Technika wokalna: oddech, rezonans, rejestry',
    pages: 370, kind: 'voice', paths: ['vocal'], verified: true,
    learning_goal: 'Zrozumieć zarządzanie oddechem (appoggio), rezonans i rejestry z perspektywy pedagogiki śpiewu.',
    why: 'Klasyczny podręcznik techniki — pisany z perspektywy śpiewu klasycznego, ale rozdziały o oddechu i rejestrach przydają się każdemu wokaliście.',
    practice: 'Czytaj rozdziałami równolegle ze ścieżką „Technika wokalna”; wracaj do rozdziału o oddechu przy lekcji „Oddech i podparcie”.',
  },
  {
    key: 'perricone-melody', title: 'Melody in Songwriting', author: 'Jack Perricone', topic: 'Melodia, rytm melodii, refren',
    pages: 200, kind: 'theory', paths: ['theory', 'writing'], verified: true,
    learning_goal: 'Budować melodie i refreny świadomie: kontur, motyw, relacja z harmonią, kontrast sekcji.',
    why: 'Łączy teorię z pisaniem piosenek — dokładnie to, czego potrzeba przy melodyjnych refrenach.',
    practice: 'Po rozdziale o refrenie porównaj go z refrenem, nad którym pracujesz, albo z trzema ulubionymi.',
  },
  {
    key: 'pattison-form', title: 'Songwriting: Essential Guide to Lyric Form and Structure', author: 'Pat Pattison', topic: 'Forma tekstu, rym, prozodia',
    pages: 190, kind: 'craft', paths: ['writing'], verified: true,
    learning_goal: 'Panować nad formą tekstu: sekcje, długości wersów, rymy i zgodność formy z treścią.',
    why: 'Krótka i konkretna — podstawa lekcji o prozodii i konstrukcji refrenu.',
    practice: 'Przy lekcji „Prozodia” sprawdź akcenty w swoim refrenie metodą z książki.',
  },
  {
    key: 'ohriner-flow', title: 'Flow: The Rhythmic Voice in Rap Music', author: 'Mitchell Ohriner', topic: 'Rytm w rapie — badania',
    pages: 300, kind: 'theory', paths: ['flow', 'analysis'], verified: true,
    learning_goal: 'Opisywać flow precyzyjnie: siatka, akcenty, grupowanie sylab, rytmiczny „głos” rapera.',
    why: 'Najpoważniejsze opracowanie flow — akademickie, więc czytaj wybrane rozdziały razem ze ścieżką „Flow”.',
    practice: 'Po rozdziale o siatce zrób transkrypcję 4 taktów ulubionej zwrotki.',
  },
  {
    key: 'connor-artistry', title: 'The Musical Artistry of Rap', author: 'Martin E. Connor', topic: 'Muzyczna analiza rapu',
    pages: 230, kind: 'theory', paths: ['flow', 'analysis'], verified: true,
    learning_goal: 'Słyszeć w rapie rytm, rym i wysokość dźwięku jako elementy muzyczne.',
    why: 'Dobre uzupełnienie Ohrinera — mniej techniczne, więcej przykładów analizy.',
    practice: 'Zastosuj jedną metodę analizy z książki w lekcji „Rozbiór całego utworu”.',
  },
  {
    key: 'moore-songmeans', title: 'Song Means', author: 'Allan F. Moore', topic: 'Analiza nagranej piosenki',
    pages: 420, kind: 'theory', paths: ['analysis'], verified: true,
    learning_goal: 'Analizować nagranie: przestrzeń brzmienia, forma, głos, persona, znaczenie.',
    why: 'Podstawa ścieżki „Analiza utworów” — obszerna, czytaj rozdział o personie i o przestrzeni brzmienia.',
    practice: 'Po rozdziale o personie zrób lekcję „Analiza tekstu i persony”.',
  },
  {
    key: 'pattison-wbl', title: 'Writing Better Lyrics', author: 'Pat Pattison', topic: 'Obraz, metafora, punkt widzenia',
    pages: 260, kind: 'craft', paths: ['writing'], verified: false,
    learning_goal: 'Pisać obrazem zamiast deklaracji, panować nad metaforą i punktem widzenia.',
    why: 'Najbardziej praktyczny podręcznik obrazu w tekście.',
    practice: 'Rozdział o „object writing” czytaj razem z lekcją „Obraz zamiast deklaracji”.',
  },
  {
    key: 'bradley-rhymes', title: 'Book of Rhymes: The Poetics of Hip Hop', author: 'Adam Bradley', topic: 'Poetyka rapu: rytm, rym, styl',
    pages: 240, kind: 'craft', paths: ['flow', 'writing', 'analysis'], verified: false,
    learning_goal: 'Rozumieć rap jako poezję: rytm, rodzaje rymów, gra słów, storytelling.',
    why: 'Daje język do opisu flow i rymu — przydatny przy analizie technik bez kopiowania wykonania.',
    practice: 'Rozdział o rymie czytaj z lekcją „Rym w siatce”.',
  },
  {
    key: 'edwards-howtorap', title: 'How to Rap', author: 'Paul Edwards', topic: 'Flow, pisanie, wykonanie — z wypowiedzi raperów',
    pages: 340, kind: 'craft', paths: ['flow'], verified: false,
    learning_goal: 'Poznać metody pracy wielu raperów: pisanie, flow, nagrywanie.',
    why: 'Zbiór realnych metod — dobre źródło alternatyw, gdy jedno podejście do flow przestaje działać.',
    practice: 'Wypisz 3 metody, które brzmią jak Twoje, i 1, której nigdy nie próbowano.',
  },
  {
    key: 'tweedy-onesong', title: 'How to Write One Song', author: 'Jeff Tweedy', topic: 'Proces pisania piosenki, nawyk',
    pages: 180, kind: 'creativity', paths: ['writing'], verified: false,
    learning_goal: 'Zbudować nawyk kończenia piosenek zamiast zbierania fragmentów.',
    why: 'Krótka i praktyczna; skupia się na regularnym tworzeniu bez czekania na wenę — zgodna z filozofią PULSE.',
    practice: 'Czytaj w krótkich porcjach przed sesjami w Creative Workflow.',
  },
  {
    key: 'rubin-creative-act', title: 'The Creative Act: A Way of Being', author: 'Rick Rubin', topic: 'Postawa twórcza, uważność, proces',
    pages: 430, kind: 'creativity', paths: ['analysis'], pl: true, verified: false,
    learning_goal: 'Rozwijać uważność na inspirację i decyzje twórcze.',
    why: 'Dobra lektura na okres zmęczenia rutyną — rozdziały są krótkie.',
    practice: 'Czytaj po jednym krótkim rozdziale, bez planu — to lektura na przerwy.',
  },
  {
    key: 'kleon-steal', title: 'Steal Like an Artist', author: 'Austin Kleon', topic: 'Wpływy, własny styl',
    pages: 160, kind: 'creativity', paths: ['analysis', 'writing'], pl: true, verified: false,
    learning_goal: 'Odróżniać czerpanie technik od kopiowania i świadomie budować styl z wpływów.',
    why: 'Wspiera zasadę Akademii: z inspiracji bierzesz „jak”, nie „co”.',
    practice: 'Czytaj razem z lekcją „Uczyć się z wpływów, nie kopiować”.',
  },
  {
    key: 'king-onwriting', title: 'Pamiętnik rzemieślnika (On Writing)', author: 'Stephen King', topic: 'Warsztat pisarski, redakcja',
    pages: 320, kind: 'craft', paths: ['writing'], pl: true, verified: false,
    learning_goal: 'Redagować własne teksty bez litości.',
    why: 'Część o redakcji przydaje się przy poprawianiu tekstów, które już istnieją.',
    practice: 'Po części o redakcji wróć do jednego tekstu w Projektach i sprawdź, co można skrócić.',
  },
  {
    key: 'rilke-letters', title: 'Listy do młodego poety', author: 'Rainer Maria Rilke', topic: 'Twórczość, samotność, autentyczność',
    pages: 100, kind: 'poetry', paths: ['writing'], pl: true, verified: false,
    learning_goal: 'Zbudować wewnętrzne powody tworzenia niezależne od oceny innych.',
    why: 'Krótka, refleksyjna — pasuje do melancholijnego, osobistego pisania.',
    practice: 'Lektura na jeden wieczór; nic nie trzeba z nią „robić”.',
  },
  {
    key: 'szymborska-wybor', title: 'Wiersze wybrane', author: 'Wisława Szymborska', topic: 'Poezja: precyzja, ironia, obraz',
    pages: 250, kind: 'poetry', paths: ['writing'], pl: true, verified: false,
    learning_goal: 'Uczyć się precyzji słowa i zaskakującej puenty.',
    why: 'Mistrzostwo puenty i konkretu.',
    practice: 'Czytaj po kilka wierszy; zapisuj w notatkach projektu mechanizmy puent, które Cię zaskoczyły.',
  },
  {
    key: 'poswiatowska-wybor', title: 'Wiersze wybrane', author: 'Halina Poświatowska', topic: 'Poezja: intensywność emocji, ciało, czas',
    pages: 200, kind: 'poetry', paths: ['writing'], pl: true, verified: false,
    learning_goal: 'Wyrażać intensywną emocję prostym, obrazowym językiem.',
    why: 'Emocjonalna intensywność bez patosu — bliska melancholijnemu kierunkowi.',
    practice: 'Przy lekcji „Obraz zamiast deklaracji” policz obrazy i deklaracje w jednym wierszu.',
  },
  {
    key: 'herbert-cogito', title: 'Pan Cogito', author: 'Zbigniew Herbert', topic: 'Poezja: postawa, symbol, persona',
    pages: 120, kind: 'poetry', paths: ['writing', 'analysis'], pl: true, verified: false,
    learning_goal: 'Rozumieć personę i symbol w tekście.',
    why: 'Uczy pisania przez postać — dobre tło dla lekcji o personie.',
    practice: 'Czytaj razem z lekcją „Analiza tekstu i persony”.',
  },
  {
    key: 'mckee-story', title: 'Story', author: 'Robert McKee', topic: 'Struktura opowieści, zwrot akcji',
    pages: 470, kind: 'craft', paths: ['writing'], pl: true, verified: false,
    learning_goal: 'Rozumieć mechanikę zwrotu i zmiany w historii.',
    why: 'Obszerna — warto czytać wybrane rozdziały o scenie i zwrocie, nie całość naraz.',
    practice: 'Rozdział o scenie czytaj z lekcją „Narracja i punkt widzenia”.',
  },
  {
    key: 'senior-mixing', title: 'Mixing Secrets for the Small Studio', author: 'Mike Senior', topic: 'Miks w domowym studiu',
    pages: 380, kind: 'craft', paths: ['analysis'], verified: false,
    learning_goal: 'Podstawy świadomego miksu i odsłuchu referencyjnego w domowych warunkach.',
    why: 'Praktyczna, bez sprzętowego fetyszu — jeśli miksujesz własne wokale.',
    practice: 'Rozdział o odsłuchu referencyjnym łączy się z lekcją „Warstwy wokalu w produkcji”.',
  },
  {
    key: 'desantis-making', title: 'Making Music: 74 Creative Strategies for Electronic Music Producers', author: 'Dennis DeSantis', topic: 'Strategie twórcze, blokady',
    pages: 300, kind: 'creativity', paths: ['analysis'], verified: false,
    learning_goal: 'Mieć zestaw strategii na start, utknięcie i kończenie utworu.',
    why: 'Krótkie rozdziały-problemy — do sięgania, gdy szkic stoi w miejscu.',
    practice: 'Sięgaj po rozdział, gdy utkniesz — bez czytania od deski do deski.',
  },
  {
    key: 'herstand-newbiz', title: 'How to Make It in the New Music Business', author: 'Ari Herstand', topic: 'Kariera niezależnego artysty',
    pages: 600, kind: 'business', paths: [], verified: false, retired: true,
    learning_goal: 'Rozumieć realia wydań i dystrybucji jako niezależny artysta.',
    why: 'Przewodnik po karierze bez wytwórni.',
    practice: 'Czytaj rozdziałami, gdy zbliża się wydanie.',
  },
  {
    key: 'passman-allyouneed', title: 'All You Need to Know About the Music Business', author: 'Donald S. Passman', topic: 'Prawa, umowy, tantiemy',
    pages: 560, kind: 'business', paths: [], verified: false, retired: true,
    learning_goal: 'Rozumieć podstawy praw autorskich, umów i tantiem.',
    why: 'Przydatna przed pierwszymi umowami.',
    practice: 'Czytaj wybrane rozdziały przed współpracą.',
  },
];

export const BOOK_BY_KEY: Record<string, CatalogBook> = Object.fromEntries(BOOKS.map((b) => [b.key, b]));
