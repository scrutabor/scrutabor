import { expect, setHelp, setTheme, test } from './fixtures';

const text = 'purificatio-beatae-mariae-virginis-postcommunio';

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/purificatio-beatae-mariae-virginis`;
	const groups = [
		language === 'pl'
			? {
					anchor: 'w012',
					members: ['w010', 'w011', 'w012'],
					forms: ['reparatiónis', 'nostræ', 'munímine'],
					gloss: 'ochrony naszego odnowienia'
				}
			: {
					anchor: 'w010',
					members: ['w010', 'w011'],
					forms: ['reparatiónis', 'nostræ'],
					gloss: 'our restoration’s'
				},
		{
			anchor: 'w024',
			members: ['w023', 'w024'],
			forms: ['esse', 'fácias'],
			gloss: language === 'pl' ? 'uczynił' : 'You may make'
		}
	];

	test(`${language} Purification keeps each construction together and each word accessible`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(route);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		await expect(section.locator('.token')).toHaveCount(48);
		// The English conclusion reads in shared groups.
		await expect(section.locator('rt')).toHaveCount(language === 'pl' ? 45 : 34);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ['light', 'dark'] as const) {
				await setTheme(page, theme);
				for (const group of groups) {
					const button = section.locator(`button[id="${text}.${group.anchor}"]`);
					await expect(button.locator('rt')).toHaveText(group.gloss);
					await expect(button.locator('.token')).toHaveCount(group.members.length);
					await button.scrollIntoViewIfNeeded();
					await page.evaluate(() => document.fonts.ready);
					const before = await button.boundingBox();
					await button.hover();
					expect(await button.boundingBox()).toEqual(before);
					await button.focus();
					await button.press('Enter');
					await expect(page.locator('aside .construction-title')).toHaveText(group.forms);
					await expect(page.locator('aside .construction-card .morph')).toHaveCount(
						group.members.length
					);
					expect(
						await page.locator('aside .inner').evaluate((el) => el.scrollWidth - el.clientWidth)
					).toBe(0);
					await page.keyboard.press('Escape');
					await expect(page.locator('aside')).toHaveCount(0);
				}
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		}
		await page.emulateMedia({ media: 'print' });
		for (const group of groups) {
			await expect(section.locator(`button[id="${text}.${group.anchor}"] rt`)).toHaveText(
				group.gloss
			);
		}
		await page.emulateMedia({ media: 'screen' });
		for (const group of groups) {
			for (const member of group.members) {
				await page.goto(`${route}?w=${text}.${member}`);
				await expect(page.locator('aside .construction-title')).toHaveText(group.forms);
				await page.keyboard.press('Escape');
			}
		}
	});

	test(`${language} Purification preserves separate contextual glosses and the response`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		const direct =
			language === 'pl'
				? [
						['w008', 'których'],
						['w009', 'jako'],
						['w013', 'udzieliłeś']
					]
				: [
						['w012', 'safeguard'],
						['w013', 'You have bestowed'],
						['w019', 'both'],
						['w020', 'now'],
						['w021', 'for us'],
						['w022', 'a remedy'],
						['w025', 'and'],
						['w026', 'in the future']
					];
		for (const [word, gloss] of [...direct, ['w048', 'Amen']]) {
			const button = section.locator(`button[id="${text}.${word}"]`);
			await expect(button.locator('rt')).toHaveText(gloss);
			await expect(button.locator('..')).toHaveClass(/\btoken\b/);
		}
		if (language === 'en') {
			for (const [anchor, gloss] of [
				['w032', 'Your Son'],
				['w036', 'who lives and reigns with You'],
				['w046', 'forever and ever']
			]) {
				const button = section.locator(`button[id="${text}.${anchor}"]`);
				await expect(button.locator('rt').first()).toHaveText(gloss);
				await expect(button.locator('..')).toHaveClass(/\btoken-group\b/);
			}
		}
		await section
			.getByRole('button', {
				name: language === 'pl' ? 'o modlitwie' : 'about this prayer'
			})
			.click();
		await expect(page.getByRole('dialog')).toContainText(
			language === 'pl' ? 'Modlitwa po Komunii formularza' : 'The postcommunion prayer of'
		);
		await page.keyboard.press('Escape');
		await setHelp(page, 2);
		await expect(section.locator('.translation')).toHaveCount(2);
		await expect(section.locator('.translation').last()).toHaveText('Amen.');
	});
}
