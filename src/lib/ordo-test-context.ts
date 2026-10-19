import { expect } from 'vitest';
import type { OrdoMovement } from './ordo';

/** Read the Latin paragraph without ruby translations or presentation markup. */
export function renderedParagraphLatin(html: string, id: string): string {
	return html
		.split('id="' + id + '"')[1]
		.split('</p>')[0]
		.replace(/^[^>]*>/, '')
		.replace(/<rt[^>]*>[\s\S]*?<\/rt>/g, '')
		.replace(/<[^>]*>/g, '')
		.replace(/\s+/g, ' ');
}

/** Keep the complete source sequence, including its punctuation, in the rendered paragraph. */
export function expectParagraphLatin(
	html: string,
	id: string,
	words: readonly { form: string; post?: string }[]
) {
	expect(renderedParagraphLatin(html, id)).toContain(
		words.map((word) => word.form + (word.post ?? '')).join(' ')
	);
}

/** The fixed preparation bodies and two reference alternatives share one position contract. */
export function expectGospelPreparationOrder(movement: OrdoMovement) {
	const ids = movement.entries.map((entry) => entry.id);
	expect(ids.slice(ids.indexOf('graduale'), ids.indexOf('evangelium') + 1)).toEqual([
		'graduale',
		'munda-cor-meum',
		'iube-domine-benedicere',
		'iube-domne-benedicere',
		'iube-domne-benedicere-in-passione',
		'evangelium'
	]);
}
