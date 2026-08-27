// The app ships the vendored corpus, which it did not write. This is what it
// can say about those files.
//
// It lives in scripts/ and not src/lib/ because it reads the filesystem:
// `node:fs` under src/ type-checks locally and fails on CI, which is a lesson
// this repository has learned before and which `npm run check` caught here
// within a minute of the file being written.
//
// Until 2026-08-19 the answer was nothing: no record of which corpus commit
// they came from, so a release could not be traced back to the edition it
// published, and an edit made under src/lib/data by hand — a "quick fix" to a
// gloss, most plausibly — would have passed every gate in this repository and
// then been overwritten, silently, by the next vendor run.
//
// The hash closes the second hole and the commit closes the first. Neither
// depends on how the files arrive, so this holds whether the corpus stays a
// sibling checkout, becomes a submodule, or is published as a release asset.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DATA = 'src/lib/data';
const provenance = JSON.parse(readFileSync(`${DATA}/provenance.json`, 'utf8'));

/** Exactly what the vendor script hashed: every JSON file it wrote, in name order. */
function digestOfVendoredData(): { sha256: string; files: number } {
	const below = (dir: string, prefix = ''): string[] =>
		readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
			const name = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) return below(`${dir}/${entry.name}`, name);
			return entry.isFile() && entry.name.endsWith('.json') && name !== 'provenance.json'
				? [name]
				: [];
		});
	const names = below(DATA).sort();
	const digest = createHash('sha256');
	for (const name of names) {
		digest.update(name);
		digest.update(readFileSync(`${DATA}/${name}`));
	}
	return { sha256: digest.digest('hex'), files: names.length };
}

describe('the corpus this app ships', () => {
	it('says which commit it came from', () => {
		expect(provenance.corpus.commit).toMatch(/^[0-9a-f]{40}$/);
		expect(provenance.schema_version).toMatch(/^\d+\.\d+\.\d+$/);
		expect(provenance.edition, 'the reader edition names its own version').toMatch(
			/^\d+\.\d+\.\d+$/
		);
	});

	it('is the shape expandDocument was written against', () => {
		// EXACT versions, not shapes of versions: `expandDocument` is a hand
		// mirror of the corpus's own expand(), keyed on hand-kept ROW_KEYS
		// and DOC_KEYS sets. A corpus that changes shape must arrive as a
		// red build and a deliberate re-read of the emitter — not as a new
		// short key falling through the sets and a layer quietly missing
		// from the reader's page. Bump these WITH the mirror, never alone.
		expect(provenance.schema_version).toBe('0.18.0');
		expect(provenance.edition).toBe('4.0.0');
	});

	it('was vendored from a clean corpus', () => {
		// A release built from an uncommitted corpus cannot be reproduced, and
		// the edition it publishes exists nowhere but one laptop.
		expect(provenance.corpus.dirty, 'the corpus had uncommitted changes when vendored').toBe(false);
	});

	it('has not been edited since it was vendored', () => {
		const actual = digestOfVendoredData();
		expect(actual.files, 'a file was added or removed under src/lib/data').toBe(provenance.files);
		expect(
			actual.sha256,
			'src/lib/data does not match its provenance — re-run scripts/vendor-corpus.mjs, ' +
				'and if you were correcting the content, correct it in the corpus'
		).toBe(provenance.sha256);
	});
});
