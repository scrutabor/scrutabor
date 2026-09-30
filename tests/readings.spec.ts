import { expect, setHelp, setTheme, test } from './fixtures';

const slug = 'omnium-sanctorum-epistola';
const constructions = {
	pl: [
		['w032', 'Nie czyńcie szkody', 2],
		['w185', 'wokół', 2],
		['w212', 'dziękczynienie', 2]
	],
	en: [
		['w002', 'those days', 2],
		['w016', 'of the living God', 2],
		['w020', 'with a loud voice', 2],
		['w023', 'to four angels', 2],
		['w025', 'it was granted', 2],
		['w032', 'Do not harm', 2],
		['w042', 'of our God', 2],
		['w045', 'their foreheads', 2],
		['w136', 'a great multitude', 2],
		['w141', 'no one could count', 3],
		['w159', 'in white robes', 2],
		['w164', 'their hands', 2],
		['w168', 'with a loud voice', 2],
		['w172', 'to our God', 2],
		['w184', 'round about', 2],
		['w198', 'their faces', 2],
		['w212', 'thanksgiving', 2],
		['w218', 'to our God', 2],
		['w221', 'forever and ever', 3]
	]
} as const;

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/omnium-sanctorum`;
	for (const [anchor, gloss, members] of constructions[language]) {
		test(`${language}: the All Saints reading keeps ${anchor} as one construction`, async ({
			page
		}) => {
			await page.goto(route);
			await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.reload();
			await setHelp(page, 1);
			const button = page.locator(`button[id="${slug}.${anchor}"]`);
			const group = button.locator('..');
			await expect(group).toHaveClass(/token-group/);
			await expect(group.locator('rt')).toHaveText(gloss);
			await expect(group.locator('.base')).toHaveCount(members);
			for (const [width, colorScheme] of [
				[320, 'light'],
				[1280, 'dark']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await setTheme(page, colorScheme);
				await button.scrollIntoViewIfNeeded();
				const before = await group.boundingBox();
				await button.hover();
				expect(await group.boundingBox()).toEqual(before);
				await button.click();
				await expect(page.locator('aside .construction-card')).toHaveCount(members);
				await expect
					.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
					.toBe(0);
				await page.keyboard.press('Escape');
			}
			await page.emulateMedia({ media: 'print' });
			await expect(group.locator('rt')).toBeVisible();
			await expect(group.locator('rt')).toHaveText(gloss);
		});
	}

	test(`${language}: the complete All Saints reading retains both Amens and its sources`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const part = page.locator(`#text-proprium-${slug}`);
		await expect(part.locator('.base')).toHaveCount(223);
		await expect(part.locator('.token-group')).toHaveCount(constructions[language].length);
		for (const word of ['w204', 'w223']) {
			await expect(part.locator(`button[id="${slug}.${word}"] rt`)).toHaveText('Amen');
		}
		if (language === 'pl') {
			for (const [word, gloss] of [
				['w141', 'nie mógł'],
				['w159', 'w szaty'],
				['w202', 'Bogu'],
				['w207', 'chwała']
			]) {
				await expect(part.locator(`button[id="${slug}.${word}"] rt`)).toHaveText(gloss);
			}
		}
		await setHelp(page, 2);
		await expect(part.locator('.translation')).toContainText(
			language === 'pl' ? 'Błogosławieństwo i chwała,' : 'to our God forever and ever. Amen.'
		);
		await part
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const sources = page.getByRole('dialog').locator('details.source-notes');
		await sources.locator('summary').click();
		for (const leaf of [799, 800]) {
			await expect(
				sources.locator(
					`a[href="https://archive.org/details/missale-romanum-1962/page/n${leaf}/mode/1up"]`
				)
			).toHaveCount(1);
		}
	});

	for (const [word, form, pl, en] of [
		['w024', 'quibus', 'r. męski', 'masculine'],
		['w134', 'hæc', 'r. nijaki', 'neuter']
	]) {
		test(`${language}: the All Saints card explains the contextual gender of ${word}`, async ({
			page
		}) => {
			await page.goto(`${route}?w=${slug}.${word}`);
			await expect(page.locator('aside .form')).toHaveText(form);
			await expect(page.locator('aside')).toContainText(language === 'pl' ? pl : en);
		});
	}
}
