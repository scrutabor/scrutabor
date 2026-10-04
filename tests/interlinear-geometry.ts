/** Painted glyph bounds, including raised initials and wrapped captions.
 * Runs inside the page without changing its DOM or ruby layout. */
export function interlinearGeometry(container: Element) {
	const context = document.createElement('canvas').getContext('2d')!;
	const ink = (element: Element) => {
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
		const boxes: { top: number; bottom: number; left: number; right: number; baseline: number }[] =
			[];
		let node: Node | null;
		while ((node = walker.nextNode())) {
			const text = node as Text;
			const style = getComputedStyle(text.parentElement!);
			context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
			let offset = 0;
			for (const character of text.data) {
				const end = offset + character.length;
				if (character.trim()) {
					const range = document.createRange();
					range.setStart(text, offset);
					range.setEnd(text, end);
					const metrics = context.measureText(character);
					for (const box of range.getClientRects()) {
						const baseline = box.top + metrics.fontBoundingBoxAscent;
						boxes.push({
							baseline,
							top: baseline - metrics.actualBoundingBoxAscent,
							bottom: baseline + metrics.actualBoundingBoxDescent,
							left: box.left - metrics.actualBoundingBoxLeft,
							right: box.left + metrics.actualBoundingBoxRight
						});
					}
				}
				offset = end;
			}
		}
		if (
			!boxes.length ||
			boxes.some((box) => Object.values(box).some((value) => !Number.isFinite(value)))
		) {
			throw new Error(`Unmeasurable interlinear ink: ${element.textContent}`);
		}
		const rows: number[] = [];
		for (const baseline of boxes.map((box) => box.baseline).sort((a, b) => a - b)) {
			if (!rows.length || baseline - rows.at(-1)! > 2) rows.push(baseline);
		}
		return {
			count: boxes.length,
			rows: rows.length,
			baselines: rows,
			top: Math.min(...boxes.map((box) => box.top)),
			bottom: Math.max(...boxes.map((box) => box.bottom)),
			left: Math.min(...boxes.map((box) => box.left)),
			right: Math.max(...boxes.map((box) => box.right))
		};
	};
	const units = container.matches('.token, .token-group')
		? [container]
		: [...container.querySelectorAll('.verse.glossed > .token, .verse.glossed > .token-group')];
	return units
		.filter((unit) => unit.querySelector('rt') && unit.getBoundingClientRect().width)
		.map((unit) => {
			const source = unit.querySelector('.shared-base') ?? unit.querySelector('.base')!;
			const caption = unit.querySelector('.caption-content')!;
			const sourceInk = ink(source),
				captionInk = ink(caption);
			const box = unit.getBoundingClientRect();
			const sourceRange = document.createRange();
			sourceRange.selectNodeContents(source);
			const paint = getComputedStyle(unit, '::before');
			const verse = unit.closest('.verse')!;
			const verseStyle = getComputedStyle(verse);
			const marker = verse.querySelector(':scope > .mark');
			const firstAnnotatedUnit = verse.querySelector(
				':scope > .token:has(rt), :scope > .token-group:has(rt)'
			);
			const markerBaselineDelta =
				marker && unit === firstAnnotatedUnit
					? ink(marker).baselines[0] - ink(verse.querySelector('.base')!).baselines[0]
					: null;
			const unwrappedWidth = (element: Element) => {
				const style = getComputedStyle(element);
				context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
				const text = element.textContent!.replace(/\s+/g, ' ').trim();
				return (
					context.measureText(text).width +
					Math.max(0, text.length - 1) * (parseFloat(style.letterSpacing) || 0)
				);
			};
			return {
				text: unit.textContent,
				verseId: verse.id,
				markerBaselineDelta,
				bounds: { top: box.top, bottom: box.bottom, left: box.left, right: box.right },
				sourceInk,
				captionInk,
				sourceLeft: sourceRange.getClientRects()[0].left,
				captionLeft: caption.getBoundingClientRect().left,
				fontSize: parseFloat(getComputedStyle(source).fontSize),
				captionFontSize: parseFloat(getComputedStyle(caption).fontSize),
				initial: !!unit.querySelector('.initial'),
				availableWidth:
					verse.clientWidth -
					parseFloat(verseStyle.paddingLeft) -
					parseFloat(verseStyle.paddingRight),
				sourceUnwrappedWidth: unwrappedWidth(source),
				captionUnwrappedWidth: unwrappedWidth(caption),
				clearance: captionInk.top - sourceInk.bottom,
				sourceHeight: source.getBoundingClientRect().height,
				sourceLeading: parseFloat(getComputedStyle(source).lineHeight),
				captionHeight: caption.getBoundingClientRect().height,
				captionLeading: parseFloat(getComputedStyle(caption).lineHeight),
				paint:
					paint.content === 'none'
						? null
						: {
								background: paint.backgroundColor,
								left: box.left + parseFloat(paint.left),
								right: box.right - parseFloat(paint.right),
								top: box.top + parseFloat(paint.top),
								bottom: box.bottom - parseFloat(paint.bottom)
							}
			};
		});
}
