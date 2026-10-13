import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ browser: true, dev: false }));
vi.mock('$lib/proper-local', () => ({ localDay: async () => null, localCanon: async () => null }));
vi.mock('$lib/storage', () => ({ readStored: () => null, writeStored: () => {} }));
import { canonData, properData } from './loaders';
let canonLookup: (typeof import('./canon'))['canonLookup'];
let chooseDay: (typeof import('./proper.svelte'))['chooseDay'];
let proper: (typeof import('./proper.svelte'))['proper'];

const cena = { date: '2026-04-02', mass: 'feria-v-in-cena-domini' };
const christmas = { date: '2026-12-25', mass: 'nativitas-domini-in-nocte' };
const feast = { date: '2026-05-14', mass: 'ascensio-domini' };
const ordinary = { date: '2026-12-13', mass: 'dominica-iii-adventus' };
async function answer(url: string) {
	if (url.includes('/canon/')) return await canonData('en');
	return {
		days: Object.fromEntries(
			await Promise.all(
				[cena, christmas, feast, ordinary].map(async (c) => [
					c.mass,
					await properData(c.mass, 'en')
				])
			)
		)
	};
}
/** English transport seam shared by the malformed-payload retry cases. */
function mockEnglishProper(body: () => Promise<unknown>) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => ({
			ok: true,
			json: () => (url.includes('/canon/') ? canonData('en') : body())
		}))
	);
}
/** Every malformed-payload case must fail closed, then genuinely recover. */
async function expectRetryRecovers() {
	await chooseDay(cena, 'en');
	expect(proper.failed).toBe(true);
	expect(proper.payload).toBeNull();
	await chooseDay(cena, 'en');
	expect(proper.failed).toBe(false);
}
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}
beforeEach(async () => {
	vi.resetModules();
	({ chooseDay, proper } = await import('./proper.svelte'));
	({ canonLookup } = await import('./canon'));
	proper.clear();
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it('separates undecided initialization from a positive ordinary/none choice', async () => {
	expect(proper.date).toBeNull();
	for (const role of ['communicantes', 'hanc-igitur', 'qui-pridie'])
		expect(proper.canonRequired(role)).toBe(true);
	const fetcher = vi.fn();
	vi.stubGlobal('fetch', fetcher);
	await chooseDay({ date: cena.date, mass: null }, 'en');
	expect(proper.date).toBe(cena.date);
	expect(proper.day).toBeNull();
	expect(proper.canonRequired('communicantes')).toBe(false);
	expect(fetcher).not.toHaveBeenCalled();
});
it('publishes only the combined body, preserves selected roles on raw-cache hits', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => ({ ok: true, json: () => answer(url) }))
	);
	await chooseDay(cena, 'en');
	expect(proper.failed).toBe(false);
	expect(proper.forSlot('communicantes')[0]?.key).toBe('ordinarium/communicantes-in-cena-domini');
	expect(proper.forSlot('hanc-igitur')[0]?.key).toBe('ordinarium/hanc-igitur-in-cena-domini');
	expect(proper.forSlot('qui-pridie')[0]?.key).toBe('ordinarium/qui-pridie-in-cena-domini');
	await chooseDay({ date: cena.date, mass: null }, 'en');
	await chooseDay(cena, 'en');
	expect(proper.forSlot('qui-pridie')[0]?.key).toBe('ordinarium/qui-pridie-in-cena-domini');
});
it('reassembles one cached Mass for injected different-date profiles, without date-keying raw payloads', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => ({ ok: true, json: () => answer(url) }))
	);
	const resolve = canonLookup!.resolve.bind(canonLookup);
	vi.spyOn(canonLookup!, 'resolve').mockImplementation((date, mass) =>
		date === '2027-12-25' ? resolve(cena.date, cena.mass) : resolve(date, mass)
	);
	await chooseDay(christmas, 'en');
	expect(proper.forSlot('communicantes')[0]?.key).toBe(
		'ordinarium/communicantes-in-nativitate-domini-in-nocte'
	);
	await chooseDay({ date: '2027-12-25', mass: christmas.mass }, 'en');
	expect(proper.forSlot('communicantes')[0]?.key).toBe('ordinarium/communicantes-in-cena-domini');
	expect(proper.forSlot('hanc-igitur')[0]?.key).toBe('ordinarium/hanc-igitur-in-cena-domini');
});
it('cannot publish superseded late success, failure or notices', async () => {
	const old = deferred<unknown>();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => ({
			ok: true,
			json: () => (url.includes('/canon/') ? canonData('pl') : old.promise)
		}))
	);
	const first = chooseDay(feast, 'pl');
	expect(proper.payload).toBeNull();
	expect(proper.loading).toBe(true);
	await chooseDay({ date: cena.date, mass: null }, 'pl');
	old.resolve({ days: { [feast.mass]: await properData(feast.mass, 'pl') } });
	await first;
	expect(proper.day).toBeNull();
	expect(proper.payload).toBeNull();
	expect(proper.failed).toBe(false);
	expect(proper.loading).toBe(false);
});
it('keeps a valid required Canon missing on failed transport, then retries invalid data', async () => {
	let calls = 0;
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => ({
			ok: true,
			json: async () => {
				if (url.includes('/canon/')) {
					calls++;
					const p = await canonData('pl');
					if (calls === 1) p.parts = [];
					return p;
				}
				return { days: { [cena.mass]: await properData(cena.mass, 'pl') } };
			}
		}))
	);
	await chooseDay(cena, 'pl');
	expect(proper.failed).toBe(true);
	expect(proper.unwritten).toBe(false);
	expect(proper.payload).toBeNull();
	expect(proper.canonRequired('communicantes')).toBe(true);
	await chooseDay(cena, 'pl');
	expect(proper.failed).toBe(false);
	expect(calls).toBe(2);
	expect(proper.forSlot('qui-pridie')[0]?.key).toBe('ordinarium/qui-pridie-in-cena-domini');
});
it('fails closed on missing valid table pair even with a held Mass', async () => {
	vi.spyOn(canonLookup!, 'resolve').mockImplementation(() => {
		throw new Error('missing pair');
	});
	await chooseDay(cena, 'en');
	expect(proper.failed).toBe(true);
	expect(proper.payload).toBeNull();
	expect(proper.canonRequired('qui-pridie')).toBe(true);
});

it('holds both newly requested parts until Canon arrives, while explicitly ordinary roles remain eligible', async () => {
	const gate = deferred<unknown>();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => ({
			ok: true,
			json: () => (url.includes('/canon/') ? gate.promise : answer(url))
		}))
	);
	const flight = chooseDay(christmas, 'en');
	await vi.waitFor(() => expect(proper.canonRequired('communicantes')).toBe(true));
	expect(proper.canonRequired('hanc-igitur')).toBe(false);
	expect(proper.canonRequired('qui-pridie')).toBe(false);
	expect(proper.payload).toBeNull();
	expect(proper.forSlot('introitus')).toEqual([]);
	gate.resolve(await canonData('en'));
	await flight;
	expect(proper.forSlot('introitus').length).toBeGreaterThan(0);
	expect(proper.forSlot('communicantes')[0].key).toBe(
		'ordinarium/communicantes-in-nativitate-domini-in-nocte'
	);
});

it('reversed valid flights cannot publish stale prayers or failure notices', async () => {
	const first = deferred<unknown>();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => ({
			ok: true,
			json: () =>
				url.includes('/canon/')
					? canonData('en')
					: url.includes('pack-01')
						? first.promise
						: answer(url)
		}))
	);
	const flight = chooseDay(ordinary, 'en');
	await chooseDay(cena, 'en');
	expect(proper.day).toBe(cena.mass);
	expect(proper.forSlot('qui-pridie')[0].key).toBe('ordinarium/qui-pridie-in-cena-domini');
	first.resolve({ days: {} });
	await flight;
	expect(proper.day).toBe(cena.mass);
	expect(proper.failed).toBe(false);
	expect(proper.loading).toBe(false);
	expect(proper.forSlot('qui-pridie')[0].key).toBe('ordinarium/qui-pridie-in-cena-domini');
});

it('does not retain a malformed successful Mass pack, and current failure leaves no prior body', async () => {
	let properCalls = 0;
	mockEnglishProper(async () => {
		properCalls++;
		return properCalls === 1
			? { days: { [cena.mass]: { day: 'wrong', lang: 'en', parts: [] } } }
			: { days: { [cena.mass]: await properData(cena.mass, 'en') } };
	});
	await expectRetryRecovers();
	expect(properCalls).toBe(2);
	expect(proper.forSlot('hanc-igitur')[0].key).toBe('ordinarium/hanc-igitur-in-cena-domini');
});

it.each(['wrong-identity', 'empty-body', 'wrong-language', 'wrong-slot', 'dropped-component'])(
	'rejects malformed successful %s before caching, then retries',
	async (kind) => {
		let calls = 0;
		mockEnglishProper(async () => {
			calls++;
			const body = structuredClone(await properData(cena.mass, 'en'))!;
			if (calls === 1) {
				if (kind === 'wrong-identity') body.parts[0].doc.id = 'ordinarium.communicantes';
				if (kind === 'empty-body') body.parts[0].doc.segments = [];
				if (kind === 'wrong-language') body.parts[0].gloss.lang = 'pl';
				if (kind === 'wrong-slot') body.parts[0].slot = 'communicantes';
				if (kind === 'dropped-component') body.parts.pop();
			}
			return { days: { [cena.mass]: body } };
		});
		await expectRetryRecovers();
		expect(calls).toBe(2);
	}
);
