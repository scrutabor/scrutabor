import { expect, setHelp, setTheme, test } from './fixtures';

const day = 'purificatio-beatae-mariae-virginis';
const text = `${day}-communio`;
const wordId = (n: number) => `w${String(n).padStart(3, '0')}`;
const readings = {
	pl: 'Zapowiedź | otrzymał | Symeon | od | Ducha | Świętego | że nie ujrzy | on | śmierci | zanim | ujrzy | Chrystusa | Pańskiego',
	en: 'Simeon received an answer | from | the Holy Spirit | that he would not see | death | unless | he saw | the Christ | of the Lord'
};
const latin = [
	'Respónsum',
	'accépit',
	'Símeon',
	'a',
	'Spíritu',
	'Sancto,',
	'non',
	'visúrum',
	'se',
	'mortem,',
	'nisi',
	'vidéret',
	'Christum',
	'Dómini.'
];
const constructions = {
	pl: [[7, 8, 8, 'że nie ujrzy', ['non', 'visúrum'], ['non', 'video']]],
	en: [
		[
			1,
			3,
			2,
			'Simeon received an answer',
			['Respónsum', 'accépit', 'Símeon'],
			['responsum', 'accipio', 'Simeon']
		],
		[5, 6, 5, 'the Holy Spirit', ['Spíritu', 'Sancto'], ['spiritus', 'sanctus']],
		[7, 9, 8, 'that he would not see', ['non', 'visúrum', 'se'], ['non', 'video', 'sui']]
	]
} as const;

for (const language of ['pl', 'en'] as const) {
	test(`${language} Purification Communion retains the complete promise and the printed Latin`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		const expected = readings[language].split(' | ');
		expect(expected).toHaveLength(language === 'pl' ? 13 : 9);
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await expect(section.locator('.token .base')).toHaveText(latin);
			await expect(section.locator('rt')).toHaveText(expected);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(section.locator('.token .base')).toHaveText(latin);
		await expect(section.locator('rt')).toHaveText(expected);
	});

	test(`${language} Purification Communion identifies the Communion source rather than the procession`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		const section = page.locator(`#text-proprium-${text}`);
		await section
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.about-text')).toContainText(
			language === 'pl' ? 'Antyfona na Komunię' : 'The Communion antiphon'
		);
		await dialog.locator('details.source-notes summary').click();
		await expect(dialog).toContainText('02-02');
		await expect(dialog).toContainText('204');
		await expect(dialog).toContainText('467');
		await expect(dialog.locator('a[href*="archive.org"]')).toHaveAttribute(
			'href',
			/\/page\/n548\//
		);
		await expect(dialog).not.toContainText('inherited references');
	});

	test(`${language} Purification Communion retains the subordinate Latin tense`, async ({
		page
	}) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto(`/app/${language}/formularium/${day}?w=${text}.w012`);
		await setTheme(page, 'dark');
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.context-layer > .gloss')).toHaveText(
			language === 'pl' ? 'ujrzy' : 'he saw'
		);
		await expect(dialog.locator('.morph')).toContainText(
			language === 'pl' ? 'imperfectum' : 'imperfect'
		);
		await expect(dialog.locator('.morph')).toContainText(
			language === 'pl' ? 'tryb łączący' : 'subjunctive'
		);
		await expect(dialog.locator('.head > a')).toHaveAttribute(
			'href',
			`/app/${language}/lemma?l=video`
		);
	});

	test(`${language} Purification Communion constructions preserve every member and stable interaction`, async ({
		page
	}) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		await setTheme(page, 'dark');
		for (const [first, last, anchor, gloss, forms, lemmata] of constructions[language]) {
			const button = page.locator(`button[id="${text}.${wordId(anchor)}"]`);
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
			for (let member = first; member <= last; member++) {
				await page.goto(`/app/${language}/formularium/${day}?w=${text}.${wordId(member)}`);
				const dialog = page.getByRole('dialog');
				await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
				await expect(dialog.locator('.construction-card h3')).toHaveText([...forms]);
				for (let index = 0; index < lemmata.length; index++) {
					await expect(
						dialog.locator('.construction-card').nth(index).locator('.head > a')
					).toHaveAttribute('href', `/app/${language}/lemma?l=${lemmata[index]}`);
				}
				if (anchor === 8) {
					const participle = dialog
						.locator('.construction-card')
						.filter({ has: page.getByRole('heading', { name: 'visúrum', exact: true }) });
					await expect(participle).toContainText(
						language === 'pl' ? 'do przeglądu' : 'awaiting review'
					);
					await expect(participle.locator('.morph')).toContainText(
						language === 'pl' ? 'czas przyszły' : 'future'
					);
					await expect(participle.locator('.morph')).toContainText(
						language === 'pl' ? 'biernik' : 'accusative'
					);
				}
				expect(
					await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
				await page.keyboard.press('Escape');
			}
		}
	});
}
