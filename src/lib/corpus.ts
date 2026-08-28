// The reader edition is a neutral base plus independently loadable language
// packs. A reading route imports one base text, the selected language's text,
// and that language's lexicon/citation tables. No other language crosses the
// loader boundary.
import analysisTable from './data/tables/analysis.json';
import sharedCitationTable from './data/tables/citations.json';
import parseTable from './data/tables/morphology.json';
import headsData from './data/lexicon/heads.json';
import { LANGS, type Lang } from './i18n';
import { bindProse } from './polish';
import { remember } from './remember';
import {
	ROOT_MANIFEST as manifest,
	TEXT_KEYS,
	TEXT_METADATA,
	hasText,
	languageResourcePaths,
	languageTextEntries,
	languageTextMetadataFor,
	textKeysFor,
	textMetadataFor
} from './corpus-metadata';
export {
	TEXT_KEYS,
	TEXT_METADATA,
	hasText,
	languageConcordancePath,
	languageTextMetadataFor,
	textKeysFor,
	textMetadataFor,
	type LanguageTextMetadata,
	type TextMetadata
} from './corpus-metadata';

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

export interface Citation {
	title: string;
	locator: string;
	url?: string;
}

export type TranslationRelationship = 'exact' | 'normalized' | 'revised' | 'traditional-composite';

export interface Word {
	id: string;
	form: string;
	post?: string;
	lemma: string;
	morph: Morph;
	head?: string;
	substantive?: boolean;
	analysis?: Analysis;
}

export type Speaker = 'sacerdos' | 'ductor' | 'minister' | 'populus' | 'omnes' | 'schola';
export type Voice = 'clara' | 'submissa' | 'secreto' | 'cantus';
export type MassForm = 'cantu' | 'lecta';

export interface Participation {
	gradus?: number;
	source: string;
	conditional?: true;
}

export interface Delivery {
	speaker?: Speaker;
	voice?: Voice;
}

export interface Segment {
	id: string;
	type: 'verse' | 'rubric';
	verse?: number;
	speaker?: Speaker;
	voice?: Voice;
	delivery?: Partial<Record<MassForm, Delivery>>;
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
	analysis_defaults_words?: Analysis;
	segments: Segment[];
	/** Retired segment ids and the live segment carrying each one's content. */
	retired_segments?: Record<string, string>;
	/** Retired word ids and the segment carrying their former context. */
	retired_words?: Record<string, string>;
}

export interface WordGloss {
	gloss: string;
	explanation?: string;
	explanation_citations?: Citation[];
	note?: string;
}

export interface SegmentGloss {
	translation?: string;
	translation_citations?: Citation[];
	translation_relationship?: TranslationRelationship;
	narrative?: string;
	narrative_citations?: Citation[];
}

export interface GlossDocument {
	schema_version: string;
	text: string;
	lang: Lang;
	status: string;
	about?: string;
	about_citations?: Citation[];
	analysis_defaults: Analysis;
	segments: Record<string, SegmentGloss>;
	words: Record<string, WordGloss>;
}

export interface TextEntry {
	text: TextDocument;
	gloss: GlossDocument;
}

export interface LemmaEntry {
	head: string;
	pos: string;
	gender?: string;
	gender_pl?: string;
	decl?: number;
	conj?: number;
	analysis?: Analysis;
	localization?: { note: true; note_citations?: Citation[] };
}

export interface SenseEntry {
	senses: string[];
	note?: string;
	note_citations?: Citation[];
	derivatives?: string[];
	analysis?: Analysis;
}

type JsonModule = { default: unknown };
type JsonImport = () => Promise<JsonModule>;

const PARSES = parseTable as unknown as (Morph | null)[];
const ANALYSES = analysisTable as unknown as (Analysis | null)[];
const SHARED_CITATIONS = sharedCitationTable as unknown as (Citation | null)[];

function at<T>(table: (T | null)[], index: number, what: string): T {
	const hit = table[index];
	if (hit == null) throw new Error(`${what}[${index}] resolves to nothing — re-run vendor-corpus`);
	return hit;
}

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

interface CoreSegmentRow {
	id: string;
	type: 'verse' | 'rubric';
	an?: number;
	w?: WordCell[];
	ec?: Record<string, number[]>;
	nc?: number[];
	[key: string]: unknown;
}

interface CoreArtifact {
	id: string;
	st: string;
	ad: number;
	adw?: number;
	ac?: number[];
	rs?: Record<string, string>;
	rw?: Record<string, string>;
	seg: CoreSegmentRow[];
	[key: string]: unknown;
}

interface LanguageSegmentRow {
	id: string;
	g?: string[];
	ex?: Record<string, string>;
	nt?: Record<string, string>;
	tr?: string;
	tc?: number[];
	tb?: TranslationRelationship;
	nr?: string;
}

interface LanguageArtifact {
	id: string;
	language: Lang;
	about: string;
	seg: LanguageSegmentRow[];
}

function expandWord(cell: WordCell): Word {
	const word: Word = {
		id: cell.i,
		form: cell.f,
		lemma: cell.l,
		morph: at(PARSES, cell.m, 'parses')
	};
	if (cell.p) word.post = cell.p;
	if (cell.h) word.head = cell.h;
	if (cell.s) word.substantive = true;
	if (cell.a !== undefined) word.analysis = at(ANALYSES, cell.a, 'analyses');
	return word;
}

const CORE_ROW_KEYS = new Set(['w', 'ec', 'nc', 'an']);
const CORE_DOC_KEYS = new Set(['st', 'ad', 'adw', 'ac', 'seg', 'rs', 'rw']);

function expandCoreMetadata(artifact: CoreArtifact): Record<string, unknown> {
	const text: Record<string, unknown> = { schema_version: manifest.corpus_schema };
	for (const [key, value] of Object.entries(artifact))
		if (!CORE_DOC_KEYS.has(key)) text[key] = value;
	text.status = artifact.st;
	if (artifact.rs) text.retired_segments = artifact.rs;
	if (artifact.rw) text.retired_words = artifact.rw;
	text.analysis_defaults = at(ANALYSES, artifact.ad, 'analyses');
	if (artifact.adw !== undefined)
		text.analysis_defaults_words = at(ANALYSES, artifact.adw, 'analyses');
	return text;
}

function expandDocument(
	artifact: CoreArtifact,
	languageArtifact: LanguageArtifact,
	languageCitations: (Citation | null)[]
): TextEntry {
	const shared = (indices?: number[]) =>
		indices?.map((index) => at(SHARED_CITATIONS, index, 'shared citations'));
	const localized = (indices?: number[]) =>
		indices?.map((index) => at(languageCitations, index, `${languageArtifact.language} citations`));

	const text = expandCoreMetadata(artifact);

	const gloss: GlossDocument = {
		schema_version: manifest.corpus_schema,
		text: artifact.id,
		lang: languageArtifact.language,
		status: artifact.st,
		about: languageArtifact.about,
		about_citations: shared(artifact.ac),
		analysis_defaults: at(ANALYSES, artifact.ad, 'analyses'),
		segments: {},
		words: {}
	};
	const languageRows = new Map(languageArtifact.seg.map((row) => [row.id, row]));

	text.segments = artifact.seg.map((row) => {
		const languageRow = languageRows.get(row.id);
		if (!languageRow)
			throw new Error(`${artifact.id}:${row.id} is absent from ${languageArtifact.language}`);
		const segment: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(row))
			if (!CORE_ROW_KEYS.has(key)) segment[key] = value;
		if (row.an !== undefined) segment.analysis = at(ANALYSES, row.an, 'analyses');

		const segmentGloss: SegmentGloss = {};
		if (languageRow.tr) segmentGloss.translation = languageRow.tr;
		if (languageRow.tc) segmentGloss.translation_citations = localized(languageRow.tc);
		if (languageRow.tb) segmentGloss.translation_relationship = languageRow.tb;
		if (languageRow.nr) segmentGloss.narrative = languageRow.nr;
		if (row.nc) segmentGloss.narrative_citations = shared(row.nc);
		if (Object.keys(segmentGloss).length) gloss.segments[row.id] = segmentGloss;

		if (row.w) {
			if (!languageRow.g || languageRow.g.length !== row.w.length) {
				throw new Error(
					`${artifact.id}:${row.id} has incomplete ${languageArtifact.language} glosses`
				);
			}
			segment.words = row.w.map((cell, position) => {
				const word = expandWord(cell);
				const entry: WordGloss = { gloss: languageRow.g![position] };
				if (languageRow.ex?.[cell.i]) entry.explanation = languageRow.ex[cell.i];
				if (languageRow.nt?.[cell.i]) entry.note = languageRow.nt[cell.i];
				if (row.ec?.[cell.i]) entry.explanation_citations = shared(row.ec[cell.i]);
				gloss.words[cell.i] = entry;
				return word;
			});
		}
		return segment;
	});

	return {
		text: text as unknown as TextDocument,
		gloss: (languageArtifact.language === 'pl' ? bindProse(gloss) : gloss) as GlossDocument
	};
}

export const LEXICON: { lemmata: Record<string, LemmaEntry> } = {
	lemmata: (headsData as unknown as { entries: Record<string, LemmaEntry> }).entries
};

const LANGUAGE_LEXICON_MODULES = import.meta.glob('./data/languages/*/lexicon.json') as Record<
	string,
	JsonImport
>;
const LANGUAGE_CITATION_MODULES = import.meta.glob('./data/languages/*/citations.json') as Record<
	string,
	JsonImport
>;
const LANGUAGE_RESOURCES = new Map<
	Lang,
	Promise<{ senses: Record<string, SenseEntry>; citations: (Citation | null)[] }>
>();

async function loadLanguageResources(language: Lang) {
	const paths = languageResourcePaths(language);
	const lexiconImport = LANGUAGE_LEXICON_MODULES[`./data/${paths.lexicon}`];
	const citationImport = LANGUAGE_CITATION_MODULES[`./data/${paths.citations}`];
	if (!lexiconImport || !citationImport) throw new Error(`${language} package is incomplete`);
	return remember(LANGUAGE_RESOURCES, language, () =>
		Promise.all([lexiconImport(), citationImport()]).then(([lexiconModule, citationModule]) => {
			const raw = (lexiconModule.default as { entries: Record<string, SenseEntry> }).entries;
			const senses = Object.fromEntries(
				Object.entries(raw).map(([lemma, value]) => {
					const entry = { ...value };
					const noteCitations = LEXICON.lemmata[lemma]?.localization?.note_citations;
					if (noteCitations) entry.note_citations = noteCitations;
					return [lemma, entry];
				})
			);
			return {
				senses: (language === 'pl' ? bindProse(senses) : senses) as Record<string, SenseEntry>,
				citations: citationModule.default as (Citation | null)[]
			};
		})
	);
}

export async function loadSenses(language: Lang): Promise<Record<string, SenseEntry>> {
	return (await loadLanguageResources(language)).senses;
}

export async function narrowLexicon(
	docs: Iterable<TextDocument>,
	language: Lang
): Promise<{ lemmata: Record<string, LemmaEntry>; senses: Record<string, SenseEntry> }> {
	const languageSenses = await loadSenses(language);
	const lemmata: Record<string, LemmaEntry> = {};
	const senses: Record<string, SenseEntry> = {};
	for (const doc of docs) {
		for (const segment of doc.segments) {
			for (const word of segment.words ?? []) {
				if (LEXICON.lemmata[word.lemma]) lemmata[word.lemma] = LEXICON.lemmata[word.lemma];
				if (languageSenses[word.lemma]) senses[word.lemma] = languageSenses[word.lemma];
			}
		}
	}
	return { lemmata, senses };
}

const CORE_MODULES = import.meta.glob('./data/texts/*/*.json') as Record<string, JsonImport>;
const LANGUAGE_TEXT_MODULES = import.meta.glob('./data/languages/*/texts/*/*.json') as Record<
	string,
	JsonImport
>;
const CORE_CACHE = new Map<string, Promise<CoreArtifact>>();
const TEXT_CACHE = new Map<string, Promise<TextEntry>>();

for (const entry of TEXT_METADATA) {
	if (!CORE_MODULES[`./data/${entry.path}`])
		throw new Error(`${entry.id} names an absent base text`);
}
for (const language of LANGS) {
	for (const entry of languageTextEntries(language)) {
		if (!LANGUAGE_TEXT_MODULES[`./data/${entry.path}`]) {
			throw new Error(`${language}:${entry.id} names an absent language text`);
		}
	}
}

async function loadCore(key: string): Promise<CoreArtifact | undefined> {
	const metadata = textMetadataFor(key);
	if (!metadata) return undefined;
	return remember(CORE_CACHE, key, () =>
		CORE_MODULES[`./data/${metadata.path}`]().then((module) => module.default as CoreArtifact)
	);
}

export async function loadCoreText(key: string): Promise<TextDocument | undefined> {
	const artifact = await loadCore(key);
	if (!artifact) return undefined;
	const text = expandCoreMetadata(artifact);
	text.segments = artifact.seg.map((row) => {
		const segment: Record<string, unknown> = {};
		for (const [name, value] of Object.entries(row))
			if (!CORE_ROW_KEYS.has(name)) segment[name] = value;
		if (row.an !== undefined) segment.analysis = at(ANALYSES, row.an, 'analyses');
		if (row.w) {
			segment.words = row.w.map(expandWord);
		}
		return segment;
	});
	return text as unknown as TextDocument;
}

export function loadedTextKeys(): string[] {
	return [...CORE_CACHE.keys()];
}

export function loadText(key: string, language: Lang): Promise<TextEntry | undefined> {
	const localizedMetadata = languageTextMetadataFor(key, language);
	if (!localizedMetadata) return Promise.resolve(undefined);
	const cacheKey = `${language}:${key}`;
	const languageImport = LANGUAGE_TEXT_MODULES[`./data/${localizedMetadata.path}`];
	return remember(TEXT_CACHE, cacheKey, () =>
		Promise.all([loadCore(key), languageImport(), loadLanguageResources(language)]).then(
			([base, localized, resources]) => {
				if (!base) throw new Error(`${key} has a language layer without a base text`);
				return expandDocument(base, localized.default as LanguageArtifact, resources.citations);
			}
		)
	);
}

export async function loadTexts(
	keys: Iterable<string>,
	language: Lang
): Promise<Record<string, TextEntry>> {
	const unique = [...new Set(keys)].filter((key) => hasText(key, language));
	const entries = await Promise.all(
		unique.map(async (key) => [key, await loadText(key, language)] as const)
	);
	return Object.fromEntries(entries.filter((entry): entry is [string, TextEntry] => !!entry[1]));
}

export async function loadCoreTexts(keys: Iterable<string>): Promise<Record<string, TextDocument>> {
	const unique = [...new Set(keys)].filter((key) => hasText(key));
	const entries = await Promise.all(
		unique.map(async (key) => [key, await loadCoreText(key)] as const)
	);
	return Object.fromEntries(entries.filter((entry): entry is [string, TextDocument] => !!entry[1]));
}

export function loadAllCoreTexts(): Promise<Record<string, TextDocument>> {
	return loadCoreTexts(TEXT_KEYS);
}

export function loadAllTexts(language: Lang): Promise<Record<string, TextEntry>> {
	return loadTexts(textKeysFor(language), language);
}
