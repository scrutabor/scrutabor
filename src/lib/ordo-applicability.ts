/** Unconfirmed occurrence guidance: retain study content without asserting a rite. */
import type { Lang } from './i18n';
import { ordinaryGuideReady, type GospelPreparationState } from './ordo-context';
import { readingPayloadReady } from './reading-announcements';
import { bindOrphans } from './polish';

export interface OrdoApplicabilityContext {
	referenceOnly: boolean;
	unconfirmed?: true;
	note?: string;
	title?: string;
	titleLanguage?: Lang;
	openingRubricContext?: string;
}

/** These fixed entries have differing prescriptions across the represented Masses.
 * Readiness confirms applicability; a title or the presence of canonical words cannot.
 * Successful occurrences continue through their existing source-owned selection paths. */
export function unconfirmedOrdoContext(
	entry: string,
	state: GospelPreparationState,
	lang: Lang
): OrdoApplicabilityContext | undefined {
	if (ordinaryGuideReady(state) || readingPayloadReady(state, lang)) return undefined;
	const guidance = (pl: string, en: string) => (lang === 'pl' ? bindOrphans(pl) : en);
	if (entry === 'ite-missa-est')
		return {
			referenceOnly: true,
			unconfirmed: true,
			title: lang === 'pl' ? 'Rozesłanie' : 'Dismissal',
			titleLanguage: lang,
			note: guidance(
				'Nie potwierdzono jeszcze formuły rozesłania dla wybranej Mszy. Zachowane teksty służą tylko do wglądu.',
				'The dismissal formula for the selected Mass has not yet been confirmed. Retained texts are for reference only.'
			)
		};
	if (['iudica-me', 'agnus-dei', 'qui-dixisti', 'benedictio'].includes(entry))
		return {
			referenceOnly: true,
			unconfirmed: true,
			note: guidance(
				'Nie potwierdzono jeszcze, czy ten tekst należy do wybranego formularza Mszy. Pełny tekst pokazano tylko do wglądu.',
				'Whether this text is used at the selected Mass has not yet been confirmed. The complete text is shown for reference only.'
			)
		};
	if (entry !== 'deus-qui-humanae') return undefined;
	const note = guidance(
		'Zastosowanie poniższej rubryki w wybranej Mszy nie zostało jeszcze potwierdzone. Rubrykę i modlitwę pokazano tylko do wglądu.',
		'The application of the following rubric at the selected Mass has not yet been confirmed. The rubric and prayer are shown for reference only.'
	);
	return { referenceOnly: true, unconfirmed: true, note, openingRubricContext: note };
}
