// Corpus access: a vendored snapshot of the scrutabor-corpus data (the
// two-layer format documented in that repo's SCHEMA.md). Once the corpus
// build publishes versioned JSON artifacts, these imports switch to
// downloaded packages and the snapshot goes away.
import textJson from './data/confiteor.json';
import plJson from './data/confiteor.pl.json';
import enJson from './data/confiteor.en.json';
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

export const confiteorText = textJson as unknown as TextDocument;

export const confiteorGlosses: Record<Lang, GlossDocument> = {
	pl: plJson as unknown as GlossDocument,
	en: enJson as unknown as GlossDocument
};
