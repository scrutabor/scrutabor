import { expect, setHelp, test } from './fixtures';

const formulary = 'dominica-v-post-pascha';
const text = `${formulary}-evangelium`;

for (const language of ['pl', 'en']) {
	test(`${language}: the Easter Gospel keeps the disciples' perfect of exeo`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/${formulary}?w=${text}.w137`);
		const panel = page.locator('aside');
		await expect(panel.locator('.form')).toHaveText('exísti');
		await expect(panel.getByRole('link', { name: 'éxeo, exíre, éxii, éxitum' })).toBeVisible();
		await expect(panel.locator('.gloss')).toHaveText(
			language === 'pl' ? 'wyszedłeś' : 'You came forth'
		);
		await expect(panel.locator('.morph')).toContainText(
			language === 'pl' ? 'perfectum' : 'perfect'
		);
		await expect(panel.locator('.morph')).toContainText(
			language === 'pl' ? '2. os.' : '2nd person'
		);
		await expect(panel.locator('.meta')).toContainText('Collatinus');
		await expect(panel.locator('.meta')).not.toContainText('Whitaker');
		await expect(panel.locator('.meta')).toContainText(
			language === 'pl' ? 'do przeglądu' : 'awaiting review'
		);

		await page.goto(`/app/${language}/formularium/${formulary}?w=${text}.w095`);
		await expect(panel.locator('.form')).toHaveText('veni');
		await expect(panel.locator('.gloss')).toHaveText(language === 'pl' ? 'przyszedłem' : 'I came');
		await expect(panel.locator('.morph')).toContainText(
			language === 'pl' ? 'perfectum' : 'perfect'
		);
		await expect(panel.locator('.morph')).not.toContainText(
			language === 'pl' ? 'tryb rozkazujący' : 'imperative'
		);
	});

	test(`${language}: the Easter Gospel explains its negation without denying intercession`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${formulary}?w=${text}.w067`);
		await expect(page.locator('aside .explanation')).toContainText(
			language === 'pl'
				? 'nie samej prośby do Ojca'
				: 'does not directly say that He will never intercede'
		);
		await page.goto(`/app/${language}/formularium/${formulary}?w=${text}.w039`);
		await expect(page.locator('aside .explanation')).toContainText(
			language === 'pl' ? 'wypowiedź obrazową' : 'rather than simply familiar maxims'
		);
	});

	test(`${language}: the Easter Gospel's need construction stays readable on a phone`, async ({
		page
	}) => {
		await page.setViewportSize({ width: 320, height: 844 });
		await page.goto(`/app/${language}/formularium/${formulary}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const pager = page.locator('.pager');
		await expect(pager.getByRole('link')).toHaveCount(2);
		const links = await pager.getByRole('link').evaluateAll((elements) =>
			elements.map((element) => {
				const { left, right } = element.getBoundingClientRect();
				return { left, right };
			})
		);
		expect(links[0].left).toBeGreaterThanOrEqual(0);
		expect(links[0].right).toBeLessThan(links[1].left);
		expect(links[1].right).toBeLessThanOrEqual(320);
		const part = page.locator(`#text-proprium-${text}`);
		const group = part.locator('.token-group', { hasText: 'opus est' });
		await expect(group.locator('rt')).toHaveText(
			language === 'pl' ? 'potrzeba' : 'You have no need'
		);
		await expect(group.locator('button')).toHaveCount(1);
		const count = language === 'pl' ? 2 : 4;
		await expect(group.locator('.token')).toHaveCount(count);
		await group.scrollIntoViewIfNeeded();
		const box = await group.boundingBox();
		await group.locator('button').hover();
		expect(await group.boundingBox()).toEqual(box);
		await group.locator('button').click();
		await expect(page.locator('aside .construction-card')).toHaveCount(count);
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
			.toBe(0);
	});
}

test('the Easter Gospel retains the selected Missal punctuation', async ({ page }) => {
	await page.goto(`/app/pl/formularium/${formulary}`);
	await setHelp(page, 1);
	for (const [word, printed] of [
		['w009', 'amen'],
		['w085', 'credidístis,'],
		['w093', 'Patre,'],
		['w100', 'mundum,'],
		['w109', 'Ecce'],
		['w112', 'loquéris,'],
		['w121', 'ómnia,']
	]) {
		await expect(page.locator(`button[id="${text}.${word}"] .base`)).toHaveText(printed);
	}
});
