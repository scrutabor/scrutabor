// Copy the corpus into src/lib/data, which is where the app reads it
// until the artifact pipeline exists.
//
// Files are named for the corpus id — ordinarium.pater-noster.json, and
// .pl.json / .en.json beside it — because slugs alone collide: the Mass
// has its own recension of the Pater noster, and a flat pater-noster.json
// could only hold one of the two. The app builds its index from the id
// inside each file, so nothing here has to be registered anywhere.
//
// Run from the app directory, with the corpus checked out beside it:
//
//     node scripts/vendor-corpus.mjs
//
// It is a copy, not a merge: anything in src/lib/data that the corpus no
// longer has is deleted, so a renamed text cannot linger as a ghost.
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CORPUS = '../scrutabor-corpus';
const DATA = 'src/lib/data';
// The allowlist exists so a re-vendor cannot silently widen the product:
// data with no surface is data shipped for nobody. `proprium` joined it on
// 2026-08-18, when the shelf and the label that names the day landed with it.
// A category added here without a catalog section fails catalog.reach.test.ts
// rather than reaching a reader as an unlinked page.
const CATEGORIES = new Set([
	'orationes',
	'defunctorum',
	'litaniae',
	'ordinarium',
	'proprium',
	'psalmi'
]);

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));

function textFiles() {
	const out = [];
	for (const category of readdirSync(join(CORPUS, 'texts'))) {
		if (!CATEGORIES.has(category)) continue;
		for (const file of readdirSync(join(CORPUS, 'texts', category))) {
			if (file.endsWith('.json')) out.push(join(CORPUS, 'texts', category, file));
		}
	}
	return out;
}

const written = new Set();
const copy = (name, value) => {
	written.add(name);
	writeFileSync(join(DATA, name), JSON.stringify(value, null, '\t') + '\n');
};

// One document per text, copied as it is. The corpus joined the Latin, both
// gloss layers and the editorial block at schema 0.14.0, and this vendors that
// document rather than taking it apart again -- the app stores what the corpus
// stores. Splitting it into the three shapes the reading code expects happens
// once, in lib/corpus.ts, and that is the only place in the app that knows
// both shapes.
for (const path of textFiles()) {
	const doc = read(path);
	if (!doc.id) throw new Error(`${path} has no id`);
	copy(`${doc.id}.json`, doc);
}

copy('lexicon.json', read(join(CORPUS, 'lexicon/lemmata.json')));
copy('lexicon.pl.json', read(join(CORPUS, 'lexicon/pl.json')));
copy('lexicon.en.json', read(join(CORPUS, 'lexicon/en.json')));

let removed = 0;
for (const file of readdirSync(DATA)) {
	if (!written.has(file)) {
		rmSync(join(DATA, file));
		removed++;
	}
}

console.log(`vendored ${written.size} files from the corpus, removed ${removed} stale`);
