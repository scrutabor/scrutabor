import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Delivery POLICY only — properties of configuration that no browser run
// can exercise (a header the edge would strip, a registration option the
// lifecycle cannot observe from inside). Everything behavioral about the
// update — install, waiting, decline, accept, controller takeover, cache
// migration, offline fallback, the stale-asset notice — runs for real, at
// two worker versions, in tests/service-worker.spec.ts. A grep that named
// those behaviors stayed green with the reload commented out; it is gone.

const layout = readFileSync('src/routes/app/+layout.svelte', 'utf8');
const headers = readFileSync('static/_headers', 'utf8');

describe('service-worker delivery policy', () => {
	it('bypasses the browser HTTP cache when registering', () => {
		expect(layout).toContain("register('/service-worker.js'");
		expect(layout).toMatch(/updateViaCache:\s*'none'/);
	});

	it('scopes the worker to the book, off the landing pages', () => {
		expect(layout).toMatch(/scope:\s*'\/app\/'/);
	});

	it('prevents the worker script from being cached by the edge or browser', () => {
		expect(headers).toMatch(
			/\/service-worker\.js\s+Cache-Control: no-cache, no-store, must-revalidate/
		);
	});
});
