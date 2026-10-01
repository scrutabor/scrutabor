import { expect, setHelp, setTheme, test } from './fixtures';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };

const relations = [
	['pl', 'sancti-matthiae-apostoli-epistola', 'w008', 'braci', 1],
	['en', 'dedicatio-sancti-michaelis-archangeli-evangelium', 'w022', 'in', 1],
	['en', 'dedicatio-sancti-michaelis-archangeli-evangelium', 'w024', 'of them', 1],
	['en', 'dominica-i-in-quadragesima-postcommunio', 'w012', 'into', 1],
	['en', 'dominica-i-in-quadragesima-postcommunio', 'w013', 'of the mystery', 1],
	['en', 'dominica-i-in-quadragesima-postcommunio', 'w017', 'fellowship', 1],
	['en', 'dominica-pentecostes-offertorium', 'w014', 'in', 1],
	['en', 'dominica-resurrectionis-collecta', 'w005', 'through', 1],
	['en', 'dominica-resurrectionis-evangelium', 'w055', 'on', 1],
	['en', 'dominica-v-post-pentecosten-offertorium', 'w014', 'at', 1],
	['en', 'dominica-vii-post-pentecosten-secreta', 'w012', 'from', 1],
	['en', 'dominica-xiii-post-pentecosten-epistola', 'w018', 'of', 1],
	['en', 'dominica-xiii-post-pentecosten-evangelium', 'w010', 'through', 1],
	['en', 'dominica-xix-post-pentecosten-offertorium', 'w003', 'in', 1],
	['en', 'epiphania-domini-evangelium', 'w005', 'in', 1],
	['en', 'immaculatum-cor-beatae-mariae-virginis-graduale', 'w004', 'in', 1],
	['en', 'nativitas-domini-in-aurora-evangelium', 'w006', 'to', 1],
	['en', 'nativitas-domini-in-nocte-evangelium', 'w181', 'in', 1],
	['en', 'septem-dolorum-beatae-mariae-virginis-sequentia', 'w099', 'in', 1],
	['en', 'dominica-in-albis-alleluia', 'w023', 'of disciples', 1],
	['en', 'sanctae-annae-matris-beatae-mariae-virginis-evangelium', 'w105', 'of the just', 1],
	['pl', 'dedicatio-sancti-michaelis-archangeli-evangelium', 'w024', 'nich', 1],
	['pl', 'sancti-matthiae-apostoli-secreta', 'w015', 'dzięki', 1],
	['pl', 'sancti-matthiae-apostoli-secreta', 'w016', 'której', 1],
	['pl', 'sancti-petri-et-pauli-apostolorum-secreta', 'w011', 'dzięki', 1],
	['pl', 'sancti-petri-et-pauli-apostolorum-secreta', 'w012', 'której', 1],
	['pl', 'beatae-mariae-virginis-a-rosario-epistola', 'w019', 'od pradawna', 2],
	['en', 'beatae-mariae-virginis-a-rosario-epistola', 'w019', 'of old', 2],
	['pl', 'nativitas-beatae-mariae-virginis-epistola', 'w019', 'od pradawna', 2],
	['en', 'nativitas-beatae-mariae-virginis-epistola', 'w019', 'of old', 2],
	['pl', 'dedicatio-sancti-michaelis-archangeli-evangelium', 'w023', 'pośrodku', 2],
	['pl', 'sancti-ioseph-opificis-introitus', 'w032', 'na próżno', 2],
	['en', 'dominica-x-post-pentecosten-evangelium', 'w066', 'afar', 2],
	['pl', 'dominica-in-albis-alleluia', 'w022', 'pośród', 2],
	['pl', 'maternitas-beatae-mariae-virginis-evangelium', 'w052', 'pośród', 2],
	['pl', 'sancta-familia-evangelium', 'w064', 'pośród', 2],
	['pl', 'sancti-ioannis-apostoli-et-evangelistae-epistola', 'w052', 'pośrodku', 2],
	['pl', 'sancti-ioannis-apostoli-et-evangelistae-introitus', 'w002', 'Pośrodku', 2],
	['pl', 'sancti-ioannis-apostoli-et-evangelistae-introitus', 'w051', 'Pośrodku', 2],
	['pl', 'sancti-matthaei-apostoli-et-evangelistae-epistola', 'w078', 'pośrodku', 2],
	['pl', 'sanctae-annae-matris-beatae-mariae-virginis-evangelium', 'w104', 'spośród', 2],
	['pl', 'sancti-matthiae-apostoli-epistola', 'w007', 'pośród', 2]
] as const;

function destination(language: string, text: string, word: string) {
	const component = `proprium/${text}`;
	const day =
		formularies.formularies.find((day) =>
			day.components.some((part) => part.text === component && part.relation === 'proper')
		) ??
		formularies.formularies.find((day) => day.components.some((part) => part.text === component));
	expect(day, `${component} belongs to a formulary`).toBeDefined();
	return { route: `/app/${language}/formularium/${day!.id}`, id: `${text}.${word}` };
}

for (const [language, text, word, gloss, members] of relations) {
	test(`${language} ${text} ${word} preserves its relation and word help`, async ({ page }) => {
		const { route, id } = destination(language, text, word);
		await page.goto(route);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${id}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		if (members > 1) {
			await expect(button.locator('.token')).toHaveCount(members);
		} else {
			await expect(button.locator('..')).toHaveClass(/\btoken\b/);
		}
		await button.focus();
		await button.press('Enter');
		await expect(page.locator('aside .morph')).toHaveCount(members);
		if (members > 1) await expect(page.locator('aside .construction-title')).toHaveCount(members);
		await page.keyboard.press('Escape');
		await expect(page.locator('aside')).toHaveCount(0);
		await page.goto(`${route}?w=${id}`);
		await expect(page.locator('aside .morph')).toHaveCount(members);
	});
}

for (const [language, text, word, gloss, members] of [
	['pl', 'sancti-matthiae-apostoli-epistola', 'w007', 'pośród', 2],
	['en', 'dominica-x-post-pentecosten-evangelium', 'w066', 'afar', 2],
	['en', 'dominica-i-in-quadragesima-postcommunio', 'w013', 'of the mystery', 1]
] as const) {
	test(`${language} ${text} relation stays legible in both themes and print`, async ({ page }) => {
		const { route, id } = destination(language, text, word);
		await page.goto(route);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const button = page.locator(`button[id="${id}"]`);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ['light', 'dark'] as const) {
				await setTheme(page, theme);
				await button.scrollIntoViewIfNeeded();
				await page.evaluate(() => document.fonts.ready);
				const geometry = () =>
					button.evaluate((element) => {
						const box = element.getBoundingClientRect();
						const rt = element.querySelector('rt')!.getBoundingClientRect();
						return {
							width: box.width,
							height: box.height,
							left: rt.left - box.left,
							right: rt.right - box.right,
							overflow: document.documentElement.scrollWidth - innerWidth
						};
					});
				await expect(button.locator('rt')).toHaveText(gloss);
				const before = await geometry();
				expect(before.overflow).toBe(0);
				expect(before.left).toBeGreaterThanOrEqual(-1);
				expect(before.right).toBeLessThanOrEqual(1);
				await button.hover();
				expect(await geometry()).toEqual(before);
				await button.click();
				await expect(page.locator('aside .morph')).toHaveCount(members);
				await page.keyboard.press('Escape');
				expect(await geometry()).toEqual(before);
			}
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
		await expect(button.locator('rt')).toHaveText(gloss);
	});
}
