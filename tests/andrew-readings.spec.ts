import { expect, setHelp, setTheme, test } from './fixtures';

const formulary = 'sancti-andreae-apostoli';
const gospel = `${formulary}-evangelium`;
const communion = `${formulary}-communio`;
const groups = {
	pl: [[['w035', 'w036'], 'w036', ['vos', 'fíeri'], 'że staniecie się']],
	en: [
		[['w004', 'w005'], 'w004', ['Ámbulans', 'Iesus'], 'As Jesus was walking'],
		[['w018', 'w019'], 'w018', ['fratrem', 'eius'], 'his brother'],
		[['w024', 'w025'], 'w024', ['erant', 'enim'], 'for they were'],
		[['w058', 'w059'], 'w058', ['fratrem', 'eius'], 'his brother'],
		[['w064', 'w065'], 'w064', ['patre', 'eórum'], 'their father'],
		[['w067', 'w068'], 'w067', ['rétia', 'sua'], 'their nets']
	]
} as const;

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/${formulary}`;
	test(`${language} Andrew retains grammatical readings in both components`, async ({ page }) => {
		await page.goto(route);
		await setHelp(page, 1);
		for (const [text, word, gloss] of language === 'pl'
			? [
					[gospel, 'w015', 'Piotrem'],
					[gospel, 'w055', 'Zebedeusza'],
					[communion, 'w004', 'sprawię'],
					[communion, 'w005', 'że wy'],
					[communion, 'w006', 'staniecie się'],
					[communion, 'w016', 'Panem']
				]
			: [
					[gospel, 'w034', 'I will make'],
					[gospel, 'w035', 'you'],
					[gospel, 'w036', 'become'],
					[gospel, 'w055', 'of Zebedee'],
					[communion, 'w004', 'I will make'],
					[communion, 'w005', 'you'],
					[communion, 'w006', 'become'],
					[communion, 'w016', 'the Lord']
				]) {
			await expect(page.locator(`button[id="${text}.${word}"] rt`)).toHaveText(gloss);
		}
	});
	for (const [members, anchor, forms, gloss] of groups[language]) {
		test(`${language} Andrew Gospel ${anchor} preserves the whole construction and both analyses`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(route);
			await setHelp(page, 1);
			const button = page.locator(`button[id="${gospel}.${anchor}"]`);
			await expect(button.locator('rt')).toHaveText(gloss);
			await expect(button.locator('.token')).toHaveCount(2);
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
					await expect(page.locator('aside .construction-title')).toHaveText([...forms]);
					await expect(page.locator('aside .construction-card .morph')).toHaveCount(2);
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
			await expect(button.locator('rt')).toBeVisible();
			await expect(button.locator('rt')).toHaveText(gloss);
			await page.emulateMedia({ media: 'screen' });
			for (const member of members) {
				await page.goto(`${route}?w=${gospel}.${member}`);
				await expect(page.locator('aside .construction-title')).toHaveText([...forms]);
				await expect(page.locator('aside .construction-card .morph')).toHaveCount(2);
			}
		});
	}

	test(`${language} Andrew preserves both complete readings and distinct causatives`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const reading = page.locator(`#text-proprium-${gospel}`);
		const chant = page.locator(`#text-proprium-${communion}`);
		await expect(reading.locator('.token')).toHaveCount(81);
		await expect(reading.locator('rt')).toHaveCount(language === 'pl' ? 78 : 73);
		await expect(chant.locator('.token')).toHaveCount(16);
		await expect(chant.locator('rt')).toHaveCount(15);
		const direct =
			language === 'pl'
				? [
						['w014', 'jest zwany'],
						['w015', 'Piotrem'],
						['w034', 'sprawię'],
						['w039', 'A'],
						['w040', 'oni'],
						['w055', 'Zebedeusza']
					]
				: [
						['w034', 'I will make'],
						['w035', 'you'],
						['w036', 'become'],
						['w039', 'And'],
						['w040', 'they'],
						['w051', 'another'],
						['w052', 'two'],
						['w055', 'of Zebedee']
					];
		for (const [word, gloss] of direct) {
			await expect(reading.locator(`button[id="${gospel}.${word}"] rt`)).toHaveText(gloss);
		}
		for (const [word, gloss] of language === 'pl'
			? [
					['w004', 'sprawię'],
					['w005', 'że wy'],
					['w006', 'staniecie się'],
					['w016', 'Panem']
				]
			: [
					['w004', 'I will make'],
					['w005', 'you'],
					['w006', 'become'],
					['w016', 'the Lord']
				]) {
			await expect(chant.locator(`button[id="${communion}.${word}"] rt`)).toHaveText(gloss);
		}
		await setHelp(page, 2);
		await expect(reading.locator('.translation')).toHaveCount(1);
		await expect(chant.locator('.translation')).toHaveCount(1);
		await expect((language === 'en' ? reading : chant).locator('.translation')).toContainText(
			language === 'en' ? 'Come after Me' : 'za Mną'
		);
	});

	for (const [text, label] of [
		[gospel, language === 'pl' ? 'Ewangelia formularza' : 'The Gospel'],
		[communion, language === 'pl' ? 'Antyfona na Komunię' : 'The Communion antiphon']
	] as const) {
		test(`${language} Andrew ${text} identifies the component and its printed source`, async ({
			page
		}) => {
			await page.goto(route);
			await page
				.locator(`#text-proprium-${text}`)
				.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
				.click();
			const dialog = page.getByRole('dialog');
			await expect(dialog).toContainText(label);
			const sources = dialog.locator('details.source-notes');
			await sources.locator('summary').click();
			await expect(sources).toContainText('Sancti/11-30');
			await expect(
				sources.locator(
					`a[href="https://archive.org/details/missale-romanum-1962/page/n${text === gospel ? 507 : 508}/mode/1up"]`
				)
			).toHaveCount(1);
			await page.keyboard.press('Escape');
		});
	}

	test(`${language} dated Andrew Mass keeps Gospel and Communion in their own movements`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-11-30`);
		await setHelp(page, 1);
		await expect(
			page.locator(`button[id="${gospel}.${language === 'pl' ? 'w036' : 'w039'}"] rt`)
		).toHaveText(language === 'pl' ? 'że staniecie się' : 'And');
		await page.goto(`/app/${language}/ordo/conclusio?dies=2026-11-30`);
		await setHelp(page, 1);
		await expect(page.locator(`button[id="${communion}.w016"] rt`)).toHaveText(
			language === 'pl' ? 'Panem' : 'the Lord'
		);
	});
}
