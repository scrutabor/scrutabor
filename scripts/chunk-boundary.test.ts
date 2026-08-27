// The emitted build's chunk boundary, held from the artifact side: the
// language packages and the concordances live under _app/immutable/corpus/
// and NOWHERE else. A lazy-loading test over the source (`lazy-corpus`)
// could stay green while a one-line `eager: true` folded both packs into
// every page's graph; only the built output can say that did not happen.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const BUILD = 'build/_app/immutable';

// Content that exists ONLY in a language package or a concordance. The
// probes are data, not identifiers, so a bundler cannot rename them away:
// the Polish and English Hail Mary translations, and a concordance-only
// posting key.
const LANGUAGE_MARKERS = [
	'Zdrowaś Maryjo, łaski pełna',
	'Hail Mary, full of grace',
	'"abeuntibus"'
];

const measurable = existsSync(BUILD);

describe('the corpus chunk boundary in the emitted build', () => {
	it('was measured against a real build', () => {
		// `npm test` runs after `npm run build` (package.json wires it, CI
		// runs it in that order). A missing build means this gate measured
		// nothing, and a gate that examines zero subjects must say so.
		expect(measurable, 'no build/ to examine — run npm run build first').toBe(true);
	});

	it.skipIf(!measurable)('keeps every language and index byte under corpus/', () => {
		const outside: string[] = [];
		const walk = (dir: string) => {
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				const path = join(dir, entry.name);
				if (entry.isDirectory()) {
					if (entry.name === 'corpus') continue;
					walk(path);
					continue;
				}
				if (!entry.name.endsWith('.js')) continue;
				const text = readFileSync(path, 'utf8');
				for (const marker of LANGUAGE_MARKERS) {
					if (text.includes(marker)) outside.push(`${path}: ${marker.slice(0, 24)}…`);
				}
			}
		};
		walk(BUILD);
		expect(outside, 'language or index data escaped the lazy corpus boundary').toEqual([]);
	});

	it.skipIf(!measurable)('still ships them inside corpus/', () => {
		const corpus = join(BUILD, 'corpus');
		const texts = readdirSync(corpus).map((name) => readFileSync(join(corpus, name), 'utf8'));
		for (const marker of LANGUAGE_MARKERS) {
			expect(
				texts.some((text) => text.includes(marker)),
				`${marker.slice(0, 24)}… is nowhere in the corpus chunks`
			).toBe(true);
		}
	});
});
