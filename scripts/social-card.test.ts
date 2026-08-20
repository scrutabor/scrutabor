// The social cards are committed PNGs drawn by scripts/social-card.mjs,
// which carries its own copy of the tagline — a generator cannot import
// the app's TypeScript. The tagline has already changed once
// (de-imperativised, then the comma dropped); a second change that misses
// the generator leaves the cards showing the old line with nothing to say
// so, because nothing regenerates them. This holds the two copies equal —
// it cannot prove the PNGs were regenerated, but it makes the drift
// visible at the source.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { M } from '../src/lib/i18n';

describe('the card generator and the app', () => {
	it('carry the same tagline in both languages', () => {
		const generator = readFileSync('scripts/social-card.mjs', 'utf8');
		const block = /const TAGLINE = \{([^}]*)\}/.exec(generator);
		expect(block, 'TAGLINE table in social-card.mjs').toBeTruthy();
		for (const lang of ['pl', 'en'] as const) {
			const entry = new RegExp(`${lang}:\\s*'([^']*)'`).exec(block![1]);
			expect(entry, `${lang} tagline in the generator`).toBeTruthy();
			// The i18n copy is bound Polish (no-break spaces); the generator
			// breaks its own lines, so compare the words.
			expect(entry![1].replace(/\u00a0/g, ' ')).toBe(M[lang].tagline.replace(/\u00a0/g, ' '));
		}
	});
});
