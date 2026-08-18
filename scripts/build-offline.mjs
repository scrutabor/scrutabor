// Assemble the book as a folder anyone can keep.
//
// The site's own build, prepared so that it runs with no server at all —
// opened straight off a disk, a USB stick, an attachment. A URL path is
// still its own small HTML file, exactly as when hosted; what changes is
// how those files find each other, and how a page starts.
//
//   node scripts/build-offline.mjs           → build-offline/
//   node scripts/build-offline.mjs --zip     → …and Scrutabor-v<version>.zip
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
import { BEACON_BLOCK, BEACON_HOST } from './beacon-block.mjs';

/** The package version, single-sourced from package.json (the release
 * ritual bumps it with `npm version`, which also cuts the tag). It goes
 * into the zip's NAME — two copies on a disk must tell themselves apart
 * before anyone unzips them — and into the README; the folder inside
 * stays plain `Scrutabor`, so unzipping always yields the same shape. */
const VERSION = JSON.parse(readFileSync('package.json', 'utf8')).version;

const SITE = 'build';
const RUNTIME = 'build-offline-runtime/offline.js';
const OUT = 'build-offline';
/** Everything but README.txt and index.html lives in here. */
const INNER = 'app';

for (const required of [SITE, join(SITE, INNER), RUNTIME]) {
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

// The BOOK, not the site. The site serves the book under /app and its
// landing pages at the root; a downloaded copy is the book alone, so only
// the build/app/ subtree (the pages) and build/_app/ (the shared
// immutable assets) are taken. Everything else at the build root — the
// landing pages, robots, the sitemap, the service worker, the manifest,
// the icons, 404.html — means something only to a web server or an app
// store, and staying outside the copy is how it stays out of the zip.
const app = join(OUT, INNER);
rmSync(OUT, { recursive: true, force: true });
cpSync(join(SITE, INNER), app, { recursive: true });
cpSync(join(SITE, '_app'), join(app, '_app'), { recursive: true });
cpSync(RUNTIME, join(app, '_app', 'offline.js'));
// The day's own texts, which live outside /app because they are data rather
// than pages. They must travel: a downloaded book that cannot open today's
// Mass is a book that fails exactly where offline was supposed to help
// (decisions #27, revised 2026-08-18). They land INSIDE the app directory
// because that is where `__scrutabor_up` points, so one path expression
// serves the site and the copy.
cpSync(join(SITE, 'artifacts'), join(app, 'artifacts'), { recursive: true });

// …and beside each one, the same day as a CLASSIC SCRIPT.
//
// Chrome refuses `fetch()` for file:// outright — "URL scheme file is not
// supported" — so the site's way of getting a day cannot work in a downloaded
// copy, however the path is spelled. A classic script CAN be loaded from
// file://, which is the same reason the offline runtime is an IIFE rather
// than a module. The reader gets one day at a time either way.
//
// The workaround lives here and nowhere else: the site keeps plain JSON, and
// only the copy that has no origin carries the script form.
for (const path of walk(join(app, 'artifacts'))) {
	if (!path.endsWith('.json')) continue;
	const day = readFileSync(path, 'utf8');
	writeFileSync(path.replace(/\.json$/, '.js'), `window.__scrutabor_day=${day};\n`);
}

// The canary for that boundary: the privacy page exists in every language
// and only on the landing side, so finding it here means the copy widened.
for (const path of walk(app)) {
	if (/[/\\]privacy\.html$/.test(path)) {
		console.error(`landing page in the package: ${path}`);
		process.exit(1);
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

	// SvelteKit writes asset paths RELATIVE (../../../_app/…), against the
	// page's place in the SITE — where _app sits beside /app, one level
	// above the book. This folder keeps _app inside app/, beside the
	// pages' own root, so every such path is one step too high.
	if (up === `${INNER}/`) {
		// The chooser ascended a level when it moved to the top: what the
		// site wrote as one directory up is, from here, the book's folder.
		html = html.replace(/\b(href|src)="\.\.\//g, `$1="${INNER}/`);
	} else {
		html = html.replace(
			/\b(href|src)="((?:\.\.\/)+)_app\//g,
			(_, attr, ups) => `${attr}="${ups.length > 3 ? ups.slice(3) : './'}_app/`
		);
	}

	// A root-absolute path means the filesystem root once there is no
	// server. The site serves the book under /app; in this folder the app/
	// directory IS that subtree and `up` already points at it, so the
	// prefix comes off — /app/pl becomes pl.html at this page's depth.
	// Every route gained a .html twin at build time; a file keeps the name
	// it has.
	html = html.replace(/\b(href|src)="(\/[^"#]*)"/g, (_, attr, target) => {
		// A query rides AFTER the .html — the file is the route, not the
		// route plus its query.
		const [, route = '', tail = ''] = /^([^?#]*)([?#].*)?$/.exec(target) ?? [];
		const stripped = route.replace(/^\/app(?=\/|$)/, '');
		// The app's own front door is the package root's index.html.
		if (stripped === '' || stripped === '/') {
			const toRoot = up === `${INNER}/` ? '' : `${up}../`;
			return `${attr}="${toRoot}index.html${tail}"`;
		}
		const suffix = /\.[a-z0-9]+$/.test(stripped) ? '' : '.html';
		return `${attr}="${up}${stripped.slice(1)}${suffix}${tail}"`;
	});

	// The visit counter belongs to the SITE. Its own gates already keep it
	// silent on a file:// page, but README.txt promises that nothing here
	// calls home, and that should be true of the bytes and not merely of
	// what they would decide to do. The pattern is tempered so that it can
	// never run past a </script> into the theme block above it.
	html = html.replace(BEACON_BLOCK, '');

	// Head links with nothing behind them any more. The font preloads carry
	// `crossorigin`, which on a file:// URL fails the CORS check and prints
	// an error for every face — and the offline runtime inlines the reading
	// face anyway, so they were asking for what it already has.
	// The manifest and apple-touch-icon links STAY, dead as they are: they
	// are the entire prerendered output of the app layout's <svelte:head>,
	// and Svelte's head hydration claims that block by its markers — with
	// the links stripped the block is empty, the claim mis-anchors, and
	// the repair swallowed every stylesheet link beside it. A link nothing
	// ever fetches is cheaper than a head the hydrator cannot recognise.
	html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, '');
	html = html.replace(/<link[^>]+rel="preload"[^>]+as="font"[^>]*>/g, '');

	// The chooser picks the reader's language before first paint and sends
	// them to it. `/app/pl` is the filesystem root here, so the very first
	// thing anyone opening this folder would meet is a blank window. (The
	// service worker needs no such treatment any more: its registration
	// lives in the app layout's compiled code, guarded there against
	// origin-less pages, not in the prerendered HTML.)
	html = html.replace(
		"location.replace('/app/' + pick + location.search + location.hash)",
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

// "Nothing here calls home" is the last line of the README and the reason
// anyone keeps a copy. The counter is cut from every page above, so this
// walks the finished package — pages, bundles, assets — and refuses to
// build one where the name survived anywhere at all.
for (const path of walk(OUT)) {
	if (readFileSync(path).includes(BEACON_HOST)) {
		console.error(`the visit counter reached the offline package: ${path}`);
		process.exit(1);
	}
}

writeFileSync(
	join(OUT, 'README.txt'),
	`Scrutabor — a Latin missal and prayer book with a word-by-word layer.
Edition v${VERSION}.

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

console.log(`${pages.length} pages → ${OUT}/`);

if (process.argv.includes('--zip')) {
	// Unzipping must give ONE folder with a name a reader recognises, not
	// three loose items in a Downloads directory.
	const staged = 'Scrutabor';
	const zip = `Scrutabor-v${VERSION}.zip`;
	rmSync(staged, { recursive: true, force: true });
	for (const stale of readdirSync('.')) {
		if (/^Scrutabor(-v.*)?\.zip$/.test(stale)) rmSync(stale);
	}
	cpSync(OUT, staged, { recursive: true });
	execFileSync('zip', ['-qr', zip, staged]);
	rmSync(staged, { recursive: true, force: true });
	console.log(`${zip} — ${(statSync(zip).size / 1048576).toFixed(1)} MB`);
}
