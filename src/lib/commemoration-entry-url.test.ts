import { afterEach, describe, expect, it, vi } from 'vitest';
import { commemorationEntryHref } from './commemoration-entry-url';
import { commemorationLookup, COMMEMORATION_SLOTS } from './commemorationes';
import { textAnchor, textHref } from './content-url';
import { commemorationPageData, properData } from './loaders';
import { properOccurrences } from './proper-occurrences';
import { resolveCompositeAddress, writeReadingAddress } from './reading-address';
import * as proprium from './proprium';

const languages = ['pl', 'en'] as const;
const addressed = [
	{ id: 'litaniae-maiores', date: '2026-04-25', mass: 'sancti-marci-evangelistae' },
	{ id: 'sancta-petronilla', date: '2027-05-31', mass: 'beata-maria-virgo-regina' }
];
const resolved = [
	{
		id: 'dominica-impedita',
		date: '2026-11-01',
		mass: 'omnium-sanctorum',
		form: 'dominica-xxiii-post-pentecosten'
	},
	{
		id: 'feria-adventus',
		date: '2026-12-08',
		mass: 'immaculata-conceptio',
		form: 'dominica-ii-adventus'
	},
	{
		id: 'festum-impeditum',
		date: '2026-12-27',
		mass: 'dominica-infra-octavam-nativitatis',
		form: 'sancti-ioannis-apostoli-et-evangelistae'
	},
	{
		id: 'dominica-impedita',
		date: '2043-11-01',
		mass: 'omnium-sanctorum',
		form: 'dominica-iv-quae-superfuit-post-epiphaniam'
	},
	{
		id: 'festum-impeditum',
		date: '2030-09-08',
		mass: 'dominica-xiii-post-pentecosten',
		form: 'nativitas-beatae-mariae-virginis'
	}
];
function activeCommemoration(date: string, mass: string, id: string) {
	const active = commemorationLookup!
		.plan(date, mass, 'lecta')
		.admitted.find((row) => row.commemoration.id === id)!;
	expect(active).toBeDefined();
	return active;
}

function adventSecretControl() {
	const dayById = proprium.dayById;
	const original = proprium.dayById('dominica-ii-adventus')!;
	const changed = structuredClone(original);
	const secret = changed.components.find((part) => part.role === 'secreta')!;
	return { dayById, original, changed, secret };
}

afterEach(() => vi.restoreAllMocks());

describe('commemoration heading entry addresses, not canonical text permalinks', () => {
	it.each(
		languages.flatMap((lang) =>
			addressed.flatMap((row) => COMMEMORATION_SLOTS.map((slot) => ({ ...row, lang, slot })))
		)
	)('$lang $id $slot opens its actual addressed set', async ({ lang, id, date, mass, slot }) => {
		const active = activeCommemoration(date, mass, id);
		expect(active.formulary).toBeNull();
		const key = active.texts[COMMEMORATION_SLOTS.indexOf(slot)];
		const href = commemorationEntryHref(lang, { key, slot, commemoration: id });
		expect(href).toBe(`/app/${lang}/commemoratio/${id}#${textAnchor(key)}`);
		const page = await commemorationPageData(id, lang);
		if (page?.kind !== 'orations') throw new Error('actual addressed target missing');
		const target = properOccurrences(page.parts).find(
			(part) => part.key === key && part.part === slot
		)!;
		expect(new URL(href, 'https://example.test').hash).toBe(`#${target.anchor}`);
		expect(page.day).toBe(id);
	});
	it.each(
		languages.flatMap((lang) =>
			resolved.flatMap((row) => COMMEMORATION_SLOTS.map((slot) => ({ ...row, lang, slot })))
		)
	)(
		'$lang $date $id $slot opens the actual resolved formulary',
		async ({ lang, id, date, mass, form, slot }) => {
			const active = activeCommemoration(date, mass, id);
			expect(active.formulary).toBe(form);
			const key = active.texts[COMMEMORATION_SLOTS.indexOf(slot)];
			const href = commemorationEntryHref(lang, { key, slot, commemoration: id, formulary: form });
			const page = await properData(form, lang);
			if (!page) throw new Error('actual resolved target missing');
			const target = properOccurrences(page.parts).find(
				(part) => part.key === key && part.part === slot
			)!;
			expect(href).toBe(`/app/${lang}/formularium/${form}#${target.anchor}`);
			// These are catalogue entry actions, not copies of the Ordo's dated/situation address.
			expect(href).not.toMatch(/[?&](dies|missa|w|s)=|~cantu/);
			expect(page.day).toBe(form);
		}
	);
	it.each(languages)('%s retains canonical shared-Mass word and segment references', (lang) => {
		for (const [key, owner] of [
			['proprium/dominica-i-passionis-secreta', 'dominica-i-passionis'],
			['proprium/dominica-iv-post-epiphaniam-collecta', 'dominica-iv-post-epiphaniam'],
			['proprium/dominica-iv-post-epiphaniam-secreta', 'dominica-iv-post-epiphaniam'],
			['proprium/dominica-iv-post-epiphaniam-postcommunio', 'dominica-iv-post-epiphaniam'],
			['proprium/visitatio-beatae-mariae-virginis-postcommunio', 'visitatio-beatae-mariae-virginis']
		]) {
			const slug = key.split('/')[1];
			expect(textHref(lang, key, { word: 'w001' })).toBe(
				`/app/${lang}/formularium/${owner}?w=${slug}.w001#${textAnchor(key)}`
			);
			expect(textHref(lang, key, { segment: 's01' })).toBe(
				`/app/${lang}/formularium/${owner}?s=${slug}.s01#${textAnchor(key)}`
			);
		}
		const key = 'proprium/sanctae-petronillae-secreta';
		expect(textHref(lang, key, { word: 'w001' })).toBe(
			`/app/${lang}/commemoratio/sancta-petronilla?w=sanctae-petronillae-secreta.w001#${textAnchor(key)}`
		);
	});
	it.each(languages)(
		'%s keeps destination-local word addresses in the selected context',
		async (lang) => {
			const page = await commemorationPageData('litaniae-maiores', lang);
			if (page?.kind !== 'orations') throw new Error('actual addressed target missing');
			const parts = properOccurrences(page.parts);
			const key = 'proprium/dominica-i-passionis-secreta';
			const target = parts.find((part) => part.key === key)!;
			const href = commemorationEntryHref(lang, {
				key,
				slot: 'secreta',
				commemoration: 'litaniae-maiores'
			});
			const url = new URL(href, 'https://example.test');
			url.searchParams.set('w', `${target.slug}.w001`);
			url.searchParams.set('s', `${target.slug}.s01`);
			const result = resolveCompositeAddress(
				parts,
				url.searchParams.get('w'),
				url.searchParams.get('s'),
				url.hash
			);
			expect(result.word).toBe(`${target.slug}.w001`);
			expect(result.segment).toBe(`${target.slug}.s01`);
			writeReadingAddress(url, result);
			expect(url.pathname).toBe(`/app/${lang}/commemoratio/litaniae-maiores`);
			expect(url.hash).toBe(`#${target.anchor}`);
		}
	);
	it('uses the role-specific repeated occurrence rather than the first same key', () => {
		const { dayById, original, changed, secret } = adventSecretControl();
		// A deliberate in-memory addressing mutation, not a newly authored liturgical use.
		changed.components.unshift({ ...secret, key: 'entry-address-control', role: 'offertorium' });
		vi.spyOn(proprium, 'dayById').mockImplementation((id) =>
			id === changed.id ? changed : dayById(id)
		);
		const href = commemorationEntryHref('en', {
			key: secret.text,
			slot: 'secreta',
			commemoration: 'feria-adventus',
			formulary: changed.id
		});
		expect(href).toBe(`/app/en/formularium/${changed.id}#${textAnchor(secret.text)}~secreta`);
		expect(original.components.some((part) => part.key === 'entry-address-control')).toBe(false);
	});
	it('refuses a date-dependent oration instead of guessing which variant a catalogue means', () => {
		const { dayById, original, changed, secret } = adventSecretControl();
		secret.condition = { weekday: 'sunday' };
		vi.spyOn(proprium, 'dayById').mockImplementation((id) =>
			id === changed.id ? changed : dayById(id)
		);
		expect(() =>
			commemorationEntryHref('en', {
				key: secret.text,
				slot: 'secreta',
				commemoration: 'feria-adventus',
				formulary: changed.id
			})
		).toThrow(/unconditional oration/);
		expect(original.components.find((part) => part.role === 'secreta')!.condition).toBeUndefined();
	});
	it.each([
		{ key: 'proprium/dominica-i-passionis-secreta', slot: 'secreta', commemoration: 'unknown' },
		{
			key: 'proprium/dominica-i-passionis-secreta',
			slot: 'evangelium',
			commemoration: 'litaniae-maiores'
		},
		{
			key: 'proprium/dominica-i-passionis-secreta',
			slot: 'collecta',
			commemoration: 'litaniae-maiores'
		},
		{
			key: 'proprium/dominica-i-passionis-secreta',
			slot: 'secreta',
			commemoration: 'litaniae-maiores',
			formulary: 'dominica-i-passionis'
		},
		{
			key: 'proprium/dominica-ii-adventus-secreta',
			slot: 'secreta',
			commemoration: 'feria-adventus'
		},
		{
			key: 'proprium/dominica-ii-adventus-secreta',
			slot: 'secreta',
			commemoration: 'feria-adventus',
			formulary: 'unknown'
		},
		{
			key: 'proprium/in-octava-nativitatis-secreta',
			slot: 'secreta',
			commemoration: 'feria-adventus',
			formulary: 'in-octava-nativitatis'
		},
		{
			key: 'proprium/dominica-i-passionis-secreta',
			slot: 'secreta',
			commemoration: 'feria-adventus',
			formulary: 'dominica-ii-adventus'
		}
	])('rejects an unbound heading context and recovers ($commemoration / $slot)', (context) => {
		expect(() => commemorationEntryHref('en', context)).toThrow(/commemoration entry/);
		expect(
			commemorationEntryHref('en', {
				key: 'proprium/dominica-i-passionis-secreta',
				slot: 'secreta',
				commemoration: 'litaniae-maiores'
			})
		).toBe('/app/en/commemoratio/litaniae-maiores#text-proprium-dominica-i-passionis-secreta');
	});
});
