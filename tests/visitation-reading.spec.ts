import { expect, setHelp, setTheme, test } from './fixtures';

const formulary = 'visitatio-beatae-mariae-virginis';
const text = `${formulary}-epistola`;
const groups = [
	['pl', 'w014', 'i do młodego jelenia', ['hinnulóque', 'cervórum']],
	['pl', 'w061', 'dał się słyszeć', ['audíta', 'est']],
	['en', 'w009', 'is like', ['símilis', 'est']],
	['en', 'w014', 'and a young deer', ['hinnulóque', 'cervórum']],
	['en', 'w061', 'has been heard', ['audíta', 'est']],
	['en', 'w094', 'let your voice sound', ['sonet', 'vox', 'tua']]
] as const;

for (const [language, anchor, gloss, members] of groups) {
	test(`${language} Visitation ${anchor} keeps the complete construction`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/${formulary}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.${anchor}"]`);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const colorScheme of ['light', 'dark'] as const) {
				await setTheme(page, colorScheme);
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
	test(`${language} Visitation keeps the whole reading and local predicates`, async ({ page }) => {
		await page.goto(route);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		await expect(section.locator('.token')).toHaveCount(107);
		const glosses =
			language === 'pl'
				? [
						['w017', 'on sam'],
						['w034', 'pośpiesz się']
					]
				: [
						['w005', 'on'],
						['w017', 'he himself'],
						['w103', 'is sweet'],
						['w107', 'is beautiful']
					];
		for (const [word, gloss] of glosses) {
			await expect(page.locator(`button[id="${text}.${word}"] rt`)).toHaveText(gloss);
		}
		await expect(page.locator(`button[id="${text}.w043"] .base`)).toHaveText(
			language === 'pl' ? 'Iam' : ['Iam', 'enim']
		);
		await expect(page.locator(`button[id="${text}.w086"] .base`)).toHaveText('petræ,');
		await expect(page.locator(`button[id="${text}.w107"] .base`)).toHaveText('decóra.');
		await setHelp(page, 2);
		await expect(section.locator('.translation')).toHaveCount(1);
		await expect(section.locator('.translation')).toContainText(
			language === 'pl' ? 'rozległ się na naszej ziemi' : 'a roe and a young deer'
		);
	});

	test(`${language} Visitation identifies the printed and exact digital sources`, async ({
		page
	}) => {
		await page.goto(route);
		const section = page.locator(`#text-proprium-${text}`);
		await section
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toContainText(language === 'pl' ? 'Epistoła' : 'The Epistle');
		const sources = dialog.locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText(
			'section marker16, announcement17, reference18, complete direct body19'
		);
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n665/mode/1up"]'
			)
		).toHaveCount(1);
		await expect(
			sources.locator(
				'a[href="https://github.com/DivinumOfficium/divinum-officium/commit/44667ff518b8ff1439780470828b39714f5306a2"]'
			)
		).toHaveCount(1);
	});
}

const comparisons = [
	[
		'dominica-vi-post-epiphaniam',
		'w010',
		'The kingdom of heaven is like',
		'w013',
		'a grain',
		['w009', 'w010', 'w011', 'w012']
	],
	[
		'dominica-vi-post-epiphaniam',
		'w054',
		'The kingdom of heaven is like',
		'w057',
		'leaven',
		['w053', 'w054', 'w055', 'w056']
	],
	['dominica-xvii-post-pentecosten', 'w054', 'is like', 'w056', 'this', ['w054', 'w055']],
	[
		'sanctae-annae-matris-beatae-mariae-virginis',
		'w010',
		'Is like',
		'w014',
		'a treasure',
		['w010', 'w011']
	],
	[
		'sanctae-annae-matris-beatae-mariae-virginis',
		'w038',
		'is like',
		'w042',
		'a man',
		['w038', 'w039']
	],
	[
		'sanctae-annae-matris-beatae-mariae-virginis',
		'w062',
		'is like',
		'w066',
		'a net',
		['w062', 'w063']
	],
	[
		'sanctae-annae-matris-beatae-mariae-virginis',
		'w133',
		'is like',
		'w135',
		'a man',
		['w133', 'w134']
	]
] as const;

for (const [day, anchor, gloss, comparand, noun, members] of comparisons) {
	test(`English ${day} ${anchor} keeps the comparison together`, async ({ page }) => {
		await page.goto(`/app/en/formularium/${day}`);
		await setHelp(page, 1);
		const id = `${day}-evangelium`;
		const button = page.locator(`button[id="${id}.${anchor}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('.token')).toHaveCount(members.length);
		expect(
			await button
				.locator('.token')
				.evaluateAll((tokens) => tokens.map((token) => token.id || token.closest('button')?.id))
		).toEqual(members.map((member) => `${id}.${member}`));
		await expect(page.locator(`button[id="${id}.${comparand}"] rt`)).toHaveText(noun);
		await button.click();
		await expect(page.locator('aside .construction-title')).toHaveCount(members.length);
		await expect(page.locator('aside .construction-card .morph')).toHaveCount(members.length);
		for (let index = 0; index < members.length; index++) {
			await expect(page.locator('aside .construction-title').nth(index)).toHaveAttribute(
				'id',
				`construction-${members[index]}-title`
			);
		}
		await page.keyboard.press('Escape');
	});
}
