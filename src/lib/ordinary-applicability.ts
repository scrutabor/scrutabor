import type { Lang } from './i18n';
import type { GospelPreparationState } from './ordo-context';
import { ordoContext } from './ordo-context';
import { resolveOrdoChoice } from './ordo-choice';
import { dayById } from './proprium';

import { ordinaryStateFor, type OrdinaryState } from './ordinary-prescriptions';

export interface OrdinaryApplicability {
	applicability: OrdinaryState;
	referenceOnly: boolean;
	note?: string;
}

/** Applicability belongs to the current, settled date and payload, never to a
 * slug, reader role, selected singing mode or previously loaded formulary. */
export function ordinaryApplicability(
	entry: string,
	state: GospelPreparationState,
	lang: Lang
): OrdinaryApplicability | undefined {
	if (entry !== 'gloria' && entry !== 'credo') return undefined;
	const name = entry === 'gloria' ? 'Gloria' : lang === 'pl' ? 'Credo' : 'the Creed';
	const reference =
		lang === 'pl'
			? 'Pełny tekst zachowano tylko do wglądu.'
			: 'The complete text is retained for reference only.';
	const unresolved = (note: string): OrdinaryApplicability => ({
		applicability: 'unresolved',
		referenceOnly: true,
		note: `${note} ${reference}`
	});
	if (!state.date || state.loading || state.failed || state.unwritten)
		return unresolved(
			lang === 'pl'
				? `Nie potwierdzono jeszcze formularza Mszy ani tego, czy odmawia się w niej ${name}.`
				: `The Mass formulary and its use of ${name} have not yet been confirmed.`
		);
	if (state.mass === null)
		return unresolved(
			lang === 'pl'
				? `${name} odmawia się wtedy, gdy nakazują to rubryki. Nie wybrano formularza Mszy.`
				: `${entry === 'gloria' ? 'The Gloria' : 'The Creed'} is said when prescribed by the rubrics. No Mass formulary is selected.`
		);
	const choice = resolveOrdoChoice(state.date, state.mass);
	if (
		choice?.mass !== state.mass ||
		state.loadedMass !== state.mass ||
		state.loadedLanguage !== lang
	)
		return unresolved(
			lang === 'pl'
				? `Nie potwierdzono jeszcze formularza dla wybranego dnia i języka ani tego, czy odmawia się ${name}.`
				: `The formulary for the selected date and language, and its use of ${name}, have not yet been confirmed.`
		);
	const prescriptions = dayById(state.mass)?.ordinary;
	const sunday = new Date(`${state.date}T12:00:00Z`).getUTCDay() === 0;
	const applicability = prescriptions
		? ordinaryStateFor(prescriptions, entry, sunday)
		: 'unresolved';
	if (applicability === 'required')
		return {
			applicability,
			referenceOnly: false,
			note: ordoContext(entry, state.mass, false, lang)
		};
	if (applicability === 'omitted') {
		const note =
			ordoContext(entry, state.mass, false, lang) ??
			(lang === 'pl'
				? `W tej Mszy nie odmawia się ${name}.`
				: `${entry === 'gloria' ? 'The Gloria' : 'The Creed'} is omitted at this Mass.`);
		return { applicability, referenceOnly: true, note: `${note} ${reference}` };
	}
	return unresolved(
		lang === 'pl'
			? `Użycie ${name} w wybranej Mszy wymaga sprawdzenia w rubrykach.`
			: `Whether ${name} is prescribed at the selected Mass still needs to be checked against its rubrics.`
	);
}
