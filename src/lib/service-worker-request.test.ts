import { describe, expect, it } from 'vitest';
import { revalidateResourceRequest } from './service-worker-request';

const origin = 'https://book.example';

describe('stable edition resource requests', () => {
	it.each([
		'/artifacts/canon/en.json',
		'/artifacts/proprium/pl/pack-01.json',
		'/artifacts/dismissal/en.json'
	])('revalidates %s without changing request metadata or cancellation', (path) => {
		const controller = new AbortController();
		const original = new Request(`${origin}${path}?edition=next&word=w001`, {
			cache: 'force-cache',
			credentials: 'include',
			headers: { 'X-Reader': 'one', Accept: 'application/json' },
			mode: 'same-origin',
			redirect: 'manual',
			referrer: `${origin}/app/en`,
			referrerPolicy: 'same-origin',
			integrity: 'sha256-YWJj',
			keepalive: true,
			signal: controller.signal
		});
		const actual = revalidateResourceRequest(original, origin);
		expect(actual).not.toBe(original);
		expect(actual.cache).toBe('no-cache');
		expect(original.cache).toBe('force-cache');
		for (const field of [
			'url',
			'method',
			'credentials',
			'mode',
			'redirect',
			'referrer',
			'referrerPolicy',
			'integrity',
			'keepalive'
		] as const)
			expect(actual[field]).toBe(original[field]);
		expect([...actual.headers]).toEqual([...original.headers]);
		expect(actual.signal.aborted).toBe(false);
		controller.abort('reader stopped');
		expect(actual.signal.aborted).toBe(true);
		expect(actual.signal.reason).toBe('reader stopped');
	});

	it('preserves an already aborted request', () => {
		const controller = new AbortController();
		controller.abort('already stopped');
		const actual = revalidateResourceRequest(
			new Request(`${origin}/artifacts/canon/pl.json`, {
				signal: controller.signal
			}),
			origin
		);
		expect(actual.signal.aborted).toBe(true);
		expect(actual.signal.reason).toBe('already stopped');
	});

	it.each([
		`${origin}/_app/immutable/corpus/text.hash.js`,
		`${origin}/app/en`,
		`${origin}/artifacts/other/en.json`,
		`${origin}/artifacts/canonish/en.json`,
		`${origin}/artifacts/canon`,
		`https://foreign.example/artifacts/canon/en.json`
	])('does not alter other requests: %s', (url) => {
		const original = new Request(url, { cache: 'force-cache' });
		expect(revalidateResourceRequest(original, origin)).toBe(original);
	});

	it.each(['POST', 'HEAD'])('does not alter %s', (method) => {
		const original = new Request(`${origin}/artifacts/canon/en.json`, { method });
		expect(revalidateResourceRequest(original, origin)).toBe(original);
	});
});
