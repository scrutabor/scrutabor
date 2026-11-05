/** Closed neutral-catalogue prescription, never a second calendar or a source edit. */
import type { GlossDocument, TextDocument } from './corpus';
import {
	validateOrdinarySegmentOmissions,
	type OrdinarySegmentOmission
} from './ordinary-omission-descriptors';
import { resolveCompositeAddress } from './reading-address';

export {
	validateOrdinarySegmentOmissions,
	type OrdinaryOmissionDescriptor,
	type OrdinarySegmentOmission,
	type WholeOrdinaryOmission
} from './ordinary-omission-descriptors';

export interface OrdinaryBody {
	key: string;
	slug: string;
	anchor: string;
	doc: TextDocument;
	gloss: GlossDocument;
}

export interface OrdinarySegmentView<T> {
	body: T;
	omitted: readonly string[];
}

/** The caller supplies only the validated current Mass's metadata after transport readiness.
 * Validate the complete original address space before deriving a nonmutating view. */
export function ordinarySegmentView<T extends OrdinaryBody>(
	slot: string,
	body: T,
	prescriptions: unknown,
	ready: boolean
): OrdinarySegmentView<T> {
	if (!ready) return { body, omitted: [] };
	const omissions = validateOrdinarySegmentOmissions(prescriptions);
	const whole = omissions.find((row) => !('segments' in row) && row.text === `ordinarium/${slot}`);
	if (whole) {
		if (
			body.key !== whole.text ||
			body.slug !== slot ||
			body.doc.id.replace('.', '/') !== whole.text ||
			body.gloss.text !== body.doc.id ||
			!body.doc.segments.some((row) => row.words?.length)
		)
			throw new Error('ordinary omission has no complete canonical body');
		return {
			body: { ...body, doc: { ...body.doc, segments: [] } },
			omitted: body.doc.segments.map((row) => row.id)
		};
	}
	const lavabo = omissions.find((row): row is OrdinarySegmentOmission => 'segments' in row);
	if (slot !== 'lavabo' || !lavabo) return { body, omitted: [] };
	const segments = body.doc.segments;
	const words = segments.flatMap((segment) => segment.words ?? []);
	if (
		body.key !== 'ordinarium/lavabo' ||
		body.slug !== 'lavabo' ||
		body.doc.id !== 'ordinarium.lavabo' ||
		body.gloss.text !== body.doc.id ||
		segments.length !== 10 ||
		segments[0].type !== 'rubric' ||
		segments.some(
			(segment, index) =>
				segment.id !== `s${String(index + 1).padStart(2, '0')}` ||
				(index > 0 &&
					(segment.type !== 'verse' ||
						!segment.words?.length ||
						!body.gloss.segments[segment.id]?.translation?.trim()))
		) ||
		words.length !== 94 ||
		words.some(
			(word, index) =>
				word.id !== `w${String(index + 1).padStart(3, '0')}` ||
				!word.form ||
				!word.lemma ||
				!word.morph?.pos ||
				!body.gloss.words[word.id]
		) ||
		segments[8].words?.[0].id !== 'w075' ||
		segments[8].words.length !== 7 ||
		segments[9].words?.[0].id !== 'w082' ||
		segments[9].words.length !== 13 ||
		segments
			.slice(8)
			.some((segment) => segment.speaker !== 'sacerdos' || segment.voice !== 'secreto')
	)
		throw new Error('ordinary omission has no complete canonical body');
	const omitted: readonly string[] = lavabo.segments;
	return {
		body: {
			...body,
			doc: { ...body.doc, segments: segments.filter((segment) => !omitted.includes(segment.id)) }
		},
		omitted
	};
}

/** Preserve an explicit omitted citation as intent, without restoring its liturgical rows.
 * The returned query addresses the complete canonical study page, not this occurrence. */
export function omittedOrdinaryCitation<T extends OrdinaryBody>(
	source: T,
	view: OrdinarySegmentView<T>,
	word: string | null,
	segment: string | null,
	hash: string
): { query: string } | null {
	if (!view.omitted.length) return null;
	const original = resolveCompositeAddress([source], word, segment, hash);
	const displayed = resolveCompositeAddress([view.body], word, segment, hash);
	const omittedWord = original.word !== null && displayed.word === null;
	const omittedSelection = original.segments.some((id) => view.omitted.includes(id));
	if (!omittedWord && !omittedSelection) return null;
	const query = new URLSearchParams();
	if (original.word) query.set('w', original.word.slice(source.slug.length + 1));
	if (original.segment) query.set('s', original.segment.slice(source.slug.length + 1));
	return { query: `?${query}` };
}
