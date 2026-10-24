import { COMMEMORATION_SLOTS, commemorationLookup, formularyOrations } from './commemorationes';
import { dayById } from './proprium';
import { properOccurrences } from './proper-occurrences';
import type { Lang } from './i18n';

interface CommemorationEntryContext {
	key: string;
	slot: string;
	commemoration: string;
	formulary?: string;
}

/** Open the set named by an active commemoration heading, not the text's canonical owner.
 * This is a catalogue entry action, not a word/source permalink or a dated Mass address. */
export function commemorationEntryHref(lang: Lang, body: CommemorationEntryContext): string {
	const entry = commemorationLookup?.commemorations.find(
		(entry) => entry.id === body.commemoration
	);
	const index = (COMMEMORATION_SLOTS as readonly string[]).indexOf(body.slot);
	if (!entry || index < 0) throw new Error('unknown commemoration entry or slot');
	let route: string;
	let parts: { key: string; part: string }[];
	if (entry.resolved) {
		if (typeof body.formulary !== 'string' || !body.formulary)
			throw new Error('resolved commemoration entry requires its formulary');
		const day = dayById(body.formulary);
		if (
			!day ||
			!commemorationLookup!
				.datesOf(entry.id)
				.some(
					(pair) => pair.formulary === day.id && Object.values(pair.decisions).includes('admitted')
				)
		)
			throw new Error('commemoration entry formulary is not published');
		if (formularyOrations(day.components)?.[index] !== body.key)
			throw new Error('commemoration entry does not match its resolved oration');
		route = `formularium/${encodeURIComponent(day.id)}`;
		// Full catalogue order matters when an earlier component uses this same text.
		parts = day.components.map((part) => ({ key: part.text, part: part.role }));
	} else {
		if (body.formulary !== undefined || entry.slots[index].text !== body.key)
			throw new Error('commemoration entry does not match its addressed oration');
		route = `commemoratio/${encodeURIComponent(entry.id)}`;
		parts = entry.slots.map((part) => ({ key: part.text!, part: part.key }));
	}
	const target = properOccurrences(parts).find(
		(part) => part.part === body.slot && part.key === body.key
	);
	if (!target) throw new Error('commemoration entry occurrence absent');
	return `/app/${lang}/${route}#${target.anchor}`;
}
