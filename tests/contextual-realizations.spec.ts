import { expect, setHelp, setTheme, test } from './fixtures';

const passion = 'dominica-ii-passionis-evangelium';
const readings = [
	['pl', 'ordinarium/evangelium-ultimum', '', 'w042', 'nic nie powstało', 3],
	[
		'pl',
		'formularium/dominica-i-in-quadragesima',
		'dominica-i-in-quadragesima-epistola.',
		'w137',
		'niemający nic',
		2
	],
	[
		'pl',
		'formularium/dominica-i-passionis',
		'dominica-i-passionis-evangelium.',
		'w146',
		'niczym',
		1
	],
	['pl', 'formularium/dominica-ii-passionis', `${passion}.`, 'w824', 'nic nie odpowiedział', 2],
	[
		'pl',
		'formularium/dominica-iii-post-pentecosten',
		'dominica-iii-post-pentecosten-collecta.',
		'w009',
		'nic nie jest',
		2
	],
	[
		'pl',
		'formularium/dominica-in-quinquagesima',
		'dominica-in-quinquagesima-epistola.',
		'w069',
		'nie pomaga',
		1
	],
	[
		'pl',
		'formularium/dominica-in-quinquagesima',
		'dominica-in-quinquagesima-evangelium.',
		'w046',
		'nie zrozumieli',
		1
	],
	[
		'pl',
		'formularium/dominica-in-sexagesima',
		'dominica-in-sexagesima-epistola.',
		'w297',
		'nie będę się chlubił',
		1
	],
	[
		'pl',
		'formularium/dominica-infra-octavam-nativitatis',
		'dominica-infra-octavam-nativitatis-epistola.',
		'w008',
		'nie różni się',
		1
	],
	[
		'pl',
		'formularium/dominica-iv-adventus',
		'dominica-iv-adventus-epistola.',
		'w043',
		'nie jestem świadom',
		2
	],
	[
		'pl',
		'formularium/dominica-xviii-post-pentecosten',
		'dominica-xviii-post-pentecosten-epistola.',
		'w045',
		'nie brakuje',
		1
	],
	[
		'pl',
		'formularium/nativitas-domini-in-die',
		'nativitas-domini-in-die-evangelium.',
		'w028',
		'nic nie powstało',
		3
	],
	['pl', 'formularium/omnium-sanctorum', 'omnium-sanctorum-graduale.', 'w008', 'nie brakuje', 1],
	['en', 'orationes/te-deum', '', 'w166', 'this day', 2],
	[
		'en',
		'formularium/dominica-ii-passionis',
		`${passion}.`,
		'w834',
		'how much testimony they give against You',
		5
	],
	[
		'en',
		'formularium/sancti-matthaei-apostoli-et-evangelistae',
		'sancti-matthaei-apostoli-et-evangelistae-evangelium.',
		'w025',
		'as He was at table',
		2
	],
	[
		'en',
		'formularium/transfiguratio-domini',
		'transfiguratio-domini-evangelium.',
		'w132',
		'as they were descending',
		2
	]
] as const;

for (const [language, path, prefix, word, gloss, members] of readings) {
	test(`${language} ${prefix || path} ${word} preserves contextual realization and help`, async ({
		page
	}) => {
		const route = `/app/${language}/${path}`;
		await page.goto(route);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${prefix}${word}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		if (members > 1) {
			await expect(button.locator('.token')).toHaveCount(members);
		} else {
			await expect(button.locator('..')).toHaveClass(/\btoken\b/);
		}
		await button.click();
		if (members > 1) {
			await expect(page.locator('aside .construction-card .morph')).toHaveCount(members);
			await expect(page.locator('aside .construction-title')).toHaveCount(members);
		} else {
			await expect(page.locator('aside .morph')).toHaveCount(1);
		}
		await page.keyboard.press('Escape');
		await expect(page.locator('aside')).toHaveCount(0);
		await page.goto(`${route}?w=${prefix}${word}`);
		await expect(page.locator('aside .morph')).toHaveCount(members);
	});
}

test('Passion testimony remains stable at narrow widths and the largest reading size', async ({
	page
}) => {
	await page.goto('/app/en/formularium/dominica-ii-passionis');
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.reload();
	await setHelp(page, 1);
	const button = page.locator(`button[id="${passion}.w834"]`);
	for (const width of [320, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		for (const colorScheme of ['light', 'dark'] as const) {
			await setTheme(page, colorScheme);
			await button.scrollIntoViewIfNeeded();
			await page.evaluate(() => document.fonts.ready);
			await expect(button.locator('rt')).toHaveText('how much testimony they give against You');
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
			const before = await geometry();
			expect(before.overflow).toBe(0);
			expect(before.left).toBeGreaterThanOrEqual(-1);
			expect(before.right).toBeLessThanOrEqual(1);
			await button.hover();
			expect(await geometry()).toEqual(before);
			await button.click();
			await expect(page.locator('aside .construction-card .morph')).toHaveCount(5);
			await page.keyboard.press('Escape');
			expect(await geometry()).toEqual(before);
		}
	}
	await page.emulateMedia({ media: 'print' });
	await expect(button.locator('rt')).toBeVisible();
	await expect(button.locator('rt')).toHaveText('how much testimony they give against You');
});
