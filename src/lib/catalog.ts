// Navigation owns only grouping and order. Latin titles come from the neutral
// reader manifest; familiar titles and aliases come from each independent
// language package. Adding a language therefore never edits this file.
import { languageTextMetadataFor, textMetadataFor } from './corpus-metadata';
import { CATALOG_ORDER } from './catalog-order';
import { LANGS, type Lang } from './i18n';
import { bindPlFields } from './polish';

export interface CatalogText {
	category: string;
	slug: string;
	title: string;
	localizedTitle: Partial<Record<Lang, string>>;
	aliases: Partial<Record<Lang, string[]>>;
}

export interface CatalogSection {
	category: string;
	label: Record<Lang, string>;
	texts: CatalogText[];
}

function localizedFields(key: string): Pick<CatalogText, 'localizedTitle' | 'aliases'> {
	const entries = LANGS.map(
		(language) => [language, languageTextMetadataFor(key, language)] as const
	);
	return {
		localizedTitle: Object.fromEntries(
			entries.flatMap(([language, metadata]) =>
				metadata?.title ? [[language, metadata.title]] : []
			)
		) as Partial<Record<Lang, string>>,
		aliases: Object.fromEntries(
			entries.flatMap(([language, metadata]) =>
				metadata?.aliases?.length ? [[language, metadata.aliases]] : []
			)
		) as Partial<Record<Lang, string[]>>
	};
}

function catalogText(category: string, slug: string): CatalogText {
	const key = `${category}/${slug}`;
	const metadata = textMetadataFor(key);
	if (!metadata) throw new Error(`catalogue names absent text ${key}`);
	return { category, slug, title: metadata.title, ...localizedFields(key) };
}

const CATALOG_SOURCE: CatalogSection[] = CATALOG_ORDER.map((section) => ({
	category: section.category,
	label: section.label,
	texts: section.texts.map((slug) => catalogText(section.category, slug))
}));

/** Polish one-letter words bound to what follows (lib/polish); Latin titles
 * and English prose in the same objects are untouched. */
export const CATALOG: CatalogSection[] = bindPlFields(CATALOG_SOURCE);

/** The same editorial order, narrowed to texts the selected package can
 * actually render. A new language may begin with one text. */
export function catalogFor(available: ReadonlySet<string>): CatalogSection[] {
	return CATALOG.map((section) => ({
		...section,
		texts: section.texts.filter((text) => available.has(`${text.category}/${text.slug}`))
	}));
}

export function sectionFor(category: string): CatalogSection | undefined {
	return CATALOG.find((section) => section.category === category);
}

export function textFor(category: string, slug: string): CatalogText | undefined {
	return sectionFor(category)?.texts.find((text) => text.slug === slug);
}

/** The book's reading order: within ordinarium this is the liturgical sequence. */
export function orderedTexts(available?: ReadonlySet<string>): CatalogText[] {
	return (available ? catalogFor(available) : CATALOG).flatMap((section) => section.texts);
}

export function neighborsOf(
	category: string,
	slug: string,
	available?: ReadonlySet<string>
): { prev?: CatalogText; next?: CatalogText } {
	const all = orderedTexts(available);
	const index = all.findIndex((text) => text.category === category && text.slug === slug);
	if (index < 0) return {};
	return { prev: all[index - 1], next: all[index + 1] };
}
