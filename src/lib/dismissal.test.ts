import { describe, expect, it } from 'vitest';
import table from './data/dismissal.json';
import {
	createDismissalLookup,
	DISMISSAL_TEXT_KEYS,
	selectedDismissal,
	validateDismissalPack
} from './dismissal';
import { dismissalData } from './loaders';
import { properOccurrences, indexOccurrenceWords } from './proper-occurrences';

describe('corpus-owned dismissal choices', () => {
	it('exposes both validated text keys for navigation', () => {
		expect(DISMISSAL_TEXT_KEYS).toEqual([
			'ordinarium/ite-missa-est',
			'ordinarium/ite-missa-est-paschale'
		]);
	});
	it('resolves all emitted choices with no implicit ordinary default', () => {
		const lookup = createDismissalLookup(table);
		// 7619 before the calendar repair: St Matthias moved to 25 February in leap years and
		// the Friday "Sunday within the octave" of 30 December removed.
		expect(table.pairs).toHaveLength(7610);
		expect(() => lookup.resolve('2033-12-30', 'dominica-infra-octavam-nativitatis')).toThrow();
		expect(lookup.resolve('2028-02-25', 'sancti-matthiae-apostoli').id).toBe('ordinary');
		let paschal = 0;
		for (const [date, mass, index] of table.pairs) {
			const profile = lookup.resolve(String(date), table.masses[Number(mass)]);
			expect(profile).toEqual(table.profiles[Number(index)]);
			if (profile.id === 'paschale') paschal += 1;
		}
		expect(paschal).toBe(152);
	});
	it.each([
		['2026-04-04', 'vigilia-paschalis', 'paschale'],
		['2026-04-05', 'dominica-resurrectionis', 'paschale'],
		['2026-04-12', 'dominica-in-albis', 'ordinary'],
		['2026-05-23', 'vigilia-pentecostes', 'ordinary'],
		['2026-12-25', 'nativitas-domini-in-nocte', 'ordinary']
	])('selects %s / %s', (date, mass, profile) => {
		expect(createDismissalLookup(table).resolve(date, mass).id).toBe(profile);
	});
	it.each(['none', 'unknown', 'dominica-resurrectionis'])(
		'rejects unsupported pair instead of supplying Ordinary: %s',
		(mass) => expect(() => createDismissalLookup(table).resolve('2026-04-11', mass)).toThrow()
	);
	const mutations: [string, (value: typeof table) => void][] = [
		[
			'version',
			(v) => {
				v.schema_version = '2.0.0';
			}
		],
		[
			'role',
			(v) => {
				v.role = 'communicantes';
			}
		],
		[
			'profile order',
			(v) => {
				v.profiles.reverse();
			}
		],
		[
			'ordinary substituted',
			(v) => {
				v.profiles[0].text = v.profiles[1].text;
			}
		],
		[
			'unknown body',
			(v) => {
				v.profiles[1].text = 'ordinarium.unknown';
			}
		],
		[
			'missing Mass',
			(v) => {
				v.masses.pop();
			}
		],
		[
			'unknown Mass',
			(v) => {
				v.masses[0] = 'unknown';
			}
		],
		[
			'duplicate Mass',
			(v) => {
				v.masses[1] = v.masses[0];
			}
		],
		[
			'duplicate pair',
			(v) => {
				v.pairs.splice(1, 0, v.pairs[0]);
			}
		],
		[
			'noncivil date',
			(v) => {
				v.pairs[0][0] = '2026-02-30';
			}
		],
		[
			'fractional index',
			(v) => {
				v.pairs[0][1] = 0.5;
			}
		],
		[
			'unresolved profile',
			(v) => {
				v.pairs[0][2] = 2;
			}
		]
	];
	it.each(mutations)('rejects malformed resource: %s', (_, mutate) => {
		const value = structuredClone(table);
		mutate(value);
		expect(() => createDismissalLookup(value)).toThrow();
	});
});

describe.each(['pl', 'en'] as const)('%s dismissal body', (lang) => {
	it('carries all fifteen words, sources and lexical identities', async () => {
		const pack = await dismissalData(lang);
		expect(pack.parts).toHaveLength(1);
		const part = pack.parts[0];
		expect(part.key).toBe('ordinarium/ite-missa-est-paschale');
		expect(part.bibliography.context.length).toBeGreaterThan(0);
		const occurrences = properOccurrences(pack.parts);
		const words = indexOccurrenceWords(occurrences);
		expect(words.size).toBe(15);
		expect(words.get('ite-missa-est-paschale.w015')?.doc.id).toBe(
			'ordinarium.ite-missa-est-paschale'
		);
		const lookup = createDismissalLookup(table);
		expect(selectedDismissal(lookup.resolve('2026-04-12', 'dominica-in-albis'), pack)).toEqual([]);
		expect(selectedDismissal(lookup.resolve('2026-04-04', 'vigilia-paschalis'), pack)).toEqual([
			part
		]);
		expect(() =>
			selectedDismissal(lookup.resolve('2026-04-04', 'vigilia-paschalis'), null)
		).toThrow();
	});
	it('rejects every missing payload layer and accepts restored data', async () => {
		const pack = await dismissalData(lang);
		const mutations: ((value: typeof pack) => void)[] = [
			(v) => {
				v.parts = [];
			},
			(v) => {
				v.parts.push(v.parts[0]);
			},
			(v) => {
				v.parts[0].key = 'ordinarium/ite-missa-est';
			},
			(v) => {
				v.parts[0].doc.id = 'ordinarium.ite-missa-est';
			},
			(v) => {
				v.parts[0].doc.segments = [];
			},
			(v) => {
				v.parts[0].gloss.lang = lang === 'pl' ? 'en' : 'pl';
			},
			(v) => {
				v.parts[0].gloss.segments = {};
			},
			(v) => {
				v.parts[0].gloss.words = {};
			},
			(v) => {
				v.lex.lemmata = {};
			},
			(v) => {
				v.lex.senses = {};
			}
		];
		for (const mutate of mutations) {
			const value = structuredClone(pack);
			mutate(value);
			expect(() => validateDismissalPack(value, lang)).toThrow();
		}
		expect(validateDismissalPack(pack, lang)).toEqual(pack);
	});
});
