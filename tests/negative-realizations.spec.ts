import { expect, setHelp, setTheme, test } from './fixtures';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };

const readings = [
	['en', 'proprium/dominica-ii-in-quadragesima-epistola', 'w015', 'you ought', 2],
	['en', 'proprium/dominica-xi-post-pentecosten-evangelium', 'w015', 'through', 1],
	['pl', 'proprium/dominica-xi-post-pentecosten-evangelium', 'w081', 'aby nikomu nie mówili', 3],
	['pl', 'proprium/dominica-ii-post-pentecosten-evangelium', 'w148', 'nie zakosztuje', 1],
	['pl', 'proprium/dominica-iii-in-quadragesima-epistola', 'w083', 'nie zwodzi', 1],
	['pl', 'proprium/sancti-matthiae-apostoli-evangelium', 'w042', 'nie zna', 1],
	['pl', 'proprium/sancti-matthiae-apostoli-evangelium', 'w049', 'nie zna', 1],
	['pl', 'proprium/sanctorum-simonis-et-iudae-apostolorum-evangelium', 'w125', 'nie dokonał', 1],
	['pl', 'proprium/transfiguratio-domini-evangelium', 'w127', 'nie ujrzeli', 1],
	['en', 'proprium/dominica-i-in-quadragesima-epistola', 'w031', 'giving', 1],
	['pl', 'proprium/dominica-ii-in-quadragesima-epistola', 'w072', 'nie dopuszczał się nadużyć', 1],
	['pl', 'proprium/dominica-ii-in-quadragesima-epistola', 'w074', 'nie oszukiwał', 1],
	['pl', 'litaniae/sanctissimi-nominis-iesu', 'w449', 'nie przestawali', 1],
	['pl', 'litaniae/sanctissimi-nominis-iesu', 'w466', 'nie pozbawiasz', 1],
	['pl', 'ordinarium/fili-dei-vivi', 'w047', 'nie dopuść', 1],
	['pl', 'ordinarium/praefatio-sacratissimi-cordis-iesu', 'w050', 'nie przestało', 1],
	['pl', 'proprium/corporis-christi-sequentia', 'w210', 'nie dokonuje się', 1],
	['pl', 'proprium/dominica-ii-post-pentecosten-collecta', 'w017', 'nie pozbawiasz', 1],
	['pl', 'proprium/dominica-iii-post-epiphaniam-epistola', 'w011', 'nieodpłacający', 1],
	['pl', 'proprium/dominica-in-sexagesima-collecta', 'w009', 'nie pokładamy ufności', 1],
	['pl', 'proprium/dominica-vi-post-pentecosten-secreta', 'w014', 'niczyje', 1],
	['en', 'proprium/transfiguratio-domini-evangelium', 'w127', 'they saw no one', 2],
	[
		'en',
		'proprium/dominica-iii-post-epiphaniam-evangelium',
		'w048',
		'See that you tell no one',
		3,
		'w046'
	],
	['en', 'proprium/transfiguratio-domini-communio', 'w005', 'tell no one', 2],
	['en', 'proprium/transfiguratio-domini-evangelium', 'w141', 'tell no one', 2],
	['en', 'proprium/dominica-ii-in-quadragesima-epistola', 'w071', 'that no one', 2],
	['en', 'proprium/dominica-xi-post-pentecosten-evangelium', 'w081', 'not to tell anyone', 3]
] as const;

function destination(language: string, text: string, word: string) {
	if (!text.startsWith('proprium/')) return { route: `/app/${language}/${text}`, id: word };
	const day =
		formularies.formularies.find((day) =>
			day.components.some((part) => part.text === text && part.relation === 'proper')
		) ?? formularies.formularies.find((day) => day.components.some((part) => part.text === text));
	expect(day, `${text} has a canonical formulary`).toBeDefined();
	return {
		route: `/app/${language}/formularium/${day!.id}`,
		id: `${text.split('/')[1]}.${word}`
	};
}

for (const [language, text, word, gloss, members, anchor = word] of readings) {
	test(`${language} ${text} ${word} preserves the contextual gloss and word analysis`, async ({
		page
	}) => {
		const { route, id } = destination(language, text, word);
		const { id: anchorId } = destination(language, text, anchor);
		await page.goto(route);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${anchorId}"]`);
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

for (const [language, word, gloss, members] of [
	['pl', 'w072', 'nie dopuszczał się nadużyć', 1],
	['en', 'w071', 'that no one', 2]
] as const) {
	test(`${language} negative realization stays stable with large type and both themes`, async ({
		page
	}) => {
		const { route, id } = destination(
			language,
			'proprium/dominica-ii-in-quadragesima-epistola',
			word
		);
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
						const gloss = element.querySelector('rt')!.getBoundingClientRect();
						return {
							width: box.width,
							height: box.height,
							left: gloss.left - box.left,
							right: gloss.right - box.right,
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
