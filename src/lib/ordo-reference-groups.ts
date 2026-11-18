import type { Lang } from './i18n';
import type { MassForm } from './corpus';
import type { OrdoEntry } from './ordo';
import { ordoContext, type GospelPreparationState } from './ordo-context';
import { readingPayloadReady } from './reading-announcements';

export const AFTER_LOW_MASS = [
	'ave-maria',
	'salve-regina',
	'deus-refugium',
	'sancte-michael',
	'cor-iesu'
];

export interface OrdoReferenceGroup {
	id: string;
	title: string;
	note: string;
	entries: OrdoEntry[];
}

/** Move the Vigil's preparation and Last Gospel out of the active sequence.
 * The sung form also sets aside the prayers prescribed after Low Mass. */
export function ordoReferenceGroups(
	movement: string | undefined,
	entries: OrdoEntry[],
	state: GospelPreparationState,
	form: MassForm,
	lang: Lang
): OrdoReferenceGroup[] {
	const groups: OrdoReferenceGroup[] = [];
	const omitted = lang === 'pl' ? 'Opuszczone w tej Mszy' : 'Omitted at this Mass';
	const vigil = state.mass === 'vigilia-paschalis' && readingPayloadReady(state, lang);
	if (vigil && movement === 'praeparatio')
		groups.push({
			id: 'vigil-preparation',
			title: omitted,
			note: ordoContext('introibo', state.mass, false, lang)!,
			entries: entries.filter((entry) => entry.text)
		});
	if (vigil && movement === 'conclusio')
		groups.push({
			id: 'vigil-last-gospel',
			title: omitted,
			note: ordoContext('evangelium-ultimum', state.mass, false, lang)!,
			entries: entries.filter((entry) => entry.id === 'evangelium-ultimum')
		});
	if (form === 'cantu' && movement === 'conclusio')
		groups.push({
			id: 'after-low-mass',
			title: lang === 'pl' ? 'Modlitwy po Mszy cichej' : 'Prayers after Low Mass',
			note:
				lang === 'pl' ? 'Odmawia się je po Mszy cichej.' : 'These prayers are said after Low Mass.',
			entries: entries.filter((entry) => AFTER_LOW_MASS.includes(entry.id))
		});
	return groups.filter((group) => group.entries.length > 0);
}
