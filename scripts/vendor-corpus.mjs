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
import { dirname, join } from 'node:path';

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
const unknown = manifest.texts
	.map((entry) => entry.id.split('.')[0])
	.filter((category) => !CATEGORIES.has(category));
if (unknown.length) {
	throw new Error(`the edition holds categories the app does not list: ${[...new Set(unknown)]}`);
}

function filesBelow(root, prefix = '') {
	const files = [];
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		const name = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) files.push(...filesBelow(join(root, entry.name), name));
		else if (entry.isFile() && entry.name.endsWith('.json')) files.push(name);
	}
	return files;
}

// The boundary the mirror must not widen: everything copied is a file the
// edition's own manifests declare. The closure is manifest-driven, so a
// future partial-language package needs no new hand-list here — but a stray
// generated file cannot ride into the public app unnamed. The corpus build
// enforces the same closure from its side; this refuses to vendor a tree
// that somehow escaped it.
const declaredByManifests = new Set([
	'manifest.json',
	...Object.values(manifest.base),
	...Object.values(manifest.bibliography)
]);
for (const entry of manifest.texts) {
	declaredByManifests.add(entry.path);
	if (entry.evidence) declaredByManifests.add(entry.evidence);
}
for (const language of manifest.languages) {
	declaredByManifests.add(language.path);
	const languageManifest = read(join(BUILD, language.path));
	for (const key of ['lexicon', 'citations', 'concordance', 'formularies']) {
		declaredByManifests.add(languageManifest[key]);
	}
	for (const resource of Object.values(languageManifest.bibliography)) {
		declaredByManifests.add(resource);
	}
	for (const entry of languageManifest.texts) {
		declaredByManifests.add(entry.path);
		if (entry.evidence) declaredByManifests.add(entry.evidence);
	}
}
const editionFiles = filesBelow(BUILD).sort();
const editionSet = new Set(editionFiles);
const undeclared = editionFiles.filter((name) => !declaredByManifests.has(name));
const unwritten = [...declaredByManifests].filter((name) => !editionSet.has(name));
if (undeclared.length || unwritten.length) {
	throw new Error(
		`the mirror and the manifests disagree — undeclared: ${undeclared}, missing: ${unwritten}`
	);
}

// Validate before replacing the current vendor tree. A malformed edition
// should leave the last known-good copy intact rather than deleting it and
// failing halfway through the command.
rmSync(DATA, { recursive: true, force: true });
mkdirSync(DATA, { recursive: true });

const written = new Set();
const copy = (name, from) => {
	written.add(name);
	// Byte for byte, so that the app ships exactly what the corpus verified.
	// Reformatting it here would mean the sha256 below attests to this
	// script's output rather than to the edition.
	const target = join(DATA, name);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, readFileSync(from));
};

// Mirror the edition instead of naming today's folders. A later optional
// language-pack search index is data with a surface, but it must not require
// teaching the vendor a new path before the app can use it.
for (const name of editionFiles) copy(name, join(BUILD, name));

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

console.log(`vendored ${written.size} files of the reader edition`);
console.log(`  corpus ${corpusCommit.slice(0, 7)}${dirty ? ' (working tree dirty)' : ''}`);
