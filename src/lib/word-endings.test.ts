import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { loadText } from './corpus';
import TextBody from './components/TextBody.svelte';

const original = (await loadText('ordinarium/praefatio-apostolorum', 'pl'))!;

describe('punctuated Latin word endings', () => {
	for (const helpLevel of [0, 1, 2]) {
		for (const raised of [false, true]) {
			it.each(['Dominatiónibus', 'O', 'Amen', 'œ́', 'glóriæ'])(
				`preserves %s and paired source marks in mode ${helpLevel}, initial ${raised}`,
				(form) => {
					const { text: doc, gloss } = structuredClone(original);
					const word = { id: 'w002', form, lemma: 'amen', morph: { pos: 'interj' }, post: ',' };
					doc.segments = [
						{
							id: 's01',
							type: 'verse',
							words: raised ? [word] : [{ ...word, id: 'w001', form: 'Et', post: '' }, word],
							parentheses: [{ from: 'w002', through: 'w002', closing: 'after-post' }]
						}
					];
					gloss.segments = { s01: { translation: 'Przekład.' } };
					gloss.words = { w001: { gloss: 'i' }, w002: { gloss: 'znaczenie' } };
					const before = JSON.stringify({ doc, gloss });
					const html = render(TextBody, { props: { doc, gloss, lang: 'pl', helpLevel } }).body;
					const text = html.replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/g, '').replace(/<[^>]*>/g, '');
					expect(text).toContain(`(${form},)`);
					expect(text).not.toMatch(/[\u00ad\u200b\u2060]/u);
					expect(JSON.stringify({ doc, gloss })).toBe(before);
					expect(html.includes('class="word-ending')).toBe(helpLevel === 1);
				}
			);
		}
	}
});
