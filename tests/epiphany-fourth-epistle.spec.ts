import { expect, setHelp, setTheme, test } from './fixtures';

const day = 'dominica-iv-post-epiphaniam';
const text = `${day}-epistola`;
const wordId = (n: number) => `w${String(n).padStart(3, '0')}`;
const readings = {
	pl: `Bracia | nikomu | nic | nie bądźcie dłużni | oprócz tego | abyście | wzajemnie | się miłowali | kto | bowiem | miłuje | bliźniego | Prawo | wypełnił | Albowiem | Nie | cudzołóż | nie | zabijaj | nie | kradnij | Nie mów fałszywego świadectwa | nie | pożądaj | i | jeśli | jakieś | jest | inne | przykazanie | w | tym | słowie | streszcza się | Będziesz miłował | bliźniego | swego | jak | siebie samego | Miłość | bliźniego | zła | nie | wyrządza | Pełnią | więc | Prawa | jest | miłość`,
	en: `Brethren | owe no one anything | except | to | love one another | for he who | loves | his neighbor | has fulfilled the Law | For | You shall not commit adultery | you shall not kill | you shall not steal | you shall not bear false witness | you shall not covet | and | if | there is any | other | commandment | in | this | word | it is summed up | You shall love | your neighbor | as | yourself | Love | of one’s neighbor | does no evil | The fulfilling | therefore | of the Law | is | love`
};

const constructions = [
	[
		2,
		4,
		4,
		'owe no one anything',
		['Némini', 'quidquam', 'debeátis'],
		['nemo', 'quisquam', 'debeo']
	],
	[7, 8, 8, 'love one another', ['ínvicem', 'diligátis'], ['invicem', 'diligo']],
	[13, 14, 14, 'has fulfilled the Law', ['legem', 'implévit'], ['lex', 'impleo']],
	[16, 17, 17, 'You shall not commit adultery', ['Non', 'adulterábis'], ['non', 'adultero']],
	[18, 19, 19, 'you shall not kill', ['Non', 'occídes'], ['non', 'occido']],
	[20, 21, 21, 'you shall not steal', ['Non', 'furáberis'], ['non', 'furor']],
	[
		22,
		25,
		25,
		'you shall not bear false witness',
		['Non', 'falsum', 'testimónium', 'dices'],
		['non', 'falsus', 'testimonium', 'dico']
	],
	[26, 27, 27, 'you shall not covet', ['Non', 'concupísces'], ['non', 'concupisco']],
	[30, 31, 31, 'there is any', ['quod', 'est'], ['qui', 'sum']],
	[39, 40, 39, 'your neighbor', ['próximum', 'tuum'], ['proximus', 'tuus']],
	[45, 47, 47, 'does no evil', ['malum', 'non', 'operátur'], ['malum', 'non', 'operor']]
] as const;

for (const language of ['pl', 'en'] as const) {
	test(`${language} Epiphany IV Epistle keeps its complete interlinear reading`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		const expected = readings[language].split(' | ');
		expect(expected).toHaveLength(language === 'pl' ? 49 : 36);
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await expect(section.locator('.token')).toHaveCount(52);
			await expect(section.locator('rt')).toHaveText(expected);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(section.locator('rt')).toHaveText(expected);
	});

	test(`${language} Epiphany IV Epistle identifies the exact source body`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		const section = page.locator(`#text-proprium-${text}`);
		await expect(section.locator('.token').nth(18).locator('.base')).toHaveText('occídes:');
		await section
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.about-text')).toContainText(
			language === 'pl' ? 'Czytanie' : 'Epistle'
		);
		await dialog.locator('details.source-notes summary').click();
		await expect(dialog).toContainText('Epi4-0');
		await expect(dialog).toContainText('complete direct body 22');
	});

	test(`${language} Epiphany IV quidquam keeps its contextual neuter without new approval`, async ({
		page
	}) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto(`/app/${language}/formularium/${day}?w=${text}.w003`);
		await setTheme(page, 'dark');
		const dialog = page.getByRole('dialog');
		const card =
			language === 'pl'
				? dialog
				: dialog
						.locator('.construction-card')
						.filter({ has: page.getByRole('heading', { name: 'quidquam', exact: true }) });
		await expect(card.locator('.head > a')).toHaveAttribute(
			'href',
			`/app/${language}/lemma?l=quisquam`
		);
		await expect(card.locator('.morph')).toHaveText(
			language === 'pl'
				? 'zaimek — biernik, l. poj., r. nijaki'
				: 'pronoun — accusative, singular, neuter'
		);
		await expect(card).toContainText(language === 'pl' ? 'do przeglądu' : 'awaiting review');
		expect(await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
			0
		);
	});
}

test('English Epiphany IV constructions preserve member cards and deep links', async ({ page }) => {
	await page.goto(`/app/en/formularium/${day}`);
	await setHelp(page, 1);
	for (const [first, last, anchor, gloss, forms, lemmata] of constructions) {
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
			await page.goto(`/app/en/formularium/${day}?w=${text}.${wordId(member)}`);
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
			await expect(dialog.locator('.construction-card h3')).toHaveText([...forms]);
			for (let index = 0; index < lemmata.length; index++) {
				await expect(
					dialog.locator('.construction-card').nth(index).locator('.head > a')
				).toHaveAttribute('href', `/app/en/lemma?l=${lemmata[index]}`);
			}
			await page.keyboard.press('Escape');
		}
	}
});
