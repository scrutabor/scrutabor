import { expect, setHelp, test } from './fixtures';

const blood = 'pretiosissimi-sanguinis-domini-nostri-iesu-christi';
const cases = [
	{
		day: 'nativitas-domini-in-die',
		part: 'introitus',
		words: 69,
		segments: 1,
		groups: [
			['w007', 'został dany', 2],
			['w055', 'został dany', 2]
		],
		prose: 'syn został nam dany'
	},
	{
		day: 'nativitas-sancti-ioannis-baptistae',
		part: 'evangelium',
		words: 156,
		segments: 1,
		groups: [
			['w055', 'nie ma nikogo', 2],
			['w070', 'żeby go nazwano', 2],
			['w099', 'padła', 2],
			['w139', 'został napełniony', 2]
		],
		prose: 'jego usta i rozwiązał się jego język'
	},
	{
		day: blood,
		part: 'communio',
		words: 16,
		segments: 1,
		groups: [
			['w003', 'został ofiarowany', 2],
			['w006', 'zgładzić grzechy wielu', 3]
		],
		prose: 'zgładzić grzechy wielu'
	},
	{
		day: blood,
		part: 'evangelium',
		words: 93,
		segments: 1,
		groups: [['w053', 'był ukrzyżowany', 2]],
		prose: 'ukrzyżowany'
	},
	{
		day: 'purificatio-beatae-mariae-virginis',
		part: 'collecta',
		words: 52,
		segments: 2,
		groups: [
			['w022', 'został przedstawiony', 2],
			['w024', 'sprawił, abyśmy', 2]
		],
		prose: 'majestat, abyśmy, jak'
	},
	{
		day: 'sacratissimi-cordis-iesu',
		part: 'evangelium',
		words: 111,
		segments: 5,
		groups: [['w040', 'był ukrzyżowany', 2]],
		prose: 'ukrzyżowany'
	}
] as const;

for (const subject of cases) {
	test(`Polish ${subject.day} ${subject.part} preserves complete predicates`, async ({ page }) => {
		await page.goto(`/app/pl/formularium/${subject.day}`);
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
				['w008', 'abyś'],
				['w026', 'z oczyszczonymi'],
				['w029', 'zostali przedstawieni']
			]) {
				await expect(page.locator(`button[id="${text}.${word}"] rt`)).toHaveText(gloss);
			}
		}
		if (subject.day === 'sacratissimi-cordis-iesu') {
			await expect(page.locator(`button[id="${text}.w087"] rt`)).toHaveText('abyście');
			await expect(page.locator(`button[id="${text}.w098"] rt`)).toHaveText('kości');
		}
		await setHelp(page, 2);
		await expect(section.locator('.translation')).toHaveCount(subject.segments);
		await expect(section).toContainText(subject.prose);
		if (subject.part === 'collecta') {
			await expect(section).toContainText('Przez tegoż Pana naszego Jezusa Chrystusa');
			await expect(section.locator('.translation').last()).toHaveText('Amen.');
		}
	});
}

test('Polish purpose and causative groups remain stable at the largest size', async ({ page }) => {
	for (const [day, part, word, gloss, members] of [
		[blood, 'communio', 'w006', 'zgładzić grzechy wielu', 3],
		['purificatio-beatae-mariae-virginis', 'collecta', 'w024', 'sprawił, abyśmy', 2]
	] as const) {
		await page.goto(`/app/pl/formularium/${day}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const button = page.locator(`button[id="${day}-${part}.${word}"]`);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const colorScheme of ['light', 'dark'] as const) {
				await page.emulateMedia({ colorScheme, media: 'screen' });
				await button.scrollIntoViewIfNeeded();
				await page.evaluate(() => document.fonts.ready);
				await expect(button.locator('rt')).toHaveText(gloss);
				const geometry = () =>
					button.evaluate((element) => {
						const box = element.getBoundingClientRect();
						const glossBox = element.querySelector('rt')!.getBoundingClientRect();
						return {
							width: box.width,
							height: box.height,
							glossWidth: glossBox.width,
							glossHeight: glossBox.height,
							overflow: document.documentElement.scrollWidth - innerWidth
						};
					});
				const before = await geometry();
				expect(before.overflow).toBe(0);
				await button.hover();
				expect(await geometry()).toEqual(before);
				await button.click();
				await expect(page.locator('aside .construction-title')).toHaveCount(members);
				await expect(page.locator('aside .construction-card .morph')).toHaveCount(members);
				await page.keyboard.press('Escape');
				expect(await geometry()).toEqual(before);
			}
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
		await expect(button.locator('rt')).toHaveText(gloss);
		await page.emulateMedia({ media: 'screen' });
	}
});
