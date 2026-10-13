import { expect, it } from 'vitest';
import { ordoContext } from './ordo-context';
import { ORDO } from './ordo';
import { PROPER_DAYS } from './proprium';
import { bindPlFields } from './polish';

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
