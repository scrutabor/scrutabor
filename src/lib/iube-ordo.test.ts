import { expect, it } from 'vitest';
import { render } from 'svelte/server';
import TextBody from './components/TextBody.svelte';
import { loadText, type Segment } from './corpus';
import { ordoData } from './loaders';
import { M } from './i18n';
import { massForm } from './mass-form.svelte';
import { ORDO, partVoice } from './ordo';
import { expectGospelPreparationOrder } from './ordo-test-context';
import {
	ordoBlessingContext,
	ordoContext,
	ordoEntryVisibility,
	ordoResponseContext,
	type GospelPreparationState
} from './ordo-context';
import { bindOrphans } from './polish';
import { PROPER_DAYS, SLOT_OF } from './proprium';
import { role, showsWords } from './role.svelte';
import { inMassForm } from './speaker-marks';

const id = 'iube-domine-benedicere';
const key = 'ordinarium/' + id;
const movement = ORDO.find((item) => item.id === 'catechumenorum')!;
const blessing = movement.entries.find((entry) => entry.id === id)!;
const requiems = [
	'commemoratio-omnium-fidelium-defunctorum',
	'commemoratio-omnium-fidelium-defunctorum-missa-ii',
	'commemoratio-omnium-fidelium-defunctorum-missa-iii'
];
const state = (mass: string | null, lang: 'pl' | 'en'): GospelPreparationState => ({
	date: '2026-04-26',
	mass,
	loadedMass: mass,
	loadedLanguage: mass ? lang : null,
	loading: false,
	failed: false,
	unwritten: false
});

it('adds one complete fixed blessing only between Munda and the Mass Gospel', () => {
	expectGospelPreparationOrder(movement);
	expect(ORDO.flatMap((item) => item.entries).filter((entry) => entry.text === key)).toEqual([
		blessing
	]);
	expect(blessing).toMatchObject({ kind: 'text', text: key });
	expect(blessing.onlyWhenPresent).toBeUndefined();
	expect(partVoice(id)).toBe('secreto');
	for (const part of ['graduale', 'alleluia', 'tractus', 'sequentia'] as const)
		expect(SLOT_OF[part]).toBe('graduale');
	expect(
		ORDO.find((item) => item.id === 'conclusio')!.entries.some((entry) => entry.text === key)
	).toBe(false);
});

it.each(['pl', 'en'] as const)(
	'keeps the %s ordinary base explicitly priest-alone and conditional',
	(lang) => {
		const note = blessing.note[lang].replaceAll('\u00a0', ' ');
		for (const phrase of lang === 'pl'
			? [
					'bez diakona i subdiakona',
					'po cichu',
					'sam śpiewa Ewangelię',
					'odrębny obrzęd',
					'Sam wybór Mszy śpiewanej',
					'za zmarłych',
					'przed ostatnią Ewangelią'
				]
			: [
					'without a deacon and subdeacon',
					'silently',
					'sings the Gospel himself',
					'separate rite',
					'Selecting sung Mass alone',
					'Masses for the Dead',
					'before the Last Gospel'
				])
			expect(note).toContain(phrase);
		expect(note).not.toContain(';');
	}
);

for (const lang of ['pl', 'en'] as const) {
	it.each(requiems)(
		'retains complete reference words but omits the request and blessing at %s in ' + lang,
		(mass) => {
			expect(PROPER_DAYS.some((day) => day.id === mass)).toBe(true);
			const context = ordoBlessingContext(id, { ...state(mass, lang), date: '2026-11-02' }, lang)!;
			expect(context.referenceOnly).toBe(true);
			expect(context.note).toContain(
				lang === 'pl'
					? 'Opuszcza się prośbę'
					: 'blessing request and the following prayer are omitted'
			);
			expect(context.note).toContain(lang === 'pl' ? 'tylko do wglądu' : 'reference only');
			expect(context.note).toContain(
				lang === 'pl'
					? 'Munda cor meum wraz ze swoim zakończeniem pozostaje'
					: 'Munda cor meum and its own conclusion remain'
			);
			expect(context.note).not.toContain(';');
			expect(ordoBlessingContext('munda-cor-meum', state(mass, lang), lang)).toBeUndefined();
		}
	);
	it.each([
		['dominica-ii-passionis', '2026-03-29'],
		['vigilia-paschalis', '2026-04-04']
	])('retains the singular priest-alone preparation at %s in ' + lang, (mass, date) => {
		expect(ordoBlessingContext(id, { ...state(mass, lang), date }, lang)).toEqual({
			referenceOnly: false
		});
		const munda = ordoContext('munda-cor-meum', mass, false, lang)!;
		expect(munda).toContain(lang === 'pl' ? 'odręb' : 'separate');
		if (mass === 'dominica-ii-passionis') {
			expect(munda).toContain(
				lang === 'pl' ? 'kapłan wykonuje Pasję sam' : 'priest delivers the Passion alone'
			);
			expect(ordoContext('evangelium', mass, false, lang)).toContain(
				lang === 'pl' ? 'Nie odmawia się Dominus vobiscum' : 'Dominus vobiscum is not said'
			);
		} else
			expect(munda).toContain(lang === 'pl' ? 'nie niesie się świateł' : 'No lights are carried');
	});
	it('shows complete Ordinary-alone words with conditional guidance in ' + lang, () => {
		const context = ordoBlessingContext(id, state(null, lang), lang)!;
		expect(context.referenceOnly).toBe(false);
		expect(context.note).toContain(
			lang === 'pl' ? 'bez wybranego formularza' : 'without a selected formulary'
		);
		// The Polish guidance arrives with its one-letter words bound (lib/polish).
		expect(context.note).toContain(
			lang === 'pl' ? bindOrphans('bez diakona i subdiakona') : 'without a deacon and subdeacon'
		);
		expect(context.note).toContain(
			lang === 'pl' ? bindOrphans('z wyjątkiem Mszy za zmarłych') : 'except at Masses for the Dead'
		);
		expect(context.note).not.toContain(';');
	});
}

const unresolved: [string, Partial<GospelPreparationState>][] = [
	['initial unknown choice', { date: null, mass: null, loadedMass: null, loadedLanguage: null }],
	['loading', { loading: true }],
	['failed', { failed: true }],
	['unwritten', { unwritten: true }],
	['missing payload', { loadedMass: null, loadedLanguage: null }],
	['wrong payload Mass', { loadedMass: 'vigilia-paschalis' }],
	['wrong payload language', { loadedLanguage: 'la' }],
	['unknown Mass even with a claimed payload', { mass: 'unknown', loadedMass: 'unknown' }],
	['loaded choice without date', { date: null }],
	['no-form loading', { mass: null, loadedMass: null, loading: true }],
	['no-form failed', { mass: null, loadedMass: null, failed: true }],
	['no-form unwritten', { mass: null, loadedMass: null, unwritten: true }]
];
it.each(unresolved)('does not advertise applicability for %s', (_, patch) => {
	for (const lang of ['pl', 'en'] as const) {
		const context = ordoBlessingContext(
			id,
			{ ...state('dominica-iii-post-pascha', lang), ...patch },
			lang
		)!;
		expect(context.referenceOnly).toBe(true);
		expect(context.note).toContain(
			lang === 'pl' ? 'Nie potwierdzono formularza' : 'has not been confirmed'
		);
		expect(context.note).toContain(lang === 'pl' ? 'tylko do wglądu' : 'reference only');
		expect(context.note).not.toContain(';');
	}
});

it('does not alter other entries or the existing Palm response decision', () => {
	for (const lang of ['pl', 'en'] as const) {
		for (const entry of ORDO.flatMap((item) => item.entries).filter((entry) => entry.id !== id))
			expect(ordoBlessingContext(entry.id, state(requiems[0], lang), lang)).toBeUndefined();
		const palm = 'dominica-ii-passionis';
		expect(
			ordoResponseContext(
				'laus-tibi-christe',
				palm,
				['proprium/dominica-ii-passionis-evangelium'],
				lang
			)
		).toEqual({
			referenceOnly: true,
			note: ordoContext('laus-tibi-christe', palm, false, lang)
		});
		expect(ordoResponseContext('laus-tibi-christe', palm, [], lang)?.referenceOnly).toBe(true);
		expect(
			ordoResponseContext('laus-tibi-christe', palm, ['proprium/other-evangelium'], lang)
		).toEqual({ referenceOnly: false });
		expect(ordoResponseContext(id, palm, [], lang)).toBeUndefined();
	}
});

it.each(['pl', 'en'] as const)(
	'loads the real complete %s corpus body and competenter with the movement',
	async (lang) => {
		const entry = await loadText(key, lang);
		expect(entry, 'canonical integration and real vendor are prerequisites').toBeDefined();
		if (!entry) throw new Error('Blessing body has not been vendored');
		expect(entry.text.segments.map((segment) => segment.words?.length)).toEqual([3, 16, 1]);
		const words = entry.text.segments.flatMap((segment) => segment.words ?? []);
		expect(words.map((word) => word.id)).toEqual(
			Array.from({ length: 20 }, (_, index) => 'w' + String(index + 1).padStart(3, '0'))
		);
		expect(words.map((word) => word.form + (word.post ?? '')).join(' ')).toBe(
			'Iube, Dómine, benedícere. Dóminus sit in corde meo, et in lábiis meis: ut digne et competénter annúntiem Evangélium suum. Amen.'
		);
		for (const form of ['lecta', 'cantu'] as const)
			for (const segment of entry.text.segments) {
				const delivery = inMassForm(segment, form);
				expect(delivery.speaker).toBe('sacerdos');
				expect(delivery.voice).toBe('secreto');
				expect(delivery.participation).toBeUndefined();
			}
		const data = await ordoData(lang, 'catechumenorum');
		expect(data?.texts[key]).toBeDefined();
		expect(data?.lex.lemmata.competenter).toMatchObject({ pos: 'adv' });
		expect(data?.lex.senses.competenter.senses.length).toBeGreaterThan(0);
	}
);

const profiles = (['pl', 'en'] as const).flatMap((lang) =>
	(['lecta', 'cantu'] as const).flatMap((form) =>
		(['populus', 'minister', 'sacerdos'] as const).flatMap((who) =>
			[0, 1, 2].map((help) => ({ lang, form, who, help }))
		)
	)
);
const verseClasses = (html: string, segment: string) => {
	const opening = html.match(new RegExp('<p[^>]*id="blessing-' + segment + '"[^>]*>'))?.[0];
	expect(opening).toBeDefined();
	return opening!.match(/class="([^"]*)"/)![1].split(/\s+/);
};
it.each(profiles)(
	'retains all real $lang/$form/$who/help$help words without reference actor/folding cues',
	async ({ lang, form, who, help }) => {
		const entry = await loadText(key, lang);
		expect(entry).toBeDefined();
		if (!entry) throw new Error('Blessing body has not been vendored');
		const before = structuredClone(entry),
			oldForm = massForm.value,
			oldRole = role.value;
		try {
			massForm.set(form);
			role.set(who);
			const rendered = (referenceOnly: boolean) =>
				render(TextBody, {
					props: {
						doc: entry.text,
						gloss: entry.gloss,
						lang,
						helpLevel: help,
						idPrefix: 'blessing',
						ontap: () => {},
						referenceOnly
					}
				}).body;
			const active = rendered(false),
				reference = rendered(true);
			expect(active).toContain('who-voice');
			expect(active).toContain(M[lang].voices.secreto);
			for (const marker of ['class="who', 'class="mark', 'who-all', 'who-join'])
				expect(reference).not.toContain(marker);
			for (const segment of entry.text.segments) {
				expect(verseClasses(active, segment.id)).toContain('quiet');
				expect(verseClasses(reference, segment.id)).not.toContain('quiet');
				expect(verseClasses(reference, segment.id)).not.toContain('answer');
				const sentence = segment.words!.map((word) => word.form + (word.post ?? '')).join(' ');
				for (const html of [active, reference]) {
					const paragraph = html.split('id="blessing-' + segment.id + '"')[1].split('</p>')[0];
					const visible = paragraph
						.replace(/<rt[^>]*>[\s\S]*?<\/rt>/g, '')
						.replace(/<[^>]*>/g, '')
						.replace(/\s+/g, ' ');
					expect(visible).toContain(sentence);
					for (const word of segment.words!)
						expect(html.split('id="blessing.' + word.id + '"').length - 1).toBe(1);
				}
			}
			const wantsWords = showsWords(
				entry.text.segments.map((segment) => inMassForm(segment, form).voice),
				partVoice(id),
				who
			);
			for (const opened of [false, true]) {
				expect(ordoEntryVisibility(true, wantsWords, opened)).toEqual({
					words: true,
					silent: false,
					folded: false,
					revealed: false
				});
				expect(ordoEntryVisibility(false, wantsWords, opened)).toEqual({
					words: who !== 'populus',
					silent: who === 'populus',
					folded: who === 'populus' && !opened,
					revealed: who === 'populus' && opened
				});
			}
		} finally {
			massForm.set(oldForm);
			role.set(oldRole);
		}
		expect(entry).toEqual(before);
	}
);

it.each(['unconditional', 'conditional'] as const)(
	'suppresses an actual controlled %s participation cue rather than passing on absent metadata',
	async (kind) => {
		const entry = await loadText(key, 'en');
		expect(entry).toBeDefined();
		if (!entry) throw new Error('Blessing body has not been vendored');
		const before = structuredClone(entry);
		// A controlled rendering counterfixture, never proposed canonical participation.
		const segment: Segment = {
			...entry.text.segments[2],
			participation: {
				lecta:
					kind === 'conditional'
						? { source: 'Test faculty', conditional: true }
						: { source: 'Test response', gradus: 1 },
				cantu:
					kind === 'conditional'
						? { source: 'Test faculty', conditional: true }
						: { source: 'Test response', gradus: 1 }
			}
		};
		const doc = { ...entry.text, segments: [segment] };
		const oldForm = massForm.value,
			oldRole = role.value;
		try {
			massForm.set('lecta');
			role.set('sacerdos');
			const rendered = (referenceOnly: boolean) =>
				render(TextBody, {
					props: { doc, gloss: entry.gloss, lang: 'en', helpLevel: 0, referenceOnly }
				}).body;
			const cue = kind === 'conditional' ? 'who-join' : 'who-all';
			expect(rendered(false)).toContain(cue);
			expect(rendered(true)).not.toContain(cue);
			expect(rendered(true)).not.toContain('who-voice');
		} finally {
			massForm.set(oldForm);
			role.set(oldRole);
		}
		expect(entry).toEqual(before);
	}
);
