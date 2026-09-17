// The hosted artifact, served the way the static host serves it.
//
// `vite preview` is SvelteKit's own preview: it answers from
// .svelte-kit/output, where the framework keeps every prerendered file it
// produced — including the `__data.json` route sidecars the build prunes
// from build/ — and falls back to the server runtime for anything else. A
// suite green against it has not seen the deployed tree. This server has
// nothing but build/ and the four rules Cloudflare Pages applies to a static
// project:
//
//   1. an exact file is served as it is;
//   2. `/a/b` is served from `a/b.html`, then `a/b/index.html`;
//   3. `static/_redirects` is honoured — exact sources, `:placeholder`
//      segments and a trailing `*` splat, with the status the line names;
//   4. everything else is `404.html`, with status 404.
//
//     node scripts/static-host.ts [port]
//
// Playwright starts it for the `static-host` project (playwright.config.ts).
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUILD = resolve('build');
const PORT = Number(process.argv[2] ?? 4174);

const TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.xml': 'application/xml',
	'.webmanifest': 'application/manifest+json',
	'.woff2': 'font/woff2',
	'.png': 'image/png',
	'.txt': 'text/plain; charset=utf-8'
};

/** A `_redirects` line as a matcher: exact segments, `:name` captures, `*` splat. */
export interface RedirectRule {
	source: string;
	target: string;
	status: number;
	regex: RegExp;
	names: string[];
}

export function parseRedirects(text: string): RedirectRule[] {
	const rules: RedirectRule[] = [];
	for (const raw of text.split('\n')) {
		// A comment is a whole line; a `#` inside a destination is a fragment.
		const line = raw.trim();
		if (!line || line.startsWith('#')) continue;
		const [source, target, status = '302'] = line.split(/\s+/);
		if (!source || !target) continue;
		const names: string[] = [];
		const pattern = source
			.split('/')
			.map((segment) => {
				if (segment === '*') {
					names.push('splat');
					return '(.*)';
				}
				if (segment.startsWith(':')) {
					names.push(segment.slice(1));
					return '([^/]+)';
				}
				return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			})
			.join('/');
		rules.push({
			source,
			target,
			status: Number(status),
			regex: new RegExp(`^${pattern}$`),
			names
		});
	}
	return rules;
}

/** The redirect for a path, or null when no rule matches. */
export function redirectFor(
	rules: RedirectRule[],
	pathname: string
): { location: string; status: number } | null {
	for (const rule of rules) {
		const match = rule.regex.exec(pathname);
		if (!match) continue;
		let location = rule.target;
		rule.names.forEach((name, index) => {
			location = location.replaceAll(`:${name}`, match[index + 1]);
		});
		return { location, status: rule.status };
	}
	return null;
}

/** The file Pages would serve for a path, or null. */
export function fileFor(root: string, pathname: string): string | null {
	let clean: string;
	try {
		clean = decodeURIComponent(pathname);
	} catch {
		return null;
	}
	for (const candidate of [clean, `${clean}.html`, join(clean, 'index.html')]) {
		const file = resolve(root, `.${candidate}`);
		if (!file.startsWith(root + sep) && file !== root) continue;
		if (existsSync(file) && statSync(file).isFile()) return file;
	}
	return null;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const rulesFile = join(BUILD, '_redirects');
	const rules = existsSync(rulesFile) ? parseRedirects(readFileSync(rulesFile, 'utf8')) : [];
	createServer((request, response) => {
		const url = new URL(request.url ?? '/', 'http://localhost');
		const redirect = redirectFor(rules, url.pathname);
		if (redirect) {
			response.writeHead(redirect.status, { location: redirect.location });
			response.end();
			return;
		}
		const file = fileFor(BUILD, url.pathname);
		if (!file) {
			response.writeHead(404, { 'content-type': TYPES['.html'] });
			response.end(readFileSync(join(BUILD, '404.html')));
			return;
		}
		response.writeHead(200, {
			'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
			'cache-control': 'no-cache'
		});
		response.end(readFileSync(file));
	}).listen(PORT, () => {
		console.log(`static host: ${BUILD} on http://localhost:${PORT}`);
	});
}
