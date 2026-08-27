import { describe, expect, it } from 'vitest';
import { remember } from './remember';

describe('remember', () => {
	it('shares one pending promise between concurrent callers', async () => {
		const cache = new Map<string, Promise<number>>();
		let calls = 0;
		const make = () => {
			calls++;
			return Promise.resolve(42);
		};
		const [a, b] = [remember(cache, 'k', make), remember(cache, 'k', make)];
		expect(await a).toBe(42);
		expect(await b).toBe(42);
		expect(calls).toBe(1);
	});

	it('evicts a rejection so the next attempt truly retries', async () => {
		const cache = new Map<string, Promise<string>>();
		let attempts = 0;
		const flaky = () => {
			attempts++;
			return attempts === 1 ? Promise.reject(new Error('transient')) : Promise.resolve('book');
		};
		await expect(remember(cache, 'k', flaky)).rejects.toThrow('transient');
		expect(cache.has('k'), 'the rejection must not be memoized').toBe(false);
		await expect(remember(cache, 'k', flaky)).resolves.toBe('book');
		expect(attempts).toBe(2);
		expect(cache.has('k'), 'the success is memoized').toBe(true);
	});

	it('keeps a success cached across later calls', async () => {
		const cache = new Map<string, Promise<string>>();
		let calls = 0;
		const make = () => {
			calls++;
			return Promise.resolve('once');
		};
		await remember(cache, 'k', make);
		await remember(cache, 'k', make);
		expect(calls).toBe(1);
	});
});
