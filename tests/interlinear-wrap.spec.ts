import { expect, setHelp, test } from './fixtures';

const ANDREW = '/app/en/formularium/sancti-andreae-apostoli';
const ANDREW_EPISTLE = '#text-proprium-sancti-andreae-apostoli-epistola';

test('oversized interlinear units wrap without changing the reading size or their identity', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(ANDREW);
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.reload();
	await page.evaluate(() => document.fonts.ready);
	const group = page.locator('.token-group', { hasText: 'Omnis enim, quicúmque' });
	await expect(group).toHaveClass(/wrapped-unit/);
	await expect(group.locator('button')).toHaveCount(1);
	await expect(group.locator('.token')).toHaveCount(3);
	await expect(group.locator('rt')).toHaveText('For everyone who');
	const geometry = () =>
		group.evaluate((element) => {
			const box = element.getBoundingClientRect();
			const base = element.querySelector('.shared-base')!.getBoundingClientRect();
			const gloss = element.querySelector('rt')!.getBoundingClientRect();
			const verse = element.closest('.verse')!;
			const style = getComputedStyle(verse);
			return {
				width: box.width,
				height: box.height,
				baseHeight: base.height,
				glossTop: gloss.top - box.top,
				glossBottom: gloss.bottom - box.top,
				clearance: gloss.top - base.bottom,
				latinSize: parseFloat(style.fontSize),
				glossSize: parseFloat(getComputedStyle(element.querySelector('rt')!).fontSize),
				available:
					verse.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
				overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
			};
		});
	const before = await geometry();
	expect(before.latinSize).toBeCloseTo(32.48, 2);
	expect(before.glossSize / before.latinSize).toBeCloseTo(0.64, 2);
	expect(before.width).toBeLessThanOrEqual(before.available + 0.5);
	expect(before.baseHeight, 'Latin wraps between complete tokens').toBeGreaterThan(60);
	expect(before.clearance).toBeGreaterThan(0);
	expect(before.glossBottom).toBeLessThanOrEqual(before.height + 0.5);
	expect(before.overflow).toBe(0);
	const button = group.locator('button');
	await button.hover();
	expect(await geometry(), 'hover changes no text geometry').toEqual(before);
	await button.focus();
	await expect(button).toBeFocused();
	expect(await geometry(), 'keyboard focus changes no text geometry').toEqual(before);
	await button.press('Enter');
	await expect(button).toHaveClass(/selected/);
	expect(await geometry(), 'selection changes no text geometry').toEqual(before);
	await page.keyboard.press('Escape');

	// Resizing restores native ruby rather than leaving a stale narrow layout.
	await page.setViewportSize({ width: 1280, height: 900 });
	await expect(group).not.toHaveClass(/wrapped-unit/);
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(group).toHaveClass(/wrapped-unit/);
	await setHelp(page, 0);
	await expect(page.locator('.wrapped-unit')).toHaveCount(0);
	await setHelp(page, 1);
	await expect(group).toHaveClass(/wrapped-unit/);
	await page.getByRole('button', { name: 'text size: largest' }).click();
	await page.locator('.menu ul').getByRole('button', { name: 'normal', exact: true }).click();
	await expect(group).not.toHaveClass(/wrapped-unit/);
	await page.getByRole('button', { name: 'text size: normal' }).click();
	await page.locator('.menu ul').getByRole('button', { name: 'largest', exact: true }).click();
	await expect(group).toHaveClass(/wrapped-unit/);
});

test('long shared and single-word glosses stay attached at narrow and wide measures', async ({
	page
}) => {
	for (const language of ['en', 'pl']) {
		for (const width of [320, 390, 1280]) {
			await page.setViewportSize({ width, height: 844 });
			await page.goto(`/app/${language}/formularium/transfiguratio-domini`);
			await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.reload();
			await page.evaluate(() => document.fonts.ready);
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
			const verses = page.locator(
				'#text-proprium-transfiguratio-domini-postcommunio .verse.glossed'
			);
			await expect(verses.first()).toBeVisible();
			const escaped = await verses.evaluateAll((verses) =>
				verses.flatMap((verse) => {
					const edge = verse.getBoundingClientRect().right;
					return [...verse.querySelectorAll('.token, rt')]
						.filter((element) => element.getBoundingClientRect().right > edge + 0.5)
						.map((element) => element.textContent);
				})
			);
			expect(escaped, `${language} at ${width}px: no clipped Latin or gloss`).toEqual([]);
		}
	}
});

test('a fitting construction keeps its native ruby baseline', async ({ page }) => {
	await page.goto('/app/en/formularium/commemoratio-omnium-fidelium-defunctorum');
	const group = page.locator('.token-group', { hasText: 'est futúrus' });
	await expect(group).not.toHaveClass(/wrapped-unit/);
	const offsets = await group.evaluate((element) => {
		const annotations = [...element.closest('.verse')!.querySelectorAll('rt')];
		const shared = element.querySelector('rt')!;
		const at = annotations.indexOf(shared);
		return [annotations[at - 1], annotations[at + 1]].map((other) =>
			Math.abs(other.getBoundingClientRect().top - shared.getBoundingClientRect().top)
		);
	});
	for (const offset of offsets) expect(offset).toBeLessThan(0.75);
});

test('one long Latin word fits the smallest reading measure without clipping', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 844 });
	await page.goto('/app/en/formularium/dominica-i-passionis');
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.reload();
	const word = page.locator('[id="dominica-i-passionis-communio.w023"]');
	const token = word.locator('..');
	await expect(token).toHaveClass(/wrapped-unit/);
	await expect(word.locator('.base')).toHaveText('commemoratiónem.');
	await expect(word.locator('rt')).toHaveText('remembrance');
	const geometry = () =>
		word.evaluate((element) => {
			const base = element.querySelector('.base')!;
			const baseBox = base.getBoundingClientRect();
			const glossBox = element.querySelector('rt')!.getBoundingClientRect();
			return {
				baseHeight: baseBox.height,
				lineHeight: parseFloat(getComputedStyle(base).lineHeight),
				inkOverflow: base.scrollWidth - base.clientWidth,
				pageOverflow: document.documentElement.scrollWidth - innerWidth,
				glossGap: glossBox.top - baseBox.bottom
			};
		});
	const before = await geometry();
	expect(before.baseHeight).toBeGreaterThan(before.lineHeight * 1.5);
	expect(before.inkOverflow).toBe(0);
	expect(before.pageOverflow).toBe(0);
	expect(before.glossGap).toBeGreaterThanOrEqual(0);
	await word.hover();
	expect(await geometry()).toEqual(before);
	await word.click();
	await expect(word).toHaveClass(/selected/);
	expect(await geometry()).toEqual(before);
	await page.keyboard.press('Escape');
	await page.setViewportSize({ width: 1280, height: 900 });
	await expect(token).not.toHaveClass(/wrapped-unit/);
});

test('an extended single-word annotation wraps as one attached unit after a content update', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(ANDREW);
	const token = page.locator(`${ANDREW_EPISTLE} .verse > .token`).first();
	const gloss = token.locator('rt');
	const original = await gloss.textContent();
	const extended = 'A deliberately extended annotation that still belongs to this one Latin word';
	await gloss.evaluate((element, text) => {
		element.textContent = text;
	}, extended);
	await expect(token).toHaveClass(/wrapped-unit/);
	await expect(gloss).toHaveText(extended);
	await expect(token.locator('button')).toHaveCount(1);
	const geometry = await token.evaluate((element) => {
		const base = element.querySelector('.base')!.getBoundingClientRect();
		const gloss = element.querySelector('rt')!.getBoundingClientRect();
		return {
			gap: gloss.top - base.bottom,
			height: gloss.height,
			lineHeight: parseFloat(getComputedStyle(element.querySelector('rt')!).lineHeight),
			overflow: document.documentElement.scrollWidth - innerWidth
		};
	});
	expect(geometry.gap).toBeGreaterThanOrEqual(0);
	expect(geometry.height).toBeGreaterThan(geometry.lineHeight * 1.5);
	expect(geometry.overflow).toBe(0);
	await gloss.evaluate((element, text) => {
		element.textContent = text;
	}, original);
	await expect(token).not.toHaveClass(/wrapped-unit/);
});

test('print geometry retains every unit and screen geometry recovers afterwards', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(ANDREW);
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.reload();
	const section = page.locator(ANDREW_EPISTLE);
	await expect(section.locator('.verse .base').first()).toBeVisible();
	const source = await section.locator('.verse .base').allTextContents();
	const targets = await section.locator('.verse rt').allTextContents();
	await page.emulateMedia({ media: 'print' });
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
		.toBe(0);
	expect(await section.locator('.verse .base').allTextContents()).toEqual(source);
	expect(await section.locator('.verse rt').allTextContents()).toEqual(targets);
	await page.emulateMedia({ media: 'screen' });
	await expect(page.locator('.token-group', { hasText: 'Omnis enim, quicúmque' })).toHaveClass(
		/wrapped-unit/
	);
});
