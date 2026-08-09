// UI strings live here; corpus content lives in the gloss layers.
import { bindProse } from './polish';
export type Lang = 'pl' | 'en';

// English first, everywhere a language list renders (owner rule).
export const LANGS: Lang[] = ['en', 'pl'];

export interface Messages {
	langName: string;
	tagline: string;
	mottoRef: string;
	workingEdition: string;
	/** The colophon's word for an edition of the app. */
	edition: string;
	levels: [string, string, string];
	levelsAria: string;
	themeAria: { toLight: string; toDark: string };
	textSizeAria: string;
	textSizes: { normal: string; larger: string; largest: string };
	langMenuAria: string;
	close: string;
	panelAria: string;
	working: string;
	lemmaPageHint: string;
	occurrences: string;
	externalDict: string;
	notFound: string;
	catalogDescription: string;
	editioDescription: string;
	grammarDescription: string;
	pronunciationDescription: string;
	/** '{title}' is replaced with the text's Latin title. */
	readingDescription: string;
	pageNotFound: string;
	errorGeneric: string;
	goHome: string;
	aboutLabel: string;
	pagerAria: string;
	ordoLead: string;
	ordoSubtitle: string;
	ordoDescription: string;
	ordoProper: string;
	ordoPending: string;
	grammarTitle: string;
	derivativesLabel: string;
	pronunciationHint: string;
	/** Who says a line, and how loudly (corpus 0.9.0). */
	speakers: Record<'sacerdos' | 'minister' | 'populus' | 'omnes' | 'schola', string>;
	/** What the red mark beside a line stands for, for a reader meeting it
	 * for the first time. Shown on hover; the abbreviation is Latin and the
	 * expansion names both the word and who says the line. */
	markTitle: Record<'sacerdos' | 'minister' | 'populus' | 'omnes' | 'schola', string>;
	/** The key to the marks, opened by tapping one. */
	markLegendTitle: string;
	markLegendNote: string;
	voices: Record<'submissa' | 'secreto' | 'cantus', string>;
	/** A verse number that cites its verse in the URL (the psalter). */
	verseAria: (n: number) => string;
	/** Marks a line the reader answers with, so it can be found at a glance. */
	/** The reader's part at Mass, and the control that sets it. */
	roleLabel: string;
	roles: Record<'populus' | 'minister' | 'sacerdos', string>;
	/** Which kind of Mass the reader is at — the people's parts differ. */
	massLabel: string;
	massForms: Record<'cantu' | 'lecta', string>;
	massHint: Record<'cantu' | 'lecta', string>;
	/** Marks the responses EVERYONE makes, the first degree of the 1958
	 * instruction — the answer to a newcomer's real question. */
	everyone: string;
	/** What the reader in the pew is called over their own lines. The
	 * corpus's own word for that speaker is `populus`, printed as lud; this
	 * is the word the picker uses, so that the setting and the page agree. */
	faithful: string;
	roleHint: Record<'populus' | 'minister' | 'sacerdos', string>;
	quietCollapsed: string;
	quietReveal: string;
	quietHide: string;
	quietAside: string;
}

const MESSAGES: Record<Lang, Messages> = {
	pl: {
		langName: 'Polski',
		tagline: 'Modlitwa po łacinie ze zrozumieniem',
		mottoRef: 'ps\u00a0118,\u00a034',
		workingEdition: 'wydanie robocze',
		edition: 'wydanie',
		levels: ['sama łacina', 'słowo po słowie', 'pełny przekład'],
		levelsAria: 'Poziom pomocy',
		themeAria: { toLight: 'przełącz na tryb jasny', toDark: 'przełącz na tryb ciemny' },
		textSizeAria: 'wielkość pisma',
		textSizes: { normal: 'normalne', larger: 'większe', largest: 'największe' },
		langMenuAria: 'wybór języka',
		close: 'Zamknij',
		panelAria: 'Analiza słowa',
		working: 'wydanie robocze · przed przeglądem eksperckim',
		lemmaPageHint: 'otwórz hasło',
		occurrences: 'w tekstach',
		externalDict: 'słownik zewnętrzny',
		notFound: 'Nie ma takiego hasła.',
		catalogDescription:
			'Modlitewnik łaciński z analizą słowo po słowie — przekład, gramatyka i wymowa każdego słowa.',
		editioDescription:
			'Jak powstaje to wydanie: świadkowie tekstu i ich kolacjonowanie, mechaniczna weryfikacja analiz, etapy przeglądu.',
		grammarDescription: 'Pojęcia gramatyki łacińskiej objaśnione na przykładach z modlitw.',
		pronunciationDescription:
			'Zasady wymowy łaciny kościelnej — tradycja rzymska i polska, z transkrypcją.',
		readingDescription:
			'{title} — tekst łaciński z analizą słowo po słowie, przekładem i objaśnieniami gramatycznymi.',
		pageNotFound: 'Ta strona nie istnieje.',
		errorGeneric: 'Coś poszło nie tak.',
		goHome: 'wróć na stronę główną',
		aboutLabel: 'o modlitwie',
		pagerAria: 'sąsiednie teksty',
		ordoLead: 'porządek Mszy świętej według Mszału Rzymskiego z 1962 roku',
		ordoSubtitle: 'Mszał Rzymski z 1962 roku',
		ordoDescription:
			'Cały porządek Mszy w rycie z 1962 roku, część po części — z tekstami stałymi i miejscami, w których wchodzą teksty własne dnia.',
		ordoProper: 'z formularza dnia',
		ordoPending: 'wkrótce w tym wydaniu',
		grammarTitle: 'gramatyka',
		derivativesLabel: 'w polszczyźnie',
		speakers: {
			sacerdos: 'kapłan',
			minister: 'ministrant',
			populus: 'lud',
			omnes: 'wszyscy',
			schola: 'schola'
		},
		markTitle: {
			sacerdos: 'Versículus — werset, który mówi kapłan',
			minister: 'Responsórium — odpowiedź ministranta',
			populus: 'Responsórium — odpowiedź wiernych',
			omnes: 'Omnes — mówią wszyscy razem',
			schola: 'Responsórium — śpiewa schola'
		},
		markLegendTitle: 'znaki przy wierszach',
		markLegendNote:
			'Znak stoi tam, gdzie zmienia się mówiący, i powtarza się po każdej rubryce. Wiersze bez znaku należą do głosu powyżej.',
		voices: { submissa: 'półgłosem', secreto: 'po cichu', cantus: 'śpiew' },
		verseAria: (n) => `odnośnik do wersetu ${n}`,
		roleLabel: 'teksty dla',
		massLabel: 'Msza',
		massForms: { cantu: 'śpiewana', lecta: 'cicha' },
		massHint: {
			cantu: 'wierni śpiewają odpowiedzi i części stałe',
			lecta: 'wierni odpowiadają razem z ministrantem i odmawiają części stałe'
		},
		everyone: 'odpowiadają wszyscy',
		faithful: 'wierni',
		roles: { populus: 'wiernych', minister: 'ministranta', sacerdos: 'kapłana' },
		roleHint: {
			populus: 'części odmawiane głośno, z odpowiedziami wiernych',
			minister: 'części odmawiane głośno, z pełnymi odpowiedziami ministranta',
			sacerdos: 'całe Ordo Missæ, wraz z modlitwami odmawianymi po cichu'
		},
		quietCollapsed: 'kapłan modli się po cichu',
		quietReveal: 'pokaż',
		quietHide: 'ukryj',
		quietAside: 'modlitwa kapłana',
		pronunciationHint: 'zasady wymowy'
	},
	en: {
		langName: 'English',
		tagline: 'Prayer in Latin, with understanding',
		mottoRef: 'ps\u00a0118\u00a0(119),\u00a034',
		workingEdition: 'working edition',
		edition: 'edition',
		levels: ['Latin only', 'word by word', 'full translation'],
		levelsAria: 'Help level',
		themeAria: { toLight: 'switch to light mode', toDark: 'switch to dark mode' },
		textSizeAria: 'text size',
		textSizes: { normal: 'normal', larger: 'larger', largest: 'largest' },
		langMenuAria: 'language selection',
		close: 'Close',
		panelAria: 'Word analysis',
		working: 'working edition · awaiting expert review',
		lemmaPageHint: 'open the entry',
		occurrences: 'in the texts',
		externalDict: 'external dictionary',
		notFound: 'No such entry.',
		catalogDescription:
			'A Latin prayer book with word-by-word analysis — translation, grammar, and pronunciation for every word.',
		editioDescription:
			'How this edition is made: text witnesses and collation, mechanical verification of the analyses, review states.',
		grammarDescription: 'Latin grammar concepts explained with examples from the prayers.',
		pronunciationDescription:
			'How to pronounce ecclesiastical Latin, in the Roman tradition, with transcriptions.',
		readingDescription:
			'{title} — the Latin text with word-by-word analysis, translation, and grammar notes.',
		pageNotFound: 'This page does not exist.',
		errorGeneric: 'Something went wrong.',
		goHome: 'go to the home page',
		aboutLabel: 'about this prayer',
		pagerAria: 'neighboring texts',
		ordoLead: 'the order of Mass in the Roman Missal of 1962',
		ordoSubtitle: 'the Roman Missal of 1962',
		ordoDescription:
			'The whole order of Mass in the 1962 rite, part by part — the fixed texts, and where the day’s own texts belong.',
		ordoProper: 'from the day’s formulary',
		ordoPending: 'not yet in this edition',
		grammarTitle: 'grammar',
		derivativesLabel: 'in English',
		speakers: {
			sacerdos: 'priest',
			minister: 'server',
			populus: 'people',
			omnes: 'all',
			schola: 'choir'
		},
		markTitle: {
			sacerdos: 'Versículus — the verse the priest says',
			minister: 'Responsórium — the server’s answer',
			populus: 'Responsórium — the answer of the faithful',
			omnes: 'Omnes — said by all together',
			schola: 'Responsórium — sung by the choir'
		},
		markLegendTitle: 'the marks beside the lines',
		markLegendNote:
			'A mark stands where the voice changes, and again after every rubric. Lines without one belong to the voice above them.',
		voices: { submissa: 'in a low voice', secreto: 'silently', cantus: 'sung' },
		verseAria: (n) => `link to verse ${n}`,
		roleLabel: 'texts for',
		massLabel: 'Mass',
		massForms: { cantu: 'sung', lecta: 'low' },
		massHint: {
			cantu: 'the faithful sing the responses and the Ordinary',
			lecta: 'the faithful answer with the server and say the Ordinary'
		},
		everyone: 'everyone answers',
		faithful: 'the faithful',
		// Bare nouns, no article: this is a label, and a label is what the
		// missals put in the margin beside a line — Priest, Server, Faithful.
		// The article belongs in the sentence underneath, where it reads as
		// English rather than as three repetitions of "the".
		roles: { populus: 'faithful', minister: 'server', sacerdos: 'priest' },
		roleHint: {
			populus: 'the parts said aloud, with the answers of the faithful',
			minister: 'the parts said aloud, with the server’s answers in full',
			sacerdos: 'the whole Ordo Missæ, including the prayers said silently'
		},
		quietCollapsed: 'the priest prays silently',
		quietReveal: 'show',
		quietHide: 'hide',
		quietAside: 'the priest’s prayer',
		pronunciationHint: 'pronunciation guide'
	}
};

// Polish one-letter words are bound to what follows them (see lib/polish);
// English needs nothing of the kind.
export const M: Record<Lang, Messages> = { en: MESSAGES.en, pl: bindProse(MESSAGES.pl) };

export function otherLang(lang: Lang): Lang {
	return lang === 'pl' ? 'en' : 'pl';
}
