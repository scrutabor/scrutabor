/**
 * Where a mark prints, where a voice is named, and where the opening
 * initial goes.
 *
 * These are editorial rules, not layout — they decide what a reader is told
 * about who is speaking and how loudly — and each of them is the owner's,
 * settled against the books and against his own experience of losing the
 * thread in a printed missal. They were written inline in the component
 * that renders them, where the only way to check one was to open a page and
 * count the marks on it. They are pure functions of the segments, so they
 * are here instead, with the reasons and the tests beside them.
 */
import type { MassForm, Segment } from '$lib/corpus';

/** Resolve who delivers a segment in the selected form of Mass. The stored
 * speaker and voice are the low-Mass base; the corpus names only exceptions. */
export function inMassForm(segment: Segment, form: MassForm): Segment {
	const delivery = segment.delivery?.[form];
	return delivery ? { ...segment, ...delivery } : segment;
}

/** How often the voice changes hands over the whole text. */
export function turns(segments: Segment[]): number {
	const speakers = segments.filter((s) => s.type === 'verse' && s.speaker).map((s) => s.speaker);
	return speakers.filter((sp, i) => i > 0 && sp !== speakers[i - 1]).length;
}

/**
 * Two shapes, and the books set them differently.
 *
 * A DIALOGUE is voices trading lines — the preface dialogue, the psalm said
 * alternately with the server. The books mark every line of it, ℣ and ℟ down
 * the page, and give it no opening initial.
 *
 * A PRAYER is one voice saying the whole thing, and it ends with the answer
 * Amen. The books open it with a red initial and mark NOTHING but that
 * answer: no missal prints ℣ down the body of the Canon.
 *
 * The two are told apart by how often the voice changes: a prayer turns over
 * once, at the Amen; a dialogue keeps turning.
 */
export function isDialogue(segments: Segment[]): boolean {
	return turns(segments) >= 2;
}

/** Is there more than one voice here at all? A text said throughout by one
 * of them names nobody: there is nothing to tell apart. */
export function hasAnswers(segments: Segment[]): boolean {
	return (
		new Set(segments.filter((s) => s.type === 'verse' && s.speaker).map((s) => s.speaker)).size > 1
	);
}

/** Does the participation layer give the faithful any part in this text?
 * A fixed response may contain only one speaker and therefore fail
 * `hasAnswers`, while still being exactly the line a reader needs marked. */
export function hasParticipation(segments: Segment[]): boolean {
	return segments.some(
		(segment) =>
			segment.type === 'verse' &&
			segment.participation !== undefined &&
			Object.keys(segment.participation).length > 0
	);
}

/**
 * Is the whole of this text said by everyone — the reader included?
 *
 * `omnes` is the one speaker every role owns (see OWNED in $lib/role): a
 * priest, a server and someone in the pew all say it. So a text with no
 * other voice in it is a text whose every line is the reader's, whoever
 * they are, and a mark beside each of them tells them apart from nobody.
 *
 * That is what an O. before *Sancta María* was doing in the Ave María
 * (owner, 2026-08-07: "a bit confusing"). His instinct was to keep marks
 * out of the plain prayers and inside the Ordo, which is right about the
 * shelf as it stands and wrong as a rule — the Angelus is a plain prayer
 * and a genuine dialogue, ℣ Ángelus Dómini nuntiávit Maríæ ℟ Et concépit,
 * and the books mark it. So the test is the text's own voices, not which
 * shelf it sits on: the four prayers this silences today are exactly the
 * four he meant, and the Angelus will keep its marks when it arrives.
 *
 * A prayer said throughout by the PRIEST is the other case and keeps its
 * mark, because there it says something the reader needs: not yours.
 */
export function saidByEveryone(segments: Segment[]): boolean {
	const voices = new Set(
		segments.filter((s) => s.type === 'verse' && s.speaker).map((s) => s.speaker)
	);
	return voices.size === 1 && voices.has('omnes');
}

/**
 * Is this one continuous prayer which the faithful say with its rubrical
 * speaker in the selected form of Mass?
 *
 * The Missale's `speaker` and the 1958 Instruction's `participation` answer
 * different questions. In the Credo, for example, every segment belongs to
 * the celebrant in the rubrics, while *De musica sacra* 25 b and 31 c give
 * the whole text to the faithful too. Printing V. over that prayer calls it
 * a versicle and then labelling the same line “the faithful” contradicts
 * itself. Words can name the shared participation once; no V./R. exchange
 * exists from the reader's place in the pew.
 *
 * A one-line fixed response is deliberately excluded: its R. is useful and
 * accurate. The Kyrie consequently keeps its alternating marks at low Mass,
 * where the faithful have the server's lines, but loses them at sung Mass,
 * where n. 25 b gives them the whole Ordinary.
 */
export function isSharedPrayer(segments: Segment[], form: MassForm): boolean {
	const verses = segments.filter((segment) => segment.type === 'verse');
	return (
		verses.length >= 2 &&
		verses.every((segment) => {
			const participation = segment.participation?.[form];
			return participation !== undefined && participation.conditional !== true;
		})
	);
}

/** Name a conditional faculty at the start of each uninterrupted run, and
 * again after a rubric has broken the reader's place in the text. */
export function namesConditionalParticipation(
	segments: Segment[],
	i: number,
	form: MassForm
): boolean {
	if (segments[i]?.participation?.[form]?.conditional !== true) return false;
	if (afterRubric(segments, i)) return true;
	for (let j = i - 1; j >= 0; j--) {
		if (segments[j].type === 'verse') {
			return segments[j].participation?.[form]?.conditional !== true;
		}
	}
	return true;
}

/** Segment index where each speaker first appears. */
export function firstAppearance(segments: Segment[]): Record<string, number> {
	const seen: Record<string, number> = {};
	segments.forEach((s, i) => {
		if (s.type === 'verse' && s.speaker && !(s.speaker in seen)) seen[s.speaker] = i;
	});
	return seen;
}

/**
 * The mark says who says it; the NAME says what the mark means, and it only
 * has to say that once. Each speaker is named the first time it appears — a
 * dialogue that alternates every line would otherwise carry a label above
 * every line of it.
 */
export function namesSpeaker(segments: Segment[], i: number): boolean {
	const sp = segments[i]?.speaker;
	if (!sp || (!hasAnswers(segments) && !hasParticipation(segments))) return false;
	return firstAppearance(segments)[sp] === i;
}

/**
 * Is there a rubric between this verse and the one before it? A direction
 * breaks the text apart on the page — red, railed, with its own translation
 * under it — and the eye that comes back down to the Latin has lost the
 * thread of whose words these are.
 */
export function afterRubric(segments: Segment[], i: number): boolean {
	for (let j = i - 1; j >= 0; j--) {
		if (segments[j].type === 'verse') return false;
		if (segments[j].type === 'rubric') return true;
	}
	return false;
}

/**
 * The mark prints where the voice TURNS, and again wherever a rubric has
 * broken the flow. Both halves are the owner's, and both are about the same
 * thing — a reader following Mass should never have to work out where the
 * last mark stopped applying:
 *
 *   * not on every line of one voice. Four V.'s down the petitions of the
 *     Pater noster say the same thing four times, and the indent already
 *     says a line belongs to the voice above it.
 *   * but yes after every rubric, even where that means Per ipsum takes a V.
 *     on each of its phrases: that prayer has a direction between every one
 *     of them, so the reader is coming back to the text each time, and each
 *     time is a place to be told.
 *   * and nowhere at all in a prayer that is everyone's throughout, where
 *     the mark has nobody to tell the reader apart from — saidByEveryone.
 */
export function marked(segments: Segment[], i: number): boolean {
	const sp = segments[i]?.speaker;
	if (!sp) return false;
	if (saidByEveryone(segments)) return false;
	if (afterRubric(segments, i)) return true;
	for (let j = i - 1; j >= 0; j--) {
		if (segments[j].type === 'verse') return segments[j].speaker !== sp;
	}
	return true;
}

/**
 * The voice follows the same rule, for the same reason: "silently" over
 * every line of a prayer said silently throughout is a label repeating
 * itself, but after a direction it is worth saying again.
 */
export function namesVoice(segments: Segment[], i: number): boolean {
	const seg = segments[i];
	if (!seg?.voice || seg.voice === 'clara') return false;
	if (afterRubric(segments, i)) return true;
	for (let j = i - 1; j >= 0; j--) {
		if (segments[j].type === 'verse') return segments[j].voice !== seg.voice;
	}
	return true;
}

/**
 * Which verse gets the opening initial, or -1 for none.
 *
 * A dialogue gets none, as the books give none. Otherwise the first verse
 * with more than the one-word call "Orémus.": the book gives the initial to
 * the prayer that follows that call, while a short opening such as "Ángele
 * Dei" is already the prayer and keeps its initial.
 */
export function firstVerseWithInitial(segments: Segment[]): number {
	if (isDialogue(segments)) return -1;
	return segments.findIndex((s) => s.type === 'verse' && (s.words?.length ?? 0) >= 2);
}
