// Corpus access: a vendored snapshot of the scrutabor-corpus data (the
// two-layer format documented in that repo's SCHEMA.md), copied in by
// scripts/vendor-corpus.mjs. Once the corpus build publishes versioned
// JSON artifacts, this switches to downloaded packages and the snapshot
// goes away.
//
// The index is built from the files rather than written out by hand:
// every text names its own id, and a hand-kept list of 160 imports beside
// 160 files is a list that drifts. Server-side only — the reading routes
// load through +page.server.ts, so none of this reaches the browser.
import lexiconLemmata from './data/lexicon.json';
import lexiconPl from './data/lexicon.pl.json';
import lexiconEn from './data/lexicon.en.json';
import type { Lang } from './i18n';
import { bindProse } from './polish';

export interface Morph {
	pos: string;
	case?: string;
	number?: string;
	gender?: string;
	person?: number;
	tense?: string;
	mood?: string;
	voice?: string;
	degree?: string;
	decl?: number;
	conj?: number;
	governs?: string;
}

export interface Analysis {
	confidence: string;
	sources: string[];
	review: string;
}

/** A reader-facing source for one exact prose unit (corpus schema 0.11.0). */
export interface Citation {
	title: string;
	locator: string;
	url?: string;
}

export interface Word {
	id: string;
	form: string;
	post?: string;
	lemma: string;
	morph: Morph;
	analysis?: Analysis;
}

/** Who says a line. Absent means the sources have not been read for it
 * yet (corpus SCHEMA.md 0.9.0) — which must be rendered as unmarked, not
 * guessed at. */
export type Speaker = 'sacerdos' | 'minister' | 'populus' | 'omnes' | 'schola';

/** How loudly: aloud, raised-but-not-full, silent, sung. */
export type Voice = 'clara' | 'submissa' | 'secreto' | 'cantus';

/** The two forms of Mass the 1958 instruction grades apart: `lecta` the low
 * Mass (its n. 31), `cantu` the sung Mass (n. 25, extended to the Missa
 * cantata by n. 26 — the form a parish keeps on Sundays). They are not the
 * same event and the people do not have the same parts in them. */
export type MassForm = 'cantu' | 'lecta';

/** Who among the FAITHFUL says this line, and on whose authority — which is
 * a different question from `speaker`, whom the Missale charges with it.
 * `gradus` is the degree of participation (1-4), absent where the law grants
 * a part without grading it. Corpus SCHEMA.md 0.10.0. */
export interface Participation {
	gradus?: number;
	source: string;
}

export interface Segment {
	id: string;
	type: 'verse' | 'rubric';
	speaker?: Speaker;
	voice?: Voice;
	text?: string;
	words?: Word[];
	analysis?: Analysis;
	participation?: Partial<Record<MassForm, Participation>>;
}

export interface TextDocument {
	schema_version: string;
	id: string;
	title: string;
	status: string;
	analysis_defaults: Analysis;
	/** Word-token default (schema 0.7.0); segments never read it.
	 * Resolution: word.analysis ?? analysis_defaults_words ?? analysis_defaults. */
	analysis_defaults_words?: Analysis;
	segments: Segment[];
}

export interface WordGloss {
	gloss: string;
	// Contextual-only and OPTIONAL since corpus schema 0.5.0 — the parse line
	// and the lexicon carry everything else.
	function?: string;
	function_citations?: Citation[];
	analysis?: Analysis;
}

export interface SegmentGloss {
	translation?: string;
	narrative?: string;
	narrative_citations?: Citation[];
}

export interface GlossDocument {
	schema_version: string;
	text: string;
	lang: string;
	status: string;
	/** One-paragraph introduction (schema 0.8.0) — collapsed by default. */
	about?: string;
	about_citations?: Citation[];
	analysis_defaults: Analysis;
	segments: Record<string, SegmentGloss>;
	words: Record<string, WordGloss>;
}

export interface TextEntry {
	text: TextDocument;
	glosses: Record<Lang, GlossDocument>;
}

// Lexicon: the per-lemma layer (corpus SCHEMA.md 0.5.0). `head` is the
// reader-facing dictionary head in liturgical orthography; senses live in
// one file per language.
export interface LemmaEntry {
	head: string;
	pos: string;
	gender?: string;
	gender_pl?: string;
	decl?: number;
	conj?: number;
	analysis?: Analysis;
}

export interface SenseEntry {
	senses: string[];
	note?: string;
	note_citations?: Citation[];
	// Target-language words genuinely derived from this lemma — learner
	// memory hooks (corpus SCHEMA.md 0.6.0).
	derivatives?: string[];
	analysis?: Analysis;
}

export interface Lexicon {
	lemmata: Record<string, LemmaEntry>;
	senses: Record<Lang, Record<string, SenseEntry>>;
}

export const LEXICON: Lexicon = {
	lemmata: lexiconLemmata.entries as Record<string, LemmaEntry>,
	senses: {
		// Polish prose is bound on the way in (lib/polish); the corpus itself
		// stores ordinary spaces, and its own checks forbid anything else.
		pl: bindProse(lexiconPl.entries as Record<string, SenseEntry>),
		en: lexiconEn.entries as Record<string, SenseEntry>
	}
};

/**
 * The lexicon entries these texts can ask about, and no others. Every page
 * that shows words does this — the reading route for one text, the ordo
 * movement for a dozen — and it is the whole reason the browser never
 * receives the dictionary (decisions #27). One copy, so that a page cannot
 * quietly ship more of it than the others.
 */
export function narrowLexicon(
	docs: Iterable<TextDocument>,
	lang: Lang
): { lemmata: Record<string, LemmaEntry>; senses: Record<string, SenseEntry> } {
	const lemmata: Record<string, LemmaEntry> = {};
	const senses: Record<string, SenseEntry> = {};
	for (const doc of docs) {
		for (const seg of doc.segments) {
			for (const w of seg.words ?? []) {
				if (LEXICON.lemmata[w.lemma]) lemmata[w.lemma] = LEXICON.lemmata[w.lemma];
				if (LEXICON.senses[lang][w.lemma]) senses[w.lemma] = LEXICON.senses[lang][w.lemma];
			}
		}
	}
	return { lemmata, senses };
}

const entry = (text: unknown, pl: unknown, en: unknown): TextEntry => ({
	text: text as TextDocument,
	glosses: { pl: bindProse(pl as GlossDocument), en: en as GlossDocument }
});

/**
 * Keyed by `category/slug`, matching the reading route params — derived
 * from each document's own id (`ordinarium.pater-noster`), so vendoring a
 * text is a file copy and nothing else.
 */
export const TEXTS: Record<string, TextEntry> = buildIndex();

function buildIndex(): Record<string, TextEntry> {
	const files = import.meta.glob('./data/*.json', { eager: true }) as Record<
		string,
		{ default: unknown }
	>;
	const texts: Record<string, TextEntry> = {};
	for (const [path, module] of Object.entries(files)) {
		const name = path.slice('./data/'.length, -'.json'.length);
		// glosses (id.pl / id.en) and the three lexicon files are not texts
		if (name.startsWith('lexicon') || /\.(pl|en)$/.test(name)) continue;
		const pl = files[`./data/${name}.pl.json`];
		const en = files[`./data/${name}.en.json`];
		if (!pl || !en) throw new Error(`${name} is missing a gloss — re-run vendor-corpus`);
		texts[name.replace('.', '/')] = entry(module.default, pl.default, en.default);
	}
	return texts;
}
