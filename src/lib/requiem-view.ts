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
		pl: 'Ostatnią Ewangelię opuszcza się, gdy bezpośrednio po Mszy następuje absolucja przy trumnie lub katafalku. W pozostałych Mszach za zmarłych kapłan ją odczytuje.',
		en: 'The Last Gospel is omitted when Mass is followed immediately by the absolution at the coffin or catafalque. At other Masses for the Dead the priest reads it as usual.'
	});
}

/** Qualify the entire generic opening before it is read; retain every canonical byte.
 * RitusXIII1 and the body's own s03 retain the prayer and withhold water blessing. */
export function requiemWaterContext(entry: string, state: GospelPreparationState, lang: Lang) {
	if (entry !== 'deus-qui-humanae') return undefined;
	return requiemBlessingNote(state, lang, {
		pl: 'We Mszy za zmarłych kapłan odmawia Deus, qui humanae i dolewa wody do wina. W tej Mszy wody się nie błogosławi.',
		en: 'At a Mass for the Dead the priest says Deus, qui humanae and adds water to the wine. The water is not blessed.'
	});
}
