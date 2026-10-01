import { expect, setHelp, setTheme, test } from './fixtures';

const formulary = 'vigilia-pentecostes';
const text = `${formulary}-epistola`;
const groups = {
	pl: [[35, 40, 40, 'nawet nie słyszeliśmy, czy Duch Święty istnieje']],
	en: [
		[2, 3, 2, 'those days'],
		[24, 27, 27, 'Did you receive the Holy Spirit'],
		[35, 40, 40, 'we have not even heard whether there is a Holy Spirit'],
		[47, 48, 47, 'were you baptized'],
		[54, 56, 54, 'Then Paul said'],
		[70, 71, 71, 'they should believe'],
		[76, 77, 77, 'Having heard these things'],
		[78, 79, 78, 'they were baptized'],
		[86, 89, 86, 'Paul had laid hands on them'],
		[90, 92, 90, 'the Holy Spirit came'],
		[100, 101, 100, 'And there were'],
		[103, 105, 103, 'about twelve men'],
		[106, 107, 106, 'And having entered']
	]
} as const;

const wordId = (n: number) => `w${String(n).padStart(3, '0')}`;

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/${formulary}`;
	test(`${language} long construction headings leave room to read the analysis`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		for (const viewport of [
			{ width: 320, height: 568 },
			{ width: 568, height: 320 },
			{ width: 320, height: 900 }
		]) {
			await page.setViewportSize(viewport);
			await page.goto(`${route}?w=${text}.w040`);
			const sheet = page.getByRole('dialog');
			const fullForm = 'neque si Spíritus Sanctus est audívimus';
			await expect(sheet.locator('header .form')).toHaveText(fullForm);
			await expect(sheet.locator('.alignment')).toContainText(fullForm);
			await expect(sheet.locator('.construction-card')).toHaveCount(6);
			for (const theme of ['light', 'dark'] as const) {
				await setTheme(page, theme);
				const geometry = await sheet.locator('.inner').evaluate((el) => ({
					height: el.clientHeight,
					header: el.querySelector('header')!.getBoundingClientRect().height
				}));
				expect(
					geometry.height - geometry.header,
					'body is not hidden behind the heading'
				).toBeGreaterThan(geometry.height * 0.4);
				for (const morphology of await sheet.locator('.construction-card .morph').all()) {
					await morphology.evaluate((el) => {
						const inner = el.closest('.inner')!;
						const heading = inner.querySelector('header')!.getBoundingClientRect();
						inner.scrollTop += el.getBoundingClientRect().top - heading.bottom;
					});
					const bounds = await morphology.evaluate((el) => {
						const inner = el.closest('.inner')!;
						return {
							top: el.getBoundingClientRect().top,
							bottom: el.getBoundingClientRect().bottom,
							headerBottom: inner.querySelector('header')!.getBoundingClientRect().bottom,
							panelBottom: inner.getBoundingClientRect().bottom
						};
					});
					expect(bounds.top).toBeGreaterThanOrEqual(bounds.headerBottom - 1);
					expect(bounds.bottom).toBeLessThanOrEqual(bounds.panelBottom);
				}
				await expect(sheet.locator('.close')).toBeInViewport();
			}
			await sheet.locator('.close').click();
			await expect(sheet).toHaveCount(0);
		}
	});
	for (const [first, last, anchor, gloss] of groups[language]) {
		test(`${language} Vigil reading ${wordId(anchor)} keeps its complete construction accessible`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(route);
			await setHelp(page, 1);
			const button = page.locator(`button[id="${text}.${wordId(anchor)}"]`);
			await expect(button.locator('rt')).toHaveText(gloss);
			await expect(button.locator('.token')).toHaveCount(last - first + 1);
			for (const width of [320, 1280]) {
				await page.setViewportSize({ width, height: 900 });
				for (const theme of ['light', 'dark'] as const) {
					await setTheme(page, theme);
					await button.scrollIntoViewIfNeeded();
					const before = await button.boundingBox();
					await button.hover();
					expect(await button.boundingBox()).toEqual(before);
					await button.focus();
					await button.press('Enter');
					await expect(page.locator('aside .construction-card .morph')).toHaveCount(
						last - first + 1
					);
					await expect(page.getByRole('dialog')).toContainText(gloss);
					expect(
						await page.locator('aside .inner').evaluate((el) => el.scrollWidth - el.clientWidth)
					).toBe(0);
					await page.keyboard.press('Escape');
					expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
						0
					);
				}
			}
			await page.emulateMedia({ media: 'print' });
			await expect(button.locator('rt')).toHaveText(gloss);
			await expect(button.locator('rt')).toBeVisible();
			await page.emulateMedia({ media: 'screen' });
			for (let member = first; member <= last; member++) {
				await page.goto(`${route}?w=${text}.${wordId(member)}`);
				await expect(page.locator('aside .construction-card .morph')).toHaveCount(last - first + 1);
				await expect(page.getByRole('dialog')).toContainText(gloss);
			}
		});
	}

	test(`${language} Vigil reading preserves all words and contextual subjects`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const reading = page.locator(`#text-proprium-${text}`);
		await expect(reading.locator('.token')).toHaveCount(120);
		await expect(reading.locator('rt')).toHaveCount(language === 'pl' ? 112 : 94);
		const direct =
			language === 'pl'
				? [
						['w045', 'czym'],
						['w047', 'ochrzczeni'],
						['w048', 'zostaliście'],
						['w076', 'Gdy tego'],
						['w077', 'wysłuchali']
					]
				: [
						['w029', 'But'],
						['w030', 'they'],
						['w051', 'In'],
						['w052', 'John’s'],
						['w096', 'they spoke'],
						['w102', 'in all']
					];
		for (const [word, gloss] of direct) {
			await expect(reading.locator(`button[id="${text}.${word}"] rt`)).toHaveText(gloss);
		}
		await setHelp(page, 2);
		await expect(reading.locator('.translation')).toHaveCount(1);
		if (language === 'en') {
			await expect(reading.locator('.translation')).toContainText('upper regions');
			await expect(reading.locator('.translation')).toContainText(
				'Did you receive the Holy Spirit when you came to believe?'
			);
			await expect(reading.locator('.translation')).not.toContainText('Holy Ghost');
		}
	});

	test(`${language} Corinth is a locative without a misleading grammar link`, async ({ page }) => {
		await page.goto(`${route}?w=${text}.w009`);
		const morphology = page.locator('aside .morph');
		await expect(morphology).toContainText(language === 'pl' ? 'miejscownik' : 'locative');
		await expect(morphology).not.toContainText(language === 'pl' ? 'dopełniacz' : 'genitive');
		await expect(morphology.locator('a')).toHaveCount(0);
	});

	test(`${language} Vigil reading identifies its component and direct source span`, async ({
		page
	}) => {
		await page.goto(route);
		await page
			.locator(`#text-proprium-${text}`)
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toContainText(language === 'pl' ? 'Epistoła formularza' : 'The Epistle');
		const sources = dialog.locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText('Pasc6-6r');
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n429/mode/1up"]'
			)
		).toHaveCount(1);
	});
}
