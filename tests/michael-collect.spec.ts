import { expect, setHelp, setTheme, test } from './fixtures';

const formulary = 'dedicatio-sancti-michaelis-archangeli';
const text = `${formulary}-collecta`;
const members = [
	'a',
	'quibus',
	'tibi',
	'ministrántibus',
	'in',
	'cælo',
	'semper',
	'assístitur',
	'ab',
	'his'
];

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/${formulary}`;
	const shared =
		language === 'pl'
			? 'przez tych, którzy służąc, zawsze stoją przy Tobie w niebie'
			: 'by those who always stand in heaven ministering to You';

	test(`${language} Michael's complete relative construction remains readable and selectable`, async ({
		page
	}) => {
		await page.goto(route);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.w013"]`);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const colorScheme of ['light', 'dark'] as const) {
				await setTheme(page, colorScheme);
				await expect(button.locator('rt')).toHaveText(shared);
				await expect(button.locator('.token')).toHaveCount(10);
				await button.scrollIntoViewIfNeeded();
				await page.evaluate(() => document.fonts.ready);
				const geometry = () =>
					button.evaluate((element) => {
						const box = element.getBoundingClientRect();
						const base = element.querySelector('.shared-base')!.getBoundingClientRect();
						const gloss = element.querySelector('rt')!.getBoundingClientRect();
						return {
							wrapped: element.closest('.token-group')!.classList.contains('wrapped-unit'),
							width: box.width,
							height: box.height,
							left: gloss.left - box.left,
							right: box.right - gloss.right,
							bottom: box.bottom - gloss.bottom,
							gap: gloss.top - base.bottom,
							overflow: document.documentElement.scrollWidth - innerWidth
						};
					});
				const before = await geometry();
				expect(before.overflow).toBe(0);
				for (const clearance of [before.left, before.right, before.bottom]) {
					expect(clearance).toBeGreaterThanOrEqual(-0.5);
				}
				// Wrapped blocks have separate line boxes. Native ruby intentionally
				// overlaps font boxes to share the ordinary gloss baseline; those
				// boxes are not glyph-ink bounds (covered by interlinear-wrap).
				expect(before.wrapped).toBe(width === 320);
				if (before.wrapped) expect(before.gap).toBeGreaterThanOrEqual(0);
				await button.hover();
				expect(await geometry()).toEqual(before);
				await button.focus();
				await button.press('Enter');
				await expect(page.locator('aside .construction-title')).toHaveText(members);
				for (const index of [1, 9]) {
					const card = page.locator('aside .construction-card').nth(index);
					await expect(card.locator('.morph')).toContainText(
						language === 'pl' ? 'męski' : 'masculine'
					);
					await expect(card.locator('.meta')).toContainText(
						language === 'pl' ? 'do przeglądu' : 'awaiting review'
					);
				}
				await page.keyboard.press('Escape');
				expect(await geometry()).toEqual(before);
			}
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
		await expect(button.locator('rt')).toHaveText(shared);
	});

	test(`${language} Michael keeps the complete prayer and its restored relationships`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		await expect(section.locator('.token')).toHaveCount(48);
		await expect(page.locator(`button[id="${text}.w007"] rt`)).toHaveText(
			language === 'pl' ? 'i ludzi' : 'and men’s'
		);
		await expect(page.locator(`button[id="${text}.w022"] rt`)).toHaveText(
			language === 'pl' ? 'na' : 'on'
		);
		if (language === 'en') {
			const manner = page.locator(`button[id="${text}.w004"]`);
			await expect(manner.locator('rt')).toHaveText('in wondrous order');
			await manner.click();
			await expect(page.locator('aside .construction-title')).toHaveText(['miro', 'órdine']);
			await page.keyboard.press('Escape');
		}
		await setHelp(page, 2);
		await expect(section.locator('.translation').first()).toContainText(
			language === 'pl'
				? 'osłaniali nasze życie na ziemi. Przez Pana naszego Jezusa Chrystusa'
				: 'who lives and reigns with You in the unity of the Holy Spirit, God, for ever and ever.'
		);
	});

	test(`${language} Michael sources link the proper, inherited body and shared conclusion`, async ({
		page
	}) => {
		await page.goto(route);
		const section = page.locator(`#text-proprium-${text}`);
		await section
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const sources = page.getByRole('dialog').locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText('heading22 and @Sancti/05-08 reference23');
		await expect(sources).toContainText('heading19, body20, $Per Dominum command21');
		await expect(sources).toContainText('heading95, conclusion96, response97');
		for (const leaf of ['n765', 'n22', 'n38', 'n39', 'n57']) {
			await expect(
				sources.locator(
					`a[href="https://archive.org/details/missale-romanum-1962/page/${leaf}/mode/1up"]`
				)
			).toHaveCount(1);
		}
	});
}
