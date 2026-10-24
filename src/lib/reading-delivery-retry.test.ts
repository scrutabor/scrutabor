import { freshProperFixture, actualPackResponse } from './proper-browser-test-fixtures';
import { announcedBodyFixtures } from './reading-test-fixtures';
// Invalid reading transport is rejected before publication and does not poison a retry.
import { expect, it, vi } from 'vitest';
import { ordoData, properData } from './loaders';
import type { TextDocument } from './corpus';

const runtime = freshProperFixture();

for (const lang of ['pl', 'en'] as const)
	for (const fault of ['delivery', 'language', 'mass'] as const)
		it(`${lang} ${fault}: failed current Mass stays empty, then genuinely retries`, async () => {
			const old = 'dominica-in-albis';
			const mass = 'dominica-iii-post-pascha';
			let broken = true;
			let properFetches = 0;
			vi.stubGlobal(
				'fetch',
				vi.fn(async (url: string) => {
					return actualPackResponse(url, lang, async () => {
						properFetches += 1;
						const previous = await properData(old, lang);
						const next = structuredClone(await properData(mass, lang))!;
						if (broken) {
							if (fault === 'language') next.lang = lang === 'pl' ? 'en' : 'pl';
							else if (fault === 'mass') next.day = old;
							else {
								const doc = next.parts.find((part) => part.part === 'evangelium')!
									.doc as TextDocument;
								const verse = doc.segments.find((s) => s.type === 'verse')!;
								expect(verse.delivery!.cantu!.speaker).toBe('sacerdos');
								verse.delivery!.cantu!.speaker = 'schola';
							}
						}
						return { days: { [old]: previous, [mass]: next } };
					});
				})
			);
			await runtime.chooseDay({ date: '2026-04-12', mass: old }, lang);
			expect(runtime.proper.failed).toBe(false);
			expect(runtime.proper.payload?.day).toBe(old);
			expect(runtime.proper.forSlot('epistola')[0].key).toBe(`proprium/${old}-epistola`);
			const pending = runtime.chooseDay({ date: '2026-04-26', mass }, lang);
			expect(runtime.proper.date).toBe('2026-04-26');
			expect(runtime.proper.day).toBe(mass);
			expect(runtime.proper.loading).toBe(true);
			expect(runtime.proper.payload).toBeNull();
			expect(runtime.proper.forSlot('epistola')).toEqual([]);
			await pending;
			expect(runtime.proper.failed).toBe(true);
			expect(runtime.proper.loading).toBe(false);
			expect(runtime.proper.date).toBe('2026-04-26');
			expect(runtime.proper.day).toBe(mass);
			expect(runtime.proper.payload).toBeNull();
			expect(runtime.proper.forSlot('epistola')).toEqual([]);
			expect(runtime.proper.forSlot('evangelium')).toEqual([]);
			const attempts = properFetches;
			broken = false;
			await runtime.chooseDay({ date: '2026-04-26', mass }, lang);
			expect(properFetches).toBeGreaterThan(attempts);
			expect(runtime.proper.failed).toBe(false);
			expect(runtime.proper.payload?.day).toBe(mass);
			expect(runtime.proper.payload?.lang).toBe(lang);
			const data = await ordoData(lang, 'catechumenorum');
			const { announcedReadings } = await import('./reading-announcements');
			const result = announcedReadings(
				'evangelium',
				announcedBodyFixtures(runtime.proper.forSlot('evangelium')),
				data!.readingOwners
			);
			expect(result).toHaveLength(4);
			expect(result.at(-1)!.key).toBe(`proprium/${mass}-evangelium`);
			expect(result.every((part) => part.slug.includes(mass))).toBe(true);
		});
