import { expect, setHelp, setTheme, test } from './fixtures';

const blood = 'pretiosissimi-sanguinis-domini-nostri-iesu-christi';
const cases = [
	{
		day: 'nativitas-domini-in-die',
		part: 'introitus',
		words: 69,
		segments: 1,
		groups: [
			['w002', 'is born', 2],
			['w007', 'is given', 2],
			['w050', 'is born', 2],
			['w055', 'is given', 2]
		],
		prose: ', whose government is upon His shoulder'
	},
	{
		day: 'nativitas-sancti-ioannis-baptistae',
		part: 'evangelium',
		words: 156,
		segments: 1,
		groups: [
			['w002', 'was fulfilled', 2],
			['w070', 'him to be called', 2],
			['w085', 'was opened', 2],
			['w139', 'was filled', 2]
		],
		prose: 'asking what he wished him to be called'
	},
	{
		day: blood,
		part: 'communio',
		words: 16,
		segments: 1,
		groups: [
			['w003', 'was offered', 2],
			['w006', 'take away the sins of many', 3]
		],
		prose: 'Christ was offered once to take away the sins of many'
	},
	{
		day: blood,
		part: 'evangelium',
		words: 93,
		segments: 1,
		groups: [
			['w009', 'It is finished', 2],
			['w053', 'had been crucified', 2],
			['w067', 'did not break', 2],
			['w087', 'has borne witness', 2]
		],
		prose: 'their legs might be broken and that the bodies might be taken away'
	},
	{
		day: 'purificatio-beatae-mariae-virginis',
		part: 'collecta',
		words: 52,
		segments: 2,
		groups: [],
		prose: 'grant us to be presented to You with purified minds'
	},
	{
		day: 'sacratissimi-cordis-iesu',
		part: 'evangelium',
		words: 111,
		segments: 5,
		groups: [
			['w040', 'had been crucified', 2],
			['w054', 'did not break', 2],
			['w074', 'has borne witness', 2],
			['w099', 'you shall not break', 2]
		],
		prose: 'You shall not break a bone of His'
	}
] as const;

for (const subject of cases) {
	test(`English ${subject.day} ${subject.part} preserves complete predicates`, async ({ page }) => {
		await page.goto(`/app/en/formularium/${subject.day}`);
		await setHelp(page, 1);
		const text = `${subject.day}-${subject.part}`;
		const section = page.locator(`#text-proprium-${text}`);
		await expect(section.locator('.token')).toHaveCount(subject.words);
		for (const [anchor, gloss, members] of subject.groups) {
			const button = page.locator(`button[id="${text}.${anchor}"]`);
			await expect(button.locator('rt')).toHaveText(gloss);
			await expect(button.locator('.token')).toHaveCount(members);
			await button.focus();
			await button.press('Enter');
			await expect(page.locator('aside .construction-title')).toHaveCount(members);
			await expect(page.locator('aside .construction-card .morph')).toHaveCount(members);
			await page.keyboard.press('Escape');
		}
		if (subject.part === 'collecta') {
			for (const [word, gloss] of [
				['w021', 'was'],
				['w022', 'presented'],
				['w025', 'may You cause'],
				['w027', 'to You'],
				['w029', 'to be presented'],
				['w039', 'with You'],
				['w040', 'lives']
			]) {
				await expect(page.locator(`button[id="${text}.${word}"] rt`)).toHaveText(gloss);
			}
		}
		await setHelp(page, 2);
		await expect(section.locator('.translation')).toHaveCount(subject.segments);
		await expect(section).toContainText(subject.prose);
	});
}

test('English Communion purpose remains readable at the largest size', async ({ page }) => {
	await page.goto(`/app/en/formularium/${blood}`);
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.reload();
	await setHelp(page, 1);
	const button = page.locator(`button[id="${blood}-communio.w006"]`);
	for (const width of [320, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		for (const colorScheme of ['light', 'dark'] as const) {
			await setTheme(page, colorScheme);
			await button.scrollIntoViewIfNeeded();
			await page.evaluate(() => document.fonts.ready);
			await expect(button.locator('rt')).toHaveText('take away the sins of many');
			const geometry = () =>
				button.evaluate((element) => {
					const box = element.getBoundingClientRect();
					const gloss = element.querySelector('rt')!.getBoundingClientRect();
					return {
						width: box.width,
						height: box.height,
						glossWidth: gloss.width,
						glossHeight: gloss.height,
						overflow: document.documentElement.scrollWidth - innerWidth
					};
				});
			const before = await geometry();
			expect(before.overflow).toBe(0);
			await button.hover();
			expect(await geometry()).toEqual(before);
			await button.click();
			await expect(page.locator('aside .construction-title')).toHaveText([
				'multórum',
				'exhauriénda',
				'peccáta'
			]);
			await expect(page.locator('aside .construction-card .morph')).toHaveCount(3);
			await page.keyboard.press('Escape');
			expect(await geometry()).toEqual(before);
		}
	}
	await page.emulateMedia({ media: 'print' });
	await expect(button.locator('rt')).toBeVisible();
	await expect(button.locator('rt')).toHaveText('take away the sins of many');
});
