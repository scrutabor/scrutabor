import { expect, setHelp, setTheme, test } from './fixtures';

const day = 'purificatio-beatae-mariae-virginis';
const text = `${day}-tractus`;
const wordId = (n: number) => `w${String(n).padStart(3, '0')}`;
const latin =
	'Nunc dimíttis servum tuum, Dómine, secúndum verbum tuum in pace. Quia vidérunt óculi mei salutáre tuum. Quod parásti ante fáciem ómnium populórum. Lumen ad revelatiónem géntium, et glóriam plebis tuæ Israël.'.split(
		' '
	);
const readings = {
	pl: 'Teraz | uwalniasz | sługę | Twego | Panie | według | słowa | Twego | w | pokoju | Albowiem | ujrzały | oczy | moje | zbawienie | Twoje | Które | przygotowałeś | przed | obliczem | wszystkich | ludów | Światłość | ku | objawieniu | poganom | i | chwałę | ludu | Twego | Izraela',
	en: 'Now | You release | Your servant | Lord | according to | Your word | in | peace | For | my eyes have seen | Your salvation | which | You have prepared | before | the face | of all | peoples | a light | for | revelation | to the Gentiles | and | glory | of Your people | Israel'
};
const gradual =
	'Suscépimus, Deus, misericórdiam tuam in médio templi tui: secúndum nomen tuum, Deus, ita et laus tua in fines terræ. Sicut audívimus, ita et vídimus in civitáte Dei nostri, in monte sancto eius.'.split(
		' '
	);
const alleluia =
	'Allelúia, allelúia. Senex púerum portábat: puer autem senem regébat. Allelúia.'.split(' ');
const constructions = [
	[35, 'Your servant', ['servum', 'tuum'], ['servus', 'tuus']],
	[39, 'Your word', ['verbum', 'tuum'], ['verbum', 'tuus']],
	[44, 'my eyes have seen', ['vidérunt', 'óculi', 'mei'], ['video', 'oculus', 'meus']],
	[47, 'Your salvation', ['salutáre', 'tuum'], ['salutare', 'tuus']],
	[61, 'of Your people', ['plebis', 'tuæ'], ['plebs', 'tuus']]
] as const;

for (const language of ['pl', 'en'] as const) {
	test(`${language} Purification Tract retains only its complete printed Latin and interlinear reading`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		const expected = readings[language].split(' | ');
		expect(latin).toHaveLength(31);
		expect(expected).toHaveLength(language === 'pl' ? 31 : 25);
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await expect(section.locator('.token .base')).toHaveText(latin);
			await expect(section.locator('rt')).toHaveText(expected);
			await expect(section.locator(`[id="${text}.w001"]`)).toHaveCount(0);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(section.locator('.token .base')).toHaveText(latin);
		await expect(section.locator('rt')).toHaveText(expected);
	});

	test(`${language} Purification Tract identifies its exact source and localized role`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		const section = page.locator(`#text-proprium-${text}`);
		await section
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.about-text')).toContainText(
			language === 'pl' ? 'Trakt formularza' : 'The Tract of the formulary'
		);
		await dialog.locator('details.source-notes summary').click();
		await expect(dialog).toContainText('02-02');
		await expect(dialog).toContainText('185–188');
		await expect(dialog).toContainText('467');
		await expect(dialog.locator('a[href*="archive.org"]')).toHaveAttribute(
			'href',
			/\/page\/n548\//
		);
		await expect(dialog).not.toContainText('inherited references');
	});

	test(`${language} Purification Tract retains the relative object and recipient distinction`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${day}?w=${text}.w049`);
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.context-layer > .gloss')).toHaveText(
			language === 'pl' ? 'Które' : 'which'
		);
		await expect(dialog.locator('.morph')).toContainText(
			language === 'pl' ? 'biernik' : 'accusative'
		);
		await expect(dialog.locator('.morph')).not.toContainText(
			language === 'pl' ? 'mianownik' : 'nominative'
		);
		await expect(dialog.locator('.head > a')).toHaveAttribute(
			'href',
			`/app/${language}/lemma?l=qui`
		);
		await page.goto(`/app/${language}/formularium/${day}?w=${text}.w058`);
		await expect(dialog.locator('.context-layer > .gloss')).toHaveText(
			language === 'pl' ? 'poganom' : 'to the Gentiles'
		);
		await expect(dialog.locator('.morph')).toContainText(
			language === 'pl' ? 'dopełniacz' : 'genitive'
		);
		await expect(dialog.locator('.morph')).not.toContainText(
			language === 'pl' ? 'celownik' : 'dative'
		);
	});

	for (const [date, selected, excluded] of [
		['2026-02-02', 'tractus', 'alleluia'],
		['2028-02-02', 'alleluia', 'tractus']
	] as const) {
		test(`${language} Purification ${date} keeps the Gradual beside the correct seasonal chant`, async ({
			page
		}) => {
			await page.goto(`/app/${language}/ordo/catechumenorum?dies=${date}`);
			await setHelp(page, 1);
			// One Ordo slot contains both chants and links to the first one.
			// Assert the actual ordered bodies, not a nonexistent second title.
			const part = page.locator('.part').filter({
				has: page.locator(`a.part-title[href*="${day}-graduale"]`)
			});
			await expect(part).toHaveCount(1);
			await expect(part.locator('.token .base')).toHaveText([
				...gradual,
				...(selected === 'tractus' ? latin : alleluia)
			]);
			await expect(part.locator(`button[id^="${day}-${excluded}."]`)).toHaveCount(0);
			const first = page.locator(
				`[id="${day}-${selected}.${selected === 'tractus' ? 'w033' : 'w001'}"]`
			);
			await expect(first.locator('.base')).toHaveText(
				selected === 'tractus' ? 'Nunc' : 'Allelúia,'
			);
			if (selected === 'tractus') {
				await expect(page.locator(`[id="${text}.w001"]`)).toHaveCount(0);
				await expect(page.locator(`[id="${text}.w032"]`)).toHaveCount(0);
			}
		});
	}
}

test('English Purification Tract prose preserves the revelation recipients', async ({ page }) => {
	await page.goto(`/app/en/formularium/${day}`);
	await setHelp(page, 2);
	const translation = page.locator(`#text-proprium-${text} .translation`);
	await expect(translation).toHaveText(
		'Now You let Your servant depart, Lord, according to Your word, in peace; for my eyes have seen Your salvation, which You have prepared before the face of all peoples: a light for revelation to the Gentiles, and the glory of Your people Israel.'
	);
});

for (const [first, gloss, forms, lemmata] of constructions) {
	test(`English Purification Tract construction ${wordId(first)} retains all member links and stable interaction`, async ({
		page
	}) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto(`/app/en/formularium/${day}`);
		await setHelp(page, 1);
		await setTheme(page, 'dark');
		const button = page.locator(`button[id="${text}.${wordId(first)}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('.token')).toHaveCount(forms.length);
		await button.scrollIntoViewIfNeeded();
		const before = await button.boundingBox();
		await button.hover();
		expect(await button.boundingBox()).toEqual(before);
		await button.focus();
		await button.press('Enter');
		await expect(page.getByRole('dialog').locator('.construction-title')).toHaveText([...forms]);
		await page.keyboard.press('Escape');
		for (let offset = 0; offset < forms.length; offset++) {
			await page.goto(`/app/en/formularium/${day}?w=${text}.${wordId(first + offset)}`);
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
			await expect(dialog.locator('.construction-card h3')).toHaveText([...forms]);
			for (let i = 0; i < lemmata.length; i++) {
				await expect(
					dialog.locator('.construction-card').nth(i).locator('.head > a')
				).toHaveAttribute('href', `/app/en/lemma?l=${lemmata[i]}`);
			}
			expect(await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
				0
			);
			await page.keyboard.press('Escape');
		}
	});
}
