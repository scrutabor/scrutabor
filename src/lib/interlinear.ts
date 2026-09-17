import type { InterlinearAlignment, SegmentGloss, Word } from './corpus';

export interface InterlinearRun {
	words: Word[];
	alignment?: InterlinearAlignment;
}

/** Join only the exceptional source spans; ordinary one-word glosses stay cheap. */
export function interlinearRuns(words: Word[], segment?: SegmentGloss): InterlinearRun[] {
	const starts = new Map(
		(segment?.alignments ?? []).map((alignment) => [alignment.words[0], alignment] as const)
	);
	const aligned = new Set((segment?.alignments ?? []).flatMap((alignment) => alignment.words));
	const byId = new Map(words.map((word) => [word.id, word] as const));
	const runs: InterlinearRun[] = [];
	for (const word of words) {
		const alignment = starts.get(word.id);
		if (alignment) {
			runs.push({
				words: alignment.words.map((id) => byId.get(id)).filter((item): item is Word => !!item),
				alignment
			});
		} else if (!aligned.has(word.id)) runs.push({ words: [word] });
	}
	return runs;
}
