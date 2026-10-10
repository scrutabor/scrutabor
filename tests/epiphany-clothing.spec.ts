import { expect, setHelp, setTheme, test } from './fixtures';

const formulary = 'dominica-v-post-epiphaniam';
const text = `${formulary}-epistola`;
const groups = [
	['pl', 'w010', 'w serdeczne miłosierdzie', ['víscera', 'misericórdiæ']],
	['en', 'w055', 'you were called', ['vocáti', 'estis']],
	['en', 'w089', 'Whatever', ['Omne', 'quodcúmque']],
	['en', 'w103', 'giving thanks', ['grátias', 'agéntes']]
] as const;

for (const [language, anchor, gloss, words] of groups) {
	test(`${language} Colossians 3 ${anchor} keeps its minimal construction together`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${formulary}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.${anchor}"]`);
		for (const [width, colorScheme] of [
			[320, 'light'],
			[1280, 'dark']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, colorScheme);
			await expect(button.locator('rt')).toHaveText(gloss);
			await button.scrollIntoViewIfNeeded();
			const before = await button.boundingBox();
			await button.hover();
			expect(await button.boundingBox()).toEqual(before);
			await button.click();
			await expect(page.locator('aside .construction-card .construction-title')).toHaveText([
				...words
			]);
			await page.keyboard.press('Escape');
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
	});
}

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/${formulary}`;
	test(`${language} Colossians 3 preserves explicit pending gender and full source framing`, async ({
		page
	}) => {
		await page.goto(`${route}?w=${text}.w038`);
		// *hæc* opens the reviewed group *ómnia autem hæc*; its own card carries the analysis.
		const card = page
			.locator('aside .construction-card')
			.filter({ has: page.locator('.construction-title', { hasText: 'hæc' }) });
		await expect(card.locator('.morph')).toContainText(language === 'pl' ? 'nijaki' : 'neuter');
		await expect(card.locator('.meta')).toContainText(
			language === 'pl' ? 'do przeglądu' : 'awaiting review'
		);
		await expect(card.locator('.meta')).not.toContainText(
			language === 'pl' ? 'zaakceptowane' : 'accepted'
		);
		await expect(card.locator('.meta')).toContainText('Whitaker');
		await expect(card.locator('.meta')).toContainText('Collatinus');
		await page.keyboard.press('Escape');
		await setHelp(page, 1);
		const part = page.locator('.proper-part', {
			has: page.locator(`[id="${text}.w001"]`)
		});
		await expect(part.locator('.token')).toHaveCount(111);
		if (language === 'en') {
			for (const [word, gloss] of [
				['w002', 'Clothe'],
				['w010', 'with a heart'],
				['w065', 'May Christ’s word dwell']
			]) {
				await expect(page.locator(`button[id="${text}.${word}"] rt`)).toHaveText(gloss);
			}
		}
		await setHelp(page, 2);
		await expect(part.locator('.translation')).toContainText(
			language === 'pl'
				? 'nauczajcie i napominajcie siebie nawzajem'
				: 'as you teach and admonish one another'
		);
		await part
			.getByRole('button', {
				name: language === 'pl' ? 'o modlitwie' : 'about this prayer'
			})
			.click();
		const sources = page.getByRole('dialog').locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources.locator('li')).toHaveCount(2);
		await expect(sources).toContainText('marker 19 and reference 20');
		await expect(sources).toContainText('marker 32, title 33, reference 34 and complete body 35');
		await expect(sources).toContainText('p. 415');
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n496/mode/1up"]'
			)
		).toHaveCount(1);
	});

	test(`${language} Colossians 3 retains three functioning explanation references`, async ({
		page
	}) => {
		for (const [word, label, target] of [
			['w072', 'Verbum', 'w063'],
			['w074', 'docéntes', 'w072'],
			['w083', 'docéntes', 'w072']
		]) {
			await page.goto(`${route}?w=${text}.${word}`);
			const explanation = page.locator('aside .explanation');
			await expect(explanation).not.toContainText(/w\d{3}/);
			await explanation.locator('.xref', { hasText: label }).click();
			if (language === 'en' && target === 'w063') {
				// Verbum now belongs to the complete predicate; its own card remains addressable.
				await expect(page.locator('aside #construction-w063-title')).toHaveText(label);
			} else {
				await expect(page.locator('aside .form')).toHaveText(label);
			}
			await expect(page.locator(`[id="${text}.${target}"]`)).toBeInViewport();
		}
	});
}
