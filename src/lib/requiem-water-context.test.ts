import { expect, it } from 'vitest';
import { render } from 'svelte/server';
import TextBody from './components/TextBody.svelte';
import { loadText } from './corpus';
import { settledSelection, unresolvedPayloadCases } from './ordinary-test-fixtures';
import { requiemWaterContext } from './requiem-view';

it.each([
	['pl', 0],
	['pl', 1],
	['pl', 2],
	['en', 0],
	['en', 1],
	['en', 2]
] as const)(
	'qualifies the general water rubric before its Latin at %s help %s without losing the prayer',
	async (lang, helpLevel) => {
		const loaded = (await loadText('ordinarium/deus-qui-humanae', lang))!;
		const saved = structuredClone(loaded);
		const state = settledSelection('2026-11-02', 'commemoratio-omnium-fidelium-defunctorum', lang);
		const note = requiemWaterContext('deus-qui-humanae', state, lang)!;
		expect(note).toBeTruthy();
		const props = { doc: loaded.text, gloss: loaded.gloss, lang, helpLevel };
		const html = render(TextBody, { props: { ...props, openingRubricContext: note } }).body;
		expect(html.indexOf(note)).toBeGreaterThanOrEqual(0);
		expect(html.indexOf(note)).toBeLessThan(html.indexOf(loaded.text.segments[0].text!));
		expect(html).toContain(loaded.text.segments[0].text!);
		expect(html).toContain('Deus');
		expect(html).toContain(loaded.text.segments[2].text!);
		expect(loaded).toEqual(saved);
		const generic = render(TextBody, { props }).body;
		expect(generic).not.toContain('rubric-context');
		expect(generic).toContain(loaded.text.segments[0].text!);
		for (const [, patch] of unresolvedPayloadCases)
			expect(requiemWaterContext('deus-qui-humanae', { ...state, ...patch }, lang)).toBeUndefined();
		expect(
			requiemWaterContext(
				'deus-qui-humanae',
				settledSelection('2026-04-12', 'dominica-in-albis', lang),
				lang
			)
		).toBeUndefined();
		expect(requiemWaterContext('deus-qui-humanae', state, lang)).toBe(note);
	}
);
