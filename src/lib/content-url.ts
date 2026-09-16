// Canonical addresses for corpus content.
//
// Ordinary prayers remain one document per text. The Proper is different:
// its natural reading unit is a complete Mass, and emitting one page for
// every component repeated the same page frame almost two thousand times.
// Proper texts therefore point into the complete formulary that owns them.
// A transferred or shared text prefers its own canonical formulary and falls
// back to the first formulary that uses it.
import type { Lang } from './i18n';
import { PROPER_DAYS } from './proprium';
export { textAnchor } from './text-anchor';
import { textAnchor } from './text-anchor';

export function formularyForText(textKey: string): string | undefined {
	const owner = PROPER_DAYS.find((day) =>
		day.components.some(
			(component) => component.text === textKey && component.relation === 'proper'
		)
	);
	if (owner) return owner.id;
	return PROPER_DAYS.find((day) => day.components.some((component) => component.text === textKey))
		?.id;
}

export interface TextAddress {
	word?: string;
	segment?: string;
}

/** The page that reads a corpus text, with an optional exact place in it. */
export function textHref(lang: Lang, textKey: string, address: TextAddress = {}): string {
	const formulary = textKey.startsWith('proprium/') ? formularyForText(textKey) : undefined;
	const base = formulary
		? `/app/${lang}/formularium/${encodeURIComponent(formulary)}`
		: `/app/${lang}/${textKey}`;
	const query = new URLSearchParams();
	const prefix = formulary ? `${textKey.split('/')[1]}.` : '';
	if (address.word) query.set('w', `${prefix}${address.word}`);
	if (address.segment) query.set('s', `${prefix}${address.segment}`);
	const suffix = query.size ? `?${query}` : '';
	return `${base}${suffix}${formulary ? `#${textAnchor(textKey)}` : ''}`;
}
