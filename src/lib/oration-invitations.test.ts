import { expect, it } from 'vitest';
import { loadText } from './corpus';
import type { Lang } from './i18n';
import { introductionBodies, introductionEventsFor, introductionOwners } from './introductiones';
import { orationInvitations, withOrationInvitations } from './oration-invitations';
import { indexOccurrenceWords } from './proper-occurrences';
import { resolveCompositeAddress, writeReadingAddress } from './reading-address';
import { readingPayloadReady } from './reading-announcements';
import { inMassForm } from './speaker-marks';
import { textFlowFor } from './reading-flow';

const QUEEN = 'proprium/beata-maria-virgo-regina';
const COMMEMORATION = 'sancta-petronilla';
const AUFER = 'ordinarium/aufer-a-nobis';
const slots = ['collecta', 'postcommunio'] as const;
const languages = ['pl', 'en'] as const;

async function context(lang: Lang, slot = 'collecta') {
	const owners = Object.fromEntries(
		await Promise.all(
			introductionOwners().map(async (key) => {
				const loaded = (await loadText(key, lang))!;
				return [key, { doc: loaded.text, gloss: loaded.gloss }];
			})
		)
	);
	const openers = introductionBodies(introductionEventsFor([slot])[slot], owners);
	const principal = (await loadText(`${QUEEN}-${slot}`, lang))!;
	const commemoration = (await loadText(`proprium/sanctae-petronillae-${slot}`, lang))!;
	const bodies = [
		{
			slug: `beata-maria-virgo-regina-${slot}`,
			anchor: `text-proprium-beata-maria-virgo-regina-${slot}`,
			commemoration: undefined as string | undefined,
			situation: undefined as 'cantu-conventualis' | 'cantu-non-conventualis' | undefined,
			doc: principal.text,
			gloss: principal.gloss
		},
		{
			slug: `sanctae-petronillae-${slot}`,
			anchor: `text-proprium-sanctae-petronillae-${slot}`,
			commemoration: COMMEMORATION,
			situation: undefined as 'cantu-conventualis' | 'cantu-non-conventualis' | undefined,
			doc: commemoration.text,
			gloss: commemoration.gloss
		}
	];
	return { openers, bodies };
}

for (const lang of languages) {
	for (const slot of slots) {
		it(`${lang} ${slot} gives the second conclusion its own canonical invitation and address`, async () => {
			const data = await context(lang, slot);
			const saved = structuredClone(data);
			const before = orationInvitations(slot, data.bodies, data.openers, true);
			const invitation = before[data.bodies[1].slug];
			const slug = `aufer-a-nobis~${slot}-introductio~commemoratio~sanctae-petronillae-${slot}`;
			expect(Object.keys(before)).toEqual([data.bodies[1].slug]);
			expect(invitation.key).toBe(AUFER);
			expect(invitation.slug).toBe(slug);
			expect(invitation.anchor).toBe(`text-ordinarium-${slug}`);
			expect(invitation.doc.segments.map((s) => [s.id, s.words!.map((w) => w.id)])).toEqual([
				['s02', ['w001']]
			]);
			for (const form of ['lecta', 'cantu'] as const) {
				const segment = inMassForm(invitation.doc.segments[0], form);
				expect([segment.speaker, segment.voice]).toEqual([
					'sacerdos',
					form === 'lecta' ? 'clara' : 'cantus'
				]);
			}
			expect(invitation.doc.segments[0].words![0].form).toBe('Orémus');
			expect(invitation.gloss).toBe(data.openers[1].gloss);
			const display = [...data.openers, ...withOrationInvitations(data.bodies, before)];
			expect(display.map((body) => body.slug)).toEqual([
				`praefatio-dialogus~${slot}-introductio`,
				`aufer-a-nobis~${slot}-introductio`,
				data.bodies[0].slug,
				slug,
				data.bodies[1].slug
			]);
			const indexed = indexOccurrenceWords(display);
			expect(indexed.get(`${slug}.w001`)?.doc.id).toBe('ordinarium.aufer-a-nobis');
			const wordOnly = resolveCompositeAddress(display, `${slug}.w001`, null, '');
			expect(wordOnly).toEqual({
				word: `${slug}.w001`,
				segment: null,
				segments: [],
				part: null
			});
			const address = resolveCompositeAddress(display, `${slug}.w001`, `${slug}.s02`, '');
			expect(address.word).toBe(`${slug}.w001`);
			expect(address.segment).toBe(`${slug}.s02`);
			expect(address.part).toBe(slug);
			expect(address.segments).toEqual(['s02']);
			const url = new URL(`https://example.invalid/app/${lang}/ordo/conclusio?dies=2027-05-31`);
			writeReadingAddress(url, address);
			expect(url.searchParams.get('dies')).toBe('2027-05-31');
			expect(url.searchParams.get('w')).toBe(`${slug}.w001`);
			expect(data).toEqual(saved);
		});
	}

	it(`${lang} keeps the two sung alternatives distinct without inviting the unadmitted one`, async () => {
		for (const slot of slots) {
			const { bodies, openers } = await context(lang, slot);
			bodies.forEach((body) => {
				body.situation = 'cantu-conventualis';
			});
			const other = {
				...bodies[0],
				slug: `${bodies[0].slug}~cantu-non-conventualis`,
				anchor: `${bodies[0].anchor}~cantu-non-conventualis`,
				situation: 'cantu-non-conventualis' as const
			};
			bodies.push(other);
			const before = orationInvitations(slot, bodies, openers, true);
			expect(Object.keys(before)).toEqual([bodies[1].slug]);
			expect(before[other.slug]).toBeUndefined();
			expect(withOrationInvitations(bodies, before).map((b) => b.slug)).toEqual([
				bodies[0].slug,
				before[bodies[1].slug].slug,
				bodies[1].slug,
				other.slug
			]);
		}
	});

	it(`${lang} leaves no-commemoration and omitted bodies untouched and never invites a Secret`, async () => {
		const { bodies, openers } = await context(lang);
		expect(orationInvitations('collecta', bodies.slice(0, 1), openers, true)).toEqual({});
		expect(orationInvitations('collecta', [], [], true)).toEqual({});
		for (const slot of ['secreta', 'offertorium', 'epistola', 'evangelium'])
			expect(orationInvitations(slot, bodies, openers, true)).toEqual({});
	});

	for (const fault of ['loading', 'failed', 'unwritten', 'language', 'mass', 'date'] as const) {
		it(`${lang} adds no invitation for the ${fault} incomplete payload`, async () => {
			const { bodies, openers } = await context(lang);
			const state = {
				date: '2027-05-31',
				mass: 'beata-maria-virgo-regina',
				loadedMass: 'beata-maria-virgo-regina',
				loadedLanguage: lang as string,
				loading: false,
				failed: false,
				unwritten: false
			};
			expect(readingPayloadReady(state, lang)).toBe(true);
			if (fault === 'language') state.loadedLanguage = lang === 'pl' ? 'en' : 'pl';
			else if (fault === 'mass') state.loadedMass = 'sancti-marci-evangelistae';
			else if (fault === 'date') state.date = 'not-a-date';
			else state[fault] = true;
			expect(readingPayloadReady(state, lang)).toBe(false);
			expect(
				orationInvitations('collecta', bodies, openers, readingPayloadReady(state, lang))
			).toEqual({});
		});
	}

	for (const fault of [
		'second-addition',
		'no-principal',
		'second-principal',
		'interleaved-situations',
		'duplicate-slug',
		'address',
		'owner-address',
		'unknown-commemoration',
		'missing-owner',
		'duplicate-owner',
		'segment',
		'word',
		'speaker',
		'low-delivery',
		'sung-delivery',
		'participation',
		'translation',
		'event'
	] as const) {
		it(`${lang} rejects ${fault} on the same input and recovers after exact restoration`, async () => {
			const data = await context(lang);
			const saved = structuredClone(data);
			const segment = data.openers[1].doc.segments[0];
			const translation = data.openers[1].gloss.segments.s02.translation;
			const delivery = structuredClone(segment.delivery);
			const principal = data.bodies[0];
			const owner = data.openers[1];
			expect(Object.keys(orationInvitations('collecta', data.bodies, data.openers, true))).toEqual([
				'sanctae-petronillae-collecta'
			]);
			try {
				if (fault === 'second-addition') data.bodies.push({ ...data.bodies[1], slug: 'second' });
				if (fault === 'no-principal') data.bodies.shift();
				if (fault === 'second-principal') data.bodies.push({ ...principal, slug: 'second' });
				if (fault === 'interleaved-situations') {
					data.bodies.forEach((body) => {
						body.situation = 'cantu-conventualis';
					});
					data.bodies.push({ ...principal, slug: 'other', situation: 'cantu-non-conventualis' });
					data.bodies.push({ ...saved.bodies[1], slug: 'late', situation: 'cantu-conventualis' });
				}
				if (fault === 'duplicate-slug') data.bodies[1].slug = principal.slug;
				if (fault === 'address') data.bodies[1].slug = 'wrong.address';
				if (fault === 'owner-address') owner.slug = 'wrong-owner';
				if (fault === 'unknown-commemoration') data.bodies[1].commemoration = 'unknown';
				if (fault === 'missing-owner') data.openers.pop();
				if (fault === 'duplicate-owner') data.openers.push(owner);
				if (fault === 'segment') segment.id = 's01';
				if (fault === 'word') segment.words![0].id = 'w002';
				if (fault === 'speaker') segment.speaker = 'minister';
				if (fault === 'low-delivery') segment.voice = 'secreto';
				if (fault === 'sung-delivery') segment.delivery!.cantu!.voice = 'secreto';
				if (fault === 'participation')
					segment.participation = {
						lecta: { gradus: 1, source: 'DMS 31 a' }
					};
				if (fault === 'translation') owner.gloss.segments.s02.translation = '';
				if (fault === 'event') owner.event = 'offertorium-introductio';
				const diagnosis = ['second-addition', 'no-principal'].includes(fault)
					? 'oration conclusion plan outside the contract'
					: fault === 'second-principal'
						? 'more than one principal oration'
						: fault === 'interleaved-situations'
							? 'interleaved oration situations'
							: fault === 'duplicate-slug'
								? 'duplicate oration occurrence'
								: fault === 'address'
									? 'invalid oration occurrence address'
									: fault === 'unknown-commemoration'
										? 'unsupported oration conclusion profile'
										: 'oration invitation has no complete validated owner';
				expect(() => orationInvitations('collecta', data.bodies, data.openers, true)).toThrow(
					diagnosis
				);
			} finally {
				// Restore the same owner, segment and input arrays, not a replacement healthy fixture.
				segment.id = 's02';
				segment.words![0].id = 'w001';
				segment.speaker = 'sacerdos';
				segment.voice = 'clara';
				principal.situation = undefined;
				segment.delivery = delivery;
				delete segment.participation;
				owner.event = 'collecta-introductio';
				owner.slug = 'aufer-a-nobis~collecta-introductio';
				owner.gloss.segments.s02.translation = translation;
				data.bodies.splice(0, data.bodies.length, principal, saved.bodies[1]);
				data.openers.splice(0, data.openers.length, data.openers[0], owner);
			}
			expect(data).toEqual(saved);
			expect(Object.keys(orationInvitations('collecta', data.bodies, data.openers, true))).toEqual([
				'sanctae-petronillae-collecta'
			]);
		});
	}

	it(`${lang} prices both invitation seams using the real neighboring flow rows`, async () => {
		const { bodies, openers } = await context(lang);
		const before = orationInvitations('collecta', bodies, openers, true);
		for (const form of ['lecta', 'cantu'] as const) {
			const flows = withOrationInvitations(bodies, before).map((body) =>
				textFlowFor(body.doc, body.gloss, { helpLevel: 2 }, form, 'sacerdos')
			);
			expect(flows).toHaveLength(3);
			for (const flow of flows) {
				expect(flow.first).toBeDefined();
				expect(flow.last).toBeDefined();
			}
			expect(flows[1].first?.index).toBe(0);
			expect(flows[1].last?.index).toBe(0);
		}
	});
}
