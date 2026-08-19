// Assemble the book as a folder anyone can keep.
//
// Until 2026-08-19 this took the site's 2,381 prerendered pages and rewrote
// each one to work without a server: every route was a file, exactly as when
// hosted. It was honest and it did not scale — each page carries its own slice
// of the dictionary, so the Ordinary and one Sunday of Advent came to 12.7 MB,
// and the whole church year would have been well over a gigabyte.
//
// The copy now ships the BOOK and renders it: one shell, one runtime carrying
// the components and the whole reader edition, and the route in the hash.
// 2 MB for what 12.7 MB used to hold, and the whole year projects to about 12
// (notes/corpus-structure-2026-08-18.md §10-11).
//
//   node scripts/build-offline.mjs           → build-offline/
//   node scripts/build-offline.mjs --zip     → …and Scrutabor-v<version>.zip
//
// What the reader opens has to be obvious at a glance, so the folder holds
// three things and no more:
//
//   README.txt     what this is
//   index.html     ← the one to open
//   app/           the runtime, which nobody needs to look at
//
// Expects `npm run build` and `npm run build:offline-runtime` to have run; it
// does not shell out to them, so a failure here is never confused with a
// failure there.
import { execFileSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { BEACON_BLOCK, BEACON_HOST } from './beacon-block.mjs';

/** The package version, single-sourced from package.json (the release
 * ritual bumps it with `npm version`, which also cuts the tag). It goes
 * into the zip's NAME — two copies on a disk must tell themselves apart
 * before anyone unzips them — and into the README; the folder inside
 * stays plain `Scrutabor`, so unzipping always yields the same shape. */
const VERSION = JSON.parse(readFileSync('package.json', 'utf8')).version;

const SITE = 'build';
const RUNTIME = 'build-offline-runtime/offline.js';
const STYLES = 'build-offline-runtime/style.css';
const OUT = 'build-offline';
/** The runtime lives here, and `__scrutabor_up` points at it. */
const INNER = 'app';

for (const required of [SITE, join(SITE, INNER), RUNTIME, STYLES]) {
	if (!existsSync(required)) {
		console.error(
			`missing ${required} — run \`npm run build\` and \`npm run build:offline-runtime\` first`
		);
		process.exit(1);
	}
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, INNER), { recursive: true });
cpSync(RUNTIME, join(OUT, INNER, 'offline.js'));

// THE SHELL, derived from the app's own template rather than written out
// here, so that the pre-paint theme block — which resolves the reader's theme
// and text size before anything is drawn — cannot drift between the two
// editions. Everything SvelteKit would have filled in is replaced: there is
// no prerendered markup to hydrate, the runtime mounts into an empty frame.
const template = readFileSync('src/app.html', 'utf8');
const icon = /<link rel="icon"[^>]*>/.exec(readFileSync(join(SITE, INNER, 'index.html'), 'utf8'));
if (!icon) {
	console.error('no icon link in the built front door — the shell would have none');
	process.exit(1);
}

let shell = template
	// The visit counter belongs to the SITE. Its own gates already keep it
	// silent on a file:// page, but README.txt promises that nothing here
	// calls home, and that should be true of the bytes and not merely of what
	// they would decide to do. The pattern is tempered so that it can never
	// run past a </script> into the theme block above it.
	.replace(BEACON_BLOCK, '')
	.replace('%app.lang%', 'en')
	.replace(
		'%sveltekit.head%',
		`${icon[0]}\n\t\t<title>Scrutabor</title>\n` +
			// The stylesheet, WRITTEN INTO THE SHELL rather than injected by
			// the runtime or linked beside it, and both alternatives were
			// tried. Injected, the document computes its styles once with the
			// browser's defaults and again when the script has run, and `body`
			// carries a quarter second `color` transition for the theme toggle
			// — so every page opened by fading up from black. Linked, a
			// file:// document may not read its own rules back, and the check
			// that every focusable thing wears the house focus ring went blind
			// to all of them at once. Inline, the styles are there at parse and
			// they are ours to inspect. The reading face rides inside as data
			// URIs, so this is also the whole of the book's typography.
			`\t\t<style>${readFileSync(STYLES, 'utf8')}</style>`
	)
	.replace(
		'<div style="display: contents">%sveltekit.body%</div>',
		// The one thing this edition gives up, said out loud rather than shown
		// as a blank window. The site renders without scripting because every
		// route is a prerendered file; the folder is one document that builds
		// the book from the corpus it carries, and that needs a script to run.
		`<noscript><div class="noscript">
			<p lang="pl">Ta kopia księgi potrzebuje JavaScriptu. Cały tekst jest tutaj, ale składa go przeglądarka.</p>
			<p lang="en">This copy of the book needs JavaScript. The whole text is here, and the browser assembles it.</p>
		</div></noscript>
		<div id="scrutabor"></div>
		<script>window.__scrutabor_up = ${JSON.stringify(`${INNER}/`)};</script>
		<script src="${INNER}/offline.js"></script>
		<script>window.__scrutabor_boot();</script>`
	);
if (shell.includes('%')) {
	const leftover = /%[a-z.]+%/.exec(shell);
	if (leftover) {
		console.error(`the shell still holds ${leftover[0]} — app.html grew a placeholder`);
		process.exit(1);
	}
}
writeFileSync(join(OUT, 'index.html'), shell);

// "Nothing here calls home" is the last line of the README and the reason
// anyone keeps a copy. The counter is cut from the shell above, so this walks
// the finished package — shell, runtime, assets — and refuses to build one
// where the name survived anywhere at all.
function* walk(dir) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) yield* walk(path);
		else yield path;
	}
}
for (const path of walk(OUT)) {
	if (readFileSync(path).includes(BEACON_HOST)) {
		console.error(`the visit counter reached the offline package: ${path}`);
		process.exit(1);
	}
}

// The landing pages are the SITE's, never the book's. The canary is the
// privacy page, which exists in every language and only on the landing side.
for (const path of walk(OUT)) {
	if (/[/\\]privacy\.html$/.test(path)) {
		console.error(`landing page in the package: ${path}`);
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

const bytes = [...walk(OUT)].reduce((sum, path) => sum + statSync(path).size, 0);
console.log(`${OUT}/ — ${(bytes / 1048576).toFixed(1)} MB`);

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
