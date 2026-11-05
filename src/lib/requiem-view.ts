/** Source-owned selected variant context; this module contains no prayer wording. */
import type { Lang } from './i18n';
import type { OrdinaryBody } from './ordinary-segment-omissions';
import type { GospelPreparationState } from './ordo-context';
import { readingPayloadReady } from './reading-announcements';
import { dayById } from './proprium';
import { bindOrphans } from './polish';

export function selectedOrdinaryBodyContext(
	body: Pick<OrdinaryBody, 'doc' | 'gloss'> | undefined
): string | undefined {
	if (
		!body ||
		![
			'ordinarium.agnus-dei-defunctorum',
			'ordinarium.agnus-dei-in-cena-domini',
			'ordinarium.ite-missa-est-defunctorum'
		].includes(body.doc.id)
	)
		return undefined;
	if (!body.gloss.about?.trim()) throw new Error('selected Ordinary body context absent');
	return body.gloss.about;
}

/** Both requiem notes hold only once the payload of a Mass that omits the blessing is settled;
 * the Polish note binds its one-letter words to the word that follows. */
function requiemBlessingNote(
	state: GospelPreparationState,
	lang: Lang,
	note: Record<Lang, string>
) {
	if (!readingPayloadReady(state, lang) || !state.mass) return undefined;
	if (!dayById(state.mass)?.ordinary_omissions.some((row) => row.reason === 'requiem-blessing'))
		return undefined;
	return lang === 'pl' ? bindOrphans(note.pl) : note.en;
}

/** No ceremony selector exists: retain the normal text and state the source's condition. */
export function requiemLastGospelContext(entry: string, state: GospelPreparationState, lang: Lang) {
	if (entry !== 'evangelium-ultimum') return undefined;
	return requiemBlessingNote(state, lang, {
		pl: 'Ostatnią Ewangelię zwykle się zachowuje. Pomija się ją, gdy po Mszy następuje absolucja nad katafalkiem.',
		en: 'The Last Gospel is normally retained. It is omitted when absolution over the tumulus follows Mass.'
	});
}

/** Qualify the entire generic opening before it is read; retain every canonical byte.
 * RitusXIII1 and the body's own s03 retain the prayer and withhold water blessing. */
export function requiemWaterContext(entry: string, state: GospelPreparationState, lang: Lang) {
	if (entry !== 'deus-qui-humanae') return undefined;
	return requiemBlessingNote(state, lang, {
		pl: 'Podczas tej Mszy za zmarłych wody się nie błogosławi. Modlitwę Deus, qui humanae i pozostałe opisane poniżej czynności zachowuje się.',
		en: 'At this Mass for the Dead, the water is not blessed. The prayer Deus, qui humanae and the other actions described below are retained.'
	});
}
