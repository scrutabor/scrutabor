import { expect, setHelp, test } from './fixtures';

const formulary = 'dominica-i-adventus';
const text = `${formulary}-evangelium`;
const groups = [
	['pl', 'w022', 'zamętu wywołanego szumem', ['confusióne', 'sónitus']],
	['pl', 'w027', 'gdy ludzie będą mdleć', ['arescéntibus', 'homínibus']],
	['pl', 'w057', 'gdy zaś to zacznie się dziać', ['His', 'autem', 'fíeri', 'incipiéntibus']],
	['pl', 'w093', 'że to się dzieje', ['hæc', 'fíeri']],
	['en', 'w018', 'on earth', ['in', 'terris']],
	['en', 'w027', 'people fainting', ['arescéntibus', 'homínibus']],
	[
		'en',
		'w057',
		'but when these things begin to happen',
		['His', 'autem', 'fíeri', 'incipiéntibus']
	]
] as const;

for (const [language, anchor, gloss, members] of groups) {
	test(`${language} Advent Gospel ${anchor} retains its complete construction`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${formulary}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.${anchor}"]`);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const colorScheme of ['light', 'dark'] as const) {
				await page.emulateMedia({ colorScheme });
				await expect(button.locator('rt')).toHaveText(gloss);
				await expect(button.locator('.token')).toHaveCount(members.length);
				await button.scrollIntoViewIfNeeded();
				await page.evaluate(() => document.fonts.ready);
				const geometry = () =>
					button.evaluate((element) => {
						const box = element.getBoundingClientRect();
						const translation = element.querySelector('rt')!.getBoundingClientRect();
						return {
							width: box.width,
							height: box.height,
							glossWidth: translation.width,
							glossHeight: translation.height,
							overflow: document.documentElement.scrollWidth - innerWidth
						};
					});
				const before = await geometry();
				expect(before.overflow).toBe(0);
				await button.hover();
				expect(await geometry()).toEqual(before);
				await button.focus();
				await button.press('Enter');
				await expect(page.locator('aside .construction-title')).toHaveText([...members]);
				await expect(page.locator('aside .construction-card .morph')).toHaveCount(members.length);
				await page.keyboard.press('Escape');
				expect(await geometry()).toEqual(before);
			}
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
		await expect(button.locator('rt')).toHaveText(gloss);
	});
}

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/${formulary}`;
	test(`${language} Advent Gospel keeps the whole reading and corrected clauses`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		await expect(section.locator('.token')).toHaveCount(119);
		const glosses =
			language === 'pl'
				? [
						['w017', 'na'],
						['w022', 'zamętu wywołanego szumem']
					]
				: [
						['w023', 'at the roaring'],
						['w033', 'of what'],
						['w068', 'He told'],
						['w077', 'they put forth'],
						['w088', 'also'],
						['w089', 'you'],
						['w091', 'you see'],
						['w093', 'happening']
					];
		for (const [word, gloss] of glosses) {
			await expect(page.locator(`button[id="${text}.${word}"] rt`)).toHaveText(gloss);
		}
		await expect(page.locator(`button[id="${text}.w100"]`)).toContainText('Amen');
		await expect(page.locator(`button[id="${text}.w119"]`)).toContainText('transíbunt');
		await setHelp(page, 2);
		await expect(section.locator('.translation')).toHaveCount(7);
		if (language === 'pl') {
			await expect(section.locator('.translation').nth(3)).toContainText(
				'Gdy wydają już z siebie owoc'
			);
		}
	});

	test(`${language} Advent Gospel identifies the printed and bounded digital sources`, async ({
		page
	}) => {
		await page.goto(route);
		const section = page.locator(`#text-proprium-${text}`);
		await section
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const sources = page.getByRole('dialog').locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText('marker41, announcement42, reference43, complete body44');
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n81/mode/1up"]'
			)
		).toHaveCount(1);
		await expect(
			sources.locator(
				'a[href="https://raw.githubusercontent.com/DivinumOfficium/divinum-officium/b5e250b0af79bc3fb4fc3ac631a622d8cb0f2a19/web/www/missa/Latin/Tempora/Adv1-0.txt"]'
			)
		).toHaveCount(1);
	});
}
