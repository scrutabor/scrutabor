// UI strings live here; corpus content lives in the gloss layers.
export type Lang = 'pl' | 'en';

// English first, everywhere a language list renders (owner rule).
export const LANGS: Lang[] = ['en', 'pl'];

export interface Messages {
	langName: string;
	tagline: string;
	mottoRef: string;
	workingEdition: string;
	levels: [string, string, string];
	levelsAria: string;
	themeAria: { toLight: string; toDark: string };
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
}

export const M: Record<Lang, Messages> = {
	pl: {
		langName: 'Polski',
		tagline: 'Módl się po łacinie ze zrozumieniem.',
		mottoRef: 'ps 118, 34',
		workingEdition: 'wydanie robocze',
		levels: ['sama łacina', 'słowo po słowie', 'pełny przekład'],
		levelsAria: 'Poziom pomocy',
		themeAria: { toLight: 'przełącz na tryb jasny', toDark: 'przełącz na tryb ciemny' },
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
			'Jak powstaje to wydanie: świadkowie i kolacja tekstów, mechaniczna weryfikacja analiz, stany przeglądu.',
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
		// NBSP after the one-letter preposition: Polish typography does not
		// leave 'z' hanging at the end of a line.
		ordoLead: 'porządek Mszy świętej według Mszału Rzymskiego z\u00a01962 roku',
		ordoSubtitle: 'Mszał Rzymski z\u00a01962 roku',
		ordoDescription:
			'Cały porządek Mszy w rycie z 1962 roku, część po części — z tekstami stałymi i miejscami, w których wchodzą teksty własne dnia.',
		ordoProper: 'z formularza dnia',
		ordoPending: 'wkrótce w tym wydaniu',
		grammarTitle: 'gramatyka',
		derivativesLabel: 'w polszczyźnie',
		pronunciationHint: 'zasady wymowy'
	},
	en: {
		langName: 'English',
		tagline: 'Pray in Latin with understanding.',
		mottoRef: 'ps 118 (119), 34',
		workingEdition: 'working edition',
		levels: ['Latin only', 'word by word', 'full translation'],
		levelsAria: 'Help level',
		themeAria: { toLight: 'switch to light mode', toDark: 'switch to dark mode' },
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
		pronunciationHint: 'pronunciation guide'
	}
};

export function otherLang(lang: Lang): Lang {
	return lang === 'pl' ? 'en' : 'pl';
}
