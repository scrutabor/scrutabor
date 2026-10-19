// Lightweight package boundaries. Catalogue and search-title code import this
// module without pulling morphology, citations, lexicon, or any text document
// into the first page of the book.
import manifestData from './data/manifest.json';
import formularyData from './data/formularies.json';
import metricsData from './data/metrics.json';
import { LANGS, type Lang } from './i18n';
import {
	validateOrdinaryPrescriptions,
	type OrdinaryPrescriptions
} from './ordinary-prescriptions';

export interface TextMetadata {
	id: string;
	path: string;
	title: string;
	evidence?: string;
}

export interface LanguageTextMetadata {
	id: string;
	path: string;
	title?: string;
	aliases?: string[];
	evidence?: string;
}

interface BibliographyResources {
	catalog: string;
	index: string;
}

interface LanguageManifest {
	schema_version: string;
	corpus_schema: string;
	language: Lang;
	direction: 'ltr' | 'rtl';
	texts: LanguageTextMetadata[];
	lexicon: string;
	citations: string;
	concordance: string;
	formularies: string;
	commemorationes: string;
	bibliography: BibliographyResources;
}

interface RootManifest {
	schema_version: string;
	corpus_schema: string;
	texts: TextMetadata[];
	languages: { id: Lang; direction: 'ltr' | 'rtl'; path: string }[];
	bibliography: BibliographyResources;
	base: { formularies: string; metrics: string; [resource: string]: string };
}

export interface CorpusMetrics {
	schema_version: string;
	texts: {
		total: number;
		proprium: number;
		words: number;
		verse_segments: number;
	};
	languages: Record<Lang, { texts: number }>;
	formularies: {
		total: number;
		observances: number;
		component_uses: number;
		unique_component_texts: number;
	};
}

export type ComponentCondition =
	| { weekday: 'sunday' | 'not-sunday' }
	| { season: 'paschale' | 'not-paschale' | 'post-septuagesimam' | 'not-post-septuagesimam' }
	| { use: 'votive-after-septuagesima' | 'votive-before-septuagesima-or-after-pentecost' };

export interface FormularyComponentMetadata {
	key: string;
	role: string;
	text: string;
	relation: 'proper' | 'shared' | 'reference';
	recension?: 'paschale' | 'non-paschale';
	condition?: ComponentCondition;
}

export interface FormularyMetadata {
	ordinary: OrdinaryPrescriptions;
	id: string;
	order: number;
	collection: string;
	season: string;
	observance: string;
	variant?: string;
	coverage?: 'partial';
	calendar: { key: string; default: boolean };
	title: string;
	components: FormularyComponentMetadata[];
}

interface FormularyCatalog {
	schema_version: string;
	formularies: FormularyMetadata[];
}

interface LanguageFormularyCatalog {
	schema_version: string;
	language: Lang;
	titles: { id: string; title: string }[];
}

interface LanguageCommemorationCatalog {
	schema_version: string;
	language: Lang;
	titles: { id: string; title: string }[];
}

type JsonModule = { default: unknown };

export const ROOT_MANIFEST = manifestData as unknown as RootManifest;
const LANGUAGE_MANIFEST_MODULES = import.meta.glob('./data/languages/*/manifest.json', {
	eager: true
}) as Record<string, JsonModule>;
const LANGUAGE_MANIFESTS = Object.fromEntries(
	ROOT_MANIFEST.languages.map(({ id, path }) => {
		const module = LANGUAGE_MANIFEST_MODULES[`./data/${path}`];
		if (!module) throw new Error(`${id} names ${path}, which was not vendored`);
		const languageManifest = module.default as LanguageManifest;
		if (languageManifest.language !== id)
			throw new Error(`${path} calls itself ${languageManifest.language}`);
		return [id, languageManifest];
	})
) as Record<Lang, LanguageManifest>;
const LANGUAGE_FORMULARY_MODULES = import.meta.glob('./data/languages/*/formularies.json', {
	eager: true
}) as Record<string, JsonModule>;
const LANGUAGE_COMMEMORATION_MODULES = import.meta.glob('./data/languages/*/commemorationes.json', {
	eager: true
}) as Record<string, JsonModule>;

if (ROOT_MANIFEST.languages.map(({ id }) => id).join(',') !== LANGS.join(',')) {
	throw new Error('the reader-edition languages and the interface-language registry differ');
}

if (ROOT_MANIFEST.base.formularies !== 'formularies.json') {
	throw new Error(`the root manifest names an unexpected formulary resource`);
}
if (ROOT_MANIFEST.base.metrics !== 'metrics.json') {
	throw new Error(`the root manifest names an unexpected metrics resource`);
}

const FORMULARY_CATALOG = formularyData as unknown as FormularyCatalog;
if (
	!FORMULARY_CATALOG ||
	typeof FORMULARY_CATALOG !== 'object' ||
	FORMULARY_CATALOG.schema_version !== '1.3.0' ||
	!Array.isArray(FORMULARY_CATALOG.formularies) ||
	!FORMULARY_CATALOG.formularies.length
)
	throw new Error('invalid neutral formulary catalogue');
for (const formulary of FORMULARY_CATALOG.formularies) {
	if (!formulary || typeof formulary !== 'object' || Array.isArray(formulary))
		throw new Error('invalid neutral formulary record');
	validateOrdinaryPrescriptions(formulary.ordinary);
}
export const FORMULARY_METADATA = FORMULARY_CATALOG.formularies;
export const CORPUS_METRICS = metricsData as unknown as CorpusMetrics;
const FORMULARY_IDS = new Set(FORMULARY_METADATA.map(({ id }) => id));
const FORMULARY_TITLES = Object.fromEntries(
	LANGS.map((language) => {
		const path = LANGUAGE_MANIFESTS[language].formularies;
		const module = LANGUAGE_FORMULARY_MODULES[`./data/${path}`];
		if (!module) throw new Error(`${language} names ${path}, which was not vendored`);
		const catalog = module.default as LanguageFormularyCatalog;
		if (catalog.schema_version !== '1.2.0' || catalog.language !== language)
			throw new Error(`${path} has an invalid localized title contract`);
		const titles = new Map(catalog.titles.map((entry) => [entry.id, entry.title]));
		if (titles.size !== FORMULARY_IDS.size || [...FORMULARY_IDS].some((id) => !titles.has(id))) {
			throw new Error(`${path} does not title the neutral formulary catalogue exactly`);
		}
		return [language, titles];
	})
) as Record<Lang, Map<string, string>>;

export function formularyTitle(id: string, language: Lang): string {
	const title = FORMULARY_TITLES[language].get(id);
	if (!title) throw new Error(`${language} has no title for formulary ${id}`);
	return title;
}

if (ROOT_MANIFEST.base.commemorationes !== 'commemorationes.json') {
	throw new Error(`the root manifest names an unexpected commemoration resource`);
}
const COMMEMORATION_TITLES = Object.fromEntries(
	LANGS.map((language) => {
		const path = LANGUAGE_MANIFESTS[language].commemorationes;
		const module = LANGUAGE_COMMEMORATION_MODULES[`./data/${path}`];
		if (!module) throw new Error(`${language} names ${path}, which was not vendored`);
		const catalog = module.default as LanguageCommemorationCatalog;
		if (catalog.schema_version !== '1.0.0' || catalog.language !== language)
			throw new Error(`${path} has an invalid localized commemoration title contract`);
		return [language, new Map(catalog.titles.map((entry) => [entry.id, entry.title]))];
	})
) as Record<Lang, Map<string, string>>;

/** The localized name of a commemoration, from its language package alone. */
export function commemorationTitle(id: string, language: Lang): string {
	const title = COMMEMORATION_TITLES[language].get(id);
	if (!title) throw new Error(`${language} has no title for commemoration ${id}`);
	return title;
}

export const TEXT_METADATA = ROOT_MANIFEST.texts;
export const TEXT_KEYS = TEXT_METADATA.map(({ id }) => id.replace('.', '/'));
if (CORPUS_METRICS.texts.total !== TEXT_METADATA.length) {
	throw new Error('the reader metrics and neutral text catalogue differ');
}
if (CORPUS_METRICS.formularies.total !== FORMULARY_METADATA.length) {
	throw new Error('the reader metrics and formulary catalogue differ');
}
const METADATA_BY_KEY = new Map(TEXT_METADATA.map((entry) => [entry.id.replace('.', '/'), entry]));
const LANGUAGE_TEXTS = Object.fromEntries(
	LANGS.map((language) => [
		language,
		new Map(LANGUAGE_MANIFESTS[language].texts.map((entry) => [entry.id.replace('.', '/'), entry]))
	])
) as Record<Lang, Map<string, LanguageTextMetadata>>;

export function textKeysFor(language: Lang): string[] {
	return LANGUAGE_MANIFESTS[language].texts.map(({ id }) => id.replace('.', '/'));
}

export function textMetadataFor(key: string): TextMetadata | undefined {
	return METADATA_BY_KEY.get(key);
}

export function languageTextMetadataFor(
	key: string,
	language: Lang
): LanguageTextMetadata | undefined {
	return LANGUAGE_TEXTS[language].get(key);
}

export function languageTextEntries(language: Lang): readonly LanguageTextMetadata[] {
	return LANGUAGE_MANIFESTS[language].texts;
}

export function languageResourcePaths(language: Lang): {
	lexicon: string;
	citations: string;
	concordance: string;
	formularies: string;
} {
	const { lexicon, citations, concordance, formularies } = LANGUAGE_MANIFESTS[language];
	return { lexicon, citations, concordance, formularies };
}

export function bibliographyResourcePaths(language: Lang): {
	root: BibliographyResources;
	language: BibliographyResources;
} {
	return {
		root: ROOT_MANIFEST.bibliography,
		language: LANGUAGE_MANIFESTS[language].bibliography
	};
}

export function bibliographyEvidencePaths(
	key: string,
	language: Lang
): { root?: string; language?: string } {
	return {
		root: METADATA_BY_KEY.get(key)?.evidence,
		language: LANGUAGE_TEXTS[language].get(key)?.evidence
	};
}

export function languageConcordancePath(language: Lang): string {
	return LANGUAGE_MANIFESTS[language].concordance;
}

export function hasText(key: string, language?: Lang): boolean {
	return language ? LANGUAGE_TEXTS[language].has(key) : METADATA_BY_KEY.has(key);
}
