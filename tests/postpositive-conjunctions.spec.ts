import { expect, setHelp, setTheme, test } from './fixtures';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };

const contrasts = [
	['ordinarium/lavabo', ['w054']],
	['proprium/ascensio-domini-epistola', ['w073']],
	['proprium/dominica-i-passionis-evangelium', ['w071', 'w166']],
	['proprium/dominica-ii-passionis-tractus', ['w032', 'w062']],
	['proprium/dominica-ii-post-epiphaniam-evangelium', ['w137']],
	['proprium/dominica-iii-in-quadragesima-evangelium', ['w044']],
	['proprium/dominica-iii-post-pascha-evangelium', ['w105']],
	['proprium/dominica-in-albis-evangelium', ['w105']],
	['proprium/dominica-in-quinquagesima-tractus', ['w029']],
	['proprium/dominica-in-septuagesima-epistola', ['w038']],
	['proprium/dominica-ix-post-pentecosten-evangelium', ['w103']],
	['proprium/dominica-xii-post-pentecosten-evangelium', ['w105']],
	['proprium/nativitas-domini-in-die-epistola', ['w162', 'w177']],
	['proprium/sancti-iacobi-apostoli-epistola', ['w026', 'w033', 'w038']],
	['proprium/sancti-laurentii-martyris-evangelium', ['w024']],
	['proprium/sancti-petri-et-pauli-apostolorum-evangelium', ['w041']],
	['proprium/sancti-thomae-apostoli-evangelium', ['w026']],
	['proprium/vigilia-pentecostes-evangelium', ['w043', 'w070']]
] as const;

function destination(text: string) {
	if (!text.startsWith('proprium/')) return { route: `/app/en/${text}`, prefix: '' };
	const day = formularies.formularies.find((formulary) =>
		formulary.components.some((part) => part.text === text && part.relation === 'proper')
	);
	expect(day, `${text} has its own formulary`).toBeDefined();
	return { route: `/app/en/formularium/${day!.id}`, prefix: `${text.split('/')[1]}.` };
}

for (const [text, words] of contrasts) {
	test(`English ${text} preserves its postpositive contrasts`, async ({ page }) => {
		const { route, prefix } = destination(text);
		await page.goto(route);
		await setHelp(page, 1);
		for (const word of words) {
			const button = page.locator(`button[id="${prefix}${word}"]`);
			await expect(button.locator('rt')).toHaveText('however');
			await expect(button.locator('..')).toHaveClass(/\btoken\b/);
			await button.focus();
			await button.press('Enter');
			await expect(page.locator('aside .morph')).toHaveCount(1);
			await expect(page.locator('aside')).toContainText('however');
			await page.keyboard.press('Escape');
			await expect(page.locator('aside')).toHaveCount(0);
		}
	});
}

for (const [text, first, second, next, predicate] of [
	['proprium/ascensio-domini-evangelium', 'w097', 'w098', 'w099', 'going forth'],
	['proprium/dominica-in-septuagesima-evangelium', 'w064', 'w065', 'w066', 'went their way']
] as const) {
	test(`English ${text} keeps the narrative connection in one minimal group`, async ({ page }) => {
		const { route, prefix } = destination(text);
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(route);
		await setHelp(page, 1);
		const group = page.locator(`button[id="${prefix}${first}"]`);
		const following = page.locator(`button[id="${prefix}${next}"]`);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ['light', 'dark'] as const) {
				await setTheme(page, theme);
				await expect(group.locator('rt')).toHaveText('And they');
				await expect(group.locator('.token')).toHaveCount(2);
				await expect(following.locator('rt')).toHaveText(predicate);
				await expect(following.locator('..')).toHaveClass(/\btoken\b/);
				await group.scrollIntoViewIfNeeded();
				await page.evaluate(() => document.fonts.ready);
				const before = await group.boundingBox();
				await group.hover();
				expect(await group.boundingBox()).toEqual(before);
				await group.focus();
				await group.press('Enter');
				await expect(page.locator('aside .construction-title')).toHaveText(['Illi', 'autem']);
				await expect(page.locator('aside .construction-card .morph')).toHaveCount(2);
				await page.keyboard.press('Escape');
				await expect(page.locator('aside')).toHaveCount(0);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		}
		await page.emulateMedia({ media: 'print' });
		await expect(group.locator('rt')).toBeVisible();
		await expect(group.locator('rt')).toHaveText('And they');
		await page.emulateMedia({ media: 'screen' });
		await page.goto(`${route}?w=${prefix}${second}`);
		await expect(page.locator('aside .construction-title')).toHaveText(['Illi', 'autem']);
	});
}
