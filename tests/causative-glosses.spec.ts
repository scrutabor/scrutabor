import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

const constructions = [
	[
		'pl',
		'/ordinarium/hanc-igitur',
		'w032',
		12,
		'rozkazał wyrwać nas od wiecznego potępienia i zaliczyć do trzody Twoich wybranych'
	],
	[
		'en',
		'/ordinarium/hanc-igitur',
		'w032',
		12,
		'command that we be rescued from eternal damnation and counted in the flock of Your chosen ones'
	],
	['pl', '/ordinarium/supplices-te-rogamus', 'w006', 3, 'rozkaż, aby te dary zostały zaniesione'],
	['en', '/ordinarium/supplices-te-rogamus', 'w006', 3, 'command that these offerings be carried'],
	[
		'en',
		'/formularium/dominica-ii-passionis',
		'dominica-ii-passionis-evangelium.w1478',
		3,
		'commanded the body to be delivered'
	],
	[
		'en',
		'/formularium/dominica-vi-post-pentecosten',
		'dominica-vi-post-pentecosten-evangelium.w102',
		2,
		'commanded them to be served'
	],
	[
		'en',
		'/formularium/dominica-xxi-post-pentecosten',
		'dominica-xxi-post-pentecosten-evangelium.w044',
		5,
		'his master ordered him to be sold'
	],
	[
		'pl',
		'/formularium/sanctissimi-nominis-iesu',
		'sanctissimi-nominis-iesu-collecta.w013',
		3,
		'nakazałeś, aby nazwano Go Jezusem'
	]
] as const;

for (const [language, route, anchor, members, caption] of constructions) {
	test(`${language} ${route} keeps its complete command construction`, async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}${route}`);
		await setHelp(page, 1);
		const group = page.locator('.token-group').filter({
			has: page.locator(`button[id="${anchor}"]`)
		});
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await expectSharedGloss(page, group, members, caption);
			await group.scrollIntoViewIfNeeded();
			const [geometry] = await group.evaluate(interlinearGeometry);
			expect(geometry.clearance).toBeGreaterThanOrEqual(0);
			expect(geometry.sourceClipping).toEqual([]);
			expect(geometry.captionClipping).toEqual([]);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		const source = await group.locator('.base').allTextContents();
		await page.emulateMedia({ media: 'print' });
		await expect(group.locator('rt')).toHaveText(caption);
		expect(await group.locator('.base').allTextContents()).toEqual(source);
		await page.emulateMedia({ media: 'screen' });
	});
}

for (const language of ['pl', 'en'] as const) {
	test(`${language} serving captions retain the food and crowd relations`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/dominica-vi-post-pentecosten`);
		await setHelp(page, 1);
		const captions =
			language === 'pl'
				? ['podawali', 'podali', 'tłumowi']
				: ['they should serve them', 'they served them', 'to the crowd'];
		for (const [index, word] of ['w090', 'w092', 'w093'].entries()) {
			await expect(
				page.locator(`button[id="dominica-vi-post-pentecosten-evangelium.${word}"] rt`)
			).toHaveText(captions[index]);
		}
		if (language === 'pl') {
			await expect(
				page.locator('button[id="dominica-vi-post-pentecosten-evangelium.w103"] rt')
			).toHaveText('podać');
		}
	});
}
