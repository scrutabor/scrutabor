// The emitted build's chunk boundary, held from the artifact side: the
// language packages and the concordances live under _app/immutable/corpus/
// and NOWHERE else. A lazy-loading test over the source (`lazy-corpus`)
// could stay green while a one-line `eager: true` folded both packs into
// every page's graph; only the built output can say that did not happen.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
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

function filesUnder(dir: string): number {
	return readdirSync(dir, { withFileTypes: true }).reduce(
		(count, entry) => count + (entry.isDirectory() ? filesUnder(join(dir, entry.name)) : 1),
		0
	);
}

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

	it.skipIf(!measurable)('keeps the complete static reader below one thousand files', () => {
		// The hosting ceiling is 5,000 by product policy, but the accepted design
		// target is stricter: enough headroom for several complete editions and
		// new interface assets without returning to file-count triage.
		const count = filesUnder('build');
		expect(count, 'the preferred static-reader budget').toBeLessThanOrEqual(1_000);
		expect(count, 'the absolute hosting budget').toBeLessThanOrEqual(5_000);
	});

	it.skipIf(!measurable)('emits no client-router data sidecars', () => {
		const sidecars: string[] = [];
		const walk = (dir: string) => {
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				const path = join(dir, entry.name);
				if (entry.isDirectory()) walk(path);
				else if (entry.name === '__data.json') sidecars.push(path);
			}
		};
		walk('build');
		expect(sidecars).toEqual([]);
	});

	it.skipIf(!measurable)('keeps the catalogue and formulary tables off ordinary pages', () => {
		// The edition's manifests (every text of every language) and the
		// formulary table grow with every corpus batch — three quarters of a
		// megabyte between them at 1,091 texts. A prayer needs its own label
		// and a grammar page its example links, and both are resolved at
		// prerender so that neither page downloads the tables to print them.
		// The catalog, search and Ordo pages need them. Held by CONTENT — a
		// string that exists only in the root manifest and one only in the
		// formulary table — and by a byte budget, because a bundler names its
		// chunks as it likes.
		const TABLE_MARKERS = ['languages/pl/manifest.json', 'unique_component_texts'];
		const BUDGET = 400 * 1024;
		const pages = [
			'build/app/pl/ordinarium/credo.html',
			'build/app/en/orationes/ave-maria.html',
			'build/app/pl/grammatica/nominativus.html',
			'build/app/pl/formularium/dominica-i-adventus.html'
		];
		for (const page of pages) {
			const html = readFileSync(page, 'utf8');
			const scripts = [...new Set(html.match(/_app\/immutable\/[a-z]+\/[\w.-]+\.js/g) ?? [])];
			expect(scripts.length, `${page} names its scripts`).toBeGreaterThan(0);
			let bytes = 0;
			for (const script of scripts) {
				const text = readFileSync(join('build', script), 'utf8');
				bytes += text.length;
				for (const marker of TABLE_MARKERS) {
					expect(text.includes(marker), `${page} carries ${marker} via ${script}`).toBe(false);
				}
			}
			expect(bytes, `${page} script bytes`).toBeLessThanOrEqual(BUDGET);
		}
	});

	it.skipIf(!measurable)('keeps grouped formulary transports modest', () => {
		const root = 'build/artifacts/proprium';
		const packs = readdirSync(root, { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
			.map((entry) => join(entry.parentPath, entry.name));
		expect(packs.length, 'the year should be grouped, not emitted one day at a time').toBeLessThan(
			100
		);
		for (const pack of packs) {
			expect(statSync(pack).size, `${pack} is too large for a responsive day choice`).toBeLessThan(
				2_000_000
			);
		}
	});
});
