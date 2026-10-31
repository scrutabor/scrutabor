import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

// The Ordinary Hanc igitur captions its command petition word by word (below).
const constructions = [
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

// Hanc igitur, w023–w034: each word keeps its own caption, electórum tuórum stays one unit,
// and the explanation at iúbeas carries the relation of both passive infinitives. The verse
// (w016–w034, 19 words) has 18 captioned units in Polish and 17 in English, where w016–w017
// also share one caption.
const petition = {
	pl: {
		units: 18,
		captions: [
			'od',
			'wiecznego',
			'potępienia',
			'nas',
			'wyrwać',
			'i',
			'do',
			'Twoich wybranych',
			'rozkazał',
			'trzody',
			'zaliczyć'
		],
		explanation:
			'„Rozkazał” zależy od wcześniejszego „byś” i łączy się z oboma bezokolicznikami: „wyrwać nas” i „zaliczyć”. Łacińskie formy są bierne: prosimy, aby to nas wyrwano i zaliczono. „Do” łączy się z dalszym „trzody”, a „Twoich wybranych” określa osoby tworzące trzodę.'
	},
	en: {
		units: 17,
		captions: [
			'from',
			'eternal',
			'damnation',
			'us',
			'to be rescued',
			'and',
			'in',
			'of Your chosen ones',
			'command',
			'the flock',
			'to be counted'
		],
		explanation:
			'“Command” governs both passive infinitives: “us to be rescued” and “to be counted”. The preposition “in” belongs with the later “flock”. The phrase “of Your chosen ones” names the people who make up the flock. The full translation gives the continuous English order.'
	}
} as const;
const petitionButtons = [
	'w023',
	'w024',
	'w025',
	'w026',
	'w027',
	'w028',
	'w029',
	'w030',
	'w032',
	'w033',
	'w034'
];

for (const language of ['pl', 'en'] as const) {
	test(`${language} /ordinarium/hanc-igitur captions its command petition word by word`, async ({
		page
	}) => {
		const { units, captions, explanation } = petition[language];
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/ordinarium/hanc-igitur`);
		await setHelp(page, 1);
		const command = page.locator('button[id="w032"]');
		const verse = page.locator('.verse').filter({ has: command });
		await expect(verse).toHaveCount(1);
		await expect(
			page.locator('.token-group').filter({ has: page.locator('button[id="w032"]') })
		).toHaveCount(0);
		const read = () =>
			Promise.all(petitionButtons.map((id) => page.locator(`button[id="${id}"] rt`).textContent()));
		expect(await read()).toEqual(captions);
		await expect(page.locator('button[id="w030"] .token')).toHaveCount(2);
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await verse.scrollIntoViewIfNeeded();
			await page.evaluate(() => document.fonts.ready);
			// Every word and caption of the petition is painted whole, and each caption clears its Latin.
			const geometry = await verse.evaluate(interlinearGeometry);
			expect(geometry).toHaveLength(units);
			for (const unit of geometry) {
				expect(unit.sourceClipping, unit.text ?? '').toEqual([]);
				expect(unit.captionClipping, unit.text ?? '').toEqual([]);
				expect(unit.clearance, unit.text ?? '').toBeGreaterThanOrEqual(0);
			}
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		const source = await verse.locator('.base').allTextContents();
		expect(source).toHaveLength(19);
		await command.click();
		const panel = page.locator('aside.panel[role="dialog"]');
		await expect(panel.locator('.context-layer > .gloss')).toHaveText(captions[8]);
		await expect(panel.locator('.context-layer .explanation')).toHaveText(explanation);
		await expect(panel.locator('.construction-card')).toHaveCount(0);
		await page.keyboard.press('Escape');
		await page.emulateMedia({ media: 'print' });
		expect(await read()).toEqual(captions);
		expect(await verse.locator('.base').allTextContents()).toEqual(source);
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
