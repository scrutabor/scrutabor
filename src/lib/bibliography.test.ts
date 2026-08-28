import { describe, expect, test } from 'vitest';
import { buildBibliography } from './bibliography';
import { loadAllTexts, loadSenses } from './corpus';

describe('the reader-facing bibliography', () => {
	test('names a source role instead of counting repeated segment citations', async () => {
		const sources = buildBibliography('pl', await loadAllTexts('pl'), await loadSenses('pl'));
		const source = sources.find(({ title }) => title === 'Powściągliwość i Praca (1912)');

		expect(source?.roles).toEqual(['translation']);
		expect(source?.locators).toHaveLength(1);
		expect(source?.locators[0].groups).toEqual([
			{
				role: 'translation',
				uses: [
					{
						title: 'Te ígitur',
						href: '/app/pl/ordinarium/te-igitur'
					}
				]
			}
		]);
	});

	test('keeps an exact backlink and Latin form for a word explanation', async () => {
		const sources = buildBibliography('en', await loadAllTexts('en'), await loadSenses('en'));
		const grammar = sources.find(({ title }) => title === 'Allen and Greenough, New Latin Grammar');
		const use = grammar?.locators
			.flatMap(({ groups }) => groups)
			.filter(({ role }) => role === 'word')
			.flatMap(({ uses }) => uses)
			.find(({ detail }) => detail === 'retríbuam');

		expect(use).toEqual({
			title: 'Quid retríbuam',
			href: '/app/en/ordinarium/quid-retribuam?w=w002',
			detail: 'retríbuam'
		});
	});

	test('contains no empty, duplicated, or unclassified uses', async () => {
		for (const lang of ['pl', 'en'] as const) {
			const sources = buildBibliography(lang, await loadAllTexts(lang), await loadSenses(lang));
			for (const source of sources) {
				const roles = new Set(source.roles);
				expect(roles.size).toBeGreaterThan(0);
				for (const locator of source.locators) {
					for (const group of locator.groups) {
						expect(roles.has(group.role)).toBe(true);
						expect(group.uses.length).toBeGreaterThan(0);
						const keys = group.uses.map(
							(use) => `${use.href}\u0000${use.title}\u0000${use.detail ?? ''}`
						);
						expect(new Set(keys).size).toBe(keys.length);
					}
				}
			}
		}
	});
});
