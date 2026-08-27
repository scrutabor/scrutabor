// The corpus emits its search keys; this app normalizes typed queries. The
// two implementations live in different languages, and the ǽ defect lived
// exactly in their gap: each side's tests passed while the pair disagreed.
// The edition therefore ships hand-authored vectors — input beside expected
// key — and BOTH sides hold themselves to the identical pairs. A divergence
// is a red test here, not a quiet unfindable word.
import { describe, expect, it } from 'vitest';
import vectors from './data/normalization.json';
import { normalizeLatin } from './concordance';
import { normalizeSearch, tokenizeSearch } from './search';

describe('the shared normalization vectors', () => {
	it('exist and cover the accented ligature', () => {
		expect(vectors.latin.length).toBeGreaterThan(5);
		expect(vectors.latin.some(([probe]) => probe.includes('ǽ'))).toBe(true);
	});

	it('normalizeLatin matches the edition, pair by pair', () => {
		for (const [probe, expected] of vectors.latin) {
			expect(normalizeLatin(probe), probe).toBe(expected);
		}
	});

	it('normalizeSearch matches the edition, pair by pair', () => {
		for (const [probe, expected] of vectors.search) {
			expect(normalizeSearch(probe), probe).toBe(expected);
		}
	});

	it('is idempotent on its own output', () => {
		for (const [probe] of vectors.latin) {
			const once = normalizeLatin(probe);
			expect(normalizeLatin(once), probe).toBe(once);
		}
		for (const [probe] of vectors.search) {
			const once = normalizeSearch(probe);
			expect(normalizeSearch(once), probe).toBe(once);
		}
	});

	it('keeps devotional capitalization a display concern only', () => {
		expect(tokenizeSearch('Sǽcula Sæculórum')).toEqual(['saecula', 'saeculorum']);
		expect(normalizeLatin('Quǽsumus')).toBe(normalizeLatin('quaesumus'));
	});
});
