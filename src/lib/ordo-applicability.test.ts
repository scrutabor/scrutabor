import { expect, it } from 'vitest';
import { render } from 'svelte/server';
import TextBody from './components/TextBody.svelte';
import { loadText } from './corpus';
import { ORDO } from './ordo';
import { unconfirmedOrdoContext } from './ordo-applicability';
import { ordinaryOmission } from './ordinary-omission';
import { settledSelection, unresolvedPayloadCases } from './ordinary-test-fixtures';
import { expectParagraphLatin, expectReferenceVerse } from './ordo-test-context';
import { requiemWaterContext } from './requiem-view';
import { massForm } from './mass-form.svelte';
import { role, ROLES } from './role.svelte';
import { findOrphans } from './polish';
import type { GospelPreparationState } from './ordo-context';

const masses = [
	'commemoratio-omnium-fidelium-defunctorum',
	'commemoratio-omnium-fidelium-defunctorum-missa-ii',
	'commemoratio-omnium-fidelium-defunctorum-missa-iii'
];
const affected = ['ite-missa-est', 'iudica-me', 'qui-dixisti', 'benedictio', 'deus-qui-humanae'];
const pending: [string, Partial<GospelPreparationState>][] = [
	['initial', { date: null, mass: null, loadedMass: null, loadedLanguage: null }],
	...unresolvedPayloadCases,
	['wrong language', {}],
	['foreign date', { date: '2026-04-04' }],
	['unknown Mass', { mass: 'unknown', loadedMass: 'unknown' }]
];

it.each(pending)(
	'shows only unconfirmed reference guidance for %s and restores confirmed use',
	(name, patch) => {
		for (const lang of ['pl', 'en'] as const)
			for (const mass of masses) {
				const ready = settledSelection('2026-11-02', mass, lang);
				const state = { ...ready, ...patch };
				if (name === 'wrong language') state.loadedLanguage = lang === 'pl' ? 'en' : 'pl';
				const saved = structuredClone(state);
				for (const entry of affected) {
					const result = unconfirmedOrdoContext(entry, state, lang)!;
					expect(result.referenceOnly).toBe(true);
					expect(result.unconfirmed).toBe(true);
					expect(result.note).toContain(lang === 'pl' ? 'wglądu' : 'reference only');
					if (lang === 'pl') expect(findOrphans(result.note!)).toEqual([]);
					if (entry === 'ite-missa-est') {
						expect(result.title).toBe(lang === 'pl' ? 'Rozesłanie' : 'Dismissal');
						expect(result.titleLanguage).toBe(lang);
						for (const ordinaryClaim of ['Ite, missa est', 'Deo grátias', 'turns', 'zwraca się'])
							expect(result.note! + result.title!).not.toContain(ordinaryClaim);
					} else expect(result.title).toBeUndefined();
					if (entry === 'deus-qui-humanae') expect(result.openingRubricContext).toBe(result.note);
					expect(unconfirmedOrdoContext(entry, ready, lang)).toBeUndefined();
				}
				expect(state).toEqual(saved);
			}
	}
);

it.each(['pl', 'en'] as const)(
	'keeps complete %s canonical reference bodies without active actors',
	async (lang) => {
		const previousForm = massForm.value;
		const previousRole = role.value;
		try {
			for (const entry of ['iudica-me', 'qui-dixisti', 'benedictio']) {
				const loaded = await loadText(`ordinarium/${entry}`, lang);
				expect(loaded, 'genuine reader6.10 vendor is required').toBeDefined();
				if (!loaded) throw new Error('canonical reference absent');
				const saved = structuredClone(loaded);
				for (const form of ['lecta', 'cantu'] as const)
					for (const who of ROLES)
						for (const helpLevel of [0, 1, 2] as const) {
							massForm.set(form);
							role.set(who);
							const context = unconfirmedOrdoContext(
								entry,
								{ ...settledSelection('2026-11-02', masses[0], lang), failed: true },
								lang
							)!;
							const props = {
								doc: loaded.text,
								gloss: loaded.gloss,
								lang,
								helpLevel,
								idPrefix: 'reference',
								// As the Ordo passes them: its words stay tappable, so each has its anchor.
								ontap: () => {}
							};
							const reference = render(TextBody, {
								props: { ...props, referenceOnly: context.referenceOnly }
							}).body;
							for (const cue of ['who-name', 'who-all', 'who-join', 'who-voice', 'class="mark'])
								expect(reference).not.toContain(cue);
							for (const segment of loaded.text.segments.filter((s) => s.type === 'verse'))
								expectReferenceVerse(reference, 'reference', segment);
							if (who === 'sacerdos' && helpLevel === 2) {
								const active = render(TextBody, { props }).body;
								expect(active).not.toBe(reference);
								expect(active).toMatch(/who-name|who-voice|\byours\b|\bquiet\b/);
							}
						}
				expect(loaded).toEqual(saved);
			}
		} finally {
			massForm.set(previousForm);
			role.set(previousRole);
		}
	}
);

it.each([
	['2026-04-12', 'dominica-in-albis', false],
	['2026-04-04', 'vigilia-paschalis', false],
	...masses.map((mass) => ['2026-11-02', mass, true] as const)
] as const)(
	'leaves genuine settled %s/%s selection and omissions source-owned',
	(date, mass, requiem) => {
		for (const lang of ['pl', 'en'] as const) {
			const state = settledSelection(date, mass, lang);
			for (const entry of affected)
				expect(unconfirmedOrdoContext(entry, state, lang)).toBeUndefined();
			for (const entry of ['iudica-me', 'qui-dixisti', 'benedictio'])
				expect(ordinaryOmission(entry, state, lang)?.text).toBe(
					requiem ? `ordinarium/${entry}` : undefined
				);
			expect(!!requiemWaterContext('deus-qui-humanae', state, lang)).toBe(requiem);
		}
	}
);

it('does not change unrelated entries or turn an unconfirmed prescription into omission', () => {
	const state = { ...settledSelection('2026-11-02', masses[0], 'en'), failed: true };
	for (const entry of ORDO.flatMap((movement) => movement.entries)) {
		if (!affected.includes(entry.id))
			expect(unconfirmedOrdoContext(entry.id, state, 'en')).toBeUndefined();
		if (['iudica-me', 'qui-dixisti', 'benedictio'].includes(entry.id))
			expect(ordinaryOmission(entry.id, state, 'en')).toBeUndefined();
	}
});

it.each(['pl', 'en'] as const)(
	'qualifies unresolved %s water rubric before Latin without adding the resolved exception',
	async (lang) => {
		const loaded = (await loadText('ordinarium/deus-qui-humanae', lang))!;
		expect(loaded).toBeDefined();
		const saved = structuredClone(loaded);
		const ready = settledSelection('2026-11-02', masses[0], lang);
		const resolved = requiemWaterContext('deus-qui-humanae', ready, lang)!;
		for (const [, patch] of unresolvedPayloadCases) {
			const context = unconfirmedOrdoContext('deus-qui-humanae', { ...ready, ...patch }, lang)!;
			for (const helpLevel of [0, 1, 2] as const) {
				const html = render(TextBody, {
					props: {
						doc: loaded.text,
						gloss: loaded.gloss,
						lang,
						helpLevel,
						referenceOnly: true,
						openingRubricContext: context.openingRubricContext
					}
				}).body;
				expect(html.indexOf(context.note!)).toBeGreaterThanOrEqual(0);
				expect(html.indexOf(context.note!)).toBeLessThan(
					html.indexOf(loaded.text.segments[0].text!)
				);
				expect(html).toContain(loaded.text.segments[0].text!);
				expect(html).toContain(loaded.text.segments[2].text!);
				expect(html).not.toContain(resolved);
				expect(html).not.toContain('who-name');
			}
		}
		expect(loaded).toEqual(saved);
		expect(requiemWaterContext('deus-qui-humanae', ready, lang)).toBe(resolved);
	}
);

it.each(['pl', 'en'] as const)(
	'retains the complete %s generic Ordinary guide after a settled explicit no-formulary choice',
	async (lang) => {
		const generic = settledSelection('2026-04-04', null, lang);
		const previousForm = massForm.value;
		const previousRole = role.value;
		try {
			massForm.set('lecta');
			role.set('sacerdos');
			for (const entry of affected) {
				expect(unconfirmedOrdoContext(entry, generic, lang)).toBeUndefined();
				const body = (await loadText(`ordinarium/${entry}`, lang))!;
				expect(body, 'complete canonical generic guide body is required').toBeDefined();
				const saved = structuredClone(body);
				for (const helpLevel of [0, 1, 2] as const) {
					const html = render(TextBody, {
						props: { doc: body.text, gloss: body.gloss, lang, helpLevel, idPrefix: entry }
					}).body;
					// Deus, qui humánæ is the priest's alone, one verse said secreto: with one speaker
					// there is nobody to tell apart, so its guide names the voice instead.
					expect(html).toContain(entry === 'deus-qui-humanae' ? 'who-voice' : 'who-name');
					for (const segment of body.text.segments.filter((s) => s.type === 'verse'))
						expectParagraphLatin(html, `${entry}-${segment.id}`, segment.words!);
				}
				expect(body).toEqual(saved);
			}
		} finally {
			massForm.set(previousForm);
			role.set(previousRole);
		}
	}
);

it('does not promote invalid, promised or unsettled null-Mass states to the generic guide', () => {
	for (const lang of ['pl', 'en'] as const) {
		const generic = settledSelection('2026-04-04', null, lang);
		for (const patch of [
			{ date: null },
			{ date: '2026-02-30' },
			{ loading: true },
			{ failed: true },
			{ unwritten: true },
			{ loadedMass: masses[0] },
			{ loadedLanguage: lang },
			{ date: '2026-11-02', mass: masses[0] }
		]) {
			const unsettled = { ...generic, ...patch };
			for (const entry of affected) {
				expect(unconfirmedOrdoContext(entry, unsettled, lang)?.referenceOnly).toBe(true);
				expect(unconfirmedOrdoContext(entry, generic, lang)).toBeUndefined();
			}
		}
	}
});
