import { describe, expect, it } from 'vitest';
import { formularyForText, textAnchor, textHref } from './content-url';
import { lemmaHref } from './lemma-url';

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

	it('selects a dictionary entry in the shared language page', () => {
		expect(lemmaHref('pl', 'pater')).toBe('/app/pl/lemma?l=pater');
	});
});
