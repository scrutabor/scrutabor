import type { Segment } from './corpus';
import type { LitanyRow } from './reading-text';

/** A physical render row, after litany pairing and speaker decisions. */
export interface FlowRow {
	row: LitanyRow;
	index: number;
	first: boolean;
	last: boolean;
	rubric: boolean;
	hidden: boolean;
	terminal: boolean;
	who: boolean;
	translated: boolean;
	before: 'rubric' | 'who' | 'verse' | 'hidden' | null;
	after: 'rubric' | 'who' | 'verse' | 'hidden' | null;
}

export interface FlowUnit {
	key: string;
	kind: 'opening' | 'instruction' | 'response' | 'row' | 'terminal';
	rows: FlowRow[];
	keep: boolean;
}

interface FlowOptions {
	hideOpeningRubric: boolean;
	/** Computed against the complete document, never a partition. */
	namesWho: (index: number) => boolean;
	translated: (index: number) => boolean;
	response: (index: number) => boolean;
}

/** Source-word bound for every compact source row, including a first row. */
export const SHORT_FLOW_WORDS = 12;

/** What a row presents to the row before it: its first box, as the
 * neighbour's `after` metadata names it. */
export function rowStart(row: FlowRow): FlowRow['before'] {
	return row.row.response !== undefined
		? null
		: row.hidden
			? 'hidden'
			: row.rubric
				? 'rubric'
				: row.who
					? 'who'
					: 'verse';
}

/** What a row presents to the row after it: its last box, as the
 * neighbour's `before` metadata names it. */
export function rowEnd(row: FlowRow): FlowRow['after'] {
	return row.row.response !== undefined
		? null
		: row.hidden
			? 'hidden'
			: row.rubric
				? 'rubric'
				: row.translated
					? null
					: 'verse';
}

/** Partition actual rendered rows without slicing or changing the document. */
export function textFlowUnits(segments: Segment[], rows: LitanyRow[], options: FlowOptions) {
	const hasVerse = (row: LitanyRow) => segments[row.primary].type === 'verse';
	const verses = rows.flatMap((row, index) => (hasVerse(row) ? [index] : []));
	const firstVerse = verses[0];
	const lastVerse = verses.at(-1);
	const short = (row: LitanyRow) =>
		[row.primary, row.response].every(
			(index) =>
				index === undefined || (segments[index].words?.length ?? Infinity) <= SHORT_FLOW_WORDS
		);
	const boundedOpening = firstVerse !== undefined && short(rows[firstVerse]);
	const layouts: FlowRow[] = rows.map((row, index) => {
		const segment = segments[row.primary];
		const rubric = segment.type === 'rubric';
		const hidden = rubric && row.primary === 0 && options.hideOpeningRubric;
		return {
			row,
			index,
			first: index === 0,
			last: index === rows.length - 1,
			rubric,
			hidden,
			terminal: rubric && lastVerse !== undefined && index > lastVerse,
			who: !rubric && options.namesWho(row.primary),
			translated: !rubric && options.translated(row.primary),
			before: null,
			after: null
		};
	});
	layouts.forEach((row, index) => {
		row.before = index ? rowEnd(layouts[index - 1]) : null;
		row.after = layouts[index + 1] ? rowStart(layouts[index + 1]) : null;
	});

	// A join means only this boundary is inside one bounded unit. Terminal
	// rubrics deliberately have no join: backward avoidance preserves their
	// attachment without boxing a complete long preceding prayer.
	const joins = new Set<number>();
	const instructions = new Set<number>();
	if (boundedOpening) for (let index = 1; index <= firstVerse; index++) joins.add(index);
	for (let index = 0; index < layouts.length; index++) {
		if (!layouts[index].rubric || layouts[index].hidden || layouts[index].terminal) continue;
		let next = index + 1;
		while (layouts[next]?.rubric && !layouts[next].terminal) next++;
		// A long row remains free to continue, even in a multi-verse reading.
		// Its rubric keeps ordinary forward avoidance without boxing that row.
		if (next < layouts.length && hasVerse(rows[next]) && short(rows[next])) {
			for (let boundary = index + 1; boundary <= next; boundary++) joins.add(boundary);
			instructions.add(index);
		}
	}
	// A direct omnes ending answers a distinct preceding voice, including
	// an unattributed invocation. A continuous everyone prayer is not a
	// dialogue merely because its last row has that same speaker.
	const directResponse =
		lastVerse !== undefined &&
		verses.length > 1 &&
		segments[rows[lastVerse].primary].speaker === 'omnes' &&
		segments[rows[verses.at(-2)!].primary].speaker !== 'omnes';
	const response =
		lastVerse !== undefined && (options.response(rows[lastVerse].primary) || directResponse);
	const shortResponse =
		response &&
		lastVerse! > 0 &&
		rows[lastVerse!].response === undefined &&
		hasVerse(rows[lastVerse! - 1]) &&
		rows[lastVerse! - 1].response === undefined &&
		short(rows[lastVerse!]) &&
		short(rows[lastVerse! - 1]);
	if (shortResponse) joins.add(lastVerse!);
	const units: FlowUnit[] = [];
	for (const row of layouts) {
		if (joins.has(row.index)) units.at(-1)!.rows.push(row);
		else
			units.push({
				key: segments[row.row.primary].id,
				kind: row.terminal ? 'terminal' : 'row',
				rows: [row],
				keep: false
			});
	}
	for (const unit of units) {
		if (boundedOpening && unit.rows.some((row) => row.index === firstVerse)) unit.kind = 'opening';
		else if (shortResponse && unit.rows.some((row) => row.index === lastVerse))
			unit.kind = 'response';
		else if (unit.rows.some((row) => instructions.has(row.index))) unit.kind = 'instruction';
		// In a print grid, the voice label's break-after alone cannot keep
		// it with its utterance. Protect only an already bounded source row;
		// a long row must remain free to continue on the next page.
		unit.keep =
			unit.rows.length > 1 ||
			unit.kind === 'opening' ||
			(unit.rows[0].who && short(unit.rows[0].row));
	}
	// The semantic opening includes its first sacred row even when that row
	// must continue across pages. Physical compactness remains unit.keep.
	const openingEnd =
		firstVerse === undefined
			? 0
			: units.findIndex((unit) => unit.rows.some((row) => row.index === firstVerse)) + 1;
	return {
		opening: units.slice(0, openingEnd),
		continuation: units.slice(openingEnd),
		compactOpening: openingEnd > 0 && units.slice(0, openingEnd).every((unit) => unit.keep),
		responseRow: response ? lastVerse : undefined
	};
}
