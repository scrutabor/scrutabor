import { expect, setHelp, setTheme, test } from './fixtures';

const groups = [
	['en', 'dominica-ii-passionis', 'evangelium', 'w091', 'could you not', 2],
	['en', 'dominica-ii-passionis', 'evangelium', 'w094', 'watch one hour', 3],
	['en', 'dominica-ii-passionis', 'evangelium', 'w295', 'I cannot', 2],
	['en', 'dominica-ii-passionis', 'evangelium', 'w1229', 'cannot', 2],
	['en', 'dominica-iii-post-epiphaniam', 'epistola', 'w025', 'it is possible', 2],
	['en', 'dominica-xxiv-post-pentecosten', 'evangelium', 'w135', 'it is possible', 2],
	['en', 'sancti-stephani-protomartyris', 'epistola', 'w041', 'they could not', 2],
	['en', 'septem-dolorum-beatae-mariae-virginis', 'sequentia', 'w054', 'would not', 2],
	[
		'en',
		'septem-dolorum-beatae-mariae-virginis',
		'sequentia',
		'w058',
		'on beholding Christ’s Mother',
		3
	],
	['en', 'vigilia-pentecostes', 'evangelium', 'w033', 'cannot', 2],
	['pl', 'dominica-iii-post-epiphaniam', 'epistola', 'w025', 'jest możliwe', 2],
	['pl', 'dominica-xxi-post-pentecosten', 'introitus', 'w010', 'nie ma nikogo, kto', 3],
	['pl', 'dominica-xxi-post-pentecosten', 'introitus', 'w071', 'nie ma nikogo, kto', 3],
	['pl', 'dominica-xxiv-post-pentecosten', 'evangelium', 'w135', 'jest możliwe', 2],
	['pl', 'septem-dolorum-beatae-mariae-virginis', 'sequentia', 'w054', 'mógłby nie', 2]
] as const;

for (const [lang, formulary, part, anchor, gloss, members] of groups) {
	test(`${lang} ${formulary} ${anchor} preserves its complete modal construction`, async ({
		page
	}) => {
		await page.goto(`/app/${lang}/formularium/${formulary}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const button = page.locator(`button[id="${formulary}-${part}.${anchor}"]`);
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
			await expect(page.getByRole('dialog')).toContainText(gloss);
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

for (const [lang, formulary, part, word, form, gloss] of [
	['en', 'dominica-ii-passionis', 'evangelium', 'w296', 'rogáre', 'ask'],
	['en', 'dominica-xxiii-post-pentecosten', 'epistola', 'w072', 'possit', 'He can'],
	['en', 'sancti-ioachim-confessoris', 'epistola', 'w051', 'fácere', 'do'],
	['pl', 'dominica-xxi-post-pentecosten', 'epistola', 'w015', 'possítis', 'mogli'],
	['pl', 'dominica-xxi-post-pentecosten', 'epistola', 'w049', 'possítis', 'mogli'],
	['pl', 'dominica-xxi-post-pentecosten', 'epistola', 'w084', 'possítis', 'moglibyście']
]) {
	test(`${lang} ${formulary} ${word} retains the modal complement or person`, async ({ page }) => {
		await page.goto(`/app/${lang}/formularium/${formulary}`);
		await setHelp(page, 1);
		const wordButton = page.locator(`button[id="${formulary}-${part}.${word}"]`);
		await expect(wordButton.locator('rt')).toHaveText(gloss);
		await wordButton.click();
		await expect(page.locator('aside .form')).toHaveText(form);
		await expect(
			page.getByRole('region', {
				name: lang === 'pl' ? 'znaczenie w kontekście' : 'meaning in context'
			})
		).toHaveText(gloss);
	});
}

for (const [lang, wording] of [
	['en', 'Who would not be saddened on contemplating Christ’s Mother suffering with her Son?'],
	['pl', 'Któż mógłby się nie zasmucić, wpatrując się w Matkę Chrystusa, bolejącą wraz z Synem?']
]) {
	test(`${lang} Sorrows stanza retains contemplation and the Mother with her Son`, async ({
		page
	}) => {
		await page.goto(`/app/${lang}/formularium/septem-dolorum-beatae-mariae-virginis`);
		await setHelp(page, 2);
		const section = page.locator('#text-proprium-septem-dolorum-beatae-mariae-virginis-sequentia');
		await expect(section.locator('.translation')).toContainText([wording]);
	});
}
