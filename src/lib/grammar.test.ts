import { describe, expect, it } from 'vitest';
import { CONCEPTS, CONCEPT_GROUPS, conceptById } from './grammar';

// Importing the module at all runs its load-time validator (every example
// must point at a real word and quote its form) — these tests make the
// remaining invariants explicit.
describe('grammar concepts', () => {
	it('covers the first tranche', () => {
		expect(CONCEPTS.length).toBeGreaterThanOrEqual(10);
	});

	it('has unique ids and known groups', () => {
		const ids = CONCEPTS.map((c) => c.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const c of CONCEPTS) {
			expect(Object.keys(CONCEPT_GROUPS)).toContain(c.group);
		}
	});

	it('resolves concepts by id', () => {
		expect(conceptById('ablativus')?.label.pl).toBe('ablativus');
		expect(conceptById('vocativus')?.label.en).toBe('vocative');
		expect(conceptById('nonexistent')).toBeUndefined();
	});

	it('gives every concept prose and at least two examples in both languages', () => {
		for (const c of CONCEPTS) {
			expect(c.what.pl, c.id).toBeTruthy();
			expect(c.what.en, c.id).toBeTruthy();
			expect(c.examples.length, c.id).toBeGreaterThanOrEqual(2);
			for (const ex of c.examples) {
				expect(ex.note.pl, `${c.id} ${ex.wordId}`).toBeTruthy();
				expect(ex.note.en, `${c.id} ${ex.wordId}`).toBeTruthy();
			}
		}
	});
});

// The examples answer to the corpus, and the guard that says so lives in
// grammar.check — which the concept route runs at prerender. Running it here
// too means a mismatch fails a unit test in a second rather than a build in
// two minutes.
describe('grammar examples against the corpus', () => {
	it('every example carries the fact its page teaches', async () => {
		const { assertExamplesResolve } = await import('./grammar.check');
		await expect(assertExamplesResolve()).resolves.toBeUndefined();
	});
});
