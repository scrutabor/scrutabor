/** A bounded actual-PDF check for an ordinary (not raised-initial) short row.
 * It requires the COMPLETE utterance with its complete label, which is stronger
 * than matching an arbitrary first-word or six-word prefix. Long paragraphs
 * must be allowed to fragment and need a different, first-line-aware check. */
import { normalizePrintText as normal, positionedPrintWords } from './print-leads.ts';

export interface ShortPrintVoice {
	label: string;
	words: string[];
	initial: string | null;
}

export function printShortVoicePages(bbox: string, voice: ShortPrintVoice): number[] {
	if (voice.initial || !voice.words.length || voice.words.length > 12 || !normal(voice.label)) {
		throw new Error(
			'Short voice checks require 1–12 complete words, a label and no raised initial.'
		);
	}
	const source = voice.words.map(normal);
	if (source.some((word) => !word))
		throw new Error('A source word must contain letters or numbers.');
	const label = normal(voice.label);
	return [...bbox.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/g)].flatMap((page, index) => {
		const words = positionedPrintWords(page[1]);
		// Label spans may be separate PDF text blocks. Try native column order
		// and geometric line order, which reunites interlinear Latin fragments.
		const ordered = [...words].sort((a, b) => (Math.abs(a.y - b.y) < 0.5 ? a.x - b.x : a.y - b.y));
		for (const columnOrder of [words, ordered])
			for (let start = 0; start < columnOrder.length; start++) {
				const utterance = columnOrder.slice(start, start + source.length);
				if (
					utterance.length !== source.length ||
					!utterance.every((word, i) => word.text === source[i])
				)
					continue;
				const first = utterance[0];
				// Every source word must be on or below its first line, on this page.
				if (utterance.some((word) => word.y < first.y - 0.5)) continue;
				for (let from = 0; from < ordered.length; from++) {
					let text = '';
					for (let to = from; to < ordered.length && text.length < label.length; to++) {
						text += ordered[to].text;
						const row = ordered.slice(from, to + 1);
						const end = Math.max(...row.map((word) => word.yEnd));
						if (
							text === label &&
							row.every((word) => Math.abs(word.y - row[0].y) < 2) &&
							end <= first.y &&
							first.y - end < 24 &&
							Math.abs(row[0].x - first.x) < 30
						)
							return [index + 1];
					}
				}
			}
		return [];
	});
}
