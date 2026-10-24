import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
	ordoBlessingContext,
	ordoContext,
	ordoMinisterBlessingContext,
	ordoResponseContext
} from './ordo-context';
import { ORDO } from './ordo';
import { PROPER_DAYS } from './proprium';
import { bindOrphans, bindPlFields } from './polish';

const entries = [
	'introibo',
	'aufer-a-nobis',
	'credo',
	'offertorium',
	'agnus-dei',
	'qui-dixisti',
	'evangelium-ultimum',
	'evangelium',
	'ite-missa-est'
];
it.each(['pl', 'en'] as const)('limits %s Vigil directions to the chosen Vigil', (lang) => {
	for (const entry of entries) {
		expect(ordoContext(entry, 'vigilia-paschalis', true, lang)?.length).toBeGreaterThan(30);
		expect(ordoContext(entry, null, false, lang)).toBeUndefined();
		expect(ordoContext(entry, 'dominica-in-albis', false, lang)).toBeUndefined();
		if (entry !== 'ite-missa-est')
			expect(ordoContext(entry, 'dominica-resurrectionis', true, lang)).toBeUndefined();
	}
	expect(ordoContext('ite-missa-est', 'dominica-resurrectionis', true, lang)).toContain(
		lang === 'pl' ? 'De Tempore' : 'temporal Masses'
	);
	expect(ordoContext('ite-missa-est', 'vigilia-paschalis', true, lang)).toContain(
		lang === 'pl' ? 'diakon lub sam kapłan' : 'deacon or priest'
	);
	expect(ordoContext('placeat', 'vigilia-paschalis', true, lang)).toBeUndefined();
});

it.each(['pl', 'en'] as const)(
	'notes the omitted Credo on the Vigil of Pentecost in %s',
	(lang) => {
		const note =
			lang === 'pl'
				? bindOrphans('W Wigilię Zesłania Ducha Świętego Credo się nie odmawia.')
				: 'The Creed is omitted at the Vigil of Pentecost.';
		for (const dismissal of [false, true])
			expect(ordoContext('credo', 'vigilia-pentecostes', dismissal, lang)).toBe(note);
		const parts = ORDO.flatMap((movement) => movement.entries).filter(
			(entry) => entry.id !== 'credo'
		);
		expect(parts.length).toBeGreaterThan(60);
		for (const entry of parts)
			expect(ordoContext(entry.id, 'vigilia-pentecostes', false, lang), entry.id).toBeUndefined();
		const masses = PROPER_DAYS.map((day) => day.id).filter((id) => id !== 'vigilia-pentecostes');
		expect(masses.length).toBeGreaterThan(100);
		for (const mass of [null, ...masses])
			expect(ordoContext('credo', mass, false, lang) ?? '', String(mass)).not.toContain(note);
		expect(ordoContext('credo', 'dominica-pentecostes', false, lang)).toBeUndefined();
	}
);

it.each(['pl', 'en'] as const)(
	'gives every retained preparation prayer an explicit %s Vigil omission note',
	(lang) => {
		const entries = ORDO.find((movement) => movement.id === 'praeparatio')!.entries;
		expect(entries).toHaveLength(9);
		for (const entry of entries) {
			expect(ordoContext(entry.id, 'vigilia-paschalis', true, lang)).toContain(
				lang === 'pl' ? 'opuszcza się' : 'omitted'
			);
			expect(ordoContext(entry.id, 'dominica-in-albis', false, lang)).toBeUndefined();
		}
		expect(ordoContext('introitus', 'vigilia-paschalis', true, lang)).toContain(
			lang === 'pl' ? 'nie ma antyfony Introitu' : 'no Introit antiphon'
		);
		expect(ordoContext('kyrie', 'vigilia-paschalis', true, lang)).toContain(
			lang === 'pl' ? 'na końcu litanii' : 'at the end of the litany'
		);
		expect(ordoContext('kyrie', 'vigilia-paschalis', true, lang)).toContain(
			lang === 'pl' ? 'Po zakończeniu Kyrie przez chór' : 'When the choir finishes the Kyrie'
		);
	}
);

it.each(['pl', 'en'] as const)(
	'explains every absent antiphon in complete formularies in %s',
	(lang) => {
		const missing: string[] = [];
		const days = PROPER_DAYS.filter((day) => !day.partial);
		expect(days.length).toBeGreaterThan(100);
		for (const day of days) {
			for (const role of ['introitus', 'offertorium', 'communio'] as const) {
				const context = ordoContext(role, day.id, false, lang);
				if (day.components.some((component) => component.role === role)) {
					expect(context, `${day.id}.${role}`).toBeUndefined();
				} else {
					missing.push(`${day.id}.${role}`);
					expect(context, `${day.id}.${role}`).toContain(lang === 'pl' ? 'nie ma antyfony' : 'no ');
				}
			}
		}
		expect(missing).toEqual([
			'vigilia-paschalis.introitus',
			'vigilia-paschalis.offertorium',
			'vigilia-paschalis.communio'
		]);
	}
);

it('describes the water and chalice offerings without confusing their prayers', () => {
	const entries = ORDO.find((movement) => movement.id === 'offertorium')!.entries;
	expect(entries.find((entry) => entry.id === 'deus-qui-humanae')!.note?.pl).toContain(
		'Do wina dolewa się kroplę wody.'
	);
	expect(entries.find((entry) => entry.id === 'offerimus-tibi')!.note).toEqual(
		bindPlFields({
			pl: 'Kapłan bierze kielich i ofiaruje go, prosząc o zbawienie nasze i całego świata.',
			en: 'The priest takes the chalice and offers it, praying for our salvation and that of the whole world.'
		})
	);
});

it.each(['pl', 'en'] as const)(
	'keeps %s prayer guidance free of unsupported counts and separate conclusions',
	(lang) => {
		const entries = ORDO.flatMap((movement) => movement.entries);
		const expected = bindPlFields({
			collecta: {
				pl: 'Kapłan pozdrawia wiernych, wzywa Orémus i odmawia modlitwę dnia — czasem także modlitwy przypadających wspomnień.',
				en: 'The priest greets the people, calls Orémus, and says the day’s prayer, adding the prayers of any commemorations prescribed.'
			},
			'suscipe-sancte-pater': {
				pl: 'Kapłan unosi patenę z hostią i ofiaruje ją po cichu.',
				en: 'The priest raises the paten with the host and offers it silently.'
			},
			postcommunio: {
				pl: 'Kapłan całuje ołtarz, pozdrawia wiernych i wraca na stronę lekcji po modlitwę końcową — tyle modlitw, ile było kolekt.',
				en: 'The priest kisses the altar, greets the people, and returns to the Epistle side for the closing prayer — as many prayers as there were collects.'
			}
		});
		for (const [id, note] of Object.entries(expected)) {
			expect(entries.find((entry) => entry.id === id)!.note?.[lang]).toBe(note[lang]);
		}
	}
);

it.each(['pl', 'en'] as const)('keeps unconfirmed after-responses as %s references', (lang) => {
	const state = {
		date: '2026-03-29',
		mass: 'dominica-ii-passionis',
		loadedMass: 'dominica-ii-passionis',
		loadedLanguage: lang,
		loading: false,
		failed: false,
		unwritten: false
	};
	for (const entry of ['deo-gratias-epistolae', 'laus-tibi-christe']) {
		const context = ordoResponseContext(entry, state, [], {}, undefined, lang);
		expect(context?.reason).toBe('unconfirmed');
		expect(context?.referenceOnly).toBe(true);
		expect(context?.note).toContain(lang === 'pl' ? 'tylko do wglądu' : 'reference only');
		expect(context?.note).not.toContain(lang === 'pl' ? 'Po Pasji' : 'After the Passion');
	}
	for (const other of ORDO.flatMap((movement) => movement.entries).filter(
		(entry) => !['deo-gratias-epistolae', 'laus-tibi-christe'].includes(entry.id)
	))
		expect(ordoResponseContext(other.id, state, [], {}, undefined, lang)).toBeUndefined();
});

it('explains the Latin Pater faculty without cancelling the priest’s quiet Amen', () => {
	const note = ORDO.flatMap((movement) => movement.entries).find(
		(entry) => entry.id === 'pater-noster'
	)!.note;
	expect(note.en).toContain('priest’s final Amen is said quietly');
	expect(note.en).toContain('may say the whole prayer with him in Latin, all adding Amen');
	expect(note.pl).toContain('kapłan mówi końcowe Amen po cichu');
	expect(note.pl).toContain('całą modlitwę po łacinie, dodając wspólnie Amen');
});

// Independent of lib/polish's own pattern: a one-letter Polish word followed by any
// whitespace other than U+00A0 may be left hanging at the end of a line.
const BREAKABLE_ORPHAN = /(?:^|[\s„“"(])[aiouwz](?=[^\S\u00a0])/i;
const BOUND_ORPHAN = /(?:^|[\s„“"(])[aiouwz]\u00a0/gi;
const preparation = (date: string | null, mass: string | null, lang: 'pl' | 'en') => ({
	...{ date, mass, loading: false, failed: false, unwritten: false },
	...{ loadedMass: mass, loadedLanguage: mass && lang }
});

it('binds the one-letter words of the two Ordinary-alone Gospel-blessing notes', () => {
	const blessing = ordoBlessingContext(
		'iube-domine-benedicere',
		preparation('2026-04-26', null, 'pl'),
		'pl'
	)!.note!;
	const deacon = ordoMinisterBlessingContext(
		'iube-domne-benedicere',
		preparation('2026-04-26', null, 'pl'),
		[],
		'pl'
	)!.note;
	for (const [note, bound] of [
		[
			blessing,
			[
				'prośba i\u00a0błogosławieństwo',
				'diakona i\u00a0subdiakona',
				'z\u00a0wyjątkiem',
				'o\u00a0obecności'
			]
		],
		[deacon, ['z\u00a0udziałem', 'z\u00a0wyjątkiem']]
	] as const) {
		expect(note).not.toMatch(BREAKABLE_ORPHAN);
		expect(note.match(BOUND_ORPHAN)).toHaveLength(bound.length);
		for (const pair of bound) expect(note).toContain(pair);
	}
	expect(blessing.replaceAll('\u00a0', ' ')).toContain(
		'Ta prośba i błogosławieństwo należą do wariantu bez diakona i subdiakona, z wyjątkiem Mszy za zmarłych. Sam wybór Mszy śpiewanej nie rozstrzyga o obecności tych posługujących.'
	);
	expect(deacon.replaceAll('\u00a0', ' ')).toContain(
		'Ten wariant dotyczy Ewangelii z udziałem diakona, z wyjątkiem Mszy za zmarłych.'
	);
});

// Every literal of the module, read from its source without comments: the notes must be
// these strings verbatim, joined by spaces, with only their one-letter words bound.
const SOURCE_LITERALS = [
	...readFileSync(new URL('./ordo-context.ts', import.meta.url), 'utf-8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^\s*\/\/.*$/gm, '')
		.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)
].map((match) => match[1]);
const POLISH_LITERALS = SOURCE_LITERALS.filter((text) => /[ąćęłńóśźż]/i.test(text));
function sourceSentences(note: string): string[] | undefined {
	const plain = note.replaceAll('\u00a0', ' ');
	if (!plain) return [];
	for (const literal of [...POLISH_LITERALS].sort((a, b) => b.length - a.length))
		if (plain === literal || plain.startsWith(literal + ' ')) {
			const rest = sourceSentences(plain.slice(literal.length + 1));
			if (rest) return [literal, ...rest];
		}
	return undefined;
}

it('binds every Polish note of every context helper without changing its wording', () => {
	const occasions: [string | null, string | null, string[]][] = [
		['2026-04-26', null, []],
		[null, 'dominica-iii-post-pascha', []],
		['2026-04-26', 'dominica-iii-post-pascha', ['proprium/dominica-iii-post-pascha-evangelium']],
		['2026-03-29', 'dominica-ii-passionis', ['proprium/dominica-ii-passionis-evangelium']],
		['2026-03-29', 'dominica-ii-passionis', ['proprium/dominica-iii-post-pascha-evangelium']],
		['2026-03-29', 'dominica-ii-passionis', []],
		['2026-04-04', 'vigilia-paschalis', ['proprium/vigilia-paschalis-evangelium']],
		['2026-05-23', 'vigilia-pentecostes', ['proprium/vigilia-pentecostes-evangelium']],
		[
			'2026-11-02',
			'commemoratio-omnium-fidelium-defunctorum',
			['proprium/commemoratio-omnium-fidelium-defunctorum-missa-i-evangelium']
		]
	];
	const ids = ORDO.flatMap((movement) => movement.entries.map((entry) => entry.id));
	const notes = { pl: new Set<string>(), en: new Set<string>() };
	for (const lang of ['pl', 'en'] as const)
		for (const [date, mass, keys] of occasions) {
			const state = preparation(date, mass, lang);
			for (const id of ids)
				for (const note of [
					ordoContext(id, mass, false, lang),
					ordoContext(id, mass, true, lang),
					ordoResponseContext(id, state, [], {}, undefined, lang)?.note,
					ordoBlessingContext(id, state, lang)?.note,
					ordoMinisterBlessingContext(id, state, keys, lang)?.note
				])
					if (note) notes[lang].add(note);
		}
	const used = new Set<string>();
	for (const note of notes.pl) {
		expect(note).not.toMatch(BREAKABLE_ORPHAN);
		expect(note).toBe(bindOrphans(note.replaceAll('\u00a0', ' ')));
		const sentences = sourceSentences(note);
		expect(sentences, note).toBeDefined();
		for (const sentence of sentences!) used.add(sentence);
	}
	// The occasions reach every Polish note the module declares, so none escapes the check.
	expect([...POLISH_LITERALS].filter((literal) => !used.has(literal))).toEqual([]);
	expect(used.size).toBe(new Set(POLISH_LITERALS).size);
	expect(used.size).toBeGreaterThanOrEqual(39);
	for (const note of notes.en) expect(note).not.toContain('\u00a0');
});
