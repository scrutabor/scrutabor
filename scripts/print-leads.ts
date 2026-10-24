import { execFileSync } from 'node:child_process';

/** Fail before PDF checks if their native extractor is unavailable. */
export function assertPrintTools(env = process.env): void {
	try {
		execFileSync('pdftotext', ['-v'], { stdio: 'pipe', env });
	} catch {
		throw new Error(
			'Actual PDF association checks require Poppler pdftotext. Install poppler-utils (Ubuntu) or poppler (macOS), then rerun; these checks do not skip a missing tool.'
		);
	}
}

/** Actual paper association, from Poppler's positioned PDF text. */
export interface PrintLead {
	title: string;
	guidance: string;
	words: string[];
	initial: string | null;
}
const normalized = (text: string) =>
	text
		.toLowerCase()
		.replaceAll('æ', 'ae')
		.replaceAll('œ', 'oe')
		.normalize('NFKD')
		.replace(/[^\p{L}\p{N}]/gu, '');
const decoded = (text: string) =>
	text.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (entity) => {
		const named: Record<string, string> = {
			'&amp;': '&',
			'&lt;': '<',
			'&gt;': '>',
			'&quot;': '"',
			'&apos;': "'"
		};
		return (
			named[entity] ??
			String.fromCodePoint(
				parseInt(entity.slice(2, -1).replace(/^x/i, ''), /^&#x/i.test(entity) ? 16 : 10)
			)
		);
	});
function words(xml: string) {
	return [...xml.matchAll(/<word\b([^>]*)>([\s\S]*?)<\/word>/g)].map((match) => ({
		text: normalized(decoded(match[2])),
		x: Number(match[1].match(/xMin="([^"]+)"/)?.[1] ?? 0),
		xEnd: Number(match[1].match(/xMax="([^"]+)"/)?.[1] ?? 0),
		y: Number(match[1].match(/yMin="([^"]+)"/)?.[1] ?? 0),
		yEnd: Number(match[1].match(/yMax="([^"]+)"/)?.[1] ?? 0)
	}));
}

export function printLeadPages(bbox: string, lead: PrintLead): number[] {
	const source = lead.words.map(normalized);
	if (!source.length || !normalized(lead.guidance)) return [];
	const remainder = lead.initial ? source[0].slice(normalized(lead.initial).length) : source[0];
	const expected = [remainder, ...source.slice(1)];
	return [...bbox.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/g)].flatMap((page, index) => {
		const positioned = words(page[1]);
		const joined = positioned.map((word) => word.text).join('');
		if (!joined.includes(normalized(lead.title)) || !joined.includes(normalized(lead.guidance)))
			return [];
		// Find the complete guidance's final word on this page. The sacred line
		// must follow it; a heading repeating source words cannot be the anchor.
		const guidance = normalized(lead.guidance);
		let guidanceEnd = -1;
		const title = normalized(lead.title);
		const titleEnds: number[] = [];
		for (let start = 0; start < positioned.length; start++) {
			let text = '';
			for (let end = start; end < positioned.length && text.length < title.length; end++) {
				text += positioned[end].text;
				if (text === title) titleEnds.push(positioned[end].y);
			}
		}
		for (let start = 0; start < positioned.length; start++) {
			let text = '';
			for (let end = start; end < positioned.length && text.length < guidance.length; end++) {
				text += positioned[end].text;
				if (text === guidance && titleEnds.some((y) => y < positioned[start].y))
					guidanceEnd = positioned[end].y;
			}
		}
		if (guidanceEnd < 0) return [];
		const lines = [...page[1].matchAll(/<line\b[^>]*>([\s\S]*?)<\/line>/g)].map((match) =>
			words(match[1])
		);
		for (const line of lines) {
			const start = line.findIndex((word) => word.text === remainder || word.text === source[0]);
			if (start < 0 || line[start].y <= guidanceEnd) continue;
			let actual = line.slice(start).map((word) => word.text);
			const sequence = actual[0] === source[0] ? source : expected;
			// One visual baseline may occupy several extractor line records.
			// Reunite only its adjacent, nonoverlapping left-to-right cluster.
			// The gap limit scales with normal ink, never with the raised initial.
			const normalHeight = line[start].yEnd - line[start].y;
			const fragments = lines
				.filter(
					(fragment) =>
						fragment !== line &&
						fragment.length > 0 &&
						Math.abs(fragment[0].y - line[start].y) < 0.5 &&
						fragment.at(-1)!.xEnd > line[start].x
				)
				.sort((left, right) => left[0].x - right[0].x);
			let right = line.at(-1)!.xEnd;
			for (const fragment of fragments) {
				if (fragment[0].x < right) {
					actual = [];
					break;
				}
				// A distant column is not a continuation of this line.
				if (normalHeight <= 0 || fragment[0].x - right > normalHeight * 1.5) break;
				actual.push(...fragment.map((word) => word.text));
				right = fragment.at(-1)!.xEnd;
			}
			if (actual.length < Math.min(4, source.length)) continue;
			if (!actual.every((word, i) => word === sequence[i])) continue;
			// The initial's ink must adjoin this actual remainder. A title's
			// complete first word cannot replace missing source ink below it.
			if (
				actual[0] !== source[0] &&
				!positioned.some(
					(word) =>
						word.text === normalized(lead.initial ?? '') &&
						word.y > guidanceEnd &&
						word.y <= line[start].y &&
						word.yEnd >= line[start].y &&
						word.xEnd <= line[start].x + 2 &&
						line[start].x - word.xEnd < 20
				)
			)
				continue;
			return [index + 1];
		}
		return [];
	});
}

export { normalized as normalizePrintText, words as positionedPrintWords };
