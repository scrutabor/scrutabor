import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ browser: true, dev: false }));
vi.mock('$lib/storage', () => ({ readStored: () => null, writeStored: () => {} }));
import { canonData, properData } from './loaders';
import { ORDO } from './ordo';
import { dayById, SLOT_OF } from './proprium';
import type { Lang } from './i18n';
import type { TextDocument, GlossDocument } from './corpus';

const vigil = { date: '2026-04-04', mass: 'vigilia-paschalis' };
const easter = { date: '2026-04-05', mass: 'dominica-resurrectionis' };
const parts = ['laudes-psalmus', 'laudes-canticum'];
let chooseDay: (typeof import('./proper.svelte'))['chooseDay'];
let proper: (typeof import('./proper.svelte'))['proper'];

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

function mockTransport(lang: Lang, body: () => Promise<unknown>) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => ({
			ok: true,
			json: () => (url.includes('/canon/') ? canonData(lang) : body())
		}))
	);
}

beforeEach(async () => {
	vi.resetModules();
	({ chooseDay, proper } = await import('./proper.svelte'));
	proper.clear();
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it('places the conditional Office after Communion and before the postcommunion', () => {
	const entries = ORDO.find((movement) => movement.id === 'conclusio')!.entries;
	const index = entries.findIndex((entry) => entry.id === 'laudes');
	expect(index).toBeGreaterThan(0);
	expect(entries[index - 1].id).toBe('communio');
	expect(entries[index + 1].id).toBe('postcommunio');
	expect(entries[index]).toMatchObject({ kind: 'proper', onlyWhenPresent: true });
	const roles = dayById(vigil.mass)!.components.map((component) => component.role);
	const start = roles.indexOf('laudes-psalmus');
	expect(start).toBeGreaterThan(0);
	expect(roles.slice(start, start + 3)).toEqual([...parts, 'postcommunio']);
	expect(SLOT_OF['laudes-psalmus']).toBe('laudes');
	expect(SLOT_OF['laudes-canticum']).toBe('laudes');
	expect(dayById(easter.mass)!.components.some((component) => parts.includes(component.role))).toBe(
		false
	);
});

it.each<Lang>(['pl', 'en'])(
	'keeps canonical Lauds visible during loading in %s, then loads both bodies',
	async (lang) => {
		const pending = deferred<unknown>();
		mockTransport(lang, () => pending.promise);
		expect(proper.hasSlot('laudes')).toBe(false);
		const flight = chooseDay(vigil, lang);
		expect(proper.hasSlot('laudes')).toBe(true);
		expect(proper.loading).toBe(true);
		expect(proper.forSlot('laudes')).toEqual([]);
		pending.resolve({ days: { [vigil.mass]: await properData(vigil.mass, lang) } });
		await flight;
		expect(proper.failed).toBe(false);
		expect(proper.loading).toBe(false);
		const bodies = proper.forSlot('laudes');
		expect(bodies.map((body) => body.part)).toEqual(parts);
		expect(
			bodies.map(
				(body) =>
					(body.doc as TextDocument).segments.flatMap((segment) => segment.words ?? []).length
			)
		).toEqual([81, 181]);
		expect(bodies.map((body) => (body.gloss as GlossDocument).lang)).toEqual([lang, lang]);
		expect(new Set(bodies.map((body) => body.slug)).size).toBe(2);
		proper.clear();
		expect(proper.hasSlot('laudes')).toBe(false);
		expect(proper.forSlot('laudes')).toEqual([]);
	}
);

it.each<Lang>(['pl', 'en'])(
	'does not mistake failed or incomplete Lauds for liturgical absence in %s',
	async (lang) => {
		let calls = 0;
		mockTransport(lang, async () => {
			const body = structuredClone(await properData(vigil.mass, lang))!;
			if (++calls === 1) body.parts = body.parts.filter((part) => part.part !== 'laudes-canticum');
			return { days: { [vigil.mass]: body } };
		});
		await chooseDay(vigil, lang);
		expect(proper.failed).toBe(true);
		expect(proper.unwritten).toBe(false);
		expect(proper.hasSlot('laudes')).toBe(true);
		expect(proper.forSlot('laudes')).toEqual([]);
		await chooseDay(vigil, lang);
		expect(proper.failed).toBe(false);
		expect(proper.forSlot('laudes')).toHaveLength(2);
		expect(calls).toBe(2);
	}
);

it('does not restore a superseded Office after choosing the Ordinary alone', async () => {
	const pending = deferred<unknown>();
	mockTransport('en', () => pending.promise);
	const flight = chooseDay(vigil, 'en');
	expect(proper.hasSlot('laudes')).toBe(true);
	await chooseDay({ date: vigil.date, mass: null }, 'en');
	expect(proper.hasSlot('laudes')).toBe(false);
	pending.resolve({ days: { [vigil.mass]: await properData(vigil.mass, 'en') } });
	await flight;
	expect(proper.hasSlot('laudes')).toBe(false);
	expect(proper.forSlot('laudes')).toEqual([]);
	expect(proper.loading).toBe(false);
	expect(proper.failed).toBe(false);
});

it('removes Lauds for the following Mass rather than carrying its cached body forward', async () => {
	mockTransport('en', async () => ({
		days: Object.fromEntries(
			await Promise.all(
				[vigil, easter].map(async (choice) => [choice.mass, await properData(choice.mass, 'en')])
			)
		)
	}));
	await chooseDay(vigil, 'en');
	expect(proper.forSlot('laudes')).toHaveLength(2);
	await chooseDay(easter, 'en');
	expect(proper.failed).toBe(false);
	expect(proper.day).toBe(easter.mass);
	expect(proper.hasSlot('laudes')).toBe(false);
	expect(proper.forSlot('laudes')).toEqual([]);
});
