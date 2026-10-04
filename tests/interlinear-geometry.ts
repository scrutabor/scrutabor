/** Painted glyph bounds, including raised initials and wrapped captions.
 * Runs inside the page without changing its DOM or ruby layout. */
export function interlinearGeometry(container: Element) {
	const context = document.createElement('canvas').getContext('2d')!;
	type Bounds = { top: number; bottom: number; left: number; right: number };
	type Clip = { ancestor: string; axis: string; start: number; end: number };
	const ink = (element: Element) => {
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
		const boxes: { top: number; bottom: number; left: number; right: number; baseline: number }[] =
			[];
		const clipping: Clip[] = [];
		let node: Node | null;
		while ((node = walker.nextNode())) {
			const text = node as Text;
			const style = getComputedStyle(text.parentElement!);
			context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
			const first = boxes.length;
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
			const nodeBoxes = boxes.slice(first);
			if (nodeBoxes.length) {
				clipping.push(
					...clippedInk(text.parentElement!, {
						top: Math.min(...nodeBoxes.map((box) => box.top)),
						bottom: Math.max(...nodeBoxes.map((box) => box.bottom)),
						left: Math.min(...nodeBoxes.map((box) => box.left)),
						right: Math.max(...nodeBoxes.map((box) => box.right))
					})
				);
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
			clipping,
			count: boxes.length,
			rows: rows.length,
			baselines: rows,
			top: Math.min(...boxes.map((box) => box.top)),
			bottom: Math.max(...boxes.map((box) => box.bottom)),
			left: Math.min(...boxes.map((box) => box.left)),
			right: Math.max(...boxes.map((box) => box.right))
		};
	};
	// Ink can extend outside a non-clipping inline box (negative side bearings).
	// Only a clipping ancestor can hide that ink; nominal caption bounds cannot.
	const clippedInk = (element: Element, painted: Bounds) => {
		const failures: Clip[] = [];
		for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
			const style = getComputedStyle(ancestor);
			if (
				style.clip !== 'auto' ||
				style.clipPath !== 'none' ||
				(style.maskImage && style.maskImage !== 'none') ||
				[style.transform, style.scale, style.rotate, style.translate].some(
					(value) => value && value !== 'none'
				)
			) {
				throw new Error(`Unsupported text clipping geometry: ${ancestor.className}`);
			}
			// Body overflow propagates to the viewport only when root overflow is
			// visible. A small body box is not itself the viewport's clipping edge.
			const rootStyle = getComputedStyle(document.documentElement);
			const viewport =
				ancestor === document.documentElement ||
				(ancestor === document.body &&
					rootStyle.overflowX === 'visible' &&
					rootStyle.overflowY === 'visible');
			const paintContainment = /\b(paint|strict|content)\b/.test(style.contain);
			const hasBox = !['inline', 'contents'].includes(style.display);
			const x = hasBox && (style.overflowX !== 'visible' || paintContainment);
			// Ordinary vertical document scrolling does not hide reading content.
			const y =
				hasBox &&
				(viewport
					? ['hidden', 'clip'].includes(style.overflowY)
					: style.overflowY !== 'visible' || paintContainment);
			if (!x && !y) continue;
			// Fail explicitly if a new layout needs a different clipping model.
			if (
				(viewport && paintContainment) ||
				(style.overflowClipMargin && style.overflowClipMargin !== '0px') ||
				[
					style.borderTopLeftRadius,
					style.borderTopRightRadius,
					style.borderBottomLeftRadius,
					style.borderBottomRightRadius
				].some((value) => parseFloat(value) !== 0)
			)
				throw new Error(`Unsupported text clipping geometry: ${ancestor.className}`);
			const box = ancestor.getBoundingClientRect();
			const left = viewport ? 0 : box.left + parseFloat(style.borderLeftWidth);
			const top = viewport ? 0 : box.top + parseFloat(style.borderTopWidth);
			// Hidden/clip have no scrollbar: retain fractional padding-box edges.
			const right = viewport
				? innerWidth
				: ['hidden', 'clip'].includes(style.overflowX)
					? box.right - parseFloat(style.borderRightWidth)
					: left + ancestor.clientWidth;
			const bottom = viewport
				? innerHeight
				: ['hidden', 'clip'].includes(style.overflowY)
					? box.bottom - parseFloat(style.borderBottomWidth)
					: top + ancestor.clientHeight;
			for (const [axis, clips, start, end, inkStart, inkEnd] of [
				['x', x, left, right, painted.left, painted.right],
				['y', y, top, bottom, painted.top, painted.bottom]
			] as const) {
				if (clips && (inkStart < start - 0.5 || inkEnd > end + 0.5)) {
					failures.push({
						ancestor: `${ancestor.tagName}.${ancestor.className}`,
						axis,
						start,
						end
					});
				}
			}
		}
		return failures;
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
			const captionBox = caption.getBoundingClientRect();
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
				sourceClipping: sourceInk.clipping,
				captionClipping: captionInk.clipping,
				captionBounds: {
					top: captionBox.top,
					bottom: captionBox.bottom,
					left: captionBox.left,
					right: captionBox.right
				},
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
