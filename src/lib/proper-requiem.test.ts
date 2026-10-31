import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import './proper-browser-test-environment';
import { canonData, dismissalData, properData } from './loaders';
import { deferred, stubJsonFetch } from './proper-test-context';
import type { Lang } from './i18n';
const choices = [
	{ date: '2026-11-02', mass: 'commemoratio-omnium-fidelium-defunctorum' },
	{ date: '2026-11-02', mass: 'commemoratio-omnium-fidelium-defunctorum-missa-ii' },
	{ date: '2026-11-02', mass: 'commemoratio-omnium-fidelium-defunctorum-missa-iii' }
];
let chooseDay: (typeof import('./proper.svelte'))['chooseDay'];
let proper: (typeof import('./proper.svelte'))['proper'];
beforeEach(async () => {
	vi.resetModules();
	({ chooseDay, proper } = await import('./proper.svelte'));
	proper.clear();
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function transport(lang: Lang, fail: () => boolean, fault?: () => string | null) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => ({
			ok: true,
			json: async () => {
				if (fail()) throw new Error('unavailable selected body');
				if (url.includes('/canon/')) return canonData(lang);
				if (url.includes('/dismissal/')) return dismissalData(lang);
				return {
					days: Object.fromEntries(
						await Promise.all(
							choices.map(async ({ mass }) => {
								const payload = structuredClone((await properData(mass, lang))!);
								const kind = fault?.();
								if (kind === 'missing')
									payload.parts = payload.parts.filter((p) => p.slot !== 'agnus-dei');
								if (kind === 'language') payload.lang = lang === 'pl' ? 'en' : 'pl';
								if (kind === 'empty')
									payload.parts.find((p) => p.slot === 'agnus-dei')!.doc.segments = [];
								return [mass, payload];
							})
						)
					)
				};
			}
		}))
	);
}

it.each(['pl', 'en'] as const)(
	'never falls back to ordinary %s Agnus on failure and recovers through real selection',
	async (lang) => {
		let failed = true;
		transport(lang, () => failed);
		expect(proper.variantRequired('agnus-dei')).toBe(true);
		for (const choice of choices) {
			failed = true;
			await chooseDay(choice, lang);
			expect(proper.failed).toBe(true);
			expect(proper.variantRequired('agnus-dei')).toBe(true);
			expect(proper.forSlot('agnus-dei')).toEqual([]);
		}
		failed = false;
		for (const choice of choices) {
			await chooseDay(choice, lang);
			expect(proper.failed).toBe(false);
			expect(proper.forSlot('agnus-dei').map((part) => part.key)).toEqual([
				'ordinarium/agnus-dei-defunctorum'
			]);
			expect(proper.forSlot('ite-missa-est').map((part) => part.key)).toEqual([
				'ordinarium/ite-missa-est-defunctorum'
			]);
		}
		await chooseDay({ date: choices[0].date, mass: null }, lang);
		expect(proper.variantRequired('agnus-dei')).toBe(false);
		expect(proper.forSlot('agnus-dei')).toEqual([]);
	}
);

it.each(['pl', 'en'] as const)(
	'keeps %s Agnus unavailable while the required dismissal is pending',
	async (lang) => {
		const { promise: waiting, release } = deferred<Awaited<ReturnType<typeof dismissalData>>>();
		stubJsonFetch(async (url) => {
			if (url.includes('/dismissal/')) return waiting;
			if (url.includes('/canon/')) return canonData(lang);
			return {
				days: Object.fromEntries(
					await Promise.all(choices.map(async ({ mass }) => [mass, await properData(mass, lang)]))
				)
			};
		});
		const flight = chooseDay(choices[0], lang);
		expect(proper.loading).toBe(true);
		expect(proper.variantRequired('agnus-dei')).toBe(true);
		expect(proper.payload).toBeNull();
		expect(proper.forSlot('agnus-dei')).toEqual([]);
		release(await dismissalData(lang));
		await flight;
		expect(proper.failed).toBe(false);
		expect(proper.forSlot('agnus-dei')).toHaveLength(1);
	}
);

it.each(['missing', 'language', 'empty'] as const)(
	'rejects %s Agnus transport and restores both languages',
	async (fault) => {
		for (const lang of ['pl', 'en'] as const) {
			proper.clear();
			let corrupt = true;
			transport(
				lang,
				() => false,
				() => (corrupt ? fault : null)
			);
			await chooseDay(choices[0], lang);
			expect(proper.failed).toBe(true);
			expect(proper.variantRequired('agnus-dei')).toBe(true);
			expect(proper.forSlot('agnus-dei')).toEqual([]);
			corrupt = false;
			await chooseDay(choices[0], lang);
			expect(proper.failed).toBe(false);
			expect(proper.forSlot('agnus-dei')).toHaveLength(1);
		}
	}
);
