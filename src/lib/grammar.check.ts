// The examples' build-time guard, kept OUT of lib/grammar so that importing
// the concepts does not drag the whole corpus into the browser. Run from the
// grammar routes' server load, which means a bad example still fails the
// prerender — the same guarantee, on the server side of the line.
import { loadTexts, type Morph } from './corpus';
import { CONCEPTS } from './grammar';

let checked = false;

// A concept page teaches one morphological fact, and its examples are meant
// to show that fact. Until now nothing said so: the guard checked that a
// word existed and that its form appeared in the phrase, which a genitive
// standing under the dative page would have passed. The corpus already
// records the fact, so the page can be held to it.
//
// `appositio` is deliberately absent: apposition is agreement between two
// words, not a value one word carries, and its examples run through four
// different cases on purpose.
const TAUGHT: Record<string, [keyof Morph, string]> = {
	nominativus: ['case', 'nom'],
	genetivus: ['case', 'gen'],
	dativus: ['case', 'dat'],
	accusativus: ['case', 'acc'],
	ablativus: ['case', 'abl'],
	vocativus: ['case', 'voc'],
	coniunctivus: ['mood', 'subj'],
	imperativus: ['mood', 'imp'],
	deponens: ['voice', 'dep']
};

/** Every example must point at a real word whose form appears in its phrase. */
export async function assertExamplesResolve(): Promise<void> {
	if (checked) return;
	const texts = await loadTexts(
		CONCEPTS.flatMap((concept) => concept.examples.map((e) => e.textKey))
	);
	for (const c of CONCEPTS) {
		for (const ex of c.examples) {
			const entry = texts[ex.textKey];
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
			const taught = TAUGHT[c.id];
			if (taught && word.morph[taught[0]] !== taught[1]) {
				throw new Error(
					`grammar: ${c.id}: ${word.form} (${ex.wordId} in ${ex.textKey}) is tagged ` +
						`${taught[0]}=${JSON.stringify(word.morph[taught[0]])}, not ${taught[1]}`
				);
			}
		}
	}
	checked = true;
}
