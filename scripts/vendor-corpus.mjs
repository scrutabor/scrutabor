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

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));

function textFiles() {
	const out = [];
	for (const category of readdirSync(join(CORPUS, 'texts'))) {
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

for (const path of textFiles()) {
	const doc = read(path);
	const id = doc.id;
	if (!id) throw new Error(`${path} has no id`);
	copy(`${id}.json`, doc);
	for (const lang of ['pl', 'en']) {
		copy(`${id}.${lang}.json`, read(join(CORPUS, 'glosses', lang, `${id}.json`)));
	}
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
