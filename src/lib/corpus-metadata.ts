// Lightweight package boundaries. Catalogue and search-title code import this
// module without pulling morphology, citations, lexicon, or any text document
// into the first page of the book.
import manifestData from './data/manifest.json';
import { LANGS, type Lang } from './i18n';

export interface TextMetadata {
	id: string;
	path: string;
	title: string;
}

export interface LanguageTextMetadata {
	id: string;
	path: string;
	title?: string;
	aliases?: string[];
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
}

interface RootManifest {
	schema_version: string;
	corpus_schema: string;
	texts: TextMetadata[];
	languages: { id: Lang; direction: 'ltr' | 'rtl'; path: string }[];
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

if (ROOT_MANIFEST.languages.map(({ id }) => id).join(',') !== LANGS.join(',')) {
	throw new Error('the reader-edition languages and the interface-language registry differ');
}

export const TEXT_METADATA = ROOT_MANIFEST.texts;
export const TEXT_KEYS = TEXT_METADATA.map(({ id }) => id.replace('.', '/'));
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
} {
	const { lexicon, citations, concordance } = LANGUAGE_MANIFESTS[language];
	return { lexicon, citations, concordance };
}

export function languageConcordancePath(language: Lang): string {
	return LANGUAGE_MANIFESTS[language].concordance;
}

export function hasText(key: string, language?: Lang): boolean {
	return language ? LANGUAGE_TEXTS[language].has(key) : METADATA_BY_KEY.has(key);
}
