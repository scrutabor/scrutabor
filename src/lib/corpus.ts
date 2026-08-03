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
	segments: Segment[];
}

export interface WordGloss {
	gloss: string;
	function: string;
	analysis?: Analysis;
}

export interface GlossDocument {
	schema_version: string;
	text: string;
	lang: string;
	status: string;
	analysis_defaults: Analysis;
	segments: Record<string, { translation?: string; narrative?: string }>;
	words: Record<string, WordGloss>;
}

export interface TextEntry {
	text: TextDocument;
	glosses: Record<Lang, GlossDocument>;
}

const entry = (text: unknown, pl: unknown, en: unknown): TextEntry => ({
	text: text as TextDocument,
	glosses: { pl: pl as GlossDocument, en: en as GlossDocument }
});

/** Keyed by `category/slug`, matching the reading route params. */
export const TEXTS: Record<string, TextEntry> = {
	'ordinarium/confiteor': entry(confiteorText, confiteorPl, confiteorEn),
	'orationes/pater-noster': entry(paterText, paterPl, paterEn),
	'orationes/ave-maria': entry(aveText, avePl, aveEn),
	'orationes/gloria-patri': entry(gloriaText, gloriaPl, gloriaEn)
};
