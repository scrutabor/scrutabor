import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

const day = 'sanctissimi-nominis-iesu';
const text = `${day}-collecta`;
const constructions = [
	[
		'pl',
		'w020',
		17,
		['qui', 'sanctus', 'nomen', 'veneror', 'in', 'terra'],
		'my, którzy czcimy na ziemi Jego święte imię'
	],
	['pl', 'w026', 23, ['is', 'quoque', 'aspectus', 'perfruor'], 'cieszyli się także oglądaniem Go'],
	[
		'en',
		'w006',
		3,
		['unigenitus', 'filius', 'tuus', 'constituo'],
		'appointed Your only-begotten Son'
	],
	['en', 'w009', 7, ['humanus', 'genus', 'salvator'], 'as Savior of the human race'],
	['en', 'w013', 11, ['Iesus', 'voco', 'iubeo'], 'commanded that He be called Jesus'],
	[
		'en',
		'w020',
		17,
		['qui', 'sanctus', 'nomen', 'veneror', 'in', 'terra'],
		'we who venerate His holy name on earth'
	],
	['en', 'w026', 23, ['is', 'quoque', 'aspectus', 'perfruor'], 'may also enjoy the sight of Him'],
	[
		'en',
		'w031',
		30,
		['idem', 'dominus', 'noster', 'Iesus', 'Christus'],
		'this same Jesus Christ, our Lord'
	],
	['en', 'w035', 35, ['filius', 'tuus'], 'Your Son'],
	['en', 'w044', 44, ['spiritus', 'sanctus'], 'of the Holy Spirit'],
	['en', 'w049', 47, ['per', 'omnis', 'saeculum', 'saeculum'], 'forever and ever']
] as const;

for (const [language, anchor, first, lemmata, caption] of constructions) {
	const members = lemmata.map((lemma, offset) => {
		const cardId = `w${String(first + offset).padStart(3, '0')}`;
		return { id: `${text}.${cardId}`, cardId, href: `/app/${language}/lemma?l=${lemma}` };
	});
	test(`${language} Holy Name ${anchor} keeps its complete construction`, async ({ page }) => {
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
	test(`${language} Holy Name retains all words, heavenly petition and separate assent`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		const part = page.locator(`#text-proprium-${text}`);
		await expect(part.locator('.token')).toHaveCount(51);
		await expect(part.locator(`[id="${text}-s01"] .token`)).toHaveCount(50);
		const assent = part.locator(`[id="${text}-s02"]`);
		await expect(assent.locator('.token')).toHaveCount(1);
		await expect(assent.locator('button.word')).toHaveAttribute('id', `${text}.w051`);
		for (const [word, caption] of [
			['w027', language === 'pl' ? 'w' : 'in'],
			['w028', language === 'pl' ? 'niebie' : 'heaven'],
			['w051', 'Amen']
		]) {
			await expect(part.locator(`[id="${text}.${word}"] rt`)).toHaveText(caption);
		}
		await setHelp(page, 2);
		await expect(part).toContainText(
			language === 'pl'
				? 'czcząc na ziemi Jego święte imię, cieszyli się także oglądaniem Go w niebie'
				: 'we who venerate His holy name on earth may also enjoy the sight of Him in heaven'
		);
		await expect(part).toContainText('Amen.');
	});

	test(`${language} Holy Name exposes bounded body, conclusion and delivery sources`, async ({
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
		for (const leaf of [113, 22, 23, 202, 305, 38, 39]) {
			await expect(
				notes.locator(
					`a[href="https://archive.org/details/missale-romanum-1962/page/n${leaf}/mode/1up"]`
				)
			).toHaveCount(1);
		}
		await expect(notes).toContainText('Latin/Ordo/Prayers.txt [Per eumdem]');
		await expect(notes).toContainText('108–109');
		await expect(notes).not.toContainText('lines 113-114');
		const wordingLinks = 'a[href*="missal_for_use_of_laity_1853-f_c_husenbeth"]';
		await expect(notes.locator(wordingLinks)).toHaveCount(0);
		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
		const part = page.locator(`#text-proprium-${text}`);
		await setHelp(page, 2);
		await expect(part.locator(wordingLinks)).toHaveCount(language === 'en' ? 2 : 0);
		if (language === 'en') {
			const translationNotes = part.locator('details.source-notes');
			await translationNotes.locator('summary').click();
			await expect(translationNotes).toContainText(
				'The translation is based on the cited historical wording, revised with reference to the Latin.'
			);
			for (const leaf of [119, 55]) {
				await expect(
					translationNotes.locator(
						`a[href="https://archive.org/details/missal_for_use_of_laity_1853-f_c_husenbeth/page/n${leaf}/mode/1up"]`
					)
				).toHaveCount(1);
			}
		}
	});
}
