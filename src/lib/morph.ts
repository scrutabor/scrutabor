// Renders the language-neutral morph object as a reader-facing description.
// The corpus stores enums (SCHEMA.md); every gloss language brings its own
// label set here.
import type { Analysis, Morph } from './corpus';
import { bindOrphans } from './polish';
import type { Lang } from './i18n';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th'];

interface MorphLabels {
	pos: Record<string, string>;
	case: Record<string, string>;
	number: Record<string, string>;
	gender: Record<string, string>;
	tense: Record<string, string>;
	mood: Record<string, string>;
	voice: Record<string, string>;
	degree: Record<string, string>;
	person: (p: number) => string;
	decl: (d: number) => string;
	conj: (c: number) => string;
	prep: (governs: string | undefined) => string;
	/** Said of a verb whose form does not settle its tense or mood. */
	undecided: string;
}

const LABELS: Record<Lang, MorphLabels> = {
	pl: {
		pos: {
			verb: 'czasownik',
			noun: 'rzeczownik',
			adj: 'przymiotnik',
			pron: 'zaimek',
			adv: 'przysłówek',
			conj: 'spójnik',
			prep: 'przyimek',
			intj: 'wykrzyknik (nieodmienny)'
		},
		case: {
			nom: 'mianownik',
			gen: 'dopełniacz',
			dat: 'celownik',
			acc: 'biernik',
			abl: 'ablativus',
			voc: 'wołacz'
		},
		number: { sg: 'l.\u00a0poj.', pl: 'l.\u00a0mn.' },
		gender: { m: 'r.\u00a0męski', f: 'r.\u00a0żeński', n: 'r.\u00a0nijaki' },
		tense: {
			pres: 'czas teraźniejszy',
			impf: 'imperfectum',
			fut: 'czas przyszły',
			perf: 'perfectum',
			plup: 'plusquamperfectum',
			futperf: 'futurum exactum'
		},
		mood: {
			ind: 'tryb oznajmujący',
			subj: 'tryb łączący',
			imp: 'tryb rozkazujący',
			inf: 'bezokolicznik',
			part: 'imiesłów'
		},
		voice: {
			act: 'strona czynna',
			pass: 'strona bierna',
			dep: 'deponens (forma bierna, znaczenie czynne)'
		},
		degree: { comp: 'stopień wyższy', sup: 'stopień najwyższy' },
		person: (p) => `${p}.\u00a0os.`,
		decl: (d) => `deklinacja\u00a0${ROMAN[d - 1]}`,
		conj: (c) => `koniugacja\u00a0${ROMAN[c - 1]}`,
		prep: (governs) => `przyimek (z ${governs === 'acc' ? 'biernikiem' : 'ablativem'})`,
		undecided: 'forma niejednoznaczna'
	},
	en: {
		pos: {
			verb: 'verb',
			noun: 'noun',
			adj: 'adjective',
			pron: 'pronoun',
			adv: 'adverb',
			conj: 'conjunction',
			prep: 'preposition',
			intj: 'interjection (indeclinable)'
		},
		case: {
			nom: 'nominative',
			gen: 'genitive',
			dat: 'dative',
			acc: 'accusative',
			abl: 'ablative',
			voc: 'vocative'
		},
		number: { sg: 'singular', pl: 'plural' },
		gender: { m: 'masculine', f: 'feminine', n: 'neuter' },
		tense: {
			pres: 'present',
			impf: 'imperfect',
			fut: 'future',
			perf: 'perfect',
			plup: 'pluperfect',
			futperf: 'future perfect'
		},
		mood: {
			ind: 'indicative',
			subj: 'subjunctive',
			imp: 'imperative',
			inf: 'infinitive',
			part: 'participle'
		},
		voice: {
			act: 'active',
			pass: 'passive',
			dep: 'deponent (passive form, active meaning)'
		},
		degree: { comp: 'comparative', sup: 'superlative' },
		person: (p) => `${ORDINAL[p - 1]}\u00a0person`,
		decl: (d) => `${ORDINAL[d - 1]}\u00a0declension`,
		conj: (c) => `${ORDINAL[c - 1]}\u00a0conjugation`,
		prep: (governs) => `preposition (with the ${governs === 'acc' ? 'accusative' : 'ablative'})`,
		undecided: 'form undecided'
	}
};

// Dictionary gender marks are international Latin abbreviations
// (masculinum/femininum/neutrum) — the same in every gloss language.
export const GENDER_MARK: Record<string, string> = { m: 'm.', f: 'f.', n: 'n.' };

// Lemma-level grammar line for the lemma page: part of speech plus the
// paradigm facts the lexicon carries (no token, so no case/number here).
export function describeLemma(
	e: { pos: string; decl?: number; conj?: number },
	lang: Lang
): string {
	const t = LABELS[lang];
	const parts = [t.pos[e.pos] ?? e.pos];
	if (e.decl) parts.push(t.decl(e.decl));
	if (e.conj) parts.push(t.conj(e.conj));
	const line = parts.join(', ');
	return lang === 'pl' ? bindOrphans(line) : line;
}

// A parse-line segment; `concept` names a grammar-concept page the term
// links to (/{lang}/grammatica/{concept}).
export interface MorphPart {
	text: string;
	concept?: string;
}

const CASE_CONCEPT: Record<string, string> = {
	nom: 'nominativus',
	gen: 'genetivus',
	dat: 'dativus',
	acc: 'accusativus',
	abl: 'ablativus',
	voc: 'vocativus'
};

const MOOD_CONCEPT: Record<string, string> = { subj: 'coniunctivus', imp: 'imperativus' };

export function describeMorphParts(m: Morph, lang: Lang): MorphPart[] {
	const t = LABELS[lang];
	const pos = t.pos[m.pos] ?? m.pos;
	// Some labels are computed rather than looked up ("przyimek (z ablativem)"),
	// so Polish one-letter binding has to happen here, where the text is made.
	const bind = (part: MorphPart): MorphPart =>
		lang === 'pl' ? { ...part, text: bindOrphans(part.text) } : part;

	if (m.pos === 'prep') return [bind({ text: t.prep(m.governs) })];
	if (m.pos === 'adv' || m.pos === 'conj' || m.pos === 'intj') return [bind({ text: pos })];

	const parts: MorphPart[] = [];
	if (m.pos === 'verb' && m.mood === 'part') {
		// Participles read as verbal adjectives: name the form first, then
		// its verbal facts (tense, voice), then the nominal agreement.
		parts.push({ text: t.mood.part });
		if (m.tense) parts.push({ text: t.tense[m.tense] ?? m.tense });
		if (m.voice)
			parts.push({
				text: t.voice[m.voice] ?? m.voice,
				concept: m.voice === 'dep' ? 'deponens' : undefined
			});
		if (m.case) parts.push({ text: t.case[m.case] ?? m.case, concept: CASE_CONCEPT[m.case] });
		if (m.number) parts.push({ text: t.number[m.number] ?? m.number });
		if (m.gender) parts.push({ text: t.gender[m.gender] ?? m.gender });
		if (m.conj) parts.push({ text: t.conj(m.conj) });
	} else if (m.pos === 'verb') {
		if (m.person) parts.push({ text: t.person(m.person) });
		if (m.number) parts.push({ text: t.number[m.number] ?? m.number });
		if (m.tense) parts.push({ text: t.tense[m.tense] ?? m.tense });
		if (m.mood) parts.push({ text: t.mood[m.mood] ?? m.mood, concept: MOOD_CONCEPT[m.mood] });
		// A verb with neither tense nor mood is not an oversight: the form
		// admits more than one and nothing in the sentence decides
		// (retríbuam — future indicative or deliberative subjunctive?). Say
		// so, or the line reads as a parse we forgot to finish. The word's
		// own note carries the argument.
		if (!m.tense && !m.mood) parts.push({ text: t.undecided });
		if (m.voice)
			parts.push({
				text: t.voice[m.voice] ?? m.voice,
				concept: m.voice === 'dep' ? 'deponens' : undefined
			});
		if (m.conj) parts.push({ text: t.conj(m.conj) });
	} else {
		if (m.degree) parts.push({ text: t.degree[m.degree] ?? m.degree });
		if (m.case) parts.push({ text: t.case[m.case] ?? m.case, concept: CASE_CONCEPT[m.case] });
		if (m.number) parts.push({ text: t.number[m.number] ?? m.number });
		if (m.gender) parts.push({ text: t.gender[m.gender] ?? m.gender });
		if (m.decl) parts.push({ text: t.decl(m.decl) });
	}

	if (parts.length === 0) return [bind({ text: pos })];
	const out: MorphPart[] = [bind({ text: `${pos} — ` })];
	parts.forEach((p, i) => {
		if (i > 0) out.push({ text: ', ' });
		out.push(bind(p));
	});
	return out;
}

export function describeMorph(m: Morph, lang: Lang): string {
	return describeMorphParts(m, lang)
		.map((p) => p.text)
		.join('');
}

// `sources` names the ANALYZERS that confirm a parse, and it sits three lines
// above the bibliographic `sourcesLabel` of a source note (SourceNotes). One
// word for both made the panel read as if Whitaker's had written the citation,
// so this line says what it is: a confirmation, not a reference.
const ANALYSIS_LABELS: Record<
	Lang,
	{ confidence: string; sources: string; values: Record<string, string> }
> = {
	pl: {
		confidence: 'pewność',
		sources: 'potwierdzenie',
		values: {
			high: 'wysoka',
			medium: 'średnia',
			low: 'niska',
			pending: 'do przeglądu',
			accepted: 'zaakceptowane',
			disputed: 'sporne',
			editorial: 'opracowanie',
			whitakers: 'Whitaker',
			collatinus: 'Collatinus',
			expert: 'ekspert'
		}
	},
	en: {
		confidence: 'confidence',
		sources: 'confirmed by',
		values: {
			high: 'high',
			medium: 'medium',
			low: 'low',
			pending: 'awaiting review',
			accepted: 'accepted',
			disputed: 'disputed',
			editorial: 'editorial',
			whitakers: 'Whitaker',
			collatinus: 'Collatinus',
			expert: 'expert'
		}
	}
};

// Where a source id leads: the analyzers to their projects, editorial
// to the edition page (per-language). Witness ids and future sources
// stay plain text.
const SOURCE_LINKS: Record<string, string> = {
	whitakers: 'https://github.com/mk270/whitakers-words',
	collatinus: 'https://outils.biblissima.fr/en/collatinus/'
};

export interface AnalysisPart {
	text: string;
	href?: string;
	external?: boolean;
}

export function describeAnalysisParts(a: Analysis, lang: Lang): AnalysisPart[] {
	const t = ANALYSIS_LABELS[lang];
	const confidence = t.values[a.confidence] ?? a.confidence;
	const review = t.values[a.review] ?? a.review;
	const parts: AnalysisPart[] = [
		{ text: `${t.confidence}: ${confidence} · ${review} · ${t.sources}: ` }
	];
	a.sources.forEach((s, i) => {
		if (i > 0) parts.push({ text: ', ' });
		const text = t.values[s] ?? s;
		if (s === 'editorial') parts.push({ text, href: `/app/${lang}/editio` });
		else if (SOURCE_LINKS[s]) parts.push({ text, href: SOURCE_LINKS[s], external: true });
		else parts.push({ text });
	});
	return parts;
}

export function describeAnalysis(a: Analysis, lang: Lang): string {
	return describeAnalysisParts(a, lang)
		.map((p) => p.text)
		.join('');
}
