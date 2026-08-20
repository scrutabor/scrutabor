// Nothing here may point at a document only the authors can open.
//
// This repository is public. The project's working notes are not: the backlog,
// the review playbook, the quality taxonomy and the conventions live in a
// private workbench, and a reader who follows `notes/conventions.md` from a
// file here lands nowhere.
//
// An external review found sixteen of these across both public repositories on
// 2026-08-19, and a re-review found three more that the FIRST VERSION OF THIS
// GATE could not see: it matched `BACKLOG.md` with the extension, and the
// survivors wrote the bare word. A gate that certifies a boundary it cannot
// see past is worse than none, so the pattern now takes the word under any
// casing. The fix in every case was to say the thing rather than to cite it.
//
// A SECOND version had the same disease in the file-name halves (found by
// mutation on 2026-08-20): `notes\/[a-z-]+` could not cross a digit and
// `reviews\/[A-Z][A-Z0-9-]*` could not cross lowercase, so a date-stamped
// note and a versioned report both walked through — and two citations of a
// date-stamped workbench note were live in this repository while the gate
// showed green. Both halves now take any plausible file name.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** The private workbench's own documents, by the names they are cited under. */
const PRIVATE =
	/reviews\/[\w.-]+\.md|notes\/[\w.-]+\.md|\bbacklog\b|\bplaybook\b|\bowner-queue\b|scrutabor-workbench/i;

/** This file names them in order to forbid them. */
const EXEMPT = new Set(['scripts/public-boundary.test.ts']);

/** Data we vendor or generate rather than write: the corpus, the lockfile,
 * the font subsets. Their contents are checked where they are produced. */
const NOT_PROSE = /^(src\/lib\/data\/|static\/|package-lock\.json$)|\.(woff2?|png|svg|ico|zip)$/;

function tracked(): string[] {
	return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
		.split('\n')
		.filter((name) => name && !EXEMPT.has(name) && !NOT_PROSE.test(name));
}

describe('the public boundary', () => {
	it('finds the files it means to check', () => {
		expect(tracked().length, 'git ls-files came back empty').toBeGreaterThan(100);
	});

	it('cites no document a reader of this repository cannot open', () => {
		const found: string[] = [];
		for (const name of tracked()) {
			let text: string;
			try {
				text = readFileSync(name, 'utf8');
			} catch {
				continue;
			}
			text.split('\n').forEach((line, i) => {
				if (PRIVATE.test(line)) found.push(`${name}:${i + 1}: ${line.trim().slice(0, 90)}`);
			});
		}
		expect(found, `these point at documents a reader cannot open:\n${found.join('\n')}`).toEqual(
			[]
		);
	});
});
