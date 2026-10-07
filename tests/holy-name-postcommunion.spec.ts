import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

const day = 'sanctissimi-nominis-iesu';
const text = `${day}-postcommunio`;
const constructions = [
	['pl', 'w009', 9, ['respicio', 'propitius'], 'wejrzyj łaskawie na'],
	['pl', 'w035', 34, ['suscipio', 'dignor'], 'racz przyjąć'],
	['pl', 'w047', 45, ['aeternus', 'praedestinatio', 'titulus'], 'na mocy wiecznego przeznaczenia'],
	['pl', 'w051', 51, ['scribo', 'sum'], 'są zapisane'],
	['en', 'w009', 9, ['respicio', 'propitius'], 'look graciously upon'],
	['en', 'w011', 11, ['votum', 'noster'], 'our desires'],
	[
		'en',
		'w029',
		17,
		[
			'qui',
			'in',
			'honor',
			'nomen',
			'filius',
			'tuus',
			'dominus',
			'noster',
			'Iesus',
			'Christus',
			'maiestas',
			'tuus',
			'offero'
		],
		'which we have offered to Your majesty in honor of the name of Your Son, our Lord Jesus Christ'
	],
	[
		'en',
		'w035',
		30,
		['placidus', 'et', 'benignus', 'vultus', 'suscipio', 'dignor'],
		'be pleased to receive with a serene and kindly countenance'
	],
	['en', 'w040', 37, ['gratia', 'tuus', 'nos', 'infundo'], 'with Your grace poured into us'],
	[
		'en',
		'w047',
		45,
		['aeternus', 'praedestinatio', 'titulus'],
		'the sign of eternal predestination'
	],
	['en', 'w049', 49, ['nomen', 'noster'], 'our names'],
	['en', 'w051', 51, ['scribo', 'sum'], 'are written'],
	[
		'en',
		'w057',
		56,
		['idem', 'dominus', 'noster', 'Iesus', 'Christus'],
		'this same Jesus Christ, our Lord'
	],
	['en', 'w061', 61, ['filius', 'tuus'], 'Your Son'],
	['en', 'w070', 70, ['spiritus', 'sanctus'], 'of the Holy Spirit'],
	['en', 'w075', 73, ['per', 'omnis', 'saeculum', 'saeculum'], 'forever and ever']
] as const;

for (const [language, anchor, first, lemmata, caption] of constructions) {
	const members = lemmata.map((lemma, offset) => {
		const cardId = `w${String(first + offset).padStart(3, '0')}`;
		return { id: `${text}.${cardId}`, cardId, href: `/app/${language}/lemma?l=${lemma}` };
	});
	test(`${language} Holy Name Postcommunion ${anchor} keeps its complete construction`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/formularium/${day}`);
		await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
		await setHelp(page, 1);
		const group = page.locator('.token-group').filter({
			has: page.locator(`button[id="${text}.${anchor}"]`)
		});
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await expectSharedGloss(page, group, members.length, caption, members);
			await group.scrollIntoViewIfNeeded();
			const [geometry] = await group.evaluate(interlinearGeometry);
			expect(geometry.clearance).toBeGreaterThanOrEqual(0);
			expect(geometry.sourceClipping).toEqual([]);
			expect(geometry.captionClipping).toEqual([]);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		const forms = await group.locator('.base').allTextContents();
		await page.emulateMedia({ media: 'print' });
		await expect(group.locator('rt')).toHaveText(caption);
		await expect(group.locator('rt')).toBeVisible();
		for (const form of await group.locator('.base').all()) await expect(form).toBeVisible();
		expect(await group.locator('.base').allTextContents()).toEqual(forms);
		await page.emulateMedia({ media: 'screen' });
	});
}

for (const language of ['pl', 'en'] as const) {
	test(`${language} Holy Name Postcommunion retains all words, heavenly petition and separate assent`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		const part = page.locator(`#text-proprium-${text}`);
		await expect(part.locator('.token')).toHaveCount(77);
		await expect(part.locator(`[id="${text}-s01"] .token`)).toHaveCount(76);
		const assent = part.locator(`[id="${text}-s02"]`);
		await expect(assent.locator('.token')).toHaveCount(1);
		await expect(assent.locator('button.word')).toHaveAttribute('id', `${text}.w077`);
		for (const [word, caption] of [
			['w053', language === 'pl' ? 'w' : 'in'],
			['w054', language === 'pl' ? 'niebie' : 'heaven'],
			['w077', 'Amen']
		]) {
			await expect(part.locator(`[id="${text}.${word}"] rt`)).toHaveText(caption);
		}
		await setHelp(page, 2);
		await expect(part).toContainText(
			language === 'pl'
				? 'nasze imiona są zapisane w niebie'
				: 'we may rejoice that our names are written in heaven'
		);
		await expect(part).toContainText('Amen.');
	});

	test(`${language} Holy Name Postcommunion exposes bounded body, conclusion and delivery sources`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		await page
			.locator(`#text-proprium-${text}`)
			.getByRole('button', {
				name: language === 'pl' ? 'o modlitwie' : 'about this prayer'
			})
			.click();
		const dialog = page.getByRole('dialog');
		const notes = dialog.locator('details.source-notes');
		await notes.locator('summary').click();
		for (const leaf of [114, 22, 23, 202, 305, 38, 39]) {
			await expect(
				notes.locator(
					`a[href="https://archive.org/details/missale-romanum-1962/page/n${leaf}/mode/1up"]`
				)
			).toHaveCount(1);
		}
		await expect(notes).toContainText('Latin/Ordo/Prayers.txt [Per eumdem]');
		await expect(notes).toContainText('108–109');
		await expect(notes).not.toContainText('lines 113-114');
		const wordingLinks =
			'a[href*="missal_for_use_of_laity_1853-f_c_husenbeth"], a[href*="TheMissalForTheLaity"]';
		await expect(notes.locator(wordingLinks)).toHaveCount(0);
		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
		const part = page.locator(`#text-proprium-${text}`);
		await setHelp(page, 2);
		await expect(part.locator(wordingLinks)).toHaveCount(language === 'en' ? 3 : 0);
		if (language === 'en') {
			const translationNotes = part.locator('details.source-notes');
			await translationNotes.locator('summary').click();
			await expect(translationNotes).toContainText(
				'The translation is based on the cited historical wording, revised with reference to the Latin.'
			);
			await expect(
				translationNotes.locator(
					'a[href="https://archive.org/details/TheMissalForTheLaity/page/n613/mode/1up"]'
				)
			).toHaveCount(1);
			for (const leaf of [121, 55]) {
				await expect(
					translationNotes.locator(
						`a[href="https://archive.org/details/missal_for_use_of_laity_1853-f_c_husenbeth/page/n${leaf}/mode/1up"]`
					)
				).toHaveCount(1);
			}
		}
	});
}
