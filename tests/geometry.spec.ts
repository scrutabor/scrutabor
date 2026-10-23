import { bare as test, expect, setHelp } from './fixtures';

const PAGES = [
	'/app/pl/ordo/catechumenorum',
	'/app/pl/ordo/praeparatio',
	'/app/pl/ordinarium/credo',
	'/app/pl/ordinarium/confiteor',
	'/app/pl/orationes/pater-noster',
	'/app/pl/orationes/angelus-domini',
	'/app/pl/litaniae/lauretanae',
	'/app/pl/psalmi/118-he',
	'/app/en/ordo/canon',
	'/app/en/ordinarium/gloria',
	// Easter Sunday: one slot carries the Gradual, the Alleluia and the Sequence,
	// so a seam between two bodies is on every run, not only on a pinned day.
	'/app/pl/ordo/catechumenorum?dies=2026-04-05',
	// First Sunday of Advent, English: the Gradual's translation sources stand
	// between it and the Alleluia, so a seam kept apart by that block is on
	// every run. The day is named by URL because the undated page shows the
	// day the reader is on. The English Easter bodies carry no sources block;
	// that page keeps the three-body slot on the English matrix.
	'/app/en/ordo/catechumenorum?dies=2026-11-29',
	'/app/en/ordo/catechumenorum?dies=2026-04-05',
	// Christmas Eve, English: the slot's continuation opens with the opening
	// body's sources block, so a sourced partition is on every run.
	'/app/en/ordo/catechumenorum?dies=2028-12-24',
	'/pl'
];
const WIDTHS = [1512, 900, 390];
// Widths generate the tests below: an empty inventory must fail collection,
// not silently remove every screen and paper sweep from the suite.
if (WIDTHS.length === 0) throw new Error('Geometry sweep requires at least one width');
const MODES = [0, 2, 1];
// The proper an Ordo address names by its day. A cell that names a day must
// show that day's proper; its identity is evidence, not an assumption.
const DAY_PROPERS: Record<string, string> = {
	'2026-04-05': 'dominica-resurrectionis',
	'2026-11-29': 'dominica-i-adventus',
	'2028-12-24': 'vigilia-nativitatis'
};
const TOLERANCE = 2.5;

// These pairs deliberately change their adjacent geometry between reading
// modes: glosses, folded attachments, litany rows and the specimen panel
// have their spacing priced where those components are defined. Every other
// pair must keep the same visible gap.
const LEGITIMATE_DIFFERENCES = new Set([
	'verse|verse',
	'verse|seg-extra',
	'seg-extra|verse',
	'seg-extra|rubric',
	'rubric|verse',
	'verse|rubric',
	'seg-extra|seg-extra',
	'verse|translation-sources',
	'seg-extra|translation-sources',
	'litany-pair|litany-pair',
	'verse|litany-pair',
	'litany-pair|rubric',
	'rubric|litany-pair',
	'litany-pair|translation-sources',
	'rubric|translation-sources',
	'who|verse',
	'details|verse',
	'verse|details',
	'span|span',
	'verse|aside',
	'seg-extra|aside',
	'div|aside'
]);

// The spacing TextBody and TextFlow price in multiples of --reading. A
// speaker label stands VOICE_MARGIN + --gloss-gap above the row it names,
// and the interlinear face adds VOICE_RESERVE for the captions the previous
// verse carries below its Latin. A direction stands RUBRIC_MARGIN +
// --gloss-gap below bare Latin and STUDY_RUBRIC_SEAM below a glossed verse,
// whose box already reserves its caption and trailing line. A row's own
// tail, in --reading-bare, is VERSE_TAIL below bare Latin, TRANSLATED_TAIL
// below a stacked translation and GRID_TAIL below either cell of a bilingual
// column row; a glossed verse carries its tail inside its box. The sweep
// takes the voice reserve back before comparing modes, and every Ordo
// partition seam and the named boundaries below are held to these numbers,
// so deleting the reserve, inflating the bare voice margin or moving any
// partition seam fails here.
const VOICE_MARGIN = 0.517;
const VOICE_RESERVE = 0.86;
const RUBRIC_MARGIN = 1;
const STUDY_RUBRIC_SEAM = 0.55;
const TRANSLATED_TAIL = 0.9;
const VERSE_TAIL = 0.62;
const GRID_TAIL = 0.55;
// A translation-sources block between two bodies: its own margins (TextBody).
const SOURCES_ABOVE = 1.1;
const SOURCES_BELOW = 0.55;
// Browser layout quantises lengths to 1/64 px; a priced constant moves far more.
const EXACT = 0.1;
// Paper does not print the translation sources, so two bodies of a slot are
// priced by their link there: a direction head stands PRINT_RUBRIC_SEAM and
// a speaker label PRINT_VOICE_SEAM times --reading below the row before it
// (TextFlow's print rules), at every width.
const PRINT_RUBRIC_SEAM = 0.68;
const PRINT_VOICE_SEAM = 0.5;
const PRINT_PAGES = [
	'/app/en/ordo/catechumenorum?dies=2026-11-29',
	'/app/pl/ordo/catechumenorum?dies=2026-11-29'
];

type Kind = 'verse' | 'rubric' | 'who';

interface Boundary {
	before: string;
	after: string;
	kind: Kind;
	/** Present only when the suite runs on this day (SCRUTABOR_TODAY). */
	day?: string;
}

const PINNED = (globalThis as { process?: { env: Record<string, string | undefined> } }).process
	?.env.SCRUTABOR_TODAY;
const boundariesFor = (url: string) =>
	(BOUNDARIES[url] ?? []).filter((boundary) => !boundary.day || boundary.day === PINNED);

// Permanent source rows at the three Ordo seams whose wrappers hold their
// margins differently in each mode, the interior rhythm the first seam must
// keep, one interior voice change, and one seam between two bodies of a slot. A seam is measured between the rows
// the opening and the continuation render, never between the wrappers. A
// speaker label is addressed through the row it names, because it carries
// no id of its own.
const BOUNDARIES: Record<string, Boundary[]> = {
	'/app/pl/ordo/catechumenorum': [
		{ before: 'kyrie-s02', after: 'kyrie-s03', kind: 'verse' },
		{ before: 'kyrie-s03', after: 'kyrie-s04', kind: 'verse' },
		// The Gradual and the Alleluia of the First Sunday of Advent share one
		// slot as two bodies; their seam is the second body's opening direction.
		{
			before: 'dominica-i-adventus-graduale-s02',
			after: 'dominica-i-adventus-alleluia-s01',
			kind: 'rubric',
			day: '2026-11-29'
		}
	],
	'/app/pl/ordo/praeparatio': [{ before: 'introibo-s02', after: 'introibo-s03', kind: 'rubric' }],
	'/app/en/ordo/canon': [
		{ before: 'praefatio-dialogus-s02', after: 'praefatio-dialogus-s03', kind: 'who' },
		{ before: 'per-ipsum-s08', after: 'per-ipsum-s09', kind: 'who' }
	]
};

interface Gap {
	id: string;
	key: string;
	gap: number;
	/** The interlinear verse before a speaker label carries the voice reserve. */
	reserve: boolean;
	/** Measured between rendered rows across an Ordo partition seam. */
	projected: boolean;
}

interface Scale {
	reading: number;
	bare: number;
	glossGap: number;
	step: string;
	rootFontSize: string;
}

interface Measured {
	before: string;
	after: string;
	kind: string;
	found: boolean;
	gap: number;
	translated: boolean;
	grid: boolean;
}

interface GeometryProbe {
	gaps: Gap[];
	overflow: string[];
	targets: string[];
	overlaps: string[];
	controls: number;
	/** Physical pairs met again under another contents wrapper and skipped. */
	duplicates: number;
	/** Physical pairs recorded more than once; must stay zero. */
	repeated: number;
	uniqueIds: boolean;
	/** Visible Ordo openings with a continuation, counted from the DOM alone. */
	partitions: number;
	/** Those partitions measured between their rendered rows. */
	projected: number;
	/** Those whose continuation holds no row, only a trailing block such as the sources. */
	trailing: number;
	/** Seams between two bodies of one slot: expected from the bodies' ids, measured, or kept apart by the translation sources between them. */
	bodySeams: number;
	projectedBodies: number;
	blockedBodies: number;
	/** Sources blocks with a row before and after them in one continuation, counted from the DOM alone. */
	sourcesBetweenBodies: number;
	/** Partitions whose continuation opens with the opening body's sources block before the next body's rows. */
	sourcedPartitions: number;
	seams: Measured[];
	scale: Scale;
	boundaries: Measured[];
}

/** Runs inside the page. Everything it needs is defined here, so the
 * function serialises; the boundaries to look up arrive as its argument. */
function probeGeometry(boundaries: Boundary[]): GeometryProbe {
	const classify = (element: Element) => {
		const known = [
			'rubric-narrative',
			'rubric-la',
			'rubric',
			'seg-extra',
			'verse',
			'part-note',
			'part-head',
			'part-text',
			'litany-pair',
			'who',
			'unfold',
			'tabella',
			'help-row',
			'about-pill',
			'translation-sources',
			'pager',
			'subtitle',
			'movement-nav',
			'specimen'
		];
		return known.find((name) => element.classList.contains(name)) ?? element.tagName.toLowerCase();
	};
	const anchorId = (element: Element) => {
		let current: Element | null = element;
		while (current && current !== document.body) {
			if (current.id) return current.id;
			current = current.parentElement;
		}
		return '';
	};
	const visible = (element: Element) => {
		const box = element.getBoundingClientRect();
		return box.height > 0 && box.width > 0 && getComputedStyle(element).position !== 'fixed';
	};
	// Print boundaries have no screen box. Follow the actual box children
	// through contents wrappers before comparing gaps.
	const boxChildren = (parent: Element): Element[] =>
		[...parent.children].flatMap((child) =>
			getComputedStyle(child).display === 'contents' ? boxChildren(child) : [child]
		);
	// A token resolved by layout, so every expectation scales with the
	// reader's own size knob and never with the margin under test.
	const token = (name: string, factor: string) => {
		const gauge = document.createElement('div');
		gauge.style.cssText = `position:absolute;top:0;left:0;visibility:hidden;width:calc(var(${name}) * ${factor})`;
		document.body.append(gauge);
		const width = gauge.getBoundingClientRect().width;
		gauge.remove();
		return width;
	};
	const scale: Scale = {
		reading: token('--reading', '1'),
		bare: token('--reading-bare', '1'),
		glossGap: token('--gloss-gap', '100px') / 100,
		step: document.documentElement.dataset.reading ?? '',
		rootFontSize: getComputedStyle(document.documentElement).fontSize
	};
	// Ordered endpoints: a source row by its permanent id, a speaker label by
	// the row it names, a translation by the row it renders.
	const endpoint = (element: Element): string => {
		if (element.classList.contains('who')) {
			const named = element.nextElementSibling;
			return named?.classList.contains('verse') && named.id ? `speaker:${named.id}` : '';
		}
		if (element.classList.contains('seg-extra')) {
			const source = element.previousElementSibling;
			return source?.classList.contains('verse') && source.id ? `translation:${source.id}` : '';
		}
		return element.id;
	};
	// A rendered row is everything its flow row places; in the bilingual
	// columns that is the Latin and its translation side by side, and the
	// row ends where the taller of the two ends.
	const rowOf = (element: Element) => {
		const row = element.closest('.flow-row');
		return row ? boxChildren(row).filter(visible) : [element];
	};
	const rowBottom = (element: Element) =>
		Math.max(...rowOf(element).map((member) => member.getBoundingClientRect().bottom));
	const rows = (container: Element) =>
		[...container.querySelectorAll('.flow-row')]
			.map((row) => boxChildren(row).filter(visible))
			.filter((members) => members.length);
	const isWrapper = (element: Element) =>
		element.classList.contains('measure') || element.classList.contains('bilingual');
	const inGrid = (element: Element) => {
		const columns = element.closest('.columns');
		return !!columns && getComputedStyle(columns).display === 'grid';
	};
	const translatedRow = (element: Element) =>
		rowOf(element).some((member) => member.classList.contains('seg-extra'));

	const out: GeometryProbe = {
		gaps: [],
		overflow: [],
		targets: [],
		overlaps: [],
		controls: 0,
		duplicates: 0,
		repeated: 0,
		uniqueIds: false,
		partitions: 0,
		projected: 0,
		trailing: 0,
		bodySeams: 0,
		projectedBodies: 0,
		blockedBodies: 0,
		sourcesBetweenBodies: 0,
		sourcedPartitions: 0,
		seams: [],
		scale,
		boundaries: []
	};
	const documentBox = document.documentElement;
	if (documentBox.scrollWidth > documentBox.clientWidth + 1) {
		out.overflow.push(
			`page scrolls sideways by ${documentBox.scrollWidth - documentBox.clientWidth}px`
		);
	}

	const scope = document.querySelector('main') ?? document.body;
	const parents = [scope, ...scope.querySelectorAll('*')];
	const ordinal = new Map<Element, number>();
	const number = (element: Element) => {
		if (!ordinal.has(element)) ordinal.set(element, ordinal.size);
		return ordinal.get(element)!;
	};
	const recorded = new Set<string>();
	const wasRecorded = (first: Element, second: Element) =>
		recorded.has(`${number(first)}:${number(second)}`);
	const record = (
		first: Element,
		second: Element,
		parent: Element,
		gap: number,
		projected: boolean
	) => {
		const token = `${number(first)}:${number(second)}`;
		if (recorded.has(token)) out.repeated += 1;
		recorded.add(token);
		const key = `${classify(first)}|${classify(second)}`;
		const from = endpoint(first);
		const to = endpoint(second);
		out.gaps.push({
			id:
				from && to
					? `${key}:${from}→${to}`
					: `${key}:${second.id || anchorId(second) || classify(parent)}`,
			key,
			gap: Number(gap.toFixed(1)),
			reserve: key === 'verse|who' && first.classList.contains('glossed'),
			projected
		});
	};
	// The same two boxes are adjacent under every contents wrapper between
	// them and their box ancestor; measure each physical pair once.
	const seen = new Map<Element, Set<Element>>();
	for (const parent of parents) {
		const children = boxChildren(parent).filter(visible);
		for (let index = 0; index < children.length - 1; index++) {
			const first = children[index];
			const second = children[index + 1];
			if (seen.get(first)?.has(second)) {
				out.duplicates += 1;
				continue;
			}
			(seen.get(first) ?? seen.set(first, new Set()).get(first)!).add(second);
			// Two bodies' flow wrappers meet at a body seam, which is measured
			// between their rows below; their edges hold the seam's margins
			// inside or outside the box by face, like the partition wrappers.
			if (isWrapper(first) && isWrapper(second)) continue;
			if (first.classList.contains('part-text') && second.classList.contains('part-continuation')) {
				// An Ordo part's opening and continuation are one text. Their
				// wrappers keep margins inside or outside the box by mode, so
				// the seam is the gap between the last row the opening renders
				// and the first row of the continuation, classified as those
				// rows are and judged below against the priced spacing. A
				// partition without rows on one side is reported, never
				// measured between its wrappers.
				const tail = rows(first).at(-1)?.at(-1);
				if (!tail) {
					out.overlaps.push('an Ordo part opening renders no row at its seam');
					continue;
				}
				const head = rows(second)[0]?.[0];
				if (!head) {
					// A continuation may hold only the translation sources. That
					// trailing block follows the opening's last row under its own
					// class, which the comparison already knows how to treat.
					const trailing = boxChildren(second).filter(visible)[0];
					if (!trailing?.classList.contains('translation-sources')) {
						out.overlaps.push('an Ordo part continuation renders no row at its seam');
						continue;
					}
					out.trailing += 1;
					record(
						tail,
						trailing,
						parent,
						trailing.getBoundingClientRect().top - rowBottom(tail),
						true
					);
					continue;
				}
				const leading = boxChildren(second).filter(visible)[0];
				if (leading?.classList.contains('translation-sources') && !leading.contains(head)) {
					// The opening's body ends at its sources block and the next body
					// follows it: both halves are judged against the block's margins.
					out.sourcedPartitions += 1;
					const box = leading.getBoundingClientRect();
					out.seams.push(
						{
							before: endpoint(tail) || classify(tail),
							after: 'sources',
							kind: 'sources-above',
							found: true,
							gap: box.top - rowBottom(tail),
							translated: translatedRow(tail),
							grid: inGrid(tail)
						},
						{
							before: 'sources',
							after: endpoint(head) || classify(head),
							kind: 'sources-below',
							found: true,
							gap: head.getBoundingClientRect().top - box.bottom,
							translated: false,
							grid: inGrid(head)
						}
					);
					continue;
				}
				out.projected += 1;
				const gap = head.getBoundingClientRect().top - rowBottom(tail);
				record(tail, head, parent, gap, true);
				out.seams.push({
					before: endpoint(tail) || classify(tail),
					after: endpoint(head) || classify(head),
					kind: classify(head),
					found: true,
					gap,
					translated: translatedRow(tail),
					grid: inGrid(tail)
				});
				continue;
			}
			const firstBox = first.getBoundingClientRect();
			const secondBox = second.getBoundingClientRect();
			if (secondBox.top < firstBox.bottom - 1) continue;
			record(first, second, parent, secondBox.top - firstBox.bottom, false);
		}
	}
	// Two boundaries with one identity would hide the second behind the
	// first. Number them in document order instead, so each is compared.
	const counts = new Map<string, number>();
	for (const gap of out.gaps) counts.set(gap.id, (counts.get(gap.id) ?? 0) + 1);
	const ordinals = new Map<string, number>();
	for (const gap of out.gaps) {
		if ((counts.get(gap.id) ?? 0) < 2) continue;
		const next = (ordinals.get(gap.id) ?? 0) + 1;
		ordinals.set(gap.id, next);
		gap.id = `${gap.id}#${next}`;
	}
	out.uniqueIds = new Set(out.gaps.map((gap) => gap.id)).size === out.gaps.length;
	// The partitions the page renders, counted without the traversal above,
	// so that a projection skipped in any mode is caught by the comparison.
	for (const continuation of scope.querySelectorAll('.part-text.part-continuation')) {
		if (!visible(continuation)) continue;
		const opening = continuation.parentElement?.querySelector(
			':scope > .print-opening > .part-text, :scope > .part-text:not(.part-continuation)'
		);
		if (opening && visible(opening)) out.partitions += 1;
	}
	// SEVERAL BODIES IN ONE SLOT. The Gradual and the Alleluia are separate
	// documents inside one continuation; every row belongs to the body whose
	// slug prefixes its segment ids. Where the slug changes between two
	// consecutive rows the bodies meet, and that seam is priced like any
	// row boundary. The expected count comes from the ids alone.
	const slugOf = (members: Element[]) => {
		const owner =
			members.find((member) => member.id) ??
			members.map((member) => member.querySelector('[id]')).find(Boolean);
		return (owner?.id ?? '').replace(/-(s|v)\d+$/, '');
	};
	for (const continuation of scope.querySelectorAll('.part-text.part-continuation')) {
		if (!visible(continuation)) continue;
		const slugs = new Set(
			[...continuation.querySelectorAll('.verse[id], .rubric[id]')].map((element) =>
				element.id.replace(/-(s|v)\d+$/, '')
			)
		);
		out.bodySeams += Math.max(0, slugs.size - 1);
		let previous: { slug: string; members: Element[] } | null = null;
		let blocked: Element | null = null;
		for (const child of continuation.children) {
			const childRows = /^(flow-unit|measure|bilingual)$/.test(child.className.split(' ')[0])
				? rows(child)
				: [];
			if (!childRows.length) {
				// A block without rows between two bodies keeps them apart; only
				// the translation sources may do so. After the last body it is a tail.
				// A hidden block (the sources on paper) keeps nothing apart.
				if (visible(child)) blocked = child;
				continue;
			}
			for (const members of childRows) {
				const slug = slugOf(members);
				if (previous && previous.slug !== slug && blocked) {
					out.blockedBodies += 1;
					if (!blocked.classList.contains('translation-sources')) {
						out.overlaps.push(
							`two bodies of one slot are kept apart by an unexplained block (${blocked.className})`
						);
					} else {
						// The sources block keeps its own margins above and below; both
						// halves of the seam are judged against them.
						const tail = previous.members.at(-1)!;
						const head = members[0];
						const box = blocked.getBoundingClientRect();
						out.seams.push(
							{
								before: endpoint(tail) || classify(tail),
								after: 'sources',
								kind: 'sources-above',
								found: true,
								gap: box.top - rowBottom(tail),
								translated: translatedRow(tail),
								grid: inGrid(tail)
							},
							{
								before: 'sources',
								after: endpoint(head) || classify(head),
								kind: 'sources-below',
								found: true,
								gap: head.getBoundingClientRect().top - box.bottom,
								translated: false,
								grid: inGrid(head)
							}
						);
					}
				} else if (previous && previous.slug !== slug) {
					const tail = previous.members.at(-1)!;
					const head = members[0];
					out.projectedBodies += 1;
					const gap = head.getBoundingClientRect().top - rowBottom(tail);
					// In the interlinear face the two rows are box siblings and
					// the walk above already measured them; judge the seam once.
					if (!wasRecorded(tail, head)) record(tail, head, continuation, gap, true);
					out.seams.push({
						before: endpoint(tail) || classify(tail),
						after: endpoint(head) || classify(head),
						kind: classify(head),
						found: true,
						gap,
						translated: translatedRow(tail),
						grid: inGrid(tail)
					});
				}
				previous = { slug, members };
				blocked = null;
			}
		}
		// Counted from the DOM alone: sources blocks with a row before and after.
		const children = [...continuation.children];
		const holdsRows = (child: Element) =>
			/^(flow-unit|measure|bilingual)$/.test(child.className.split(' ')[0]) &&
			rows(child).length > 0;
		out.sourcesBetweenBodies += children.filter(
			(child, index) =>
				child.classList.contains('translation-sources') &&
				visible(child) &&
				children.slice(0, index).some(holdsRows) &&
				children.slice(index + 1).some(holdsRows)
		).length;
	}

	for (const boundary of boundaries) {
		const before = document.getElementById(boundary.before);
		const named = document.getElementById(boundary.after);
		const after = boundary.kind === 'who' ? named?.previousElementSibling : named;
		const measured: Measured = {
			before: boundary.before,
			after: boundary.after,
			kind: boundary.kind,
			found: !!before && !!after && (boundary.kind !== 'who' || after.classList.contains('who')),
			gap: NaN,
			translated: false,
			grid: false
		};
		if (measured.found && before && after) {
			measured.gap = after.getBoundingClientRect().top - rowBottom(before);
			measured.translated = translatedRow(before);
			measured.grid = inGrid(before);
		}
		out.boundaries.push(measured);
	}

	const controls = document.querySelectorAll(
		'.tabella button, .tabella select, .about-pill, .pager a, .unfold, .refold'
	);
	out.controls = controls.length;
	for (const control of controls) {
		const box = control.getBoundingClientRect();
		if (box.height > 0 && box.height < 23) {
			out.targets.push(`${classify(control)} h=${box.height.toFixed(0)}`);
		}
	}

	return out;
}

/** The gap a boundary must show in this mode, from the priced constants and
 * the resolved tokens alone. A verse seam equals the tail its face prices
 * for the row before it. */
function expectedBoundary(measured: Measured, mode: number, scale: Scale): number | null {
	const voice = scale.reading * (VOICE_MARGIN + scale.glossGap);
	const tail = scale.bare * (measured.translated ? TRANSLATED_TAIL : VERSE_TAIL);
	if (measured.kind === 'who') {
		if (mode === 1) return voice + scale.reading * VOICE_RESERVE;
		if (mode === 0 || measured.grid) return voice;
		return Math.max(tail, voice);
	}
	if (measured.kind === 'rubric') {
		return mode === 1
			? scale.reading * STUDY_RUBRIC_SEAM
			: scale.reading * (RUBRIC_MARGIN + scale.glossGap);
	}
	if (measured.kind === 'sources-above') return scale.reading * SOURCES_ABOVE;
	if (measured.kind === 'sources-below') return scale.reading * SOURCES_BELOW;
	if (measured.kind !== 'verse') return null;
	if (mode === 1) return 0;
	if (mode === 0) return scale.bare * VERSE_TAIL;
	return measured.grid ? scale.bare * GRID_TAIL : tail;
}

/** Compare one page at one width across the modes measured. Returns how many
 * named boundaries and how many projected seams were judged, so a caller
 * can prove that neither count is zero or short. */
function compareModes(
	url: string,
	width: number,
	perMode: Record<number, GeometryProbe>,
	findings: string[]
): { boundaries: number; seams: number } {
	const byId: Record<string, Record<number, Gap>> = {};
	const bases: Record<string, { key: string; counts: Record<number, number> }> = {};
	for (const mode of MODES) {
		if (!perMode[mode].uniqueIds)
			findings.push(`${url} @${width} m${mode}: boundary identities collide`);
		for (const gap of perMode[mode].gaps) {
			(byId[gap.id] ??= {})[mode] = gap;
			const entry = (bases[gap.id.replace(/#\d+$/, '')] ??= { key: gap.key, counts: {} });
			entry.counts[mode] = (entry.counts[mode] ?? 0) + 1;
		}
	}
	// Numbered boundaries are paired by document order. That pairing is only
	// sound while every mode names the same number of boundaries under one
	// base identity, whether it numbers them or stands alone; otherwise the
	// ordinals would compare strangers, and the difference is reported.
	const unstable = new Set<string>();
	for (const [base, entry] of Object.entries(bases)) {
		const counts = Object.values(entry.counts);
		if (counts.length < 2 || new Set(counts).size < 2 || LEGITIMATE_DIFFERENCES.has(entry.key)) {
			continue;
		}
		unstable.add(base);
		findings.push(
			`${url} @${width}: the boundaries named ${base} differ in number between modes: ${Object.entries(
				entry.counts
			)
				.map(([mode, count]) => `m${mode}=${count}`)
				.join(' ')}`
		);
	}
	for (const [id, modes] of Object.entries(byId)) {
		const entries = Object.entries(modes).map(([mode, gap]) => [Number(mode), gap] as const);
		if (entries.length < 2 || LEGITIMATE_DIFFERENCES.has(entries[0][1].key)) continue;
		if (unstable.has(id.replace(/#\d+$/, ''))) continue;
		const values = entries.map(
			([mode, gap]) => gap.gap - (gap.reserve ? VOICE_RESERVE * perMode[mode].scale.reading : 0)
		);
		if (Math.max(...values) - Math.min(...values) > TOLERANCE) {
			findings.push(
				`${url} @${width}: gap ${id} differs: ${entries
					.map(
						([mode, gap], index) =>
							`m${mode}=${gap.gap}${gap.reserve ? ` (${values[index].toFixed(1)} without the voice reserve)` : ''}`
					)
					.join(' ')}`
			);
		}
	}
	// One judgement, one count: the coverage counts below come from here.
	const judge = (mode: number, measured: Measured, what: string): number => {
		const name = `${url} @${width} m${mode}: ${what} ${measured.before}→${measured.after}`;
		if (!measured.found) {
			findings.push(`${name} is not on the page`);
			return 1;
		}
		const expected = expectedBoundary(measured, mode, perMode[mode].scale);
		if (expected === null || !Number.isFinite(expected)) {
			findings.push(`${name} (${measured.kind}) has no priced spacing to equal`);
		} else if (Math.abs(measured.gap - expected) > EXACT) {
			findings.push(`${name} is ${measured.gap.toFixed(2)}px, expected ${expected.toFixed(2)}px`);
		}
		return 1;
	};
	let boundaries = 0;
	let seams = 0;
	for (const mode of MODES) {
		for (const measured of perMode[mode].boundaries) {
			boundaries += judge(mode, measured, 'boundary');
		}
		for (const measured of perMode[mode].seams) {
			seams += judge(mode, measured, 'seam');
		}
	}
	return { boundaries, seams };
}

/** Load one page in one mode and measure it. The reading size is bound
 * before navigation and read back from the page, never assumed. */
async function measure(
	page: import('@playwright/test').Page,
	url: string,
	mode: number,
	step: 'normal' | 'larger' | 'largest'
): Promise<GeometryProbe> {
	await page.evaluate(
		([value, size]) => {
			localStorage.setItem('scrutabor-help', String(value));
			localStorage.setItem('scrutabor-reading', size);
			// The Ordo remembers the day a reader chose for the rest of their
			// day. A cell must show the day its own address names, or today's,
			// never the one the previous cell chose.
			localStorage.removeItem('scrutabor-day');
		},
		[mode, step] as const
	);
	await page.goto(url);
	await page.waitForSelector('html[data-hydrated]', { state: 'attached' });
	await expect(page.locator('html')).toHaveAttribute('data-help', String(mode));
	await expect(page.locator('html')).toHaveAttribute('data-reading', step);
	await expect(page.locator('main')).toBeVisible();
	// A dated cell must show the proper its address names. "Nothing is loading"
	// is also true before the day picker has chosen and on a page showing another
	// day, so the whole state is polled together; a failure prints what the page
	// showed instead (address, day label, picker, loading and failure counts).
	const named = DAY_PROPERS[new URL(url, 'http://localhost').searchParams.get('dies') ?? ''];
	if (named) {
		await expect
			.poll(
				() =>
					page.evaluate((prefix) => {
						const state = {
							href: location.href,
							day: document.querySelector('#day-value')?.textContent?.trim() ?? null,
							applied: document.querySelector('.day-open')?.getAttribute('aria-busy') === 'false',
							busy: document.querySelector('main')?.getAttribute('aria-busy') === 'true',
							loading: document.querySelectorAll('.part-loading, .part.loading').length,
							failed: document.querySelectorAll('main p.part-note[role="status"]').length,
							named: document.querySelector(`main .part [id^="${prefix}-"]`) !== null
						};
						const shown =
							state.applied && !state.busy && !state.loading && !state.failed && state.named;
						return shown ? 'shows its proper' : JSON.stringify(state);
					}, named),
				{ timeout: 20_000, message: `${url} must show the proper of ${named}` }
			)
			.toBe('shows its proper');
	}
	// An Ordo slot's proper arrives after hydration. Measure only once the
	// page itself says nothing is still loading and no slot has given up;
	// other pages carry no such state and pass at once.
	await expect(page.locator('main')).not.toHaveAttribute('aria-busy', 'true');
	await expect(page.locator('.part-loading, .part.loading')).toHaveCount(0);
	await expect(page.locator('main p.part-note[role="status"]')).toHaveCount(0);
	if (named) await expect(page.locator(`main .part [id^="${named}-"]`).first()).toBeAttached();
	await page.evaluate(() => document.fonts.ready);
	const data = await page.evaluate(probeGeometry, boundariesFor(url));
	expect(data.scale.step).toBe(step);
	expect(data.scale.reading, 'the reading token must resolve').toBeGreaterThan(0);
	expect(data.scale.bare).toBeGreaterThan(0);
	expect(data.scale.glossGap).toBeGreaterThan(0);
	return data;
}

/** All pages and modes at one width and reading size. Every batch retains
 * the complete seam inventory and all of its non-vacuity checks. */
async function sweep(
	page: import('@playwright/test').Page,
	width: number,
	step: 'normal' | 'larger' | 'largest',
	normal: Scale | null
) {
	const expectedRuns = PAGES.length * MODES.length;
	const expectedBoundaries =
		PAGES.reduce((sum, url) => sum + boundariesFor(url).length, 0) * MODES.length;
	const findings: string[] = [];
	const emptyRuns: string[] = [];
	let runs = 0;
	let gapProbes = 0;
	let controlProbes = 0;
	let duplicates = 0;
	let repeated = 0;
	let partitions = 0;
	let projected = 0;
	let trailing = 0;
	let bodySeams = 0;
	let projectedBodies = 0;
	let blockedBodies = 0;
	let sourcesBetweenBodies = 0;
	let sourcedPartitions = 0;
	let judgedBoundaries = 0;
	let judgedSeams = 0;

	await page.setViewportSize({ width, height: 1000 });
	for (const url of PAGES) {
		const perMode: Record<number, GeometryProbe> = {};

		for (const mode of MODES) {
			const data = await measure(page, url, mode, step);
			if (normal) {
				// The larger steps scale the root; every token follows it.
				const ratio = parseFloat(data.scale.rootFontSize) / parseFloat(normal.rootFontSize);
				expect(ratio, 'the page applies a larger root size').toBeGreaterThan(1);
				expect(Math.abs(data.scale.reading - normal.reading * ratio)).toBeLessThan(EXACT);
			}
			runs += 1;
			gapProbes += data.gaps.length;
			controlProbes += data.controls;
			duplicates += data.duplicates;
			repeated += data.repeated;
			partitions += data.partitions;
			projected += data.projected;
			trailing += data.trailing;
			bodySeams += data.bodySeams;
			projectedBodies += data.projectedBodies;
			blockedBodies += data.blockedBodies;
			sourcesBetweenBodies += data.sourcesBetweenBodies;
			sourcedPartitions += data.sourcedPartitions;
			if (!data.gaps.length) emptyRuns.push(`${url} @${width} m${mode}`);
			perMode[mode] = data;
			for (const issue of [...data.overflow, ...data.targets, ...data.overlaps]) {
				findings.push(`${url} @${width} m${mode}: ${issue}`);
			}
		}

		const judged = compareModes(url, width, perMode, findings);
		judgedBoundaries += judged.boundaries;
		judgedSeams += judged.seams;
	}

	expect(runs, 'page-width-mode coverage').toBe(expectedRuns);
	expect(gapProbes, 'adjacent-block probes must not be vacuous').toBeGreaterThan(0);
	expect(controlProbes, 'control probes must not be vacuous').toBeGreaterThan(0);
	expect(
		duplicates,
		'contents wrappers repeat physical pairs; each must be measured once'
	).toBeGreaterThan(0);
	expect(repeated, 'no physical pair may be recorded twice').toBe(0);
	expect(partitions, 'Ordo partitions must be on the matrix').toBeGreaterThan(0);
	expect(bodySeams, 'slots with several bodies must be on the matrix').toBeGreaterThan(0);
	expect(
		blockedBodies,
		'a seam kept apart by a sources block must be on the matrix'
	).toBeGreaterThan(0);
	expect(
		sourcedPartitions,
		'a partition opened by a sources block must be on the matrix'
	).toBeGreaterThan(0);
	expect(
		projected + trailing + sourcedPartitions,
		'every Ordo partition must be measured between rows'
	).toBe(partitions);
	expect(
		projectedBodies + blockedBodies,
		'every seam between two bodies of a slot must be measured'
	).toBe(bodySeams);
	expect(
		blockedBodies,
		'a body seam is kept apart only by a sources block that is really there'
	).toBe(sourcesBetweenBodies);
	expect(judgedSeams, 'every projected seam must be judged').toBe(
		projected + projectedBodies + 2 * (blockedBodies + sourcedPartitions)
	);
	expect(judgedBoundaries, 'named boundary coverage').toBe(expectedBoundaries);
	expect(emptyRuns, 'every matrix cell must measure adjacent blocks').toEqual([]);
	expect(findings, findings.join('\n')).toEqual([]);
}

// The priced constants are multiples of --reading, so every seam and voice
// change must hold at every size the reader can choose, not only at the
// default. The page's own root size, measured at the default first, says
// what the larger steps are. Width-sized batches give each scenario its own
// timeout and let existing sweep shards balance the same complete matrix.
for (const step of ['normal', 'larger', 'largest'] as const) {
	for (const width of WIDTHS) {
		test(`reading modes preserve the book geometry (${step}, ${width}px) @online @sweep`, async ({
			page
		}) => {
			test.setTimeout(240_000);
			expect(PAGES.length).toBeGreaterThan(0);
			expect(WIDTHS.length).toBeGreaterThan(0);
			expect(MODES.length).toBeGreaterThan(0);
			expect(Object.keys(BOUNDARIES).every((url) => PAGES.includes(url))).toBe(true);
			await page.goto('/app/pl');
			await page.evaluate(() => localStorage.setItem('scrutabor-theme', 'light'));
			await page.setViewportSize({ width, height: 1000 });
			const normal = step === 'normal' ? null : await measure(page, PAGES[0], MODES[0], 'normal');
			await sweep(page, width, step, normal?.scale ?? null);
		});
	}
}

// On paper the translation sources are not printed, so the seam between the
// Gradual and the Alleluia of the First Sunday of Advent (a direction head
// after a body that shows its sources on screen) must be priced by the link
// between the two bodies, not left at zero as the slot's edges are.
for (const width of WIDTHS) {
	test(`paper keeps the seam between two bodies of a slot (${width}px) @online @sweep`, async ({
		page
	}) => {
		test.setTimeout(120_000);
		await page.goto('/app/pl');
		await page.evaluate(() => localStorage.setItem('scrutabor-theme', 'light'));
		await page.emulateMedia({ media: 'print' });
		let judged = 0;
		await page.setViewportSize({ width, height: 1000 });
		for (const url of PRINT_PAGES) {
			const data = await measure(page, url, 2, 'normal');
			expect(
				data.bodySeams,
				`${url} @${width}: the slot holds two bodies on paper`
			).toBeGreaterThan(0);
			expect(data.blockedBodies, `${url} @${width}: paper prints no block between bodies`).toBe(0);
			expect(data.sourcesBetweenBodies).toBe(0);
			const seams = data.seams.filter(
				(seam) =>
					/dominica-i-adventus-graduale-s02$/.test(seam.before) &&
					/dominica-i-adventus-alleluia-s01$/.test(seam.after)
			);
			expect(seams.length, `${url} @${width}: the Advent body seam is measured on paper`).toBe(1);
			for (const seam of seams) {
				const factor =
					seam.kind === 'rubric' ? PRINT_RUBRIC_SEAM : seam.kind === 'who' ? PRINT_VOICE_SEAM : NaN;
				const expected = data.scale.reading * factor;
				expect(Number.isFinite(expected), `${url} @${width}: paper seam kind ${seam.kind}`).toBe(
					true
				);
				expect(
					Math.abs(seam.gap - expected),
					`${url} @${width} paper: seam ${seam.before}→${seam.after} is ${seam.gap.toFixed(2)}px, expected ${expected.toFixed(2)}px`
				).toBeLessThan(EXACT);
				judged += 1;
			}
		}
		expect(judged, 'paper body seams judged').toBe(PRINT_PAGES.length);
	});
}

// A shared gloss under a construction that OPENS the verse sits on the same
// row as every other gloss of that verse, at every reading size. The raised
// initial's extra height is absorbed by its own token, so the shared
// annotation must not take back the lift a single raised word needs; when it
// did, `stał się` sat 4px above its row and 5.6px at the largest size.
for (const size of ['normal', 'largest'] as const) {
	for (const [lang, formulary, text] of [
		['pl', 'dominica-ii-post-pentecosten', 'dominica-ii-post-pentecosten-introitus'],
		['en', 'dominica-ii-post-pentecosten', 'dominica-ii-post-pentecosten-introitus']
	] as const) {
		test(`a shared gloss under a raised initial keeps its row (${lang}, ${size})`, async ({
			page
		}) => {
			await page.addInitScript((step) => localStorage.setItem('scrutabor-reading', step), size);
			await page.goto(`/app/${lang}/formularium/${formulary}#text-proprium-${text}`);
			await page.waitForSelector('html[data-hydrated]', { state: 'attached' });
			await setHelp(page, 1);
			await page.evaluate(() => document.fonts.ready);
			const rows = await page.evaluate((id) => {
				const verse = document.getElementById(`text-proprium-${id}`)!.querySelector('.verse')!;
				const group = verse.querySelector('.token-group')!;
				const top = verse.getBoundingClientRect().top;
				const annotations = [...verse.querySelectorAll('rt')];
				const shared = group.querySelector('rt')!;
				const next = annotations[annotations.indexOf(shared) + 1];
				return {
					opensTheVerse: verse.querySelector('.token-group, .token') === group,
					raised: !!group.querySelector('.initial'),
					shared: shared.getBoundingClientRect().top - top,
					neighbour: next.getBoundingClientRect().top - top
				};
			}, text);
			expect(rows.opensTheVerse).toBe(true);
			expect(rows.raised, 'the construction carries the raised initial').toBe(true);
			expect(Math.abs(rows.shared - rows.neighbour)).toBeLessThan(0.75);
		});
	}
}
