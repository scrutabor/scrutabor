import type { GospelPreparationState } from './ordo-context';
import type { Lang } from './i18n';

export function settledSelection(
	date: string,
	mass: string | null,
	lang: Lang
): GospelPreparationState {
	return {
		date,
		mass,
		loadedMass: mass,
		loadedLanguage: mass ? lang : null,
		loading: false,
		failed: false,
		unwritten: false
	};
}

export const unresolvedPayloadCases: [string, Partial<GospelPreparationState>][] = [
	['loading', { loading: true }],
	['failure', { failed: true }],
	['unwritten', { unwritten: true }],
	['missing payload', { loadedMass: null, loadedLanguage: null }],
	['stale Mass', { loadedMass: 'vigilia-paschalis' }]
];
