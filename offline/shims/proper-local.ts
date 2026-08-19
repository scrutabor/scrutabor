// The downloaded copy's answer: the day is already here.
//
// The runtime carries the whole corpus, so `properData` builds the day from
// the same texts a reading page renders — no fetch, which file:// refuses,
// and no per-day artifact, which at the whole church year would have been 400
// files and about 8 MB of what the runtime already holds.
import { properData } from '$lib/loaders';
import type { Lang } from '$lib/i18n';

export function localDay(day: string, lang: Lang): unknown | null {
	return properData(day, lang);
}
