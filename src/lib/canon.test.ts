import { describe, expect, it } from 'vitest';
import table from './data/canon.json';
import {
	CANON_ROLES,
	CANON_VARIANTS,
	createCanonLookup,
	canonKey,
	selectedCanon,
	validateCanonPack
} from './canon';
import { canonData } from './loaders';
import { indexOccurrenceWords, properOccurrences } from './proper-occurrences';
import { resolveCompositeAddress } from './reading-address';

describe('source-owned Canon table', () => {
	it('reads every real date/Mass pair, not a calendar reimplementation', () => {
		const lookup = createCanonLookup(table);
		expect(table.pairs).toHaveLength(7610);
		for (const [date, mass, profile] of table.pairs)
			expect(lookup.resolve(String(date), table.masses[Number(mass)])).toEqual(
				table.profiles[Number(profile)]
			);
	});
	it('follows the repaired calendar: St Matthias on 25 February of a leap year, no Friday Sunday', () => {
		const lookup = createCanonLookup(table);
		expect(lookup.resolve('2028-02-25', 'sancti-matthiae-apostoli').id).toBe('ordinary');
		expect(() => lookup.resolve('2028-02-24', 'sancti-matthiae-apostoli')).toThrow();
		expect(() => lookup.resolve('2033-12-30', 'dominica-infra-octavam-nativitatis')).toThrow();
		expect(lookup.resolve('2029-12-30', 'dominica-infra-octavam-nativitatis').id).toBe(
			'nativitas-in-die'
		);
	});
	it.each([
		['2026-04-02', 'feria-v-in-cena-domini', 'in-cena-domini'],
		['2026-12-25', 'nativitas-domini-in-nocte', 'nativitas-in-nocte'],
		['2026-12-25', 'nativitas-domini-in-aurora', 'nativitas-in-die'],
		['2026-12-25', 'nativitas-domini-in-die', 'nativitas-in-die'],
		['2026-04-04', 'vigilia-paschalis', 'pascha-in-nocte'],
		['2026-04-05', 'dominica-resurrectionis', 'pascha-in-die'],
		['2026-05-14', 'ascensio-domini', 'ascensio'],
		['2026-05-23', 'vigilia-pentecostes', 'pentecostes'],
		['2026-05-24', 'dominica-pentecostes', 'pentecostes'],
		['2026-12-13', 'dominica-iii-adventus', 'ordinary']
	])('resolves independent source endpoint %s / %s', (date, mass, id) =>
		expect(createCanonLookup(table).resolve(date, mass).id).toBe(id)
	);
	it.each(['none', 'unknown', 'nativitas-domini-in-nocte'])(
		'does not default missing pairs to Ordinary: %s',
		(mass) => expect(() => createCanonLookup(table).resolve('2026-04-02', mass)).toThrow()
	);
	const corruptions: [string, (value: typeof table) => void][] = [
		[
			'version',
			(value) => {
				value.schema_version = '2.0.0';
			}
		],
		[
			'role order',
			(value) => {
				value.roles.reverse();
			}
		],
		[
			'profile identity',
			(value) => {
				value.profiles[4].id = 'ordinary';
			}
		],
		[
			'missing role',
			(value) => {
				delete (value.profiles[4].texts as Partial<(typeof value.profiles)[4]['texts']>)[
					'qui-pridie'
				];
			}
		],
		[
			'wrong role',
			(value) => {
				value.profiles[4].texts.communicantes = 'ordinarium.hanc-igitur-in-cena-domini';
			}
		],
		[
			'unknown body',
			(value) => {
				value.profiles[4].texts.communicantes = 'ordinarium.communicantes-unknown';
			}
		],
		[
			'ordinary substitution',
			(value) => {
				value.profiles[0].texts.communicantes = value.profiles[4].texts.communicantes;
			}
		],
		[
			'duplicate pair',
			(value) => {
				value.pairs.splice(1, 0, value.pairs[0]);
			}
		],
		[
			'float index',
			(value) => {
				value.pairs[0][1] = 1.5;
			}
		],
		[
			'invalid date',
			(value) => {
				value.pairs[0][0] = '2026-02-30';
			}
		],
		[
			'index bound',
			(value) => {
				value.pairs[0][2] = 99;
			}
		]
	];
	it.each(corruptions)('rejects actual resource mutation %s', (_, mutate) => {
		const value = structuredClone(table);
		mutate(value);
		expect(() => createCanonLookup(value)).toThrow();
	});
});

describe.each(['pl', 'en'] as const)('%s Canon payload', (lang) => {
	it('uses eleven actual corpus bodies once with their source/lexical/occurrence data', async () => {
		const pack = await canonData(lang);
		expect(pack.parts).toHaveLength(11);
		expect(new Set(pack.parts.map((p) => p.key))).toEqual(new Set(CANON_VARIANTS.map(canonKey)));
		for (const profile of createCanonLookup(table).profiles) {
			const parts = selectedCanon(profile, pack);
			for (const role of CANON_ROLES) {
				const part = parts.find((p) => p.slot === role);
				if (profile.texts[role] === `ordinarium.${role}`) expect(part).toBeUndefined();
				else expect(part?.doc.id).toBe(profile.texts[role]);
			}
		}
		const parts = properOccurrences(
			selectedCanon(createCanonLookup(table).resolve('2026-04-02', 'feria-v-in-cena-domini'), pack)
		);
		const indexed = indexOccurrenceWords(parts);
		expect(indexed.size).toBe(204);
		expect(indexed.get('qui-pridie-in-cena-domini.w001')?.doc.id).toBe(
			'ordinarium.qui-pridie-in-cena-domini'
		);
		const inline = parts.map((p) => ({ ...p, entry: { doc: p.doc, gloss: p.gloss } }));
		const resolved = resolveCompositeAddress(inline, 'qui-pridie-in-cena-domini.w001', null, '');
		expect(resolved.word).toBe('qui-pridie-in-cena-domini.w001');
		for (const part of pack.parts) expect(part.bibliography.context.length).toBeGreaterThan(0);
	});
	it('rejects each absent or empty emitted body, not merely a pack count', async () => {
		const pack = await canonData(lang);
		for (let i = 0; i < pack.parts.length; i++) {
			const missing = structuredClone(pack);
			missing.parts.splice(i, 1);
			expect(() => validateCanonPack(missing, lang)).toThrow();
			const empty = structuredClone(pack);
			empty.parts[i].doc.segments = [];
			expect(() => validateCanonPack(empty, lang)).toThrow();
			const wrong = structuredClone(pack);
			wrong.parts[i].gloss.lang = lang === 'en' ? 'pl' : 'en';
			expect(() => validateCanonPack(wrong, lang)).toThrow();
		}
	});
	it('rejects identity, lexical, segment and language corruption', async () => {
		const pack = await canonData(lang);
		for (const mutate of [
			(p: typeof pack) => {
				p.parts[1] = p.parts[0];
			},
			(p: typeof pack) => {
				p.lang = lang === 'en' ? 'pl' : 'en';
			},
			(p: typeof pack) => {
				p.parts[0].slot = 'qui-pridie';
			},
			(p: typeof pack) => {
				p.parts[0].doc.id = 'ordinarium.communicantes';
			},
			(p: typeof pack) => {
				p.lex.lemmata = {};
			},
			(p: typeof pack) => {
				p.lex.senses = {};
			},
			(p: typeof pack) => {
				p.parts[0].gloss.segments = {};
			},
			(p: typeof pack) => {
				p.parts[0].gloss.words = {};
			}
		]) {
			const value = structuredClone(pack);
			mutate(value);
			expect(() => validateCanonPack(value, lang)).toThrow();
		}
	});
});
