import type { Lang } from './i18n';

/** One dictionary document per language; the entry is selected by query. */
export function lemmaHref(lang: Lang, lemma: string): string {
	// Query values are case-sensitive, unlike file names on common desktop
	// filesystems. The shared dictionary page therefore needs no collision
	// catalogue merely to address Clemens beside clemens.
	return `/app/${lang}/lemma?l=${encodeURIComponent(lemma)}`;
}

/** External dictionaries use the headword, not our homograph discriminator. */
export function externalDictionaryHref(lemma: string): string {
	return `https://logeion.uchicago.edu/${encodeURIComponent(lemma.split('_', 1)[0])}`;
}
