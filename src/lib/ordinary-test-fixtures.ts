import { expect } from 'vitest';
import { loadText } from './corpus';
import {
	omittedOrdinaryCitation,
	type OrdinaryBody,
	type OrdinarySegmentView
} from './ordinary-segment-omissions';
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

export async function loadOrdinaryReference(slot: string, lang: Lang): Promise<OrdinaryBody> {
	const key = `ordinarium/${slot}`;
	const { text, gloss } = (await loadText(key, lang))!;
	return { key, slug: slot, anchor: slot, doc: text, gloss };
}

export function expectWholeBodyOmitted(
	original: OrdinaryBody,
	view: OrdinarySegmentView<OrdinaryBody>
) {
	expect(view.body.doc.segments).toEqual([]);
	expect(view.omitted).toEqual(original.doc.segments.map((s) => s.id));
	expect(omittedOrdinaryCitation(original, view, `${original.slug}.w001`, null, '')?.query).toBe(
		'?w=w001'
	);
}
