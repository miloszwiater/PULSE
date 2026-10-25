/**
 * Sources behind the Music Academy. `verified` = the bibliographic facts
 * (author, title, year, publisher/URL) were checked against a primary or
 * reliable listing while this content was written (October 2026).
 * Unverified items are real, widely cited works whose details were not
 * re-checked — the UI labels them "do sprawdzenia".
 */
export interface Source {
  key: string;
  title: string;
  author: string;
  year?: number;
  publisher?: string;
  url?: string;
  isbn?: string;
  kind: 'book' | 'article' | 'web' | 'course';
  verified: boolean;
  /** What the source is used for in PULSE and any caveat. */
  note: string;
}

export const SOURCES: Source[] = [
  {
    key: 'omt', kind: 'web', verified: true,
    title: 'Open Music Theory, wersja 2', author: 'Mark Gotham, Kyle Gullings, Chelsey Hamm, Bryn Hughes, Brian Jarvis, Megan Lavengood, John Peterson',
    url: 'https://viva.pressbooks.pub/openmusictheory/', publisher: 'VIVA Pressbooks (licencja CC BY-SA 4.0)',
    note: 'Darmowy, otwarty podręcznik akademicki: rytm i metrum, interwały, skale, harmonia, forma piosenki popularnej.',
  },
  {
    key: 'adams2009', kind: 'article', verified: true, year: 2009,
    title: 'On the Metrical Techniques of Flow in Rap Music', author: 'Kyle Adams',
    publisher: 'Music Theory Online 15.5', url: 'https://mtosmt.org/issues/mto.09.15.5/mto.09.15.5.adams.php',
    note: 'Analiza flow: położenie akcentowanych sylab i rymów względem metrum, zgodność składni z taktem, artykulacja.',
  },
  {
    key: 'ohriner2019', kind: 'book', verified: true, year: 2019,
    title: 'Flow: The Rhythmic Voice in Rap Music', author: 'Mitchell Ohriner', publisher: 'Oxford University Press', isbn: '9780190670412',
    note: 'Monografia o rytmie w rapie — siatka szesnastek, akcenty, grupowanie sylab, porównania raperów.',
  },
  {
    key: 'connor2018', kind: 'book', verified: true, year: 2018,
    title: 'The Musical Artistry of Rap', author: 'Martin E. Connor', publisher: 'McFarland', isbn: '9780786498987',
    note: 'Muzyczna analiza rapu: rytm, rym, wysokość dźwięku w wykonaniu.',
  },
  {
    key: 'ncvs-straw', kind: 'web', verified: true,
    title: 'Straw phonation (SOVT) — materiały National Center for Voice and Speech', author: 'Ingo R. Titze / NCVS',
    url: 'https://ncvs.org/?p=7980',
    note: 'Ćwiczenia z półprzymkniętym traktem głosowym (słomka): glissanda, krótkie serie po 2–5 minut kilka razy dziennie.',
  },
  {
    key: 'kapsner2015', kind: 'article', verified: true, year: 2015,
    title: 'A Randomized Controlled Trial of Two Semi-Occluded Vocal Tract Voice Therapy Protocols',
    author: 'Mara R. Kapsner-Smith, Eric J. Hunter, Kimberly Kirkham, Kimberly Cox, Ingo R. Titze',
    publisher: 'Journal of Speech, Language, and Hearing Research 58, s. 535–549',
    note: 'Badanie kliniczne terapii SOVT (słomka w wodzie) — podstawa naukowa ćwiczeń ze słomką. Dotyczy terapii, nie treningu artystycznego.',
  },
  {
    key: 'miller1986', kind: 'book', verified: true, year: 1986,
    title: 'The Structure of Singing: System and Art in Vocal Technique', author: 'Richard Miller', publisher: 'Schirmer Books',
    note: 'Klasyczny podręcznik techniki wokalnej; rozdział o zarządzaniu oddechem (appoggio). Pisany z perspektywy śpiewu klasycznego.',
  },
  {
    key: 'voice-hygiene', kind: 'web', verified: true,
    title: 'Zalecenia higieny głosu (materiały dla pacjentów ośrodków laryngologicznych, m.in. Johns Hopkins Voice Center)', author: 'Johns Hopkins Medicine',
    note: 'Nawodnienie, unikanie krzyku i dymu, odpoczynek głosowy; chrypka dłużej niż 2 tygodnie → wizyta u laryngologa lub foniatry.',
  },
  {
    key: 'henrich2006', kind: 'article', verified: false, year: 2006,
    title: 'Mirroring the voice from Garcia to the present day: some insights into singing voice registers', author: 'Nathalie Henrich',
    publisher: 'Logopedics Phoniatrics Vocology 31',
    note: 'Przegląd badań nad rejestrami (mechanizmy krtaniowe M1/M2). Szczegóły bibliograficzne do sprawdzenia.',
  },
  {
    key: 'ableton-learning', kind: 'course', verified: true,
    title: 'Learning Music', author: 'Ableton', url: 'https://learningmusic.ableton.com/',
    note: 'Darmowy, interaktywny kurs podstaw rytmu, melodii, akordów i budowy utworu w przeglądarce (uruchomiony w 2017 r.; aktualny stan strony do sprawdzenia).',
  },
  {
    key: 'musictheory-net', kind: 'web', verified: false,
    title: 'musictheory.net — lekcje i trening słuchu', author: 'Ricci Adams', url: 'https://www.musictheory.net/',
    note: 'Popularne darmowe lekcje i ćwiczenia (interwały, akordy, rozpoznawanie słuchem). Zawartość do sprawdzenia.',
  },
  {
    key: 'moore2012', kind: 'book', verified: true, year: 2012,
    title: 'Song Means: Analysing and Interpreting Recorded Popular Song', author: 'Allan F. Moore', publisher: 'Ashgate',
    note: 'Metoda analizy nagranej piosenki: warstwy brzmienia, forma, głos, persona, znaczenie.',
  },
  {
    key: 'perricone2000', kind: 'book', verified: true, year: 2000,
    title: 'Melody in Songwriting', author: 'Jack Perricone', publisher: 'Berklee Press', isbn: '9780634006388',
    note: 'Budowa melodii i refrenu: rytm melodii, kontur, relacja z harmonią, kontrast zwrotka–refren.',
  },
  {
    key: 'pattison1991', kind: 'book', verified: true, year: 1991,
    title: 'Songwriting: Essential Guide to Lyric Form and Structure', author: 'Pat Pattison', publisher: 'Berklee Press',
    note: 'Forma tekstu: sekcje, długość i rytm wersów, rymy, „prozodia” jako zgodność formy z treścią.',
  },
  {
    key: 'pattison-wbl', kind: 'book', verified: false,
    title: 'Writing Better Lyrics', author: 'Pat Pattison', publisher: 'Writer’s Digest Books',
    note: 'Pisanie obrazem („object writing”), metafora, punkt widzenia. Wydanie i rok do sprawdzenia.',
  },
  {
    key: 'bradley2009', kind: 'book', verified: false,
    title: 'Book of Rhymes: The Poetics of Hip Hop', author: 'Adam Bradley', publisher: 'Basic Civitas',
    note: 'Rap jako poezja: rytm, rym, gra słów, storytelling. Szczegóły wydania do sprawdzenia.',
  },
  {
    key: 'edwards2009', kind: 'book', verified: false,
    title: 'How to Rap: The Art and Science of the Hip-Hop MC', author: 'Paul Edwards', publisher: 'Chicago Review Press',
    note: 'Metody pracy raperów z ich wypowiedzi: pisanie, flow, wykonanie. Szczegóły wydania do sprawdzenia.',
  },
];

export const SOURCE_BY_KEY: Record<string, Source> = Object.fromEntries(SOURCES.map((s) => [s.key, s]));
