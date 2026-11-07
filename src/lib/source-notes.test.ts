import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import SourceNotes from './components/SourceNotes.svelte';
import {
	buildBibliography,
	loadBibliographySource,
	loadTextBibliography,
	uniqueCitations
} from './bibliography';

const source = { title: 'Prayer book', locator: 'p. 12', url: 'https://example.org/book' };

describe('material source limits', () => {
	it('preserves different qualifications when citations share a page', () => {
		const first = { ...source, notes: ['Only the ending is printed here.'] };
		const second = { ...source, notes: ['Other wording differs.'] };
		const combined = uniqueCitations([first, second, first]);
		expect(combined).toEqual([
			{ ...source, notes: ['Only the ending is printed here.', 'Other wording differs.'] }
		]);
		expect(first.notes).toEqual(['Only the ending is printed here.']);
	});
	it('keeps distinct page locations separate', () => {
		expect(uniqueCitations([source, { ...source, locator: 'p. 13' }])).toHaveLength(2);
	});
	it('renders a source limitation inside the source disclosure', () => {
		const note = 'Only the ending is printed here.';
		const html = render(SourceNotes, {
			props: { citations: [{ ...source, notes: [note] }], lang: 'en' }
		}).body;
		expect(html).toContain('citation-note');
		expect(html.indexOf(note)).toBeGreaterThan(html.indexOf('<details'));
		expect(html.indexOf(note)).toBeLessThan(html.indexOf('</details>'));
	});
});

// These are shipped source limitations, not notes synthesized by the renderer.
const sourceScopes = [
	{
		lang: 'en',
		key: 'orationes/te-deum',
		edition: 'edition.blessed-be-god-1925',
		fragment: 'The printed hymn ends with',
		other: 'pl'
	},
	{
		lang: 'pl',
		key: 'orationes/memorare',
		edition: 'edition.katechizm-religji-rzymsko-katolickiej-1925',
		fragment: 'Nie ustala pochodzenia pozostałych zdań modlitwy.',
		other: 'en'
	}
] as const;

describe('shipped source qualifications', () => {
	it.each(sourceScopes)(
		'retains $lang limits in both reading and bibliography views',
		async ({ lang, key, edition, fragment, other }) => {
			const reading = await loadTextBibliography(lang, key);
			const notes = reading.translation.flatMap((citation) => citation.notes ?? []);
			expect(notes.some((note) => note.includes(fragment))).toBe(true);
			expect(reading.context.flatMap((citation) => citation.notes ?? [])).not.toContainEqual(
				expect.stringContaining(fragment)
			);
			const catalogue = await buildBibliography(lang);
			const source = catalogue.sections
				.flatMap((section) => section.sources)
				.find((source) => source.id === edition);
			expect(source).toBeDefined();
			const details = await loadBibliographySource(lang, source!);
			expect(details.flatMap((group) => group.notes ?? [])).toContainEqual(
				expect.stringContaining(fragment)
			);
			const opposite = await loadTextBibliography(other, key);
			expect(opposite.translation.flatMap((citation) => citation.notes ?? [])).not.toContainEqual(
				expect.stringContaining(fragment)
			);
		}
	);
});
