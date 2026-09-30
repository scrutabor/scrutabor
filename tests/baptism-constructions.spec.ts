import { expect, setHelp, test } from './fixtures';

const formulary = 'commemoratio-baptismatis-domini';
const text = `${formulary}-evangelium`;

const groups = [
	['pl', 'w020', 'To jest Ten', ['Hic', 'est']],
	['en', 'w020', 'This is the One', ['Hic', 'est']],
	['en', 'w055', 'bore witness', ['testimónium', 'perhíbuit']],
	['en', 'w105', 'bore witness', ['testimónium', 'perhíbui']]
] as const;

for (const [language, anchor, gloss, words] of groups) {
	test(`${language} baptism ${anchor} keeps the whole construction together`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/${formulary}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.${anchor}"]`);
		for (const [width, colorScheme] of [
			[320, 'light'],
			[1280, 'dark']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await page.emulateMedia({ colorScheme });
			await expect(button.locator('rt')).toHaveText(gloss);
			await button.scrollIntoViewIfNeeded();
			const before = await button.boundingBox();
			await button.hover();
			expect(await button.boundingBox()).toEqual(before);
			await button.click();
			await expect(page.locator('aside .construction-card .construction-title')).toHaveText([
				...words
			]);
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
			await page.keyboard.press('Escape');
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toHaveText(gloss);
	});
}

for (const language of ['pl', 'en'] as const) {
	test(`${language} baptism retains separate words, full prose and source framing`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${formulary}`);
		await setHelp(page, 1);
		const targets =
			language === 'pl'
				? [
						['w048', 'przyszedłem'],
						['w049', 'ja'],
						['w095', 'Tym, który'],
						['w109', 'Synem']
					]
				: [
						['w040', 'did not know'],
						['w072', 'did not know'],
						['w086', 'you see'],
						['w102', 'saw'],
						['w109', 'the Son']
					];
		for (const [word, gloss] of targets) {
			const button = page.locator(`button[id="${text}.${word}"]`);
			await expect(button.locator('rt')).toHaveText(gloss);
			await button.click();
			await expect(
				page.getByRole('region', {
					name: language === 'pl' ? 'znaczenie w kontekście' : 'meaning in context'
				})
			).toHaveText(gloss);
			await page.keyboard.press('Escape');
		}
		const part = page.locator('.proper-part', { has: page.locator(`[id="${text}.w001"]`) });
		await expect(part.locator('.token')).toHaveCount(110);
		await setHelp(page, 2);
		await expect(part).toContainText(
			language === 'pl'
				? 'Ten, nad kim zobaczysz Ducha zstępującego i pozostającego na Nim, jest Tym, który'
				: 'The One upon whom you see the Spirit descending and remaining is the One who'
		);
		await part
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const sources = page.getByRole('dialog').locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText('heading 26, title 27, reference 28, body 29');
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n122/mode/1up"]'
			)
		).toHaveText('Missale Romanum ex decreto SS. Concilii Tridentini restitutum');
		await sources.locator('.bibliography-link a').click();
		const edition = page
			.getByRole('region', {
				name: language === 'pl' ? 'Łacińskie świadectwa tekstu' : 'Latin textual witnesses',
				exact: true
			})
			.locator('.source', {
				has: page.locator('cite', {
					hasText: 'Missale Romanum ex decreto SS. Concilii Tridentini restitutum'
				})
			});
		await expect(edition.locator('.edition-meta')).toContainText('Benziger');
		await expect(edition.locator('.edition-meta')).toContainText('1962');
	});
}

const splits = [
	['corporis-christi', 'evangelium', 'w040', 'w041', 'live'],
	['dominica-ii-post-pascha', 'evangelium', 'w074', 'w075', 'know'],
	['sanctorum-simonis-et-iudae-apostolorum', 'evangelium', 'w054', 'w055', 'have spoken'],
	['septem-dolorum-beatae-mariae-virginis', 'sequentia', 'w135', 'w136', 'live']
] as const;

for (const [day, part, subject, verb, gloss] of splits) {
	test(`${day} ${verb} does not duplicate its separate subject`, async ({ page }) => {
		await page.goto(`/app/en/formularium/${day}`);
		await setHelp(page, 1);
		await expect(page.locator(`button[id="${day}-${part}.${subject}"] rt`)).toHaveText('I');
		const button = page.locator(`button[id="${day}-${part}.${verb}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await button.click();
		await expect(page.getByRole('region', { name: 'meaning in context' })).toHaveText(gloss);
	});
}
