// The landing's specimen: the verse the motto comes from (Ps 118, 34),
// in the same document shape every corpus text has, so the landing can
// render it through the app's own TextBody — the same ruby, the same
// raised initial, the same translation slot — instead of imitating them.
//
// This is landing content, not corpus data: the verse has not yet been
// through the witness-and-collation gauntlet (the He stanza is decided,
// queued work), so it lives here as editorial matter, and moves into the
// corpus when the stanza does. The glosses adapt to the target language
// as the book's glosses do — the first et is consecutive (an imperative
// answered by a future), which Polish renders "a", not "i"; so Wujek:
// "Daj mi zrozumienie, a będę się badał…". The second joins two futures
// and stays "i". illam points back at legem, rendered by the Polish
// antecedent (Prawo): "go".
import type { GlossDocument, TextDocument } from '$lib/corpus';
import type { Lang } from '$lib/i18n';
import { bindProse } from '$lib/polish';

const EDITORIAL = { confidence: 'medium', sources: ['editorial'], review: 'pending' };

export const SPECIMEN_DOC: TextDocument = {
	schema_version: '0.9.0',
	id: 'landing.da-mihi-intellectum',
	title: 'Da mihi intellectum',
	status: 'working',
	analysis_defaults: EDITORIAL,
	segments: [
		{
			id: 's01',
			type: 'verse',
			words: [
				{ id: 'w001', form: 'Da', lemma: 'do', morph: { pos: 'verb' } },
				{ id: 'w002', form: 'mihi', lemma: 'ego', morph: { pos: 'pron' } },
				{
					id: 'w003',
					form: 'intellectum',
					post: ',',
					lemma: 'intellectus',
					morph: { pos: 'noun' }
				},
				{ id: 'w004', form: 'et', lemma: 'et', morph: { pos: 'conj' } },
				{ id: 'w005', form: 'scrutabor', lemma: 'scrutor', morph: { pos: 'verb' } },
				{ id: 'w006', form: 'legem', lemma: 'lex', morph: { pos: 'noun' } },
				{ id: 'w007', form: 'tuam', post: ',', lemma: 'tuus', morph: { pos: 'adj' } },
				{ id: 'w008', form: 'et', lemma: 'et', morph: { pos: 'conj' } },
				{ id: 'w009', form: 'custodiam', lemma: 'custodio', morph: { pos: 'verb' } },
				{ id: 'w010', form: 'illam', lemma: 'ille', morph: { pos: 'pron' } },
				{ id: 'w011', form: 'in', lemma: 'in', morph: { pos: 'prep' } },
				{ id: 'w012', form: 'toto', lemma: 'totus', morph: { pos: 'adj' } },
				{ id: 'w013', form: 'corde', lemma: 'cor', morph: { pos: 'noun' } },
				{ id: 'w014', form: 'meo', post: '.', lemma: 'meus', morph: { pos: 'adj' } }
			]
		}
	]
};

const GLOSSES: Record<Lang, { words: string[]; translation: string }> = {
	pl: {
		words: [
			'daj',
			'mnie',
			'zrozumienie',
			'a',
			'będę zgłębiał',
			'prawo',
			'twoje',
			'i',
			'będę strzegł',
			'go',
			'w',
			'całym',
			'sercu',
			'moim'
		],
		translation: 'Daj mi zrozumienie, a będę zgłębiał Twoje Prawo i strzegł go całym sercem.'
	},
	en: {
		words: [
			'give',
			'to me',
			'understanding',
			'and',
			'I will search',
			'law',
			'your',
			'and',
			'I will keep',
			'it',
			'in',
			'whole',
			'heart',
			'my'
		],
		translation:
			'Give me understanding, and I will search your law, and I will keep it with my whole heart.'
	}
};

function glossDoc(lang: Lang): GlossDocument {
	const { words, translation } = GLOSSES[lang];
	const doc: GlossDocument = {
		schema_version: '0.9.0',
		text: SPECIMEN_DOC.id,
		lang,
		status: 'working',
		analysis_defaults: EDITORIAL,
		segments: { s01: { translation } },
		words: Object.fromEntries(
			(SPECIMEN_DOC.segments[0].words ?? []).map((w, i) => [w.id, { gloss: words[i] }])
		)
	};
	return lang === 'pl' ? bindProse(doc) : doc;
}

export const SPECIMEN_GLOSS: Record<Lang, GlossDocument> = {
	pl: glossDoc('pl'),
	en: glossDoc('en')
};
