import { expect, it } from 'vitest';
import { ORDO } from './ordo';

// RG 469–470 defer the intervening chants to the Missal's provisions. The
// Septuagesima proper (MR 1962 p. 51) expressly omits its Tract on the named
// ferias: absence of Alleluia does not by itself prescribe a Tract.
const notes = {
	pl: 'Traktus i sekwencja pojawiają się zgodnie z rubrykami formularza.',
	en: 'The Tract and the Sequence are included where prescribed.'
} as const;

for (const language of ['pl', 'en'] as const) {
	it(`${language} defers the Tract and Sequence to the formulary's rubrics`, () => {
		const gradual = ORDO.flatMap((part) => part.entries).find((entry) => entry.id === 'graduale');
		expect(gradual?.when?.[language].replace(/\s+/g, ' ')).toBe(notes[language]);
	});
}
