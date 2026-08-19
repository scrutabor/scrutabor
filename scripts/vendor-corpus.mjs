// Copy the corpus's READER EDITION into src/lib/data, which is where the app
// reads it.
//
// The corpus is authored to be reviewed: one fact to a line, every editorial
// claim visible, the parse written out at each of 6,143 words. Its own
// `python build.py` derives the other shape — the apparatus left behind, the
// repeated layers replaced by indices into corpus-wide tables — and verifies
// it by expanding it back and comparing whole documents. That verified output
// is what this vendors, so the app ships what the corpus has already proved
// it can reconstruct.
//
// Run from the app directory, with the corpus checked out beside it:
//
//     node scripts/vendor-corpus.mjs
//
// It shells out to the corpus's own build rather than reimplementing it: the
// emitter and its round-trip check belong to the corpus, and a second copy of
// that logic in JavaScript would be a second edition to keep honest. Python
// is therefore needed to RE-VENDOR and not to build the app — the data is
// committed, so `git clone && npm ci && npm run build` needs neither the
// corpus nor Python.
//
// It is a copy, not a merge: anything in src/lib/data that the edition no
// longer has is deleted, so a renamed text cannot linger as a ghost.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CORPUS = '../scrutabor-corpus';
const DATA = 'src/lib/data';
const TEXTS = join(DATA, 't');
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

const python = existsSync(join(CORPUS, '.venv/bin/python'))
	? join(CORPUS, '.venv/bin/python')
	: 'python3';
execFileSync(python, ['build.py'], { cwd: CORPUS, stdio: 'inherit' });

const BUILD = join(CORPUS, 'build');
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const manifest = read(join(BUILD, 'manifest.json'));

// The guard is now a check rather than a filter. The edition's index numbers
// its texts, so dropping one here would leave every posting after it pointing
// at the wrong text — a corpus that grows a category has to be admitted on
// purpose, and this says so loudly instead of quietly renumbering.
const unknown = manifest.texts.map((id) => id.split('.')[0]).filter((c) => !CATEGORIES.has(c));
if (unknown.length) {
	throw new Error(`the edition holds categories the app does not list: ${[...new Set(unknown)]}`);
}

rmSync(TEXTS, { recursive: true, force: true });
mkdirSync(TEXTS, { recursive: true });

const written = new Set();
const copy = (name, from) => {
	written.add(name);
	// Byte for byte, so that the app ships exactly what the corpus verified.
	// Reformatting it here would mean the sha256 below attests to this
	// script's output rather than to the edition.
	writeFileSync(join(DATA, name), readFileSync(from));
};

for (const name of [
	'manifest.json',
	'm.json',
	'a.json',
	'c.json',
	'x.json',
	'lex.json',
	'kal.json'
]) {
	copy(name, join(BUILD, name));
}
for (const file of readdirSync(join(BUILD, 't'))) {
	// A literal slash, not join(): scripts/provenance.test.ts re-walks these
	// names to check the digest, and the two sides must spell a path the same way.
	if (file.endsWith('.json')) copy(`t/${file}`, join(BUILD, 't', file));
}

let removed = 0;
for (const file of readdirSync(DATA)) {
	if (file === 't' || written.has(file)) continue;
	rmSync(join(DATA, file), { recursive: true });
	removed++;
}

// WHICH CORPUS THIS IS. Until 2026-08-19 the app carried files it could not
// account for: nothing said which commit they came from, so a release could
// not be traced to the edition it published, and a hand-edit under
// src/lib/data would have gone unnoticed by every gate.
//
// The commit answers the first question and the content hash answers the
// second. Neither needs the corpus to be a submodule or a package — those
// change where the files come from, and this records what arrived.
const corpusCommit = execFileSync('git', ['-C', CORPUS, 'rev-parse', 'HEAD'], {
	encoding: 'utf8'
}).trim();
const dirty =
	execFileSync('git', ['-C', CORPUS, 'status', '--porcelain'], { encoding: 'utf8' }).trim() !== '';

const digest = createHash('sha256');
for (const name of [...written].sort()) {
	digest.update(name);
	digest.update(readFileSync(join(DATA, name)));
}

const provenance = {
	note: 'Written by scripts/vendor-corpus.mjs. Checked by scripts/provenance.test.ts.',
	corpus: { repository: 'scrutabor-corpus', commit: corpusCommit, dirty },
	edition: manifest.schema_version,
	schema_version: manifest.corpus_schema,
	files: written.size,
	sha256: digest.digest('hex')
};
writeFileSync(join(DATA, 'provenance.json'), JSON.stringify(provenance, null, '\t') + '\n');

console.log(`vendored ${written.size} files of the reader edition, removed ${removed} stale`);
console.log(`  corpus ${corpusCommit.slice(0, 7)}${dirty ? ' (working tree dirty)' : ''}`);
