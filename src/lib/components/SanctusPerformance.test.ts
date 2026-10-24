import { afterEach, expect, it } from 'vitest';
import { render } from 'svelte/server';
import TextBody from './TextBody.svelte';
import { loadText } from '../corpus';
import { massForm } from '../mass-form.svelte';
import { role, ROLES } from '../role.svelte';

afterEach(() => {
	role.set('populus');
	massForm.set('cantu');
});

const labels = {
	pl: 'Schola śpiewa, a wierni mogą dołączyć. Kapłan odmawia ten sam tekst po cichu.',
	en: 'The choir sings, and the faithful may join. The priest recites the same text quietly.'
};

for (const lang of ['pl', 'en'] as const)
	for (const who of ROLES)
		for (const form of ['cantu', 'lecta'] as const)
			for (const helpLevel of [0, 1, 2])
				for (const showSpeakerNames of [true, false]) {
					it(`${lang}/${who}/${form}/help${helpLevel}/names${showSpeakerNames} retains one body and both actions`, async () => {
						const entry = await loadText('ordinarium/sanctus', lang);
						expect(entry).toBeDefined();
						role.set(who);
						massForm.set(form);
						const html = render(TextBody, {
							props: {
								doc: entry!.text,
								gloss: entry!.gloss,
								lang,
								helpLevel,
								showSpeakerNames,
								hideOpeningRubric: true,
								idPrefix: 'sanctus',
								ontap: () => {}
							}
						}).body.replaceAll('\u00a0', ' ');
						expect(html.match(/class="verse[^"]*\banswer\b/g)).toHaveLength(5);
						expect(html.match(/class="mark[" ]/g) ?? []).toHaveLength(0);
						expect(html).not.toMatch(/class="verse[^"]*\bquiet\b/);
						expect(html.split(labels[lang])).toHaveLength(form === 'cantu' ? 2 : 1);
						expect(html.match(/class="who-performance"/g) ?? []).toHaveLength(
							form === 'cantu' ? 1 : 0
						);
						if (form === 'cantu') {
							expect(html).not.toContain('class="who-name"');
							expect(html).not.toContain('class="who-voice"');
						}
						for (const segment of entry!.text.segments) {
							expect(html.match(new RegExp(`id="sanctus-${segment.id}"`, 'g'))).toHaveLength(1);
						}
						const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
						expect(ids.length).toBe(new Set(ids).size);
						expect(ids.filter((id) => /^sanctus\.w\d{3}$/.test(id))).toEqual(
							Array.from({ length: 25 }, (_, n) => `sanctus.w${String(n + 1).padStart(3, '0')}`)
						);
						expect(entry!.text.segments.flatMap((s) => s.words ?? [])).toHaveLength(25);
					});
				}

it.each(['pl', 'en'] as const)(
	'%s reference-only suppresses performance and ownership',
	async (lang) => {
		const entry = await loadText('ordinarium/sanctus', lang);
		const html = render(TextBody, {
			props: {
				doc: entry!.text,
				gloss: entry!.gloss,
				lang,
				helpLevel: 0,
				referenceOnly: true
			}
		}).body;
		expect(html).not.toContain('who-performance');
		expect(html).not.toMatch(/class="verse[^"]*\banswer\b/);
	}
);
