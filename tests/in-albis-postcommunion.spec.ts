import { expect, setHelp, setTheme, test } from './fixtures';

const text = 'dominica-in-albis-postcommunio';
const prose = {
	pl: 'Prosimy, Panie, Boże nasz, abyś przenajświętsze tajemnice, których udzieliłeś dla osłony naszego odnowienia, uczynił dla nas lekarstwem zarówno obecnym, jak i przyszłym. Przez Pana naszego Jezusa Chrystusa, Syna Twojego, który z Tobą żyje i króluje w jedności Ducha Świętego, Bóg, na wieki wieków.',
	en: 'We ask You, Lord our God, to make the most holy mysteries, which You have bestowed to safeguard our restoration, a remedy for us both now and in the future. Through our Lord Jesus Christ, Your Son, who lives and reigns with You in the unity of the Holy Spirit, God, for ever and ever.'
};
const groups = {
	pl: [
		[
			['w010', 'w011', 'w012'],
			'w012',
			['reparatiónis', 'nostræ', 'munímine'],
			'ochrony naszego odnowienia'
		],
		[['w018', 'w019'], 'w019', ['esse', 'fácias'], 'uczynił']
	],
	en: [
		[['w003', 'w004'], 'w003', ['Deus', 'noster'], 'our God'],
		[['w010', 'w011'], 'w010', ['reparatiónis', 'nostræ'], 'our restoration’s'],
		[['w015', 'w016', 'w017'], 'w017', ['præsens', 'nobis', 'remédium'], 'a present remedy for us'],
		[['w018', 'w019'], 'w019', ['esse', 'fácias'], 'You may make'],
		[['w027', 'w028'], 'w027', ['Fílium', 'tuum'], 'Your Son'],
		[['w036', 'w037'], 'w036', ['Spíritus', 'Sancti'], 'of the Holy Spirit']
	]
} as const;

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/dominica-in-albis`;
	for (const [members, anchor, forms, gloss] of groups[language]) {
		test(`${language} Low Sunday ${anchor} keeps the construction and each analysis accessible`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(route);
			await setHelp(page, 1);
			const button = page.locator(`button[id="${text}.${anchor}"]`);
			await expect(button.locator('rt')).toHaveText(gloss);
			await expect(button.locator('.token')).toHaveCount(members.length);
			for (const width of [320, 1280]) {
				await page.setViewportSize({ width, height: 900 });
				for (const theme of ['light', 'dark'] as const) {
					await setTheme(page, theme);
					await button.scrollIntoViewIfNeeded();
					await page.evaluate(() => document.fonts.ready);
					const before = await button.boundingBox();
					await button.hover();
					expect(await button.boundingBox()).toEqual(before);
					await button.focus();
					await button.press('Enter');
					await expect(page.locator('aside .construction-title')).toHaveText([...forms]);
					await expect(page.locator('aside .construction-card .morph')).toHaveCount(members.length);
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
				await page.goto(`${route}?w=${text}.${member}`);
				await expect(page.locator('aside .construction-title')).toHaveText([...forms]);
				await expect(page.locator('aside .construction-card .morph')).toHaveCount(members.length);
			}
		});
	}

	test(`${language} Low Sunday preserves every word and the separate response`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		await expect(section.locator('.token')).toHaveCount(43);
		await expect(section.locator('rt')).toHaveCount(language === 'pl' ? 40 : 35);
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
						['w014', 'both'],
						['w020', 'and'],
						['w021', 'a future one'],
						['w030', 'with You'],
						['w031', 'lives'],
						['w033', 'reigns'],
						['w039', 'through']
					];
		for (const [word, gloss] of [...direct, ['w043', 'Amen']]) {
			const button = section.locator(`button[id="${text}.${word}"]`);
			await expect(button.locator('rt')).toHaveText(gloss);
			await expect(button.locator('..')).toHaveClass(/\btoken\b/);
		}
		if (language === 'en') {
			const retained = section.locator(`button[id="${text}.w023"]`);
			await expect(retained.locator('rt')).toHaveText('our Lord');
			await expect(retained.locator('.token')).toHaveCount(2);
		}
		await setHelp(page, 2);
		await expect(section.locator('.translation')).toHaveText([prose[language], 'Amen.']);
	});

	test(`${language} Low Sunday separates printed body and expanded conclusion sources`, async ({
		page
	}) => {
		await page.goto(route);
		await page
			.locator(`#text-proprium-${text}`)
			.getByRole('button', {
				name: language === 'pl' ? 'o modlitwie' : 'about this prayer'
			})
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toContainText(
			language === 'pl' ? 'Modlitwa po Komunii formularza' : 'The prayer after Communion of'
		);
		const sources = dialog.locator('details.source-notes');
		await sources.locator('summary').click();
		for (const locator of ['body 53 and reference 54', 'conclusion 96, response 97', 'RG 115 a']) {
			await expect(sources).toContainText(locator);
		}
		for (const leaf of [416, 22]) {
			await expect(
				sources.locator(
					`a[href="https://archive.org/details/missale-romanum-1962/page/n${leaf}/mode/1up"]`
				)
			).toHaveCount(1);
		}
		await page.keyboard.press('Escape');
	});

	test(`${language} dated Low Sunday uses the same postcommunion`, async ({ page }) => {
		await page.goto(`/app/${language}/ordo/conclusio?dies=2026-04-12`);
		await setHelp(page, 1);
		await expect(page.locator(`button[id="${text}.w019"] rt`)).toHaveText(
			language === 'pl' ? 'uczynił' : 'You may make'
		);
		await expect(page.locator(`button[id="${text}.w019"] .token`)).toHaveCount(2);
		await expect(page.locator(`button[id="${text}.w043"] rt`)).toHaveText('Amen');
	});
}
