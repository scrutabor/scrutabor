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

// The corpus keeps ONE document per text since schema 0.14.0: the Latin, both
// gloss layers and an editorial block, joined. The app still reads three, and
// there is no reason for it to change on the same day the corpus did — so the
// split happens here, at the boundary, and src/lib/data keeps the shape it has
// always had. When the app moves to the reader edition this whole function
// goes with it.
const SEG_LANG = ['translation', 'translation_citations', 'narrative', 'narrative_citations'];
const WORD_LANG = ['gloss', 'function', 'function_citations', 'note'];

function splitLayers(doc) {
	const editorial = doc.editorial ?? {};
	// The split is a shape, not a schema. It carries the version of the
	// document it came from, or the vendored corpus would claim two.
	const version = doc.schema_version;
	const text = { schema_version: version };
	for (const [key, value] of Object.entries(doc)) {
		if (['schema_version', 'segments', 'editorial', 'about', 'about_citations'].includes(key))
			continue;
		text[key] = value;
	}
	for (const key of ['status', 'notes', 'source', 'analysis_defaults', 'analysis_defaults_words']) {
		if (key in editorial) text[key] = editorial[key];
	}

	const layers = {};
	for (const lang of ['pl', 'en']) {
		// The key order the vendored files have always had, so joining the
		// corpus shows up as no diff at all on this side.
		const layer = {
			schema_version: version,
			text: doc.id,
			lang,
			status: editorial.status ?? 'working-edition'
		};
		for (const key of ['about', 'about_citations']) {
			if (doc[key] && lang in doc[key]) layer[key] = doc[key][lang];
		}
		layer.analysis_defaults = editorial.analysis_defaults ?? {};
		layer.segments = {};
		layer.words = {};
		layers[lang] = layer;
	}

	text.segments = doc.segments.map((row) => {
		const segment = {};
		for (const [key, value] of Object.entries(row)) {
			if (SEG_LANG.includes(key) || key === 'words') continue;
			segment[key] = value;
		}
		if (editorial.segments?.[row.id]?.analysis)
			segment.analysis = editorial.segments[row.id].analysis;
		for (const key of SEG_LANG) {
			for (const [lang, value] of Object.entries(row[key] ?? {})) {
				(layers[lang].segments[row.id] ??= {})[key] = value;
			}
		}
		if (row.words) {
			segment.words = row.words.map((cell) => {
				const word = Object.fromEntries(
					Object.entries(cell).filter(([key]) => !WORD_LANG.includes(key))
				);
				if (editorial.words?.[cell.id]?.analysis) word.analysis = editorial.words[cell.id].analysis;
				for (const key of WORD_LANG) {
					for (const [lang, value] of Object.entries(cell[key] ?? {})) {
						(layers[lang].words[cell.id] ??= {})[key] = value;
					}
				}
				return word;
			});
		}
		return segment;
	});
	return { text, layers };
}

for (const path of textFiles()) {
	const doc = read(path);
	const id = doc.id;
	if (!id) throw new Error(`${path} has no id`);
	const { text, layers } = splitLayers(doc);
	copy(`${id}.json`, text);
	for (const lang of ['pl', 'en']) copy(`${id}.${lang}.json`, layers[lang]);
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
