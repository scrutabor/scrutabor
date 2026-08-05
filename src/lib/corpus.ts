// Corpus access: a vendored snapshot of the scrutabor-corpus data (the
// two-layer format documented in that repo's SCHEMA.md). Once the corpus
// build publishes versioned JSON artifacts, these imports switch to
// downloaded packages and the snapshot goes away.
import confiteorText from './data/confiteor.json';
import confiteorPl from './data/confiteor.pl.json';
import confiteorEn from './data/confiteor.en.json';
import paterText from './data/pater-noster.json';
import paterPl from './data/pater-noster.pl.json';
import paterEn from './data/pater-noster.en.json';
import aveText from './data/ave-maria.json';
import avePl from './data/ave-maria.pl.json';
import aveEn from './data/ave-maria.en.json';
import gloriaText from './data/gloria-patri.json';
import gloriaPl from './data/gloria-patri.pl.json';
import gloriaEn from './data/gloria-patri.en.json';
import gloriaExcText from './data/gloria.json';
import gloriaExcPl from './data/gloria.pl.json';
import gloriaExcEn from './data/gloria.en.json';
import credoText from './data/credo.json';
import credoPl from './data/credo.pl.json';
import credoEn from './data/credo.en.json';
import sanctusText from './data/sanctus.json';
import sanctusPl from './data/sanctus.pl.json';
import sanctusEn from './data/sanctus.en.json';
import agnusText from './data/agnus-dei.json';
import agnusPl from './data/agnus-dei.pl.json';
import agnusEn from './data/agnus-dei.en.json';
import lexiconLemmata from './data/lexicon.json';
import lexiconPl from './data/lexicon.pl.json';
import lexiconEn from './data/lexicon.en.json';
import type { Lang } from './i18n';

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

export interface Word {
	id: string;
	form: string;
	post?: string;
	lemma: string;
	morph: Morph;
	analysis?: Analysis;
}

export interface Segment {
	id: string;
	type: 'verse' | 'rubric';
	text?: string;
	words?: Word[];
	analysis?: Analysis;
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
	analysis?: Analysis;
}

export interface GlossDocument {
	schema_version: string;
	text: string;
	lang: string;
	status: string;
	/** One-paragraph introduction (schema 0.8.0) — collapsed by default. */
	about?: string;
	analysis_defaults: Analysis;
	segments: Record<string, { translation?: string; narrative?: string }>;
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
		pl: lexiconPl.entries as Record<string, SenseEntry>,
		en: lexiconEn.entries as Record<string, SenseEntry>
	}
};

const entry = (text: unknown, pl: unknown, en: unknown): TextEntry => ({
	text: text as TextDocument,
	glosses: { pl: pl as GlossDocument, en: en as GlossDocument }
});

/** Keyed by `category/slug`, matching the reading route params. */
export const TEXTS: Record<string, TextEntry> = {
	'ordinarium/confiteor': entry(confiteorText, confiteorPl, confiteorEn),
	'ordinarium/gloria': entry(gloriaExcText, gloriaExcPl, gloriaExcEn),
	'ordinarium/credo': entry(credoText, credoPl, credoEn),
	'ordinarium/sanctus': entry(sanctusText, sanctusPl, sanctusEn),
	'ordinarium/agnus-dei': entry(agnusText, agnusPl, agnusEn),
	'orationes/pater-noster': entry(paterText, paterPl, paterEn),
	'orationes/ave-maria': entry(aveText, avePl, aveEn),
	'orationes/gloria-patri': entry(gloriaText, gloriaPl, gloriaEn)
};
