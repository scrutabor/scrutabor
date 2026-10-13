import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ browser: true, dev: false }));
vi.mock('$lib/storage', () => ({ readStored: () => null, writeStored: () => {} }));
import { canonData, dismissalData, properData } from './loaders';
import type { Lang } from './i18n';

const vigil = { date: '2026-04-04', mass: 'vigilia-paschalis' };
const easter = { date: '2026-04-05', mass: 'dominica-resurrectionis' };
const lowSunday = { date: '2026-04-12', mass: 'dominica-in-albis' };
const slot = 'ite-missa-est';
let chooseDay: (typeof import('./proper.svelte'))['chooseDay'];
let proper: (typeof import('./proper.svelte'))['proper'];
let dismissalLookup: (typeof import('./dismissal'))['dismissalLookup'];

beforeEach(async () => {
	vi.resetModules();
	({ chooseDay, proper } = await import('./proper.svelte'));
	({ dismissalLookup } = await import('./dismissal'));
	proper.clear();
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function transport(lang: Lang, replacement = () => dismissalData(lang)) {
	const fetcher = vi.fn(async (url: string) => ({
		ok: true,
		json: async () => {
			if (url.includes('/dismissal/')) return replacement();
			if (url.includes('/canon/')) return canonData(lang);
			return {
				days: Object.fromEntries(
					await Promise.all(
						[vigil, easter, lowSunday].map(async (choice) => [
							choice.mass,
							await properData(choice.mass, lang)
						])
					)
				)
			};
		}
	}));
	vi.stubGlobal('fetch', fetcher);
	return fetcher;
}

it.each<Lang>(['pl', 'en'])('keeps %s choice pending until all its bodies arrive', async (lang) => {
	let release!: (value: Awaited<ReturnType<typeof dismissalData>>) => void;
	const pending = new Promise<Awaited<ReturnType<typeof dismissalData>>>((resolve) => {
		release = resolve;
	});
	transport(lang, () => pending);
	expect(proper.variantRequired(slot)).toBe(true);
	const flight = chooseDay(vigil, lang);
	expect(proper.loading).toBe(true);
	expect(proper.variantRequired(slot)).toBe(true);
	expect(proper.paschalDismissal).toBe(true);
	expect(proper.payload).toBeNull();
	release(await dismissalData(lang));
	await flight;
	expect(proper.failed).toBe(false);
	expect(proper.forSlot(slot).map((part) => part.key)).toEqual([
		'ordinarium/ite-missa-est-paschale'
	]);
	expect(proper.forSlot('laudes')).toHaveLength(2);
	await chooseDay(easter, lang);
	expect(proper.forSlot(slot)).toHaveLength(1);
	expect(proper.forSlot('laudes')).toHaveLength(0);
});

it('does not request a replacement for the Ordinary or carry one beyond its dates', async () => {
	const fetcher = transport('en');
	await chooseDay(lowSunday, 'en');
	expect(proper.failed).toBe(false);
	expect(proper.variantRequired(slot)).toBe(false);
	expect(proper.paschalDismissal).toBe(false);
	expect(fetcher.mock.calls.some(([url]) => url.includes('/dismissal/'))).toBe(false);
	await chooseDay(vigil, 'en');
	expect(proper.forSlot(slot)).toHaveLength(1);
	await chooseDay(lowSunday, 'en');
	expect(proper.forSlot(slot)).toHaveLength(0);
	expect(proper.variantRequired(slot)).toBe(false);
	await chooseDay({ date: vigil.date, mass: null }, 'en');
	expect(proper.variantRequired(slot)).toBe(false);
	expect(proper.paschalDismissal).toBe(false);
});

it.each(['transport', 'incomplete'] as const)(
	'never substitutes Ordinary after %s failure; retry is real',
	async (failure) => {
		let calls = 0;
		transport('en', async () => {
			if (++calls === 1) {
				if (failure === 'transport') throw new Error('network interrupted');
				return { ...(await dismissalData('en')), parts: [] };
			}
			return dismissalData('en');
		});
		await chooseDay(vigil, 'en');
		expect(proper.failed).toBe(true);
		expect(proper.payload).toBeNull();
		expect(proper.variantRequired(slot)).toBe(true);
		expect(proper.forSlot(slot)).toEqual([]);
		await chooseDay(vigil, 'en');
		expect(calls).toBe(2);
		expect(proper.failed).toBe(false);
		expect(proper.forSlot(slot)).toHaveLength(1);
	}
);

it.each([false, true])(
	'does not publish superseded dismissal success/failure=%s',
	async (fails) => {
		let release!: () => void;
		const wait = new Promise<void>((resolve) => {
			release = resolve;
		});
		transport('en', async () => {
			await wait;
			if (fails) throw new Error('old failure');
			return dismissalData('en');
		});
		const flight = chooseDay(vigil, 'en');
		await chooseDay({ date: vigil.date, mass: null }, 'en');
		release();
		await flight;
		expect(proper.day).toBeNull();
		expect(proper.payload).toBeNull();
		expect(proper.failed).toBe(false);
		expect(proper.loading).toBe(false);
		expect(proper.variantRequired(slot)).toBe(false);
	}
);

it('fails closed before requesting data if the finite resource cannot resolve the choice', async () => {
	const fetcher = transport('en');
	vi.spyOn(dismissalLookup!, 'resolve').mockImplementation(() => {
		throw new Error('missing pair');
	});
	await chooseDay(vigil, 'en');
	expect(proper.failed).toBe(true);
	expect(proper.variantRequired(slot)).toBe(true);
	expect(proper.payload).toBeNull();
	expect(fetcher).not.toHaveBeenCalled();
});
