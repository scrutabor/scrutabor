// Renders the language-neutral morph object as a reader-facing description.
// The corpus stores enums (SCHEMA.md); every gloss language brings its own
// label set here.
import type { Analysis, Morph } from './corpus';
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
			prep: 'przyimek'
		},
		case: {
			nom: 'mianownik',
			gen: 'dopełniacz',
			dat: 'celownik',
			acc: 'biernik',
			abl: 'ablativus',
			voc: 'wołacz'
		},
		number: { sg: 'l. poj.', pl: 'l. mn.' },
		gender: { m: 'r. męski', f: 'r. żeński', n: 'r. nijaki' },
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
			inf: 'bezokolicznik'
		},
		voice: {
			act: 'strona czynna',
			pass: 'strona bierna',
			dep: 'deponens (forma bierna, znaczenie czynne)'
		},
		degree: { comp: 'stopień wyższy', sup: 'stopień najwyższy' },
		person: (p) => `${p}. os.`,
		decl: (d) => `deklinacja ${ROMAN[d - 1]}`,
		conj: (c) => `koniugacja ${ROMAN[c - 1]}`,
		prep: (governs) => `przyimek (z ${governs === 'acc' ? 'biernikiem' : 'ablativem'})`
	},
	en: {
		pos: {
			verb: 'verb',
			noun: 'noun',
			adj: 'adjective',
			pron: 'pronoun',
			adv: 'adverb',
			conj: 'conjunction',
			prep: 'preposition'
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
			inf: 'infinitive'
		},
		voice: {
			act: 'active',
			pass: 'passive',
			dep: 'deponent (passive form, active meaning)'
		},
		degree: { comp: 'comparative', sup: 'superlative' },
		person: (p) => `${ORDINAL[p - 1]} person`,
		decl: (d) => `${ORDINAL[d - 1]} declension`,
		conj: (c) => `${ORDINAL[c - 1]} conjugation`,
		prep: (governs) => `preposition (with the ${governs === 'acc' ? 'accusative' : 'ablative'})`
	}
};

export function describeMorph(m: Morph, lang: Lang): string {
	const t = LABELS[lang];
	const pos = t.pos[m.pos] ?? m.pos;

	if (m.pos === 'prep') return t.prep(m.governs);
	if (m.pos === 'adv' || m.pos === 'conj') return pos;

	const parts: string[] = [];
	if (m.pos === 'verb') {
		if (m.person) parts.push(t.person(m.person));
		if (m.number) parts.push(t.number[m.number] ?? m.number);
		if (m.tense) parts.push(t.tense[m.tense] ?? m.tense);
		if (m.mood) parts.push(t.mood[m.mood] ?? m.mood);
		if (m.voice) parts.push(t.voice[m.voice] ?? m.voice);
		if (m.conj) parts.push(t.conj(m.conj));
	} else {
		if (m.degree) parts.push(t.degree[m.degree] ?? m.degree);
		if (m.case) parts.push(t.case[m.case] ?? m.case);
		if (m.number) parts.push(t.number[m.number] ?? m.number);
		if (m.gender) parts.push(t.gender[m.gender] ?? m.gender);
		if (m.decl) parts.push(t.decl(m.decl));
	}
	return parts.length > 0 ? `${pos} — ${parts.join(', ')}` : pos;
}

const ANALYSIS_LABELS: Record<
	Lang,
	{ confidence: string; sources: string; values: Record<string, string> }
> = {
	pl: {
		confidence: 'pewność',
		sources: 'źródła',
		values: {
			high: 'wysoka',
			medium: 'średnia',
			low: 'niska',
			pending: 'do przeglądu',
			accepted: 'zaakceptowane',
			disputed: 'sporne',
			editorial: 'opracowanie',
			expert: 'ekspert'
		}
	},
	en: {
		confidence: 'confidence',
		sources: 'sources',
		values: {
			high: 'high',
			medium: 'medium',
			low: 'low',
			pending: 'awaiting review',
			accepted: 'accepted',
			disputed: 'disputed',
			editorial: 'editorial',
			expert: 'expert'
		}
	}
};

export function describeAnalysis(a: Analysis, lang: Lang): string {
	const t = ANALYSIS_LABELS[lang];
	const confidence = t.values[a.confidence] ?? a.confidence;
	const review = t.values[a.review] ?? a.review;
	const sources = a.sources.map((s) => t.values[s] ?? s).join(', ');
	return `${t.confidence}: ${confidence} · ${review} · ${t.sources}: ${sources}`;
}
