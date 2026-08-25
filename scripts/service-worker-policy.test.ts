import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const layout = readFileSync('src/routes/app/+layout.svelte', 'utf8');
const headers = readFileSync('static/_headers', 'utf8');
const worker = readFileSync('src/service-worker.ts', 'utf8');

describe('service-worker update delivery', () => {
	it('bypasses the browser HTTP cache when registering', () => {
		expect(layout).toContain("register('/service-worker.js'");
		expect(layout).toMatch(/updateViaCache:\s*'none'/);
	});

	it('prevents the worker script from being cached by the edge or browser', () => {
		expect(headers).toContain('/_app/immutable/*');
		expect(headers).toMatch(
			/\/service-worker\.js\s+Cache-Control: no-cache, no-store, must-revalidate/
		);
	});

	it('keeps an update waiting until the reader accepts the notice', () => {
		expect(layout).toContain("addEventListener('updatefound'");
		expect(layout).toContain("postMessage('activate-release')");
		expect(worker).toContain("event.data === 'activate-release'");
		expect(worker).toContain('sw.skipWaiting()');
	});

	it('reloads a controlled page when the accepted worker takes over', () => {
		expect(layout).toContain("addEventListener('controllerchange'");
		expect(layout).toContain('if (hadController) location.reload()');
		expect(worker).toContain('await sw.clients.claim()');
	});
});
