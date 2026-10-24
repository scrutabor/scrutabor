import type { Lang } from './i18n';
import type { GospelPreparationState } from './ordo-context';
import { ordinaryApplicability } from './ordinary-applicability';
import { bindOrphans } from './polish';

/** Presentation only. The canonical prescription and settled occurrence decide
 * omission; an unresolved or Ordinary-only view never loses its complete text. */
export function ordinaryOmission(
	entry: string,
	state: GospelPreparationState,
	lang: Lang
): { note: string } | undefined {
	if (entry !== 'gloria' && entry !== 'credo') return undefined;
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
