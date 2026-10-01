import { expect, setHelp, setTheme, test } from './fixtures';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };

const predicates = [
	['ordinarium/panem-caelestem', ['w009', 'w010'], 'w010', ['non', 'sum'], 'I am not'],
	['ordinarium/panem-caelestem', ['w026', 'w027'], 'w027', ['non', 'sum'], 'I am not'],
	['ordinarium/panem-caelestem', ['w043', 'w044'], 'w044', ['non', 'sum'], 'I am not'],
	[
		'proprium/dominica-i-adventus-graduale',
		['w005', 'w006'],
		'w006',
		['non', 'confundéntur'],
		'will not be put to shame'
	],
	[
		'proprium/dominica-i-adventus-evangelium',
		['w104', 'w105'],
		'w105',
		['non', 'præteríbit'],
		'will not pass away'
	],
	[
		'proprium/dominica-i-adventus-evangelium',
		['w118', 'w119'],
		'w119',
		['non', 'transíbunt'],
		'will not pass away'
	],
	[
		'proprium/corporis-christi-sequentia',
		['w041', 'w042'],
		'w042',
		['non', 'ambígitur'],
		'it is not doubted'
	],
	[
		'proprium/dominica-ii-passionis-communio',
		['w003', 'w004'],
		'w004',
		['non', 'potest'],
		'cannot'
	],
	[
		'proprium/dominica-ii-passionis-evangelium',
		['w120', 'w121'],
		'w121',
		['non', 'potest'],
		'cannot'
	],
	[
		'proprium/septem-dolorum-beatae-mariae-virginis-sequentia',
		['w043', 'w044'],
		'w044',
		['non', 'fleret'],
		'would not weep'
	],
	[
		'proprium/commemoratio-omnium-fidelium-defunctorum-missa-i-sequentia',
		['w144', 'w145'],
		'w145',
		['non', 'sunt'],
		'are not'
	],
	[
		'proprium/dominica-iii-adventus-evangelium',
		['w029', 'w030', 'w031'],
		'w030',
		['non', 'sum', 'ego'],
		'I am not'
	]
] as const;

for (const [text, members, anchor, forms, gloss] of predicates) {
	test(`English ${text} ${anchor} keeps the negative predicate together`, async ({ page }) => {
		const proper = text.startsWith('proprium/');
		const day = formularies.formularies.find((entry) =>
			entry.components.some((part) => part.text === text && part.relation === 'proper')
		);
		if (proper) expect(day, `${text} has a canonical formulary`).toBeDefined();
		const route = proper ? `/app/en/formularium/${day!.id}` : `/app/en/${text}`;
		const prefix = proper ? `${text.split('/')[1]}.` : '';
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(route);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${prefix}${anchor}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('.token')).toHaveCount(members.length);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ['light', 'dark'] as const) {
				await setTheme(page, theme);
				await button.scrollIntoViewIfNeeded();
				await page.evaluate(() => document.fonts.ready);
				const before = await button.boundingBox();
				await button.hover();
				expect(await button.boundingBox()).toEqual(before);
				await button.focus();
				await button.press('Enter');
				await expect(page.locator('aside .construction-title')).toHaveText([...forms]);
				await expect(page.locator('aside .construction-card .morph')).toHaveCount(members.length);
				expect(
					await page.locator('aside .inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
				await page.keyboard.press('Escape');
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
		await expect(button.locator('rt')).toHaveText(gloss);
		await page.emulateMedia({ media: 'screen' });
		for (const member of members) {
			await page.goto(`${route}?w=${prefix}${member}`);
			await expect(page.locator('aside .construction-title')).toHaveText([...forms]);
			await expect(page.locator('aside .construction-card .morph')).toHaveCount(members.length);
			await page.keyboard.press('Escape');
		}
	});
}
