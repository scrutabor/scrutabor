import type { Handle } from '@sveltejs/kit';

// Stamps the page language into <html lang> at render time — with full
// prerendering this runs at build, so every static page carries its language.
export const handle: Handle = ({ event, resolve }) =>
	resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%app.lang%', event.params.lang ?? 'pl')
	});
