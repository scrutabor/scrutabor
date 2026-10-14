import { expect, setTheme, test } from './fixtures';

// General dictionary alternatives do not replace the contextual word parse.
const alternatives = [
	['Bethlehem', 'n. / f.'],
	['Ierosolyma', 'n. / f.'],
	['advena', 'm. / f.'],
	['coniunx', 'f. / m.'],
	['dies', 'm. / f.'],
	['exsul', 'm. / f.'],
	['ficus', 'f. / m.'],
	['infans', 'f. / m.'],
	['locus', 'm. / n.'],
	['martyr', 'm. / f.'],
	['parens', 'm. / f.'],
	['pascha', 'n. / f.'],
	['praeses', 'm. / f.'],
	['princeps', 'm. / f.'],
	['virgo', 'f. / m.']
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const [lemma, genders] of alternatives) {
		test(`${language}: ${lemma} keeps both dictionary genders`, async ({ page }) => {
			await page.goto(`/app/${language}/lemma?l=${lemma}`);
			const summary = page.locator('.lexical-summary');
			await expect(summary.locator('.gender')).toHaveText(genders);
			if (lemma === 'ficus' || lemma === 'pascha') {
				const expected = {
					ficus: {
						pl: 'rzeczownik, deklinacja II / deklinacja IV',
						en: 'noun, 2nd declension / 4th declension'
					},
					pascha: {
						pl: 'rzeczownik, deklinacja III / deklinacja I',
						en: 'noun, 3rd declension / 1st declension'
					}
				};
				await expect(summary.locator('.grammar')).toHaveText(expected[lemma][language]);
			}
		});
	}

	test(`${language}: dictionary alternatives do not invent gender`, async ({ page }) => {
		await page.goto(`/app/${language}/lemma?l=panis`);
		await expect(page.locator('.lexical-summary .gender')).toHaveText('m.');
		await page.goto(`/app/${language}/lemma?l=sum`);
		await expect(page.locator('.lexical-summary')).toBeVisible();
		await expect(page.locator('.lexical-summary .gender')).toHaveCount(0);
	});

	for (const [path, word, lemma, genders, parse] of [
		[
			'formularium/dominica-in-albis',
			'dominica-in-albis-introitus.w004',
			'infans',
			'f. / m.',
			{ pl: 'r. męski', en: 'masculine' }
		],
		[
			'formularium/dominica-in-albis',
			'dominica-in-albis-introitus.w044',
			'infans',
			'f. / m.',
			{ pl: 'r. męski', en: 'masculine' }
		],
		[
			'ordinarium/praefatio-paschalis',
			'w021',
			'pascha',
			'n. / f.',
			{ pl: 'r. nijaki', en: 'neuter' }
		],
		[
			'formularium/dominica-vii-post-pentecosten',
			'dominica-vii-post-pentecosten-evangelium.w037',
			'ficus',
			'f. / m.',
			{ pl: 'deklinacja IV', en: '4th declension' }
		]
	] as const) {
		test(`@reader ${language}: ${path} ${word} distinguishes dictionary and contextual form`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/${path}?w=${word}`);
				await setTheme(page, theme);
				const dialog = page.getByRole('dialog');
				const href = `/app/${language}/lemma?l=${lemma}`;
				const card =
					lemma === 'pascha'
						? dialog
								.locator('.construction-card')
								.filter({ has: page.locator(`a[href="${href}"]`) })
						: dialog;
				const entry = card.locator(`.head a[href="${href}"]`);
				await expect(entry.locator('.gender')).toHaveText(genders);
				await expect(entry).toHaveAttribute('href', href);
				await expect(card.locator('.morph')).toContainText(parse[language]);
				expect(
					await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
			}
		});
	}
}
