// Corpus access: the READER EDITION of scrutabor-corpus, vendored by
// scripts/vendor-corpus.mjs from that repo's own `python build.py`.
//
// The corpus is authored to be read by a philologist in a diff — every
// editorial claim visible, the parse written out at each of 6,143 words. The
// reader edition is the same book with the apparatus left behind and the
// three repeated layers — parse, analysis, citation — replaced by indices
// into tables the whole corpus shares. It is 39% fewer bytes to parse and it
// puts 412 parse objects on the heap where the corpus has 6,143, because
// `expandDocument` hands out the table's own object rather than a copy.
//
// The index is built from the files rather than written out by hand: every
// text names its own id, and a hand-kept list of 111 imports beside 111 files
// is a list that drifts. Server-side only — the reading routes load through
// +page.server.ts, so none of this reaches the browser.
import manifest from './data/manifest.json';
import parseTable from './data/m.json';
import analysisTable from './data/a.json';
import citationTable from './data/c.json';
import lexicon from './data/lex.json';
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
	/** The word this one leans on (corpus SCHEMA.md). No component reads
	 * these two yet — they are expanded because `expandDocument` must stay
	 * the exact mirror of the corpus's own `expand()`, and a field the type
	 * cannot hold is how the word-level note went missing for a month. */
	head?: string;
	substantive?: boolean;
	analysis?: Analysis;
}

/** Who says a line. Absent means the sources have not been read for it
 * yet (corpus SCHEMA.md 0.9.0) — which must be rendered as unmarked, not
 * guessed at. */
export type Speaker = 'sacerdos' | 'ductor' | 'minister' | 'populus' | 'omnes' | 'schola';

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
	verse?: number;
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
	/** The editorial note on THIS word in THIS place — every disputed
	 * reading carries one naming the competing readings and which one
	 * this edition takes. A panel that says "disputed" without it ships
	 * the doubt and withholds the note of it. */
	note?: string;
	analysis?: Analysis;
}

export interface SegmentGloss {
	translation?: string;
	translation_citations?: Citation[];
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
	lemmata: lexicon.h as unknown as Record<string, LemmaEntry>,
	senses: {
		// Polish prose is bound on the way in (lib/polish); the corpus itself
		// stores ordinary spaces, and its own checks forbid anything else.
		pl: bindProse(lexicon.s.pl as unknown as Record<string, SenseEntry>),
		en: lexicon.s.en as unknown as Record<string, SenseEntry>
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

/**
 * The corpus-wide tables, and the point of the whole edition.
 *
 * Three layers repeat themselves hard enough to be worth addressing by index
 * rather than writing out — a few hundred parses carry all six thousand
 * words, a handful of analysis shapes carry every provenance claim, and one
 * citation table carries every reference. (Exact counts live in the vendored
 * data, not here: two earlier versions of this comment went stale.)
 * Expanding a text hands out the table's OWN object at every site, so the
 * sharing survives into the heap rather than ending at the file.
 */
const PARSES = parseTable as unknown as Morph[];
const ANALYSES = analysisTable as unknown as Analysis[];
const CITATIONS = citationTable as unknown as Citation[];

/** A table index that resolves to nothing is a vendoring defect — a stale
 * or truncated table beside newer documents — and has to fail HERE, at
 * module init on the build machine, not as a TypeError in the first word
 * panel a reader opens. The provenance test hashes the files; this is the
 * only check that they agree with each other. */
function at<T>(table: T[], index: number, what: string): T {
	const hit = table[index];
	if (hit === undefined) {
		throw new Error(`${what}[${index}] resolves to nothing — re-run vendor-corpus`);
	}
	return hit;
}

/** One artifact row: the emitter's short keys, spelled out once here. */
interface WordCell {
	i: string;
	f: string;
	l: string;
	p?: string;
	m: number;
	h?: string;
	s?: boolean;
	a?: number;
}
interface SegmentRow {
	id: string;
	type: 'verse' | 'rubric';
	an?: number;
	w?: WordCell[];
	g?: Record<Lang, string[]>;
	fn?: Record<Lang, Record<string, string>>;
	nt?: Record<Lang, Record<string, string>>;
	fc?: Record<Lang, Record<string, number[]>>;
	tr?: Record<Lang, string>;
	tc?: Record<Lang, number[]>;
	nr?: Record<Lang, string>;
	nc?: Record<Lang, number[]>;
	[key: string]: unknown;
}
interface Artifact {
	id: string;
	st: string;
	ad: number;
	adw?: number;
	about: Record<Lang, string>;
	ac?: Record<Lang, number[]>;
	seg: SegmentRow[];
	[key: string]: unknown;
}

const ROW_KEYS = new Set(['w', 'g', 'fn', 'nt', 'fc', 'tr', 'tc', 'nr', 'nc', 'an']);
const DOC_KEYS = new Set(['st', 'ad', 'adw', 'about', 'ac', 'seg']);
const LANGS: Lang[] = ['pl', 'en'];

/**
 * One artifact becomes the three documents the reading code reads.
 *
 * The mirror of `expand()` in the corpus's build_reader/emit.py, and it must
 * stay one: that function is what the corpus's own `verify()` runs over all
 * 111 texts to prove the edition lost nothing, so the shape this returns is
 * the shape the corpus has already checked itself against. A component that
 * asks for the Polish gloss of a word is right to keep asking for exactly
 * that, and does — the whole of the app's knowledge of two shapes is here.
 */
function expandDocument(artifact: Artifact): TextEntry {
	const cited = (indices?: number[]) => indices?.map((i) => at(CITATIONS, i, 'citations'));

	const text: Record<string, unknown> = { schema_version: manifest.corpus_schema };
	for (const [key, value] of Object.entries(artifact)) {
		if (!DOC_KEYS.has(key)) text[key] = value;
	}
	text.status = artifact.st;
	text.analysis_defaults = at(ANALYSES, artifact.ad, 'analyses');
	if (artifact.adw !== undefined)
		text.analysis_defaults_words = at(ANALYSES, artifact.adw, 'analyses');

	const layers = Object.fromEntries(
		LANGS.map((lang) => [
			lang,
			{
				schema_version: manifest.corpus_schema,
				text: artifact.id,
				lang,
				status: artifact.st,
				about: artifact.about[lang],
				about_citations: cited(artifact.ac?.[lang]),
				analysis_defaults: at(ANALYSES, artifact.ad, 'analyses'),
				segments: {} as Record<string, Record<string, unknown>>,
				words: {} as Record<string, Record<string, unknown>>
			}
		])
	) as Record<Lang, ReturnType<typeof Object.fromEntries> & Record<string, unknown>>;

	text.segments = artifact.seg.map((row) => {
		const segment: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(row)) {
			if (!ROW_KEYS.has(key)) segment[key] = value;
		}
		if (row.an !== undefined) segment.analysis = at(ANALYSES, row.an, 'analyses');

		for (const lang of LANGS) {
			const bucket: Record<string, unknown> = {};
			if (row.tr?.[lang]) bucket.translation = row.tr[lang];
			if (row.tc?.[lang]) bucket.translation_citations = cited(row.tc[lang]);
			if (row.nr?.[lang]) bucket.narrative = row.nr[lang];
			if (row.nc?.[lang]) bucket.narrative_citations = cited(row.nc[lang]);
			if (Object.keys(bucket).length) {
				(layers[lang].segments as Record<string, unknown>)[row.id] = bucket;
			}
		}

		if (row.w) {
			segment.words = row.w.map((cell, position) => {
				const word: Record<string, unknown> = { id: cell.i, form: cell.f, lemma: cell.l };
				if (cell.p) word.post = cell.p;
				word.morph = at(PARSES, cell.m, 'parses');
				if (cell.h) word.head = cell.h;
				if (cell.s) word.substantive = true;
				if (cell.a !== undefined) word.analysis = at(ANALYSES, cell.a, 'analyses');
				for (const lang of LANGS) {
					const entry: Record<string, unknown> = { gloss: row.g?.[lang]?.[position] ?? '' };
					const fn = row.fn?.[lang]?.[cell.i];
					if (fn) entry.function = fn;
					const note = row.nt?.[lang]?.[cell.i];
					if (note) entry.note = note;
					const cites = row.fc?.[lang]?.[cell.i];
					if (cites) entry.function_citations = cited(cites);
					(layers[lang].words as Record<string, unknown>)[cell.i] = entry;
				}
				return word;
			});
		}
		return segment;
	});

	return {
		text: text as unknown as TextDocument,
		glosses: {
			pl: bindProse(layers.pl) as unknown as GlossDocument,
			en: layers.en as unknown as GlossDocument
		}
	};
}

/**
 * Keyed by `category/slug`, matching the reading route params — derived
 * from each artifact's own id (`ordinarium.pater-noster`), so vendoring a
 * text is a file copy and nothing else.
 */
export const TEXTS: Record<string, TextEntry> = buildIndex();

function buildIndex(): Record<string, TextEntry> {
	const files = import.meta.glob('./data/t/*.json', { eager: true }) as Record<
		string,
		{ default: unknown }
	>;
	const texts: Record<string, TextEntry> = {};
	for (const [path, module] of Object.entries(files)) {
		const name = path.slice('./data/t/'.length, -'.json'.length);
		const artifact = module.default as Artifact;
		if (!artifact.seg) throw new Error(`${name} has no segments — re-run vendor-corpus`);
		texts[name.replace('.', '/')] = expandDocument(artifact);
	}
	if (Object.keys(texts).length !== manifest.texts.length) {
		throw new Error(
			`${Object.keys(texts).length} texts vendored, ${manifest.texts.length} in the manifest`
		);
	}
	return texts;
}
