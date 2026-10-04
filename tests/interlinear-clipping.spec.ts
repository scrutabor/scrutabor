import { bare as test, expect } from './fixtures';
import { interlinearGeometry } from './interlinear-geometry';

// Synthetic controls qualify the same measurement used on complete reader pages.
// Overflowing ink is allowed; actually hiding it on either axis is not.
test('interlinear ink distinguishes visible overhang from clipping @reader', async ({ page }) => {
	await page.setContent(`<!doctype html>
		<style>
			.verse { font: 32px / 1.3 serif; padding: 40px; }
			.token-group, ruby, .shared-base, .caption-content, rt { display: block; }
			.token-group { width: 240px; }
			.shared-base { font-size: 32px; }
			.source-word { display: inline-block; white-space: nowrap; }
			rt { font-size: 22px; }
			.caption-content { width: 2px; white-space: nowrap; }
		</style>
		<div class="verse glossed"><div class="token-group"><ruby>
			<span class="shared-base"><span class="source-word token"><span class="base"><span class="initial">F</span>utúrus</span></span> est</span>
			<rt><span class="caption-content"><span class="target-leaf">will be</span></span></rt>
		</ruby></div></div>`);
	const token = page.locator('.token-group');
	const measure = async () => (await token.evaluate(interlinearGeometry))[0];
	const visible = await measure();
	expect(visible.captionInk.right).toBeGreaterThan(visible.captionBounds.right + 1);
	expect(visible.captionClipping).toEqual([]);
	expect(visible.sourceClipping).toEqual([]);

	for (const overflow of ['hidden', 'clip', 'auto', 'scroll']) {
		await page.locator('.caption-content').evaluate((element, value) => {
			(element as HTMLElement).style.overflow = value;
		}, overflow);
		expect(
			(await measure()).captionClipping.some(({ axis }) => axis === 'x'),
			overflow
		).toBe(true);
	}
	await page.locator('.caption-content').evaluate((element) => {
		(element as HTMLElement).style.overflow = 'visible';
	});
	for (const axis of ['x', 'y']) {
		await token.evaluate((element, axis) => {
			(element as HTMLElement).style.cssText =
				axis === 'x'
					? 'width: 2px; overflow-x: clip; overflow-y: visible'
					: 'height: 2px; overflow-y: clip; overflow-x: visible';
		}, axis);
		const clipped = await measure();
		expect(
			clipped.captionClipping.some((clip) => clip.axis === axis),
			axis
		).toBe(true);
		expect(
			clipped.sourceClipping.some((clip) => clip.axis === axis),
			axis
		).toBe(true);
	}
	await token.evaluate((element) => (element as HTMLElement).removeAttribute('style'));
	expect((await measure()).captionClipping).toEqual([]);

	// A shared base is not the leaf: each individual word can be clipped too.
	for (const [selector, field] of [
		['.source-word', 'sourceClipping'],
		['.target-leaf', 'captionClipping']
	] as const) {
		for (const axis of ['x', 'y']) {
			await page.locator(selector).evaluate((element, axis) => {
				(element as HTMLElement).style.cssText =
					`display:inline-block;${axis === 'x' ? 'width' : 'height'}:2px;overflow:hidden`;
			}, axis);
			expect(
				(await measure())[field].some((clip) => clip.axis === axis),
				`${selector} ${axis}`
			).toBe(true);
			await page
				.locator(selector)
				.evaluate((element) => (element as HTMLElement).removeAttribute('style'));
		}
	}
	for (const [selector, css] of [
		['.initial', 'clip-path:inset(0 100% 0 0)'],
		['.target-leaf', 'position:absolute;clip:rect(0px,1px,1px,0px)'],
		['.verse', 'transform:scale(2)'],
		['.verse', 'scale:.5'],
		['.source-word', 'rotate:10deg'],
		['.target-leaf', 'display:inline-block;translate:2px']
	]) {
		await page
			.locator(selector)
			.evaluate((element, css) => ((element as HTMLElement).style.cssText = css), css);
		await expect(measure()).rejects.toThrow('Unsupported text clipping geometry');
		await page
			.locator(selector)
			.evaluate((element) => (element as HTMLElement).removeAttribute('style'));
	}
	for (const selector of ['html', 'body']) {
		await page
			.locator(selector)
			.evaluate(
				(element) => ((element as HTMLElement).style.cssText = 'height:50px;overflow:hidden')
			);
		// Propagated overflow clips the viewport, not the short root/body box.
		expect((await measure()).captionClipping).toEqual([]);
		await token.evaluate((element) => ((element as HTMLElement).style.marginTop = '2000px'));
		expect((await measure()).captionClipping.some(({ axis }) => axis === 'y')).toBe(true);
		await token.evaluate((element) => (element as HTMLElement).removeAttribute('style'));
		await page
			.locator(selector)
			.evaluate((element) => (element as HTMLElement).removeAttribute('style'));
	}
});
