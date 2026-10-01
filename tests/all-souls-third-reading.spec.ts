import { expect, setHelp, setTheme, test } from './fixtures';

const day = 'commemoratio-omnium-fidelium-defunctorum-missa-iii';
const text = `${day}-epistola`;
const wordId = (n: number) => `w${String(n).padStart(3, '0')}`;
const groups = [
	[24, 25, 'their labors', ['labóribus', 'suis']],
	[26, 28, 'for their works', ['ópera', 'enim', 'illórum']]
] as const;

for (const [first, last, gloss, forms] of groups) {
	test(`English third All Souls reading keeps ${wordId(first)} together`, async ({ page }) => {
		const route = `/app/en/formularium/${day}`;
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(route);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.${wordId(first)}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('.token')).toHaveCount(forms.length);
		for (let member = first + 1; member <= last; member++) {
			await expect(page.locator(`button[id="${text}.${wordId(member)}"]`)).toHaveCount(0);
		}
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await button.scrollIntoViewIfNeeded();
			const before = await button.boundingBox();
			await button.hover();
			expect(await button.boundingBox()).toEqual(before);
			await button.focus();
			await button.press('Enter');
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('header .form')).toHaveText(forms.join(' '));
			await expect(dialog.locator('.construction-title')).toHaveText([...forms]);
			await expect(dialog.locator('.construction-card .morph')).toHaveCount(forms.length);
			await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
			expect(await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
				0
			);
			await page.keyboard.press('Escape');
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
		await page.emulateMedia({ media: 'screen' });
		for (let member = first; member <= last; member++) {
			await page.goto(`${route}?w=${text}.${wordId(member)}`);
			await expect(page.getByRole('dialog').locator('header .form')).toHaveText(forms.join(' '));
			await expect(page.locator('aside .construction-title')).toHaveText([...forms]);
		}
	});
}

for (const [number, form, gloss] of [
	[5, 'vocem', 'a voice'],
	[11, 'Beáti', 'blessed are'],
	[22, 'requiéscant', 'they may rest']
] as const) {
	test(`English third All Souls reading expresses ${wordId(number)} naturally`, async ({
		page
	}) => {
		await page.goto(`/app/en/formularium/${day}`);
		await setHelp(page, 1);
		const word = page.locator(`button[id="${text}.${wordId(number)}"]`);
		await expect(word.locator('rt')).toHaveText(gloss);
		await expect(word.locator('ruby > .base')).toHaveCount(1);
		await expect(word.locator('ruby > .base')).toHaveText(form);
		if (number === 22) {
			await expect(page.locator(`button[id="${text}.w021"] rt`)).toHaveText('that');
		}
	});
}

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/${day}`;
	test(`${language} third All Souls reading preserves every word and provider`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const reading = page.locator(`#text-proprium-${text}`);
		await expect(reading.locator('.token')).toHaveCount(30);
		await expect(reading.locator('rt')).toHaveText(
			language === 'pl'
				? [
						'w',
						'dniach',
						'owych',
						'usłyszałem',
						'głos',
						'z',
						'nieba',
						'mówiący',
						'mi',
						'napisz',
						'błogosławieni',
						'umarli',
						'którzy',
						'w',
						'Panu',
						'umierają',
						'odtąd',
						'już',
						'mówi',
						'Duch',
						'aby',
						'odpoczywali',
						'od',
						'trudów',
						'swoich',
						'uczynki',
						'bowiem',
						'ich',
						'idą za',
						'nimi'
					]
				: [
						'in',
						'those days',
						'I heard',
						'a voice',
						'from',
						'heaven',
						'saying',
						'to me',
						'write',
						'blessed are',
						'the dead',
						'who',
						'in',
						'the Lord',
						'die',
						'henceforth',
						'now',
						'says',
						'the Spirit',
						'that',
						'they may rest',
						'from',
						'their labors',
						'for their works',
						'follow',
						'them'
					]
		);
		await expect(reading.locator('.token').last()).toContainText('illos');
	});

	test(`${language} third All Souls reading explains the possessors without renewing approval`, async ({
		page
	}) => {
		await page.goto(`${route}?w=${text}.w028`);
		const dialog = page.getByRole('dialog');
		const card =
			language === 'pl'
				? dialog
				: dialog.locator('.construction-card').filter({
						has: page.locator('h3', { hasText: /^illórum$/ })
					});
		await expect(card.locator('.morph')).toContainText(
			language === 'pl' ? 'dopełniacz' : 'genitive'
		);
		await expect(card.locator('.morph')).toContainText(language === 'pl' ? 'męski' : 'masculine');
		await expect(card.locator('.verification')).toContainText(
			language === 'pl' ? 'do przeglądu' : 'awaiting review'
		);
	});

	test(`${language} third All Souls sources identify the direct reading`, async ({ page }) => {
		await page.goto(route);
		await page
			.locator(`#text-proprium-${text}`)
			.getByRole('button', {
				name: language === 'pl' ? 'o modlitwie' : 'about this prayer'
			})
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toContainText(language === 'pl' ? 'Epistoła' : 'The Epistle');
		const sources = dialog.locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText('p. 726');
		await expect(sources).toContainText('Latin/Sancti/11-02m3.txt');
		await expect(sources).toContainText('direct body line 19');
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n807/mode/1up"]'
			)
		).toHaveCount(1);
	});
}
