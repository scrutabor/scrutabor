import { expect, test } from 'vitest';
import { buildBibliography, loadBibliographySource, loadTextBibliography } from './bibliography';

test.each(['pl', 'en'] as const)(
	'keeps the prayer printed for St Anastasia distinct from the digital reference in %s',
	async (lang) => {
		const bibliography = await buildBibliography(lang);
		const edition = bibliography.sections
			.find(({ id }) => id === 'latin_textual_sources')!
			.sources.find(({ id }) => id === 'edition.divinum-officium-missa.44667ff')!;
		const groups = await loadBibliographySource(lang, edition);
		for (const [part, firstLine, count] of [
			['collecta', 'L21-L23', 4],
			['secreta', 'L51-L53', 4],
			['postcommunio', 'L64-L66', 6]
		] as const) {
			const group = groups.find(({ url }) => url?.endsWith('12-25m2.txt#' + firstLine))!;
			const text = await loadTextBibliography(lang, 'proprium/nativitas-domini-in-aurora-' + part);
			const citation = text.context.find(({ url }) => url === group.url)!;
			expect(group.notes).toHaveLength(1);
			expect(citation.notes).toEqual(group.notes);
			expect(citation.passages).toEqual(group.passages);
			expect(citation.passages).toHaveLength(count);
			const note = group.notes![0].replaceAll('\u00a0', ' ');
			if (part === 'postcommunio') {
				expect(note).toContain(
					lang === 'pl' ? 'mszał Benzigera podaje Satiásti' : 'Benziger Missal prints Satiásti'
				);
				expect(note).toContain('Præsta nobis (C6b)');
				expect(citation.passages![3].url).toMatch(/Commune\/C6b\.txt#L42-L44$/);
				expect(citation.passages![4].url).toMatch(/Commune\/C6a\.txt#L88-L90$/);
			} else {
				expect(note).toContain('Per eundem');
				expect(note).toContain('Per Dominum');
			}
		}
	}
);
