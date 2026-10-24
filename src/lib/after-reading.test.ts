import {
	freshProperFixture,
	actualPackResponse,
	deferredTransport
} from './proper-browser-test-fixtures';
import {
	selectedResponseFixture as fixture,
	responseFixtureContext as context,
	responseReadingRole as readingRole,
	announcedBodyFixtures,
	currentReadingState,
	responseCatalogueFixture,
	expectResponseCatalogueRoundTrip,
	expectResponseCatalogueRestored
} from './reading-test-fixtures';
import { expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import { ordoData, properData, readingData } from './loaders';
import { ordoContext, ordoEntryVisibility, ordoResponseContext } from './ordo-context';
import type { Lang } from './i18n';
import { artifactPath, dayById, componentApplies } from './proprium';
import TextBody from './components/TextBody.svelte';
import { massForm } from './mass-form.svelte';
import { role } from './role.svelte';
import { dayOn } from './kalendarium';

const choices = {
	prior: { date: '2026-11-29', mass: 'dominica-i-adventus' },
	ordinary: { date: '2026-04-26', mass: 'dominica-iii-post-pascha' },
	vigil: { date: '2026-04-04', mass: 'vigilia-paschalis' },
	passion: { date: '2026-03-29', mass: 'dominica-ii-passionis' }
};
const responses = ['deo-gratias-epistolae', 'laus-tibi-christe'] as const;

const states = [
	'cold',
	'ordinary-only',
	'invalid-date',
	'date-mass-mismatch',
	'unwritten',
	'loading',
	'failed',
	'wrong-loaded-mass',
	'wrong-loaded-language',
	'zero',
	'multiple',
	'foreign',
	'malformed',
	'owner-rejected',
	'ordinary',
	'vigil',
	'passion'
] as const;

for (const lang of ['pl', 'en'] as const)
	for (const entry of responses)
		it.each(states)(`${lang} ${entry}: %s is grounded in the selected body`, async (name) => {
			const choice =
				name === 'vigil' ? choices.vigil : name === 'passion' ? choices.passion : choices.ordinary;
			const f = await fixture(choice, lang, entry);
			const baseline = context(entry, f, lang);
			expect(baseline.reason).toBe(
				name === 'passion' && entry === responses[1] ? 'passion' : 'ordinary-reading'
			);
			const original = structuredClone(f);
			switch (name) {
				case 'cold':
					f.state = { ...f.state, date: null, mass: null, loadedMass: null, loadedLanguage: null };
					break;
				case 'ordinary-only':
					f.state = { ...f.state, mass: null, loadedMass: null, loadedLanguage: null };
					break;
				case 'invalid-date':
					f.state.date = '2026-02-30';
					break;
				case 'date-mass-mismatch':
					f.state.date = choices.vigil.date;
					break;
				case 'unwritten':
					f.state.unwritten = true;
					break;
				case 'loading':
					f.state.loading = true;
					break;
				case 'failed':
					f.state.failed = true;
					break;
				case 'wrong-loaded-mass':
					f.state.loadedMass = choices.vigil.mass;
					break;
				case 'wrong-loaded-language':
					f.state.loadedLanguage = lang === 'pl' ? 'en' : 'pl';
					break;
				case 'zero':
					f.readings = [];
					break;
				case 'multiple':
					f.readings.push({ ...f.readings[0], slug: 'second', anchor: 'second' });
					break;
				case 'foreign':
					f.readings = (await fixture(choices.vigil, lang, entry)).readings;
					break;
				case 'malformed':
					f.readings[0].gloss.words = {};
					break;
				case 'owner-rejected':
					f.owners = {};
					break;
			}
			const answer = context(entry, f, lang);
			const ready = ['ordinary', 'vigil', 'passion'].includes(name);
			const passion = name === 'passion' && entry === responses[1];
			expect(answer.reason).toBe(
				passion
					? 'passion'
					: ready
						? 'ordinary-reading'
						: name === 'ordinary-only'
							? 'ordinary-only'
							: 'unconfirmed'
			);
			expect(answer.referenceOnly).toBe(passion || !ready);
			if (passion) expect(answer.note).toBe(ordoContext(entry, choices.passion.mass, false, lang));
			else if (!ready) {
				expect(answer.note).toContain(lang === 'pl' ? 'tylko do wglądu' : 'reference only');
				expect(answer.note).not.toMatch(/Pasji|Passion|omitted|opuszcza|śpiew|sing/i);
				expect(ordoEntryVisibility(answer.referenceOnly, false, false)).toEqual({
					words: true,
					silent: false,
					folded: false,
					revealed: false
				});
			} else expect(answer.note).toBeUndefined();
			// Every negative has a healthy recovery, not just an expected failure.
			expect(context(entry, original, lang)).toEqual(baseline);
		});

for (const lang of ['pl', 'en'] as const)
	for (const entry of responses)
		it(`${lang} ${entry}: a real ordinary body becomes eligible only with a matching catalogue binding`, async () => {
			const f = await fixture(choices.passion, lang, entry);
			const alternative = await fixture(choices.ordinary, lang, entry);
			const foreign = alternative.readings;
			f.readings = foreign;
			f.lex = alternative.lex;
			expect(context(entry, f, lang).reason).toBe('unconfirmed');
			const component = dayById(choices.passion.mass)!.components.find(
				(c) => c.role === readingRole(entry)
			)!;
			const oldText = component.text;
			try {
				component.text = foreign[0].key;
				// Explicit hypothetical future catalogue binding, not a current Palm alternative.
				expect(context(entry, f, lang)).toEqual({
					referenceOnly: false,
					reason: 'ordinary-reading'
				});
			} finally {
				component.text = oldText;
			}
			expect(context(entry, f, lang).reason).toBe('unconfirmed');
		});

for (const lang of ['pl', 'en'] as const)
	for (const entry of responses)
		for (const helpLevel of [0, 1, 2])
			it(`${lang} ${entry} help${helpLevel}: real fixed words, anchors and citations survive reference mode`, async () => {
				const body = (await readingData(lang, 'ordinarium', entry))!;
				expect(body).not.toBeNull();
				const before = structuredClone(body);
				const words = body.doc.segments.flatMap((s) => s.words ?? []);
				expect(words).toHaveLength(entry === responses[0] ? 2 : 3);
				const oldForm = massForm.value,
					oldRole = role.value;
				try {
					for (const form of ['lecta', 'cantu'] as const)
						for (const who of ['populus', 'minister', 'sacerdos'] as const) {
							massForm.set(form);
							role.set(who);
							const draw = (referenceOnly: boolean) =>
								render(TextBody, {
									props: {
										doc: body.doc,
										gloss: body.gloss,
										lang,
										helpLevel,
										idPrefix: entry,
										referenceOnly,
										ontap: () => {},
										verifiedTranslationCitations: body.bibliography.translation
									}
								}).body;
							const active = draw(false),
								reference = draw(true);
							expect(active).toContain('class="who');
							expect(reference).not.toContain('class="who');
							expect(reference).not.toContain('class="mark');
							const verse = reference.match(new RegExp('<p[^>]*id="' + entry + '-s01"[^>]*>'))?.[0];
							expect(verse).toBeDefined();
							expect(verse).not.toMatch(/\b(answer|quiet)\b/);
							const plain = reference.replace(/<[^>]*>/g, '');
							for (const word of words) {
								expect(reference.split('id="' + entry + '.' + word.id + '"')).toHaveLength(2);
								expect(plain).toContain(word.form);
								if (helpLevel === 1) expect(plain).toContain(body.gloss.words[word.id].gloss!);
							}
							if (helpLevel === 2) {
								expect(plain).toContain(body.gloss.segments.s01.translation!);
								for (const citation of body.bibliography.translation)
									if (citation.url)
										expect(reference).toContain(citation.url.replaceAll('&', '&amp;'));
							}
						}
				} finally {
					massForm.set(oldForm);
					role.set(oldRole);
				}
				expect(body).toEqual(before);
			});

const runtime = freshProperFixture();
const deferred = deferredTransport;
async function transport(hook?: (url: string) => Promise<boolean>) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => {
			const lang: Lang = url.includes('/pl/') || url.includes('/pl.json') ? 'pl' : 'en';
			if (url.includes('/proprium/') && hook && !(await hook(url)))
				return { ok: false, status: 503 };
			return actualPackResponse(url, lang, async () => {
				expect(url).toContain('/proprium/');
				const days = Object.fromEntries(
					await Promise.all(
						Object.values(choices).map(async (choice) => [
							choice.mass,
							await properData(choice.mass, lang)
						])
					)
				);
				return { days };
			});
		})
	);
}
async function currentContext(lang: Lang, entry: string) {
	const data = (await ordoData(lang, 'catechumenorum'))!;
	const readings = announcedBodyFixtures(runtime.proper.forSlot(readingRole(entry)));
	return ordoResponseContext(
		entry,
		currentReadingState(runtime.proper),
		readings,
		data.readingOwners,
		runtime.proper.payload?.lex,
		lang
	)!;
}
async function assertOrdinary(lang: Lang) {
	expect(runtime.proper.failed).toBe(false);
	expect(runtime.proper.payload?.lang).toBe(lang);
	for (const entry of responses)
		expect((await currentContext(lang, entry)).reason).toBe('ordinary-reading');
}

for (const lang of ['pl', 'en'] as const) {
	it(`${lang}: ordinary to pending Palm to confirmed Passion and back uses actual store state`, async () => {
		const pending = deferred();
		expect(artifactPath(choices.ordinary.mass, lang)).not.toBe(
			artifactPath(choices.passion.mass, lang)
		);
		await transport(async (url) => {
			if (url === artifactPath(choices.passion.mass, lang)) await pending.promise;
			return true;
		});
		await runtime.chooseDay(choices.ordinary, lang);
		await assertOrdinary(lang);
		const flight = runtime.chooseDay(choices.passion, lang);
		expect(runtime.proper.loading).toBe(true);
		expect(runtime.proper.payload).toBeNull();
		for (const entry of responses)
			expect((await currentContext(lang, entry)).reason).toBe('unconfirmed');
		pending.release();
		await flight;
		expect(runtime.proper.payload?.day).toBe(choices.passion.mass);
		expect((await currentContext(lang, responses[0])).reason).toBe('ordinary-reading');
		expect((await currentContext(lang, responses[1])).reason).toBe('passion');
		await runtime.chooseDay(choices.ordinary, lang);
		await assertOrdinary(lang);
	});
	it(`${lang}: failed Vigil retries into two active responses without the old body`, async () => {
		let broken = false;
		await transport(async () => !broken);
		expect(artifactPath(choices.prior.mass, lang)).not.toBe(artifactPath(choices.vigil.mass, lang));
		await runtime.chooseDay(choices.prior, lang);
		await assertOrdinary(lang);
		broken = true;
		await runtime.chooseDay(choices.vigil, lang);
		expect(runtime.proper.failed).toBe(true);
		expect(runtime.proper.payload).toBeNull();
		for (const entry of responses)
			expect((await currentContext(lang, entry)).reason).toBe('unconfirmed');
		broken = false;
		await runtime.chooseDay(choices.vigil, lang);
		await assertOrdinary(lang);
		expect(runtime.proper.payload?.day).toBe(choices.vigil.mass);
	});
	it(`${lang}: a superseded language flight cannot restore an old-language active body`, async () => {
		const other: Lang = lang === 'pl' ? 'en' : 'pl';
		const pending = deferred();
		await transport(async (url) => {
			if (url.includes('/' + other + '/')) await pending.promise;
			return true;
		});
		const old = runtime.chooseDay(choices.ordinary, other);
		for (const entry of responses)
			expect((await currentContext(lang, entry)).reason).toBe('unconfirmed');
		await runtime.chooseDay(choices.ordinary, lang);
		await assertOrdinary(lang);
		pending.release();
		await old;
		await assertOrdinary(lang);
	});
	it(`${lang}: invalid, unwritten and explicit Ordinary-only choices recover without stale instructions`, async () => {
		await transport();
		const referenceState = async (choice: { date: string; mass: string | null }) => {
			await runtime.chooseDay(choice, lang);
			expect(runtime.proper.payload).toBeNull();
			for (const entry of responses)
				expect((await currentContext(lang, entry)).referenceOnly).toBe(true);
		};
		await runtime.chooseDay(choices.ordinary, lang);
		await assertOrdinary(lang);
		await referenceState({ date: '2026-02-30', mass: choices.ordinary.mass });
		await runtime.chooseDay(choices.ordinary, lang);
		await assertOrdinary(lang);

		// A controlled future incomplete-edition counterfixture, not a claim about today's coverage.
		// All actual shipped calendar rows now have a default formulary.
		const catalog = await import('./proprium');
		const choicesNow = await import('./ordo-choice');
		const currentDay = catalog.dayById(choices.ordinary.mass)!;
		expect(currentDay).toBeDefined();
		expect(dayOn(choices.ordinary.date)).not.toBeNull();
		expect(choicesNow.resolveOrdoChoice(choices.ordinary.date)).toEqual(choices.ordinary);
		const originalDefault = currentDay.calendar.default;
		const beforeDay = structuredClone(currentDay);
		expect(originalDefault).toBe(true);
		try {
			currentDay.calendar.default = false;
			expect(choicesNow.resolveOrdoChoice(choices.ordinary.date)).toEqual({
				date: choices.ordinary.date,
				mass: null
			});
			await referenceState({ date: choices.ordinary.date, mass: null });
			expect(runtime.proper.unwritten).toBe(true);
		} finally {
			currentDay.calendar.default = originalDefault;
		}
		expect(currentDay.calendar.default).toBe(originalDefault);
		expect(currentDay).toEqual(beforeDay);
		expect(choicesNow.resolveOrdoChoice(choices.ordinary.date)).toEqual(choices.ordinary);
		await runtime.chooseDay(choices.ordinary, lang);
		await assertOrdinary(lang);
		await referenceState({ date: choices.ordinary.date, mass: null });
		expect(runtime.proper.unwritten).toBe(false);
		await runtime.chooseDay(choices.ordinary, lang);
		await assertOrdinary(lang);
	});
}

// In-memory catalogue guard fixtures, not new permitted ritual alternatives.
for (const lang of ['pl', 'en'] as const)
	for (const entry of responses) {
		it(`${lang} ${entry}: selected catalogue conditions exclude and restore a delivered body`, async () => {
			const testCase = await responseCatalogueFixture(choices.ordinary, lang, entry);
			const { f, baseline, day, original, component, applicable } = testCase;
			const excluded: typeof component = { ...component, condition: { weekday: 'not-sunday' } };
			expect(componentApplies(applicable.condition, choices.ordinary.date)).toBe(true);
			expect(componentApplies(excluded.condition, choices.ordinary.date)).toBe(false);
			try {
				day.components = original.map((c) => (c === component ? applicable : c));
				expect(context(entry, f, lang)).toEqual(baseline);
				day.components = original.map((c) => (c === component ? excluded : c));
				expectResponseCatalogueRoundTrip(testCase, entry, lang);
			} finally {
				day.components = original;
			}
			expectResponseCatalogueRestored(testCase, entry, lang);
		});

		it(`${lang} ${entry}: two applicable catalogue occurrences cannot authorize one delivered body`, async () => {
			const testCase = await responseCatalogueFixture(choices.ordinary, lang, entry);
			const { f, baseline, day, original, component, applicable } = testCase;
			const duplicate: typeof component = { ...applicable, key: `${component.key}-duplicate` };
			expect(original.some((c) => c.key === duplicate.key)).toBe(false);
			expect(componentApplies(applicable.condition, choices.ordinary.date)).toBe(true);
			expect(componentApplies(duplicate.condition, choices.ordinary.date)).toBe(true);
			try {
				day.components = original.map((c) => (c === component ? applicable : c));
				expect(context(entry, f, lang)).toEqual(baseline);
				// Keep the matching occurrence first: deleting only the length guard must fail this test.
				day.components = original.flatMap((c) => (c === component ? [applicable, duplicate] : [c]));
				expect(
					day.components.filter(
						(c) =>
							c.role === readingRole(entry) && componentApplies(c.condition, choices.ordinary.date)
					)
				).toHaveLength(2);
				expectResponseCatalogueRoundTrip(testCase, entry, lang);
			} finally {
				day.components = original;
			}
			expectResponseCatalogueRestored(testCase, entry, lang);
		});

		it(`${lang} ${entry}: filtering a foreign catalogue occurrence cannot authorize its observed body`, async () => {
			const testCase = await responseCatalogueFixture(choices.ordinary, lang, entry);
			const { f, baseline, day, original, component, applicable } = testCase;
			const alternative = await fixture(choices.vigil, lang, entry);
			expect(context(entry, alternative, lang)).toEqual(baseline);
			expect(alternative.readings[0].key).not.toBe(component.text);
			const excluded: typeof component = {
				...component,
				key: `${component.key}-excluded`,
				text: alternative.readings[0].key,
				condition: { weekday: 'not-sunday' }
			};
			expect(original.some((c) => c.key === excluded.key)).toBe(false);
			expect(componentApplies(applicable.condition, choices.ordinary.date)).toBe(true);
			expect(componentApplies(excluded.condition, choices.ordinary.date)).toBe(false);
			const originalReadings = f.readings;
			const originalLex = f.lex;
			try {
				// Excluded comes first: count and identity must use the filtered catalogue.
				day.components = original.flatMap((c) => (c === component ? [excluded, applicable] : [c]));
				expect(
					day.components.filter(
						(c) =>
							c.role === readingRole(entry) && componentApplies(c.condition, choices.ordinary.date)
					)
				).toHaveLength(1);
				expect(f.readings).toHaveLength(1);
				expect(context(entry, f, lang)).toEqual(baseline);
				// A real healthy body and its own lexicon still do not match the selected occurrence.
				f.readings = alternative.readings;
				f.lex = alternative.lex;
				expect(f.readings).toHaveLength(1);
				expect(context(entry, f, lang)).toMatchObject({
					referenceOnly: true,
					reason: 'unconfirmed'
				});
				f.readings = originalReadings;
				f.lex = originalLex;
				expect(context(entry, f, lang)).toEqual(baseline);
			} finally {
				day.components = original;
				f.readings = originalReadings;
				f.lex = originalLex;
			}
			expectResponseCatalogueRestored(testCase, entry, lang);
		});
	}
