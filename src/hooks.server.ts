import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';

/** The Cloudflare Web Analytics site token.
 *
 * Read through `$env/dynamic/private` rather than the static twin, because
 * ABSENT IS THE NORMAL CASE — it is set on the production Pages project and
 * nowhere else, and the static module turns a missing variable into a build
 * error. Being unset is what keeps a dev server, a preview deployment and
 * the downloadable copy of the book silent without anyone remembering to
 * switch anything off. Dynamic here also means the whole value is resolved
 * at build, since every page of this site is prerendered.
 *
 * Private, though it ends up in public HTML: the name is not a secret, it
 * is a destination. Going through the private module keeps it out of the
 * client bundle, so the one place it can appear is the page the hook
 * stamps. The page checks its shape again before using it (src/app.html). */
const BEACON = env.CF_BEACON_TOKEN ?? '';

// Stamps the page language into <html lang> at render time — with full
// prerendering this runs at build, so every static page carries its language.
// The pages with no language of their own — the two routers, the 404 — fall
// back to English: it is their declared x-default, and the 404 itself speaks
// both languages English first. The old 'pl' default put lang="pl" on the
// PWA's start_url.
export const handle: Handle = ({ event, resolve }) =>
	resolve(event, {
		// Function replacements: with a string, `$` sequences in the value are
		// substitution patterns. A language code and a hex token carry none
		// today, but an environment value substituted into HTML should not
		// depend on staying that lucky.
		transformPageChunk: ({ html }) =>
			html
				.replace('%app.lang%', () => event.params.lang ?? 'en')
				.replace('%app.beacon%', () => BEACON)
	});
