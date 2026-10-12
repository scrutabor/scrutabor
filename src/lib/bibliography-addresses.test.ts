import { describe, expect, test } from 'vitest';
import { buildBibliography, loadBibliographySource } from './bibliography';
import { loadedTextKeys } from './corpus';
import { PROPER_DAYS } from './proprium';

describe('bibliography destinations in the complete reader', () => {
	test.each(['pl', 'en'] as const)(
		'all %s evidence uses retain their exact reading address',
		async (lang) => {
			const loadedBefore = loadedTextKeys();
			const bibliography = await buildBibliography(lang);
			const counts = { proper: 0, ordinary: 0, lemma: 0, word: 0, segment: 0, range: 0, text: 0 };
			for (const source of bibliography.sections.flatMap((section) => section.sources)) {
				for (const group of await loadBibliographySource(lang, source)) {
					for (const use of group.uses) {
						const url = new URL(use.href, 'https://reader.invalid');
						if (use.kind === 'lemma') {
							counts.lemma++;
							expect(url.pathname).toBe(`/app/${lang}/lemma`);
							expect(url.searchParams.get('l')).toBe(use.key.slice('lemma:'.length));
							continue;
						}
						const [textId, first, last] = use.key.split(':');
						const textKey = textId.replace('.', '/');
						const isProper = textKey.startsWith('proprium/');
						const slug = textKey.split('/')[1];
						const prefix = isProper ? `${slug}.` : '';
						counts[use.kind]++;
						if (isProper) {
							counts.proper++;
							const candidates = PROPER_DAYS.filter((day) =>
								day.components.some((part) => part.text === textKey)
							);
							expect(candidates.length, textId).toBeGreaterThan(0);
							const owner =
								candidates.find((day) =>
									day.components.some((part) => part.text === textKey && part.relation === 'proper')
								) ?? candidates[0];
							expect(url.pathname, use.key).toBe(`/app/${lang}/formularium/${owner.id}`);
							expect(url.hash, use.key).toBe(`#text-proprium-${slug}`);
						} else {
							counts.ordinary++;
							expect(url.pathname, use.key).toBe(`/app/${lang}/${textKey}`);
							expect(url.hash).toBe('');
						}
						const query =
							use.kind === 'word'
								? { w: `${prefix}${first}` }
								: use.kind === 'segment' || use.kind === 'range'
									? { s: `${prefix}${first}${use.kind === 'range' ? `-${last}` : ''}` }
									: {};
						expect(Object.fromEntries(url.searchParams), use.key).toEqual(query);
					}
				}
			}
			expect(counts.proper).toBeGreaterThan(1000);
			for (const kind of ['ordinary', 'lemma', 'word', 'segment', 'range', 'text'] as const)
				expect(counts[kind], kind).toBeGreaterThan(0);
			expect(loadedTextKeys()).toEqual(loadedBefore);
		}
	);

	test('a new English Proper segment does not depend on a legacy redirect', async () => {
		const bibliography = await buildBibliography('en');
		const source = bibliography.sections
			.flatMap((section) => section.sources)
			.find((source) => source.id === 'edition.the-missal-for-the-use-of-the-laity-1853')!;
		const uses = (await loadBibliographySource('en', source)).flatMap((group) => group.uses);
		expect(uses).toContainEqual(
			expect.objectContaining({
				key: 'proprium.feria-v-in-cena-domini-collecta:s01:s01',
				href: '/app/en/formularium/feria-v-in-cena-domini?s=feria-v-in-cena-domini-collecta.s01#text-proprium-feria-v-in-cena-domini-collecta'
			})
		);
	});
});
