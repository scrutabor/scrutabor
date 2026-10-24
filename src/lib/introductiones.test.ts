import { afterEach, describe, expect, it } from 'vitest';
import table from './data/introductiones.json';
import { loadText } from './corpus';
import type { Lang } from './i18n';
import { ordoData } from './loaders';
import { massForm } from './mass-form.svelte';
import { ORDO } from './ordo';
import { inMassForm } from './speaker-marks';
import { speakerLabels } from './speaker-labels-test-context';
import {
	createIntroductionLookup,
	introductionBodies,
	introductionEventsFor,
	introductionLookup,
	introductionOwners,
	RENDERED_INTRODUCTIONS,
	type IntroductionBody
} from './introductiones';

const DIALOGUE = 'ordinarium/praefatio-dialogus';
const AUFER = 'ordinarium/aufer-a-nobis';

async function owners(lang: Lang) {
	return Object.fromEntries(
		await Promise.all(
			introductionOwners().map(async (key) => {
				const entry = await loadText(key, lang);
				return [key, entry && { doc: entry.text, gloss: entry.gloss }] as const;
			})
		)
	);
}

const event = (id: string, lookup = introductionLookup) =>
	lookup!.events.find((candidate) => candidate.id === id)!;

const labels = (body: IntroductionBody, lang: Lang) =>
	speakerLabels(body.doc, body.gloss, lang, body.slug);

const before = massForm.value;
afterEach(() => massForm.set(before));

describe('the corpus-owned Ordo introductions', () => {
	it('validates the vendored resource and renders exactly the three opening events', () => {
		expect(introductionLookup).not.toBeNull();
		expect(
			[...introductionLookup!.units.values()]
				.filter((u) => u.role !== 'announcement')
				.map((u) => u.id)
		).toEqual(['invitatio-oremus', 'responsio-gloria-tibi', 'responsio-salutationis', 'salutatio']);
		expect(introductionLookup!.events.map(({ id, before }) => [id, before])).toEqual([
			['collecta-introductio', 'collecta'],
			['epistola-annuntiatio', 'epistola'],
			['evangelium-salutatio', 'evangelium'],
			['evangelium-annuntiatio', 'evangelium'],
			['offertorium-introductio', 'offertorium'],
			['postcommunio-introductio', 'postcommunio']
		]);
		const parts = ORDO.flatMap((movement) => movement.entries.map(({ id }) => id));
		expect(Object.keys(introductionEventsFor(parts)).sort()).toEqual([
			'collecta',
			'offertorium',
			'postcommunio'
		]);
		// No Orémus before the Secret (Ritus servandus VII, 7): the resource names no such event.
		// The Gospel greeting waits for the reading announcements and the Passion exception.
		expect(introductionEventsFor(['secreta', 'evangelium'])).toEqual({});
		expect(introductionOwners()).toEqual([DIALOGUE, AUFER]);
	});

	it.each(['pl', 'en'] as const)(
		'%s cuts every rendered event from its owners with the occurrence delivery',
		async (lang) => {
			const texts = await owners(lang);
			for (const id of RENDERED_INTRODUCTIONS) {
				const bodies = introductionBodies(event(id), texts);
				expect(
					bodies.map(({ key, slug, doc }) => [key, slug, doc.segments.map((s) => s.id)])
				).toEqual([
					[DIALOGUE, `praefatio-dialogus~${id}`, ['s02', 's03']],
					[AUFER, `aufer-a-nobis~${id}`, ['s02']]
				]);
				expect(bodies.map(({ anchor }) => anchor)).toEqual([
					`text-ordinarium-praefatio-dialogus~${id}`,
					`text-ordinarium-aufer-a-nobis~${id}`
				]);
				const segments = bodies.flatMap(({ doc }) => doc.segments);
				expect(segments.map((s) => s.words!.map((w) => w.form))).toEqual([
					['Dóminus', 'vobíscum'],
					['Et', 'cum', 'spíritu', 'tuo'],
					['Orémus']
				]);
				const delivered = (form: 'lecta' | 'cantu') =>
					segments.map((s) => [inMassForm(s, form).speaker, inMassForm(s, form).voice]);
				expect(delivered('lecta')).toEqual([
					['sacerdos', 'clara'],
					['minister', 'clara'],
					['sacerdos', 'clara']
				]);
				expect(delivered('cantu')).toEqual([
					['sacerdos', 'cantus'],
					['schola', 'cantus'],
					['sacerdos', 'cantus']
				]);
				// The faithful's participation stays the owner's: the answer in both forms of Mass,
				// none on the celebrant's lines.
				expect(segments.map((s) => s.participation && Object.keys(s.participation).sort())).toEqual(
					[undefined, ['cantu', 'lecta'], undefined]
				);
				for (const body of bodies)
					for (const segment of body.doc.segments)
						expect(body.gloss.segments[segment.id].translation?.trim()).toBeTruthy();
			}
			// The owners' canonical documents are not changed by the cut.
			expect(texts[AUFER]!.doc.segments.find((s) => s.id === 's02')!.delivery).toBeUndefined();
			expect(texts[DIALOGUE]!.doc.segments.find((s) => s.id === 's03')!.delivery).toEqual({
				cantu: { speaker: 'schola', voice: 'cantus' }
			});
		}
	);

	it.each([
		['pl', ['kapłan', 'usługujący i wierni'], ['kapłan', 'schola i wierni'], 'śpiew'],
		['en', ['priest', 'server and faithful'], ['priest', 'choir and faithful'], 'sung']
	] as const)(
		'%s names the celebrant, the server and the choir with the faithful in both forms',
		async (lang, low, sung, voice) => {
			const bodies = introductionBodies(event('collecta-introductio'), await owners(lang));
			massForm.set('lecta');
			expect(labels(bodies[0], lang)).toMatchObject({ names: low, voices: [] });
			expect(labels(bodies[1], lang)).toMatchObject({ names: [], voices: [] });
			massForm.set('cantu');
			// The voice is named where it changes, once over the sung exchange.
			expect(labels(bodies[0], lang)).toMatchObject({ names: sung, voices: [voice] });
			expect(labels(bodies[1], lang)).toMatchObject({ names: [], voices: [voice] });
			for (const form of ['lecta', 'cantu'] as const) {
				massForm.set(form);
				expect(labels(bodies[0], lang).marks).toEqual(['V.', 'R.']);
				expect(labels(bodies[1], lang).marks).toEqual(['V.']);
			}
		}
	);

	it.each(['pl', 'en'] as const)(
		'%s Ordo movements carry their introductions and the lexicon of their words',
		async (lang) => {
			const where: Record<string, string[]> = {
				praeparatio: [],
				catechumenorum: ['collecta'],
				offertorium: ['offertorium'],
				canon: [],
				communio: [],
				conclusio: ['postcommunio']
			};
			expect(Object.keys(where)).toEqual(ORDO.map(({ id }) => id));
			for (const [movement, parts] of Object.entries(where)) {
				const data = (await ordoData(lang, movement))!;
				expect(Object.keys(data.introductions), movement).toEqual(parts);
				for (const part of parts) {
					expect(data.introductions[part].map(({ slug }) => slug)).toEqual([
						`praefatio-dialogus~${part}-introductio`,
						`aufer-a-nobis~${part}-introductio`
					]);
					for (const body of data.introductions[part])
						for (const segment of body.doc.segments)
							for (const word of segment.words ?? []) {
								expect(data.lex.lemmata[word.lemma], word.lemma).toBeDefined();
								expect(data.lex.senses[word.lemma], word.lemma).toBeDefined();
							}
				}
			}
		}
	);

	type Table = typeof table;
	const resource: [string, (value: Table) => void, RegExp][] = [
		[
			'version',
			(v) => {
				v.schema_version = '1.0.0';
			},
			/invalid introduction resource/
		],
		[
			'extra field',
			(v) => {
				(v as unknown as Record<string, unknown>).rubrics = {};
			},
			/invalid introduction resource/
		],
		[
			'unknown role',
			(v) => {
				v.units[0].role = 'oration';
			},
			/invalid introduction unit/
		],
		[
			'unknown owner',
			(v) => {
				v.units[0].text = 'ordinarium/ignotum';
			},
			/invalid introduction unit/
		],
		[
			'repeated word',
			(v) => {
				v.units[2].words[1] = v.units[2].words[0];
			},
			/invalid introduction unit/
		],
		[
			'units out of order',
			(v) => {
				v.units.reverse();
			},
			/units out of order/
		],
		[
			'events out of order',
			(v) => {
				v.events.reverse();
			},
			/event order or placement/
		],
		[
			'a rendered event absent',
			(v) => {
				v.events = v.events.filter(({ id }) => id !== 'offertorium-introductio');
			},
			/events missing/
		],
		[
			'a sung voice at a low Mass',
			(v) => {
				v.events[0].occurrences[0].lecta.voice = 'cantus';
			},
			/invalid introduction delivery/
		],
		[
			'a server at a sung Mass',
			(v) => {
				v.events[0].occurrences[1].cantu.speaker = 'minister';
			},
			/invalid introduction delivery/
		],
		[
			'an unknown unit',
			(v) => {
				v.events[0].occurrences[2].unit = 'invitatio';
			},
			/invalid introduction occurrence/
		]
	];
	it.each(resource)('rejects a malformed resource: %s', (_name, mutate, message) => {
		const broken = structuredClone(table);
		mutate(broken);
		expect(() => createIntroductionLookup(broken)).toThrow(message);
	});
	it('accepts the untouched resource the mutations start from', () =>
		expect(() => createIntroductionLookup(structuredClone(table))).not.toThrow());

	const cuts: [string, (value: Table) => void][] = [
		[
			'a partial segment',
			(v) => {
				v.units.find(({ id }) => id === 'responsio-salutationis')!.words.pop();
			}
		],
		[
			'a foreign segment',
			(v) => {
				v.units.find(({ id }) => id === 'salutatio')!.segment = 's04';
			}
		],
		[
			'reversed words',
			(v) => {
				v.units.find(({ id }) => id === 'responsio-salutationis')!.words.reverse();
			}
		]
	];
	it.each(cuts)('refuses to cut %s out of its owner', async (name, mutate) => {
		const broken = structuredClone(table);
		mutate(broken);
		const original = await owners('en');
		const saved = structuredClone(original);
		const texts = structuredClone(original);
		let lookup: ReturnType<typeof createIntroductionLookup>;
		if (name === 'a foreign segment') {
			// The closed resource rejects a foreign association before any slicing occurs.
			expect(() => createIntroductionLookup(broken)).toThrow(
				/invalid introduction unit role or owner/
			);
			lookup = createIntroductionLookup(structuredClone(table));
			// Keep that valid contract and independently supply an owner with only the foreign segment.
			const segment = texts[DIALOGUE]!.doc.segments.find((item) => item.id === 's02')!;
			expect(segment).toBeDefined();
			segment.id = 's04';
		} else lookup = createIntroductionLookup(broken);
		expect(() => introductionBodies(event('collecta-introductio', lookup), texts, lookup)).toThrow(
			/does not address one complete owner segment/
		);
		expect(() => introductionBodies(event('collecta-introductio'), original)).not.toThrow();
		expect(original).toEqual(saved);
	});
	it('refuses an owner absent from the language package', async () => {
		const texts = await owners('pl');
		delete texts[AUFER];
		expect(() => introductionBodies(event('collecta-introductio'), texts)).toThrow(/no owner text/);
	});
	it('refuses an owner segment without a translation', async () => {
		const texts = await owners('pl');
		const gloss = structuredClone(texts[AUFER]!.gloss);
		gloss.segments.s02.translation = ' ';
		expect(() =>
			introductionBodies(event('collecta-introductio'), {
				...texts,
				[AUFER]: { doc: texts[AUFER]!.doc, gloss }
			})
		).toThrow(/does not address one complete owner segment/);
	});
});
