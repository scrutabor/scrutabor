// The examples' build-time guard, kept OUT of lib/grammar so that importing
// the concepts does not drag the whole corpus into the browser. Run from the
// grammar routes' server load, which means a bad example still fails the
// prerender — the same guarantee, on the server side of the line.
import { TEXTS } from './corpus';
import { CONCEPTS } from './grammar';

let checked = false;

/** Every example must point at a real word whose form appears in its phrase. */
export function assertExamplesResolve(): void {
	if (checked) return;
	for (const c of CONCEPTS) {
		for (const ex of c.examples) {
			const entry = TEXTS[ex.textKey];
			const word = entry?.text.segments
				.flatMap((s) => s.words ?? [])
				.find((w) => w.id === ex.wordId);
			if (!word) throw new Error(`grammar: ${c.id}: no word ${ex.wordId} in ${ex.textKey}`);
			if (!ex.la.includes(word.form)) {
				throw new Error(
					`grammar: ${c.id}: phrase ${JSON.stringify(ex.la)} does not contain form ` +
						`${JSON.stringify(word.form)} (${ex.wordId})`
				);
			}
		}
	}
	checked = true;
}
