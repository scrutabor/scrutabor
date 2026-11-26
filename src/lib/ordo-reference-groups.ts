import type { Lang } from './i18n';
import type { MassForm } from './corpus';
import type { OrdoEntry } from './ordo';
import { ordoContext, type GospelPreparationState } from './ordo-context';
import { readingPayloadReady } from './reading-announcements';
import { bindOrphans } from './polish';

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

const endings: Record<string, { id: string; parts: string[]; pl: string; en: string }> = {
	'nativitas-domini-in-die': {
		id: 'christmas-last-gospel',
		parts: ['evangelium-ultimum'],
		pl: 'W trzeciej Mszy Bożego Narodzenia prolog św. Jana jest Ewangelią dnia. Na zakończenie nie odczytuje się ostatniej Ewangelii.',
		en: 'At the third Mass of Christmas the prologue of Saint John is the Gospel of the day. The Last Gospel is omitted.'
	},
	'dominica-ii-passionis': {
		id: 'palm-last-gospel',
		parts: ['evangelium-ultimum'],
		pl: 'Gdy Mszę poprzedza poświęcenie palm z procesją, kończy się ona bez ostatniej Ewangelii. W pozostałych Mszach Niedzieli Palmowej kapłan na zakończenie czyta o wjeździe Jezusa do Jerozolimy (Mt 21, 1–9).',
		en: 'When Mass follows the blessing and procession of palms, the Last Gospel is omitted. At other Masses on Palm Sunday the priest ends by reading the account of Jesus entering Jerusalem (Matthew 21:1–9).'
	},
	'feria-v-in-cena-domini': {
		id: 'holy-thursday-ending',
		parts: ['benedictio', 'evangelium-ultimum'],
		pl: 'Po śpiewanej Mszy Wieczerzy Pańskiej następuje uroczyste przeniesienie Najświętszego Sakramentu. Opuszcza się końcowe błogosławieństwo i ostatnią Ewangelię. Msza cicha odprawiana za zgodą ordynariusza kończy się w zwykły sposób.',
		en: 'The solemn transfer of the Blessed Sacrament follows the sung Mass of the Lord’s Supper. The final blessing and the Last Gospel are omitted. A Low Mass celebrated with the permission of the local Ordinary ends in the usual way.'
	}
};

export function ordoReferenceGroups(
	movement: string | undefined,
	entries: OrdoEntry[],
	state: GospelPreparationState,
	form: MassForm,
	lang: Lang
): OrdoReferenceGroup[] {
	const groups: OrdoReferenceGroup[] = [];
	const omitted = lang === 'pl' ? 'Opuszczone w tej Mszy' : 'Omitted at this Mass';
	const mass = readingPayloadReady(state, lang) ? state.mass : null;
	const vigil = mass === 'vigilia-paschalis';
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
	const ending = mass && endings[mass];
	if (ending && movement === 'conclusio' && (mass !== 'feria-v-in-cena-domini' || form === 'cantu'))
		groups.push({
			id: ending.id,
			title:
				mass === 'dominica-ii-passionis'
					? lang === 'pl'
						? 'Ostatnia Ewangelia w Niedzielę Palmową'
						: 'The Last Gospel on Palm Sunday'
					: omitted,
			note: lang === 'pl' ? bindOrphans(ending.pl) : ending.en,
			entries: entries.filter((entry) => ending.parts.includes(entry.id))
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
