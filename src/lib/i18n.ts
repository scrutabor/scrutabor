// UI strings live here; corpus content lives in the gloss layers.
import { bindProse } from './polish';
import type { Season } from './proprium';

export type Lang = 'pl' | 'en';

// English first, everywhere a language list renders (owner rule).
export const LANGS: Lang[] = ['en', 'pl'];

export interface Messages {
	langName: string;
	tagline: string;
	mottoRef: string;
	/** The colophon's word for an edition of the app. */
	edition: string;
	/** Accessible name for the compact home control inside the prayer book. */
	bookHome: string;
	/** The three reading modes, as the words the control shows: bare
	 * Latin, the word-by-word, the bilingual view. */
	levels: [string, string, string];
	levelsLabel: string;
	themeAria: { toLight: string; toDark: string };
	textSizeAria: string;
	textSizes: { normal: string; larger: string; largest: string };
	langMenuAria: string;
	close: string;
	panelAria: string;
	wordContextLabel: string;
	wordEntryLabel: string;
	wordFormLabel: string;
	working: string;
	lemmaPageHint: string;
	occurrences: string;
	externalDict: string;
	notFound: string;
	catalogDescription: string;
	editioDescription: string;
	bibliographyTitle: string;
	bibliographyDescription: string;
	bibliographyLink: string;
	grammarDescription: string;
	pronunciationDescription: string;
	/** '{title}' is replaced with the text's Latin title. */
	readingDescription: string;
	pageNotFound: string;
	errorGeneric: string;
	goHome: string;
	aboutLabel: string;
	sourcesLabel: string;
	pagerAria: string;
	ordoLead: string;
	ordoSubtitle: string;
	ordoDescription: string;
	ordoProper: string;
	dayLabel: string;
	dayNone: string;
	dayLoading: string;
	dayFailed: string;
	/** A real day of the calendar whose Mass this edition has not written.
	 * A different absence from `dayFailed`: nothing went wrong. */
	dayUnwritten: string;
	/** Announced when the picked day's texts have landed in the page. */
	dayInPlace: string;
	dayPartial: string;
	dayIsToday: string;
	dayAhead: string;
	dayWeekOf: string;
	/** What the day setting is doing, as the role and Mass hints do. */
	dayHint: Record<'none', string>;
	/** The seasons of the year, for grouping the day picker. */
	seasons: Record<Season, string>;
	ordoPending: string;
	grammarTitle: string;
	derivativesLabel: string;
	pronunciationHint: string;
	/** Who says a line, and how loudly (corpus 0.9.0). */
	speakers: Record<'sacerdos' | 'ductor' | 'minister' | 'populus' | 'omnes' | 'schola', string>;
	/** What the red mark beside a line stands for, for a reader meeting it
	 * for the first time. Shown on hover; the abbreviation is Latin and the
	 * expansion names both the word and who says the line. */
	markTitle: Record<'sacerdos' | 'ductor' | 'minister' | 'populus' | 'omnes' | 'schola', string>;
	/** The key to the marks, opened by tapping one. */
	markLegendTitle: string;
	markLegendNote: string;
	voices: Record<'submissa' | 'secreto' | 'cantus', string>;
	/** A verse number that cites its verse in the URL (the psalter). */
	verseAria: (n: number) => string;
	/** The reader's part at Mass, and the control that sets it. */
	roleLabel: string;
	roles: Record<'populus' | 'minister' | 'sacerdos', string>;
	/** Which kind of Mass the reader is at — the people's parts differ. */
	massLabel: string;
	massForms: Record<'cantu' | 'lecta', string>;
	/** Marks the responses EVERYONE makes, the first degree of the 1958
	 * instruction — the answer to a newcomer's real question. */
	everyone: string;
	/** What the reader in the pew is called over their own lines. The
	 * corpus's own word for that speaker is `populus`, printed as lud; this
	 * is the word the picker uses, so that the setting and the page agree. */
	faithful: string;
	/** Reader-facing attribution when the faithful make a line whose
	 * rubrical speaker is someone else. Both truths remain visible. */
	faithfulWith: Record<'sacerdos' | 'ductor' | 'minister' | 'populus' | 'omnes' | 'schola', string>;
	quietCollapsed: string;
	quietReveal: string;
	quietHide: string;
	quietAside: string;
	prayerFormsLabel: string;
	prayerFormShort: string;
	prayerFormLong: string;
	repeatedPrayer: string;
	repeatedPrayerShow: string;
	repeatedPrayerHide: string;
}

const MESSAGES: Record<Lang, Messages> = {
	pl: {
		langName: 'Polski',
		tagline: 'Modlitwa po łacinie ze zrozumieniem',
		mottoRef: 'ps\u00a0118,\u00a034',
		edition: 'wydanie',
		bookHome: 'strona główna modlitewnika',
		levels: ['łacina', 'interlinearnie', 'przekład'],
		levelsLabel: 'tryb',
		themeAria: { toLight: 'przełącz na tryb jasny', toDark: 'przełącz na tryb ciemny' },
		textSizeAria: 'wielkość pisma',
		textSizes: { normal: 'normalne', larger: 'większe', largest: 'największe' },
		langMenuAria: 'wybór języka',
		close: 'zamknij',
		panelAria: 'analiza słowa',
		wordContextLabel: 'znaczenie w kontekście',
		wordEntryLabel: 'hasło',
		wordFormLabel: 'forma',
		working: 'o wydaniu · wydanie robocze przed przeglądem eksperckim',
		lemmaPageHint: 'otwórz hasło',
		occurrences: 'w tekstach',
		externalDict: 'słownik zewnętrzny',
		notFound: 'Nie ma takiego hasła.',
		catalogDescription:
			'Modlitewnik łaciński z analizą słowo po słowie — przekład, gramatyka i wymowa każdego słowa.',
		editioDescription:
			'Jak powstaje to wydanie: świadkowie tekstu i ich kolacjonowanie, mechaniczna weryfikacja analiz, etapy przeglądu.',
		bibliographyTitle: 'bibliografia',
		bibliographyDescription:
			'Źródła przywołane w objaśnieniach Scrutabor, z dokładnymi odsyłaczami i miejscami ich wykorzystania.',
		bibliographyLink: 'pełna bibliografia',
		grammarDescription: 'Pojęcia gramatyki łacińskiej objaśnione na przykładach z modlitw.',
		pronunciationDescription:
			'Zasady wymowy łaciny kościelnej — tradycja rzymska i polska, z transkrypcją.',
		readingDescription:
			'{title} — tekst łaciński z analizą słowo po słowie, przekładem i objaśnieniami gramatycznymi.',
		pageNotFound: 'Ta strona nie istnieje.',
		errorGeneric: 'Wystąpił błąd.',
		goHome: 'wróć na stronę główną',
		aboutLabel: 'o modlitwie',
		sourcesLabel: 'źródła',
		pagerAria: 'sąsiednie teksty',
		ordoLead: 'Porządek Mszy świętej według Mszału Rzymskiego z 1962 roku',
		ordoSubtitle: 'Mszał Rzymski z 1962 roku',
		ordoDescription:
			'Cały porządek Mszy w rycie z 1962 roku, część po części — z tekstami stałymi i miejscami, w których wchodzą teksty własne dnia.',
		ordoProper: 'z formularza dnia',
		dayLabel: 'dzień',
		dayNone: 'bez formularza',
		dayLoading: 'wczytywanie',
		dayFailed: 'nie udało się wczytać',
		dayUnwritten: 'jeszcze nie w tym wydaniu',
		dayInPlace: 'teksty dnia są na stronie',
		dayPartial: '(część tekstów)',
		dayIsToday: 'dziś ·',
		dayAhead: 'formularza na dziś jeszcze tu nie ma — wybierz inny dzień',
		dayWeekOf: 'dziś dzień powszedni — ostatnia niedziela to',
		dayHint: {
			none: 'sam porządek Mszy, bez tekstów zmiennych'
		},
		seasons: {
			adventus: 'Adwent',
			nativitas: 'Okres Bożego Narodzenia',
			epiphania: 'Okres Objawienia Pańskiego',
			septuagesima: 'Przedpoście',
			quadragesima: 'Wielki Post',
			passionis: 'Okres Męki Pańskiej',
			paschale: 'Okres wielkanocny',
			'per-annum': 'Okres w ciągu roku'
		},
		ordoPending: 'jeszcze nie w tym wydaniu',
		grammarTitle: 'gramatyka',
		derivativesLabel: 'w polszczyźnie',
		speakers: {
			sacerdos: 'kapłan',
			ductor: 'prowadzący',
			minister: 'usługujący',
			populus: 'lud',
			omnes: 'wszyscy',
			schola: 'schola'
		},
		markTitle: {
			sacerdos: 'Versículus — werset, który mówi kapłan',
			ductor: 'Versículus — werset osoby prowadzącej modlitwę',
			minister: 'Respónsum — odpowiedź usługującego i wiernych',
			populus: 'Respónsum — odpowiedź wiernych',
			omnes: 'Omnes — mówią wszyscy razem',
			schola: 'Respónsum — śpiewa schola'
		},
		markLegendTitle: 'znaki przy wierszach',
		markLegendNote:
			'Znak stoi tam, gdzie zmienia się mówiący, i powtarza się po każdej rubryce. Wiersze bez znaku należą do głosu powyżej.',
		voices: { submissa: 'półgłosem', secreto: 'po cichu', cantus: 'śpiew' },
		verseAria: (n) => `odnośnik do wersetu ${n}`,
		roleLabel: 'rola',
		massLabel: 'msza',
		massForms: { cantu: 'śpiewana', lecta: 'cicha' },
		everyone: 'odpowiadają wszyscy',
		faithful: 'wierni',
		faithfulWith: {
			sacerdos: 'kapłan i wierni',
			ductor: 'prowadzący i wierni',
			minister: 'usługujący i wierni',
			populus: 'wierni',
			omnes: 'wszyscy',
			schola: 'schola i wierni'
		},
		roles: { populus: 'wierni', minister: 'usługujący', sacerdos: 'kapłan' },
		quietCollapsed: 'kapłan modli się po cichu',
		quietReveal: 'pokaż',
		quietHide: 'ukryj',
		quietAside: 'modlitwa kapłana',
		prayerFormsLabel: 'forma modlitwy',
		prayerFormShort: 'antyfona',
		prayerFormLong: 'forma rozszerzona',
		repeatedPrayer: 'Ave María, grátia plena…',
		repeatedPrayerShow: 'pokaż tekst',
		repeatedPrayerHide: 'ukryj tekst',
		pronunciationHint: 'zasady wymowy'
	},
	en: {
		langName: 'English',
		tagline: 'Prayer in Latin with understanding',
		mottoRef: 'ps\u00a0118\u00a0(119),\u00a034',
		edition: 'edition',
		bookHome: 'prayer book home',
		levels: ['Latin', 'interlinear', 'translation'],
		levelsLabel: 'mode',
		themeAria: { toLight: 'switch to light mode', toDark: 'switch to dark mode' },
		textSizeAria: 'text size',
		textSizes: { normal: 'normal', larger: 'larger', largest: 'largest' },
		langMenuAria: 'language selection',
		close: 'close',
		panelAria: 'word analysis',
		wordContextLabel: 'meaning in context',
		wordEntryLabel: 'dictionary entry',
		wordFormLabel: 'form',
		working: 'about this edition · working edition awaiting expert review',
		lemmaPageHint: 'open the entry',
		occurrences: 'in the texts',
		externalDict: 'external dictionary',
		notFound: 'No such entry.',
		catalogDescription:
			'A Latin prayer book with word-by-word analysis — translation, grammar, and pronunciation for every word.',
		editioDescription:
			'How this edition is made: text witnesses and collation, mechanical verification of the analyses, review states.',
		bibliographyTitle: 'bibliography',
		bibliographyDescription:
			'Sources cited by Scrutabor’s explanations, with exact references and the places where they are used.',
		bibliographyLink: 'complete bibliography',
		grammarDescription: 'Latin grammar concepts explained with examples from the prayers.',
		pronunciationDescription:
			'How to pronounce ecclesiastical Latin — the Roman and Polish traditions, with transcriptions.',
		readingDescription:
			'{title} — the Latin text with word-by-word analysis, translation, and grammar notes.',
		pageNotFound: 'This page does not exist.',
		errorGeneric: 'Something went wrong.',
		goHome: 'go to the home page',
		aboutLabel: 'about this prayer',
		sourcesLabel: 'sources',
		pagerAria: 'neighboring texts',
		ordoLead: 'The order of Mass in the Roman Missal of 1962',
		ordoSubtitle: 'the Roman Missal of 1962',
		ordoDescription:
			'The whole order of Mass in the 1962 rite, part by part — the fixed texts, and where the day’s own texts belong.',
		ordoProper: 'from the day’s formulary',
		dayLabel: 'day',
		dayNone: 'no formulary',
		dayLoading: 'loading',
		dayFailed: 'could not be loaded',
		dayUnwritten: 'not yet in this edition',
		dayInPlace: 'the day’s texts are on the page',
		dayPartial: '(some texts)',
		dayIsToday: 'today ·',
		dayAhead: 'today’s formulary is not here yet — choose another day',
		dayWeekOf: 'today is a weekday — the last Sunday:',
		dayHint: {
			none: 'the order of Mass alone, without the day’s own texts'
		},
		seasons: {
			adventus: 'Advent',
			nativitas: 'Christmastide',
			epiphania: 'Epiphanytide',
			septuagesima: 'Septuagesima',
			quadragesima: 'Lent',
			passionis: 'Passiontide',
			paschale: 'Eastertide',
			'per-annum': 'Through the year'
		},
		ordoPending: 'not yet in this edition',
		grammarTitle: 'grammar',
		derivativesLabel: 'in English',
		speakers: {
			sacerdos: 'priest',
			ductor: 'leader',
			minister: 'server',
			populus: 'people',
			omnes: 'all',
			schola: 'choir'
		},
		markTitle: {
			sacerdos: 'Versículus — the verse the priest says',
			ductor: 'Versículus — the verse said by the prayer leader',
			minister: 'Respónsum — the answer of the server and the faithful',
			populus: 'Respónsum — the answer of the faithful',
			omnes: 'Omnes — said by all together',
			schola: 'Respónsum — sung by the choir'
		},
		markLegendTitle: 'the marks beside the lines',
		markLegendNote:
			'A mark stands where the voice changes, and again after every rubric. Lines without one belong to the voice above them.',
		voices: { submissa: 'in a low voice', secreto: 'silently', cantus: 'sung' },
		verseAria: (n) => `link to verse ${n}`,
		roleLabel: 'part',
		massLabel: 'Mass',
		massForms: { cantu: 'sung', lecta: 'low' },
		everyone: 'everyone answers',
		faithful: 'the faithful',
		faithfulWith: {
			sacerdos: 'priest and faithful',
			ductor: 'leader and faithful',
			minister: 'server and faithful',
			populus: 'the faithful',
			omnes: 'all',
			schola: 'choir and faithful'
		},
		// Bare nouns, no article: this is a label, and a label is what the
		// missals put in the margin beside a line — Priest, Server, Faithful.
		// The article belongs in the sentence underneath, where it reads as
		// English rather than as three repetitions of "the".
		roles: { populus: 'faithful', minister: 'server', sacerdos: 'priest' },
		quietCollapsed: 'the priest prays silently',
		quietReveal: 'show',
		quietHide: 'hide',
		quietAside: 'the priest’s prayer',
		prayerFormsLabel: 'prayer form',
		prayerFormShort: 'antiphon',
		prayerFormLong: 'extended form',
		repeatedPrayer: 'Ave María, grátia plena…',
		repeatedPrayerShow: 'show text',
		repeatedPrayerHide: 'hide text',
		pronunciationHint: 'pronunciation guide'
	}
};

// Polish one-letter words are bound to what follows them (see lib/polish);
// English needs nothing of the kind.
export const M: Record<Lang, Messages> = { en: MESSAGES.en, pl: bindProse(MESSAGES.pl) };
