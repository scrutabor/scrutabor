import { afterEach, describe, expect, it, vi } from 'vitest';

const environment = vi.hoisted(() => ({ dev: false }));
vi.mock('$app/environment', () => environment);
vi.mock('$lib/loaders', () => ({
	canonData: async (lang: string) => ({ lang, parts: [] }),
	properData: async (day: string, lang: string) => ({ day, lang, parts: [] })
}));
vi.mock('$lib/proprium', () => ({ formularyPacks: () => [[{ id: 'example-mass' }]] }));

import { GET as canon } from '../routes/artifacts/canon/[lang].json/+server';
import { GET as propers } from '../routes/artifacts/proprium/[lang]/[pack].json/+server';

afterEach(() => {
	environment.dev = false;
});

describe('stable-URL text packs must revalidate between editions', () => {
	it.each([false, true])(
		'keeps development=%s responses out of immutable HTTP caches',
		async (dev) => {
			environment.dev = dev;
			const responses = [
				await canon({ params: { lang: 'en' } } as Parameters<typeof canon>[0]),
				await propers({ params: { lang: 'pl', pack: 'pack-01' } } as Parameters<typeof propers>[0])
			];
			for (const response of responses) {
				expect(response.status).toBe(200);
				expect(response.headers.get('cache-control')).toBe(dev ? 'no-store' : 'no-cache');
			}
			expect(await responses[0].json()).toEqual({ lang: 'en', parts: [] });
			expect(await responses[1].json()).toEqual({
				days: { 'example-mass': { day: 'example-mass', lang: 'pl', parts: [] } }
			});
		}
	);
});
