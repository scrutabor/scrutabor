export type DocumentBox = { x: number; y: number; width: number; height: number };

/** Ignore arithmetic noise from combining viewport rectangles with scrolling,
 * not layout movement. This is far below one browser layout subpixel. */
export function documentBoxDelta(actual: DocumentBox, expected: DocumentBox): DocumentBox {
	const delta = (key: keyof DocumentBox) => {
		const difference = actual[key] - expected[key];
		return Math.abs(difference) <= 0.0001 ? 0 : difference;
	};
	return { x: delta('x'), y: delta('y'), width: delta('width'), height: delta('height') };
}
