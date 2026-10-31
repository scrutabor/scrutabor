import { describe, expect, it } from 'vitest';
import { commemorationForText, formularyForText, textAnchor, textHref } from './content-url';
import { lemmaHref } from './lemma-url';
import { commemorationLookup } from './commemorationes';

describe('canonical corpus addresses', () => {
	it('keeps ordinary texts on their own pages', () => {
		expect(textHref('pl', 'orationes/ave-maria', { word: 'w001' })).toBe(
			'/app/pl/orationes/ave-maria?w=w001'
		);
	});

	it('addresses a proper text inside its complete formulary', () => {
		const key = 'proprium/dominica-i-adventus-introitus';
		expect(formularyForText(key)).toBe('dominica-i-adventus');
		expect(textAnchor(key)).toBe('text-proprium-dominica-i-adventus-introitus');
		expect(textHref('en', key, { segment: 's001' })).toBe(
			'/app/en/formularium/dominica-i-adventus?s=dominica-i-adventus-introitus.s001#text-proprium-dominica-i-adventus-introitus'
		);
	});

	it('addresses a commemoration oration inside its set of orations', () => {
		const key = 'proprium/litaniae-maiores-collecta';
		expect(formularyForText(key)).toBeUndefined();
		expect(commemorationForText(key)).toBe('litaniae-maiores');
		expect(textHref('pl', key, { word: 'w001' })).toBe(
			'/app/pl/commemoratio/litaniae-maiores?w=litaniae-maiores-collecta.w001#text-proprium-litaniae-maiores-collecta'
		);
		// The shared Secret keeps the formulary that owns it.
		expect(commemorationForText('proprium/dominica-i-passionis-secreta')).toBe('litaniae-maiores');
		expect(formularyForText('proprium/dominica-i-passionis-secreta')).toBe('dominica-i-passionis');
	});

	it('prefers the proper owner after overlapping references without reordering them', () => {
		for (const role of ['secreta', 'postcommunio']) {
			const key = `proprium/sanctae-petronillae-${role}`;
			const users = commemorationLookup!.commemorations.filter((entry) =>
				entry.slots.some((slot) => slot.text === key)
			);
			expect(users.map(({ id }) => id)).toEqual([
				'sancta-maria-magdalena-de-pazzis',
				'sancta-monica',
				'sancta-petronilla'
			]);
			expect(users.map((entry) => entry.slots.find((slot) => slot.text === key)!.relation)).toEqual(
				['reference', 'reference', 'proper']
			);
			expect(commemorationForText(key)).toBe('sancta-petronilla');
			for (const lang of ['pl', 'en'] as const)
				expect(textHref(lang, key, { word: 'w001' })).toBe(
					`/app/${lang}/commemoratio/sancta-petronilla?w=sanctae-petronillae-${role}.w001#${textAnchor(key)}`
				);
		}
		// This actual addressed body has only reference users here; retain the existing fallback.
		expect(commemorationForText('proprium/dominica-i-passionis-secreta')).toBe('litaniae-maiores');
	});

	it('selects a dictionary entry in the shared language page', () => {
		expect(lemmaHref('pl', 'pater')).toBe('/app/pl/lemma?l=pater');
	});
});
