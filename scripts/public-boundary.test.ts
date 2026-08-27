// A relative documentation reference must open from this repository.
//
// This repository is self-contained: when a comment or an error message
// points a reader at `notes/<page>.md`, `reviews/<page>.md`, or
// `docs/<page>.md`, that file must exist here. A pointer a reader cannot
// follow is worse than none — the first person to trip a check would be told
// to consult a page that is not there. The rule is the readable one: say the
// thing, or cite a page this repository actually ships.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DOC_REFERENCE = /\b(?:notes|reviews|docs)\/[A-Za-z0-9][A-Za-z0-9._-]*\.md\b/g;

/** Data we vendor or generate rather than write: the corpus, the lockfile,
 * the font subsets. Their contents are checked where they are produced. */
const NOT_PROSE = /^(src\/lib\/data\/|static\/|package-lock\.json$)|\.(woff2?|png|svg|ico|zip)$/;

function tracked(): string[] {
	return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
		.split('\n')
		.filter((name) => name && !NOT_PROSE.test(name));
}

export function danglingReferences(root: string, names: string[]): string[] {
	const found: string[] = [];
	for (const name of names) {
		let text: string;
		try {
			text = readFileSync(join(root, name), 'utf8');
		} catch {
			continue;
		}
		text.split('\n').forEach((line, i) => {
			for (const reference of line.match(DOC_REFERENCE) ?? []) {
				if (!existsSync(join(root, reference))) found.push(`${name}:${i + 1}: ${reference}`);
			}
		});
	}
	return found;
}

describe('the public boundary', () => {
	it('finds the files it means to check', () => {
		expect(tracked().length, 'git ls-files came back empty').toBeGreaterThan(100);
	});

	it('cites no documentation page this repository does not ship', () => {
		const found = danglingReferences('.', tracked());
		expect(
			found,
			`these point at documentation a reader cannot open:\n${found.join('\n')}`
		).toEqual([]);
	});

	it('can fail', async () => {
		// The example reference is assembled at runtime so this file's own
		// text does not carry a dangling literal for the scan above.
		const { mkdtempSync } = await import('node:fs');
		const { tmpdir } = await import('node:os');
		const root = mkdtempSync(join(tmpdir(), 'boundary-'));
		const reference = ['notes', 'example.md'].join('/');
		writeFileSync(join(root, 'src.ts'), `// see ${reference} for the rules\n`);
		const found = danglingReferences(root, ['src.ts']);
		expect(found).toHaveLength(1);
		expect(found[0]).toContain(reference);
		mkdirSync(join(root, 'notes'));
		writeFileSync(join(root, reference), '# rules\n');
		expect(danglingReferences(root, ['src.ts'])).toEqual([]);
	});
});
