import { expect, it } from 'vitest';
import { expandDocument } from './corpus';

it('decodes a translation label only from its own language artifact', () => {
	const core = { id: 'test.label', st: 'working-edition', ad: 0, seg: [] };
	const label = 'Przekład hymniczny ks. Tadeusza Karyłowskiego';
	const pl = expandDocument(
		core,
		{ id: core.id, language: 'pl', about: 'Test.', translation_label: label, seg: [] },
		[]
	);
	const en = expandDocument(core, { id: core.id, language: 'en', about: 'Test.', seg: [] }, []);
	expect(pl.gloss.translation_label).toBe(label);
	expect(pl.text).not.toHaveProperty('translation_label');
	expect(en.gloss).not.toHaveProperty('translation_label');
});
