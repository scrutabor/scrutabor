// Whether this copy of the book already holds the day the reader picked.
//
// On the SITE it never does, and this is a stub that says so. The corpus must
// not reach the browser (decisions #27), so a day arrives as a prerendered
// file, fetched when it is chosen.
//
// A DOWNLOADED copy is the other case: it carries the whole corpus in its one
// runtime, so the day is already there and asking for it over a transport
// would be asking for what is in memory. The offline build aliases this module
// to offline/shims/proper-local.ts, which answers from the corpus.
//
// This is a stub rather than a branch on `__scrutabor_up` because a branch
// would put `$lib/loaders` — and through it every text — into the site's own
// client bundle, which is the exact weight the split exists to keep out.
import type { Lang } from './i18n';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function localDay(day: string, lang: Lang): unknown | null {
	return null;
}
