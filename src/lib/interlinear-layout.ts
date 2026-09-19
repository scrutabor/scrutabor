/** Keep native ruby for units that fit, and wrap only an oversized source/gloss
 * pair. The verse's content box, not the remaining space on its current line,
 * is the limit: ordinary units move intact to the next line first. */
export function fitInterlinear(verse: HTMLElement, helpLevel: number) {
	let frame = 0;
	let destroyed = false;
	const fit = () => {
		if (destroyed) return;
		cancelAnimationFrame(frame);
		frame = 0;
		const units = [
			...verse.querySelectorAll<HTMLElement>(':scope > .token, :scope > .token-group')
		];
		// Restore intrinsic widths before measuring, including after a wider
		// viewport or smaller reading size makes native ruby possible again.
		for (const unit of units) unit.classList.remove('wrapped-unit');
		if (helpLevel !== 1) return;
		const style = getComputedStyle(verse);
		const available =
			verse.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
		if (available <= 0) return;
		const oversized = units.filter(
			(unit) => unit.querySelector('rt') && unit.getBoundingClientRect().width > available + 0.5
		);
		for (const unit of oversized) unit.classList.add('wrapped-unit');
	};
	const schedule = () => {
		if (!destroyed && !frame) frame = requestAnimationFrame(fit);
	};
	const resize = new ResizeObserver(schedule);
	resize.observe(verse);
	// The same verse can receive another mode, language or repeated-text state.
	const mutation = new MutationObserver(schedule);
	mutation.observe(verse, { childList: true, subtree: true, characterData: true });
	document.fonts.addEventListener('loadingdone', schedule);
	void document.fonts.ready.then(schedule);
	window.addEventListener('beforeprint', fit);
	window.addEventListener('afterprint', schedule);
	schedule();
	return {
		update(nextHelpLevel: number) {
			helpLevel = nextHelpLevel;
			schedule();
		},
		destroy() {
			destroyed = true;
			cancelAnimationFrame(frame);
			resize.disconnect();
			mutation.disconnect();
			document.fonts.removeEventListener('loadingdone', schedule);
			window.removeEventListener('beforeprint', fit);
			window.removeEventListener('afterprint', schedule);
		}
	};
}
