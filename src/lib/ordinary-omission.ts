import type { Lang } from './i18n';
import type { GospelPreparationState } from './ordo-context';
import { ordinaryApplicability } from './ordinary-applicability';
import { bindOrphans } from './polish';
import { readingPayloadReady } from './reading-announcements';
import { dayById } from './proprium';
import { validateOrdinarySegmentOmissions } from './ordinary-omission-descriptors';

/** Presentation only. The canonical prescription and settled occurrence decide
 * omission; an unresolved or Ordinary-only view never loses its complete text. */
export function ordinaryOmission(
	entry: string,
	state: GospelPreparationState,
	lang: Lang
): { note: string; text?: string } | undefined {
	if (entry !== 'gloria' && entry !== 'credo') {
		if (!readingPayloadReady(state, lang) || !state.mass) return undefined;
		const day = dayById(state.mass);
		if (!day) return undefined;
		const row = validateOrdinarySegmentOmissions(day.ordinary_omissions).find(
			(item) => !('segments' in item) && item.text === `ordinarium/${entry}`
		);
		if (!row) return undefined;
		const names = {
			'requiem-iudica': [
				'W tej Mszy pomija się psalm Iudica me.',
				'Psalm Iudica me is omitted at this Mass.'
			],
			'requiem-peace-prayer': [
				'W tej Mszy pomija się pierwszą modlitwę o pokój przed Komunią.',
				'The first prayer for peace before Communion is omitted at this Mass.'
			],
			'triduum-peace-prayer': [
				'W tej Mszy pomija się pierwszą modlitwę o pokój przed Komunią oraz pocałunek pokoju. Pozdrowienie Pax Domini i dwie pozostałe modlitwy przed Komunią pozostają.',
				'The first prayer for peace before Communion and the kiss of peace are omitted at this Mass. The Pax Domini greeting and the other two prayers before Communion remain.'
			],
			'vigil-agnus-dei': [
				'W tej Mszy pomija się Agnus Dei.',
				'The Agnus Dei is omitted at this Mass.'
			],
			'requiem-blessing': [
				'W tej Mszy nie udziela się końcowego błogosławieństwa.',
				'The final blessing is omitted at this Mass.'
			]
		};
		if (!(row.reason in names)) return undefined;
		const note = names[row.reason as keyof typeof names][lang === 'pl' ? 0 : 1];
		return { note: lang === 'pl' ? bindOrphans(note) : note, text: row.text };
	}
	if (ordinaryApplicability(entry, state, lang)?.applicability !== 'omitted') return undefined;
	const note =
		lang === 'pl'
			? entry === 'gloria'
				? 'W tej Mszy nie odmawia się hymnu Gloria.'
				: 'W tej Mszy nie odmawia się Credo.'
			: entry === 'gloria'
				? 'The Gloria is omitted at this Mass.'
				: 'The Creed is omitted at this Mass.';
	return { note: lang === 'pl' ? bindOrphans(note) : note };
}
