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
	pageNotFound: string;
	errorGeneric: string;
	goHome: string;
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
		pageNotFound: 'Ta strona nie istnieje.',
		errorGeneric: 'Coś poszło nie tak.',
		goHome: 'wróć na stronę główną',
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
		pageNotFound: 'This page does not exist.',
		errorGeneric: 'Something went wrong.',
		goHome: 'go to the home page',
		grammarTitle: 'grammar',
		derivativesLabel: 'in English',
		pronunciationHint: 'pronunciation guide'
	}
};

export function otherLang(lang: Lang): Lang {
	return lang === 'pl' ? 'en' : 'pl';
}
