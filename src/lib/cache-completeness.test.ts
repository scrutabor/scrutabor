import { describe, expect, it, vi } from 'vitest';
import { cacheContainsAll } from './cache-completeness';

describe('offline cache completion', () => {
	it('requires every promised path before an old book may be deleted', async () => {
		const present = new Set(['/shell', '/text']);
		const cache = {
			match: vi.fn(async (path: RequestInfo | URL) =>
				present.has(String(path)) ? new Response('ok') : undefined
			)
		};
		expect(await cacheContainsAll(cache, ['/shell', '/text', '/new-index'])).toBe(false);
		present.add('/new-index');
		expect(await cacheContainsAll(cache, ['/shell', '/text', '/new-index'])).toBe(true);
	});

	it('checks duplicate paths only once', async () => {
		const cache = { match: vi.fn(async () => new Response('ok')) };
		expect(await cacheContainsAll(cache, ['/shell', '/shell'])).toBe(true);
		expect(cache.match).toHaveBeenCalledOnce();
	});
});
