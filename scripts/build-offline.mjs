// Assemble the book as a folder anyone can keep.
//
// The site's own build, prepared so that it runs with no server at all —
// opened straight off a disk, a USB stick, an attachment. A URL path is
// still its own small HTML file, exactly as when hosted; what changes is
// how those files find each other, and how a page starts.
//
//   node scripts/build-offline.mjs           → build-offline/
//   node scripts/build-offline.mjs --zip     → …and scrutabor-offline.zip
//
// Expects `npm run build` and `vite build --config vite.offline.config.ts`
// to have run; it does not shell out to them, so that a failure here is
// never confused with a failure there.
import { execFileSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync
} from 'node:fs';
import { join, relative, sep } from 'node:path';

const SITE = 'build';
const RUNTIME = 'build-offline-runtime/offline.js';
const OUT = 'build-offline';

for (const required of [SITE, RUNTIME]) {
	if (!existsSync(required)) {
		console.error(
			`missing ${required} — run \`npm run build\` and \`npm run build:offline-runtime\` first`
		);
		process.exit(1);
	}
}

function* walk(dir) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) yield* walk(path);
		else yield path;
	}
}

rmSync(OUT, { recursive: true, force: true });
cpSync(SITE, OUT, { recursive: true });
cpSync(RUNTIME, join(OUT, '_app', 'offline.js'));

// A stylesheet's url() resolves against the STYLESHEET, so a font sitting
// beside it is simply named.
let sheets = 0;
for (const path of walk(OUT)) {
	if (!path.endsWith('.css')) continue;
	const before = readFileSync(path, 'utf8');
	const after = before.replaceAll('url(/_app/immutable/assets/', 'url(./');
	if (before !== after) {
		writeFileSync(path, after);
		sheets++;
	}
}

let pages = 0;
for (const path of walk(OUT)) {
	if (!path.endsWith('.html')) continue;
	const depth = relative(OUT, path).split(sep).length - 1;
	const up = depth ? '../'.repeat(depth) : './';
	let html = readFileSync(path, 'utf8');

	// A root-absolute path means the filesystem root once there is no
	// server. Every route gained a .html twin at build time; a file keeps
	// the name it has.
	html = html.replace(/\b(href|src)="(\/[^"#]*)"/g, (_, attr, target) => {
		const suffix = /\.[a-z0-9]+$/.test(target) ? '' : '.html';
		return `${attr}="${up}${target.slice(1)}${suffix}"`;
	});

	// Nothing here will fetch a module, and a service worker cannot
	// register without an origin — nor has it anything to do when every
	// file is already on the disk.
	html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, '');
	html = html.replaceAll('navigator.serviceWorker.register(sanitised)', 'Promise.resolve()');

	// The root picks the reader's language before first paint and sends
	// them to it. `/pl` is the filesystem root here, so the very first
	// thing anyone opening this folder would meet is a blank window.
	html = html.replace(
		"location.replace('/' + pick + location.search + location.hash)",
		`location.replace(${JSON.stringify(up)} + pick + '.html' + location.search + location.hash)`
	);

	// THE substitution. SvelteKit's page bootstrap awaits two dynamic
	// imports and then calls `kit.start(app, element, {...})`. A dynamic
	// import is the one thing file:// refuses, so the awaited pair becomes
	// the offline runtime, which offers the same `start`. Everything else
	// the build wrote — node ids, data, the call itself — stands.
	const before = html;
	html = html.replace(
		/Promise\.all\(\[\s*import\([^)]*\),\s*import\([^)]*\)\s*\]\)/,
		'Promise.resolve([window.__scrutabor_kit, null])'
	);
	if (html === before) {
		console.error(`no SvelteKit bootstrap found in ${path} — the page would render but never wake`);
		process.exit(1);
	}

	// The runtime, and this page's depth: a page cannot work out its own,
	// because under file:// its path is wherever the reader unzipped it.
	html = html.replace(
		'<script>\n\t\t\t\t{\n\t\t\t\t\t__sveltekit',
		`<script>window.__scrutabor_up=${JSON.stringify(up)};</script>\n\t\t\t` +
			`<script src="${up}_app/offline.js"></script>\n\t\t\t` +
			'<script>\n\t\t\t\t{\n\t\t\t\t\t__sveltekit'
	);
	writeFileSync(path, html);
	pages++;
}

writeFileSync(
	join(OUT, 'README.txt'),
	`Scrutabor — a Latin missal and prayer book with a word-by-word layer.

Open index.html in any browser. Everything works with no internet:
tap a word for its dictionary entry and parse, move the slider for more
or less help, choose whose parts you are following.

This copy is yours. Nothing here calls home, nothing expires, and it
will keep working if the website ever does not.

scrutabor.org
`
);

console.log(`${pages} pages, ${sheets} stylesheets → ${OUT}/`);

if (process.argv.includes('--zip')) {
	const zip = 'scrutabor-offline.zip';
	rmSync(zip, { force: true });
	execFileSync('zip', ['-qr', join('..', zip), '.'], { cwd: OUT });
	const mb = (statSync(zip).size / 1048576).toFixed(1);
	console.log(`${zip} — ${mb} MB`);
}
