import { afterEach, describe, expect, it, vi } from 'vitest';
import neutral from './data/commemorationes.json';
import pl from './data/languages/pl/commemorationes.json';
import en from './data/languages/en/commemorationes.json';
import { localizedCommemorations, type CommemorationAboutSlot } from './commemoration-titles';
import * as metadata from './corpus-metadata';
import { commemorationData, commemorationPageData, properData } from './loaders';
import { loadText } from './corpus';

const LITANIES = 'litaniae-maiores';
const PETRONILLA = 'sancta-petronilla';
const SECRET = 'proprium/dominica-i-passionis-secreta';
const catalogs = { pl, en };
const languages = ['pl', 'en'] as const;
const edited = () =>
	structuredClone(en) as {
		schema_version: string;
		language: string;
		titles: { id: string; title: string; about?: unknown }[];
	};
afterEach(() => vi.restoreAllMocks());

describe('localized commemoration context contract 1.1.0', () => {
	it.each(languages)(
		'%s preserves every real existing title and inherits all default prose',
		(lang) => {
			const lookup = localizedCommemorations(catalogs[lang], lang, neutral.commemorations);
			for (const entry of catalogs[lang].titles) {
				expect(lookup.title(entry.id)).toBe(entry.title);
				const owner = neutral.commemorations.find((row) => row.id === entry.id)!;
				for (const slot of owner.slots.filter((slot) => slot.text !== null))
					expect(lookup.about(entry.id, slot.key as CommemorationAboutSlot)).toBeUndefined();
			}
		}
	);
	it('distinguishes missing, empty and nonempty values without changing the input', () => {
		const value = edited();
		value.titles.find((row) => row.id === LITANIES)!.about = {
			secreta: '',
			postcommunio: 'A deliberate contextual explanation.'
		};
		const before = JSON.stringify(value);
		const lookup = localizedCommemorations(value, 'en', neutral.commemorations);
		expect(lookup.about(LITANIES, 'collecta')).toBeUndefined();
		expect(lookup.about(LITANIES, 'secreta')).toBe('');
		expect(lookup.about(LITANIES, 'postcommunio')).toBe('A deliberate contextual explanation.');
		expect(lookup.about(PETRONILLA, 'secreta')).toBeUndefined();
		expect(JSON.stringify(value)).toBe(before);
		// The validated view owns its value, not a mutable reference into the input object.
		(value.titles.find((row) => row.id === LITANIES)!.about as Record<string, string>).secreta =
			'later';
		expect(lookup.about(LITANIES, 'secreta')).toBe('');
		expect(() => lookup.title('unknown')).toThrow(/unknown/);
		expect(() => lookup.about('unknown', 'secreta')).toThrow(/unknown/);
		expect(() => lookup.about(LITANIES, 'unknown' as CommemorationAboutSlot)).toThrow(/slot/);
		expect(() => lookup.about('feria-adventus', 'secreta')).toThrow(/calendar/);
	});
	it.each<[string, unknown]>([
		['null map', null],
		['array map', []],
		['string map', ''],
		['null value', { secreta: null }],
		['number value', { secreta: 1 }],
		['boolean value', { secreta: false }],
		['array value', { secreta: [] }],
		['object value', { secreta: {} }],
		['whitespace', { secreta: ' \n\t' }],
		['unknown role', { evangelium: 'No.' }],
		['prototype key', JSON.parse('{"__proto__":"No."}')]
	])('rejects %s, then accepts the recovered exact catalog', (_name, about) => {
		const value = edited();
		value.titles.find((row) => row.id === LITANIES)!.about = about;
		expect(() => localizedCommemorations(value, 'en', neutral.commemorations)).toThrow(
			/commemoration/
		);
		expect(localizedCommemorations(en, 'en', neutral.commemorations).title(LITANIES)).toBe(
			'Greater Litanies'
		);
	});
	it.each<[string, (value: ReturnType<typeof edited>) => void]>([
		[
			'old version',
			(value: ReturnType<typeof edited>) => {
				value.schema_version = '1.0.0';
			}
		],
		[
			'wrong language',
			(value: ReturnType<typeof edited>) => {
				value.language = 'pl';
			}
		],
		[
			'missing identity',
			(value: ReturnType<typeof edited>) => {
				value.titles.pop();
			}
		],
		[
			'duplicate identity',
			(value: ReturnType<typeof edited>) => {
				value.titles[1] = value.titles[0];
			}
		],
		[
			'unknown identity',
			(value: ReturnType<typeof edited>) => {
				value.titles[0].id = 'unknown';
			}
		],
		[
			'extra field',
			(value: ReturnType<typeof edited>) => {
				Object.assign(value.titles[0], { extra: true });
			}
		],
		[
			'calendar key',
			(value: ReturnType<typeof edited>) => {
				value.titles.find((row) => row.id === 'feria-adventus')!.about = { secreta: '' };
			}
		]
	])('rejects %s without weakening the real recovered contract', (_name, mutate) => {
		const value = edited();
		mutate(value);
		expect(() => localizedCommemorations(value, 'en', neutral.commemorations)).toThrow(
			/commemoration/
		);
		expect(localizedCommemorations(en, 'en', neutral.commemorations).title(PETRONILLA)).toBe(
			'Saint Petronilla, Virgin'
		);
	});
});

describe('context about is an addressed-page view only', () => {
	it.each(languages)(
		'%s keeps the accurate real Rogation reference and Petronilla default',
		async (lang) => {
			for (const id of [LITANIES, PETRONILLA]) {
				const page = await commemorationPageData(id, lang);
				expect(page?.kind).toBe('orations');
				if (page?.kind !== 'orations') throw new Error('real addressed page missing');
				for (const part of page.parts) {
					const shared = await loadText(part.key, lang);
					expect(part.gloss).toBe(shared!.gloss);
				}
			}
			const secret = (await loadText(SECRET, lang))!.gloss.about!;
			expect(secret).toContain(
				lang === 'pl' ? '1. Niedziela Męki Pańskiej' : 'First Passion Sunday'
			);
			expect(secret).toContain(lang === 'pl' ? 'Litanii Większych' : 'Greater Litanies');
		}
	);
	it.each(languages)(
		'%s isolates replacement and suppression from the real shared Mass owner/cache',
		async (lang) => {
			const shared = (await loadText(SECRET, lang))!;
			const before = JSON.stringify(shared);
			const pack = await commemorationData(lang);
			const packBefore = JSON.stringify(pack);
			const ordinaryAbout = metadata.commemorationAbout;
			const lookup = vi.spyOn(metadata, 'commemorationAbout');
			try {
				for (const override of ['Context-only explanation.', '']) {
					lookup.mockImplementation((id, slot, language) =>
						id === LITANIES && slot === 'secreta' && language === lang
							? override
							: ordinaryAbout(id, slot, language)
					);
					const page = await commemorationPageData(LITANIES, lang);
					if (page?.kind !== 'orations') throw new Error('real addressed page missing');
					const part = page.parts.find((part) => part.key === SECRET)!;
					expect(part.gloss.about).toBe(override);
					expect(part.gloss).not.toBe(shared.gloss);
					expect(part.doc).toBe(shared.text);
					expect(part.gloss.segments).toBe(shared.gloss.segments);
					expect(part.gloss.words).toBe(shared.gloss.words);
					expect({ ...part.gloss, about: shared.gloss.about }).toEqual(shared.gloss);
					const mass = await properData('dominica-i-passionis', lang);
					const source = mass!.parts.find((part) => part.key === SECRET)!;
					expect(source.gloss).toBe(shared.gloss);
					expect(source.gloss.about).toBe(shared.gloss.about);
					expect(JSON.stringify(shared)).toBe(before);
					expect(JSON.stringify(pack)).toBe(packBefore);
					expect(JSON.stringify(await commemorationData(lang))).toBe(packBefore);
				}
			} finally {
				lookup.mockRestore();
			}
			const recovered = await commemorationPageData(LITANIES, lang);
			if (recovered?.kind !== 'orations') throw new Error('recovered page missing');
			expect(recovered.parts.find((part) => part.key === SECRET)!.gloss).toBe(shared.gloss);
			expect(JSON.stringify(shared)).toBe(before);
		}
	);
});
