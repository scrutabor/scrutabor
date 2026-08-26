import { describe, expect, it } from 'vitest';
import { loadAllTexts } from './corpus';
import { ipa, pronunciations } from './pronunciation';
import { PRONUNCIATION_RULES } from './pronuntiatio-rules';

const TEXTS = await loadAllTexts();

// The pronunciation page teaches twelve rules and prints a transcription
// beside each. The transcriptions are hand-written prose on a page, and the
// app generates its own from `pronunciation.ts` — two statements of one fact,
// which is the shape that drifts. A reader who reads the rule and then taps
// the word must be shown the same thing twice.
describe('the pronunciation page and the module agree', () => {
	it('prints the transcription the module generates', () => {
		for (const rule of PRONUNCIATION_RULES) {
			const { roman, polish, differ } = pronunciations(rule.example);
			const expected = differ ? `rz. /${roman}/ · pol. /${polish}/` : `/${roman}/`;
			expect(rule.exampleIpa.pl, `${rule.grapheme} — ${rule.example}`).toBe(expected);
			expect(rule.exampleIpa.en, `${rule.grapheme} — ${rule.example}`).toBe(
				`/${ipa(rule.example, 'roman')}/`
			);
		}
	});

	it('links every example that claims a corpus word to that word', () => {
		for (const rule of PRONUNCIATION_RULES) {
			if (!rule.href) continue;
			const [path, query] = rule.href.split('?');
			const key = path.replace(/^\//, '');
			const id = new URLSearchParams(query).get('w');
			const word = TEXTS[key]?.text.segments.flatMap((s) => s.words ?? []).find((w) => w.id === id);
			expect(word, `${rule.grapheme} — ${rule.href}`).toBeDefined();
			expect(word!.form, `${rule.grapheme} — ${rule.href}`).toBe(rule.example);
		}
	});
});
