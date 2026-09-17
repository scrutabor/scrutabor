import { describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DEV_SERVICE_WORKER_SOURCE, serveDevServiceWorker } from './dev-service-worker.ts';

function responseDouble() {
	return {
		statusCode: 0,
		setHeader: vi.fn(),
		end: vi.fn()
	} as unknown as ServerResponse;
}

describe('development service worker guard', () => {
	it('serves an inert, immediately active worker without a fetch handler', () => {
		const response = responseDouble();
		const next = vi.fn();

		serveDevServiceWorker(
			{ url: '/service-worker.js?bypass=1' } as IncomingMessage,
			response,
			next
		);

		expect(response.statusCode).toBe(200);
		expect(response.setHeader).toHaveBeenCalledWith(
			'Cache-Control',
			'no-cache, no-store, must-revalidate'
		);
		expect(response.end).toHaveBeenCalledWith(DEV_SERVICE_WORKER_SOURCE);
		expect(DEV_SERVICE_WORKER_SOURCE).toContain("self.addEventListener('install'");
		expect(DEV_SERVICE_WORKER_SOURCE).toContain('event.waitUntil(self.skipWaiting())');
		expect(DEV_SERVICE_WORKER_SOURCE).toContain("self.addEventListener('activate'");
		expect(DEV_SERVICE_WORKER_SOURCE).not.toContain("addEventListener('fetch'");
		expect(next).not.toHaveBeenCalled();
	});

	it('leaves every other Vite request alone', () => {
		const response = responseDouble();
		const next = vi.fn();

		serveDevServiceWorker({ url: '/app/pl' } as IncomingMessage, response, next);

		expect(next).toHaveBeenCalledOnce();
		expect(response.end).not.toHaveBeenCalled();
	});
});
