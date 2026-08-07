// Assemble the book as a folder anyone can keep.
//
// The site's own build, prepared so that it runs with no server at all —
// opened straight off a disk, a USB stick, an attachment. A URL path is
// still its own small HTML file, exactly as when hosted; what changes is
// how those files find each other, and how a page starts.
//
//   node scripts/build-offline.mjs           → build-offline/
//   node scripts/build-offline.mjs --zip     → …and Scrutabor.zip
//
// What the reader opens has to be obvious at a glance, so the folder holds
// three things and no more:
//
//   README.txt     what this is
//   index.html     ← the one to open
//   app/           everything else, which nobody needs to look at
//
// Expects `npm run build` and `npm run build:offline-runtime` to have run;
// it does not shell out to them, so a failure here is never confused with a
// failure there.
import { execFileSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	readFileSync,
	readdirSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync
} from 'node:fs';
import { join, relative, sep } from 'node:path';

const SITE = 'build';
const RUNTIME = 'build-offline-runtime/offline.js';
const OUT = 'build-offline';
/** Everything but README.txt and index.html lives in here. */
const INNER = 'app';

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

const app = join(OUT, INNER);
rmSync(OUT, { recursive: true, force: true });
cpSync(SITE, app, { recursive: true });
cpSync(RUNTIME, join(app, '_app', 'offline.js'));

// Files that only mean something to a web server or an app store. A
// crawler will never read this folder; a service worker cannot register
// without an origin; nothing can be installed from a disk. 404.html is
// SvelteKit's fallback for a server that has one, and nothing here links
// to it.
const POINTLESS = [
	'robots.txt',
	'sitemap.xml',
	'404.html',
	'service-worker.js',
	'manifest.webmanifest',
	'icon-192.png',
	'icon-512.png',
	'icon-maskable-512.png'
];
let dropped = 0;
for (const name of POINTLESS) {
	const path = join(app, name);
	if (existsSync(path)) {
		rmSync(path);
		dropped++;
	}
}

// A stylesheet's url() resolves against the STYLESHEET, so a font sitting
// beside it is simply named.
for (const path of walk(app)) {
	if (!path.endsWith('.css')) continue;
	const before = readFileSync(path, 'utf8');
	const after = before.replaceAll('url(/_app/immutable/assets/', 'url(./');
	if (before !== after) writeFileSync(path, after);
}

// The root's language chooser is the whole of the top level, so it moves
// out of the copied site and up. Everything it points at gains the `app/`
// prefix, which is exactly what its depth would have been.
renameSync(join(app, 'index.html'), join(OUT, 'index.html'));

/** @type {Array<[path: string, up: string]>} */
const pages = [[join(OUT, 'index.html'), `${INNER}/`]];
for (const path of walk(app)) {
	if (!path.endsWith('.html')) continue;
	const depth = relative(app, path).split(sep).length - 1;
	pages.push([path, depth ? '../'.repeat(depth) : './']);
}

for (const [path, up] of pages) {
	let html = readFileSync(path, 'utf8');

	// The chooser descended a level when it moved to the top, so the paths
	// SvelteKit already wrote relative — stylesheets, chiefly — have to
	// follow it. Everything it names lives in the folder below now.
	if (up === `${INNER}/`) html = html.replace(/\b(href|src)="\.\//g, `$1="${INNER}/`);

	// A root-absolute path means the filesystem root once there is no
	// server. Every route gained a .html twin at build time; a file keeps
	// the name it has.
	html = html.replace(/\b(href|src)="(\/[^"#]*)"/g, (_, attr, target) => {
		// A query rides AFTER the .html — the file is the route, not the
		// route plus its query.
		const [, route = '', tail = ''] = /^([^?#]*)([?#].*)?$/.exec(target) ?? [];
		const suffix = /\.[a-z0-9]+$/.test(route) ? '' : '.html';
		return `${attr}="${up}${route.slice(1)}${suffix}${tail}"`;
	});

	// Head links with nothing behind them any more. The font preloads carry
	// `crossorigin`, which on a file:// URL fails the CORS check and prints
	// an error for every face — and the offline runtime inlines the reading
	// face anyway, so they were asking for what it already has.
	html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, '');
	html = html.replace(/<link[^>]+rel="manifest"[^>]*>/g, '');
	html = html.replace(/<link[^>]+rel="apple-touch-icon"[^>]*>/g, '');
	html = html.replace(/<link[^>]+rel="preload"[^>]+as="font"[^>]*>/g, '');

	// It cannot register without an origin, and it has nothing to do when
	// every file is already on the disk.
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
}

writeFileSync(
	join(OUT, 'README.txt'),
	`Scrutabor — a Latin missal and prayer book with a word-by-word layer.

    Open index.html.

It works in any browser, with no internet: tap a word for its dictionary
entry and its grammar, move the slider for more or less help, choose
whose parts you are following at Mass.

The "app" folder holds the book itself. There is nothing to look at in
there, and nothing to install.

This copy is yours. Nothing here calls home, nothing expires, and it will
keep working if the website one day does not.

scrutabor.org
`
);

console.log(`${pages.length} pages, ${dropped} server-only files dropped → ${OUT}/`);

if (process.argv.includes('--zip')) {
	// Unzipping must give ONE folder with a name a reader recognises, not
	// three loose items in a Downloads directory.
	const staged = 'Scrutabor';
	const zip = 'Scrutabor.zip';
	rmSync(staged, { recursive: true, force: true });
	rmSync(zip, { force: true });
	cpSync(OUT, staged, { recursive: true });
	execFileSync('zip', ['-qr', zip, staged]);
	rmSync(staged, { recursive: true, force: true });
	console.log(`${zip} — ${(statSync(zip).size / 1048576).toFixed(1)} MB`);
}
