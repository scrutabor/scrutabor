import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

export const DEV_SERVICE_WORKER_PATH = '/service-worker.js';

// A production worker can survive a preview server that once used the dev
// origin. Without a valid replacement it keeps answering /app/ navigations
// from its old cache, so the page can look stale while Vite is serving fresh
// modules. This deliberately inert worker replaces that registration in dev:
// it claims existing tabs but has no fetch listener, hence every request goes
// straight to Vite.
export const DEV_SERVICE_WORKER_SOURCE = `
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
`;

export function serveDevServiceWorker(
	request: IncomingMessage,
	response: ServerResponse,
	next: () => void
): void {
	if (request.url?.split('?', 1)[0] !== DEV_SERVICE_WORKER_PATH) {
		next();
		return;
	}

	response.statusCode = 200;
	response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
	response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
	response.end(DEV_SERVICE_WORKER_SOURCE);
}

export function devServiceWorkerGuard(): Plugin {
	return {
		name: 'neutralize-production-service-worker-in-dev',
		enforce: 'pre',
		apply: 'serve',
		configureServer(server) {
			server.middlewares.use(serveDevServiceWorker);
		}
	};
}
