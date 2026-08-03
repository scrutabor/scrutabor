// UI strings live here; corpus content lives in the gloss layers.
export type Lang = 'pl' | 'en';

export const LANGS: Lang[] = ['pl', 'en'];

export interface Messages {
	langName: string;
	tagline: string;
	mottoRef: string;
	subtitle: string;
	levels: [string, string, string];
	levelsAria: string;
	translationLabel: string;
	themeAria: { toLight: string; toDark: string };
	langMenuAria: string;
	lemmaLabel: string;
	close: string;
	panelAria: string;
	cardCat: string;
	cardNote: string;
	working: string;
}

export const M: Record<Lang, Messages> = {
	pl: {
		langName: 'Polski',
		tagline: 'Módl się po łacinie ze zrozumieniem.',
		mottoRef: 'ps 118, 34',
		subtitle: 'ordinarium missæ · wydanie robocze',
		levels: ['sam tekst', 'co się dzieje', 'słowo po słowie'],
		levelsAria: 'Poziom pomocy',
		translationLabel: 'przekład',
		themeAria: { toLight: 'przełącz na tryb jasny', toDark: 'przełącz na tryb ciemny' },
		langMenuAria: 'wybór języka',
		lemmaLabel: 'lemat',
		close: 'Zamknij',
		panelAria: 'Analiza słowa',
		cardCat: 'ordinarium',
		cardNote: 'spowiedź powszechna — słowo po słowie',
		working: 'wydanie robocze · przed przeglądem eksperckim'
	},
	en: {
		langName: 'English',
		tagline: 'Pray in Latin with understanding.',
		mottoRef: 'ps 118 (119), 34',
		subtitle: 'ordinarium missæ · working edition',
		levels: ['text only', "what's happening", 'word by word'],
		levelsAria: 'Help level',
		translationLabel: 'translation',
		themeAria: { toLight: 'switch to light mode', toDark: 'switch to dark mode' },
		langMenuAria: 'language selection',
		lemmaLabel: 'lemma',
		close: 'Close',
		panelAria: 'Word analysis',
		cardCat: 'ordinarium',
		cardNote: 'the general confession — word by word',
		working: 'working edition · awaiting expert review'
	}
};

export function otherLang(lang: Lang): Lang {
	return lang === 'pl' ? 'en' : 'pl';
}
