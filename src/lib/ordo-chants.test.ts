import { expect, it } from 'vitest';
import { ORDO } from './ordo';

// RG 469–470 defer the intervening chants to the Missal's provisions. The
// Septuagesima proper (MR 1962 p. 51) expressly omits its Tract on the named
// ferias: absence of Alleluia does not by itself prescribe a Tract.
const notes = {
	pl: 'traktus śpiewa się tylko wtedy, gdy przewiduje go formularz dnia. Podobnie sekwencję dodaje się zgodnie z jego rubrykami',
	en: "the Tract is sung only when prescribed by the day's formulary. The Sequence is likewise included according to its rubrics"
} as const;

for (const language of ['pl', 'en'] as const) {
	it(`${language} defers the Tract and Sequence to the formulary's rubrics`, () => {
		const gradual = ORDO.flatMap((part) => part.entries).find((entry) => entry.id === 'graduale');
		expect(gradual?.when?.[language].replace(/\s+/g, ' ')).toBe(notes[language]);
	});
}
