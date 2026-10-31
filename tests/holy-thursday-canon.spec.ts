import { expect, setHelp, test } from './fixtures';
import { interlinearGeometry } from './interlinear-geometry';

const texts = [
	'communicantes-in-cena-domini',
	'hanc-igitur-in-cena-domini',
	'qui-pridie-in-cena-domini'
];

for (const language of ['pl', 'en'] as const) {
	for (const slug of texts) {
		test(`@reader ${language}: ${slug} complete narrow interlinear`, async ({ page }) => {
			await page.setViewportSize({ width: 320, height: 844 });
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`/app/${language}/ordinarium/${slug}`);
			await setHelp(page, 1);
			await page.evaluate(() => document.fonts.ready);
			const boxes = await page.locator('main').evaluate(interlinearGeometry);
			expect(boxes.length).toBeGreaterThan(15);
			for (const box of boxes) {
				expect(box.sourceClipping, JSON.stringify(box)).toEqual([]);
				expect(box.captionClipping, JSON.stringify(box)).toEqual([]);
				expect(box.clearance, JSON.stringify(box)).toBeGreaterThanOrEqual(0);
			}
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
		});
	}
}

// A row names the language it pins; one realization may be shared where both languages group alike.
const constructions: {
	slug: string;
	first: string;
	last: string;
	anchor: string;
	count: number;
	pl?: string;
	en?: string;
}[] = [
	{
		slug: 'communicantes-in-cena-domini',
		first: 'w013',
		last: 'w014',
		anchor: 'w014',
		count: 2,
		pl: 'został wydany',
		en: 'was handed over'
	},
	{
		// The divine reflexive is lowercase in the working Polish (owner, 2026-10-21).
		// Celebránda (w030) follows with its own caption.
		slug: 'hanc-igitur-in-cena-domini',
		first: 'w025',
		last: 'w029',
		anchor: 'w029',
		count: 5,
		pl: 'tajemnice swojego Ciała i Krwi',
		en: 'the mysteries of His Body and Blood'
	},
	// Both languages caption the petition word by word; only the elect remain one unit.
	{
		slug: 'hanc-igitur-in-cena-domini',
		first: 'w050',
		last: 'w051',
		anchor: 'w050',
		count: 2,
		pl: 'Twoich wybranych',
		en: 'of Your elect'
	},
	{
		slug: 'qui-pridie-in-cena-domini',
		first: 'w004',
		last: 'w008',
		anchor: 'w008',
		count: 5,
		pl: 'miał cierpieć dla zbawienia nas i wszystkich',
		en: 'He was to suffer for our salvation and that of all'
	}
];

// The petition (s06, w036–w054) in reading order. Polish captions every word but the elect
// (w050–w051); English also groups w036–w037 and w038–w040. Regrouping any word changes this.
const petitionCaptions = {
	pl: [
		'i dni',
		'nasze',
		'w',
		'Twoim',
		'pokoju',
		'uporządkował',
		'a także',
		'z',
		'wiecznego',
		'potępienia',
		'nas',
		'wyrwać',
		'i',
		'do',
		'Twoich wybranych',
		'nakazał',
		'trzody',
		'zaliczyć'
	],
	en: [
		'and our days',
		'in Your peace',
		'order',
		'and',
		'from',
		'eternal',
		'condemnation',
		'us',
		'to be delivered',
		'and',
		'in',
		'of Your elect',
		'command',
		'the flock',
		'to be counted'
	]
} as const;

// Former members of the petition's shared captions now open as single words.
const wordCaptions = [
	['w030', 'do sprawowania', 'to be celebrated'],
	['w043', 'z', 'from'],
	['w047', 'wyrwać', 'to be delivered'],
	['w049', 'do', 'in'],
	['w052', 'nakazał', 'command'],
	['w054', 'zaliczyć', 'to be counted']
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const item of constructions) {
		const gloss = item[language];
		if (!gloss) continue;
		for (const member of [item.first, item.last]) {
			test(`@reader ${language}: ${item.slug} shared construction from ${member}`, async ({
				page
			}) => {
				await page.setViewportSize({ width: 320, height: 844 });
				await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
				await page.goto(`/app/${language}/ordinarium/${item.slug}?w=${member}`);
				const panel = page.locator('aside.panel[role="dialog"]');
				await expect(panel.locator('.context-layer > .gloss')).toHaveText(gloss);
				await expect(panel.locator('.construction-card')).toHaveCount(item.count);
				await expect
					.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
					.toBe(0);
				await page.keyboard.press('Escape');
				await expect(panel).toHaveCount(0);
				await setHelp(page, 1);
				await expect(page.locator(`button[id="${item.anchor}"] rt`)).toHaveText(gloss);
			});
		}
	}
	for (const [word, pl, en] of wordCaptions) {
		const caption = language === 'pl' ? pl : en;
		test(`@reader ${language}: hanc-igitur-in-cena-domini word caption from ${word}`, async ({
			page
		}) => {
			await page.setViewportSize({ width: 320, height: 844 });
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`/app/${language}/ordinarium/hanc-igitur-in-cena-domini?w=${word}`);
			const panel = page.locator('aside.panel[role="dialog"]');
			await expect(panel.locator('.context-layer > .gloss')).toHaveText(caption);
			await expect(panel.locator('.construction-card')).toHaveCount(0);
			await page.keyboard.press('Escape');
			await expect(panel).toHaveCount(0);
			await setHelp(page, 1);
			await expect(page.locator(`button[id="${word}"]`)).not.toHaveClass(/word-construction/);
			await expect(page.locator(`button[id="${word}"] rt`)).toHaveText(caption);
		});
	}
	test(`@reader ${language}: hanc-igitur-in-cena-domini petition captions in reading order`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordinarium/hanc-igitur-in-cena-domini`);
		await setHelp(page, 1);
		const petition = page.locator('.verse').filter({ has: page.locator('button[id="w052"]') });
		await expect(petition).toHaveCount(1);
		await expect(petition.locator('rt')).toHaveText([...petitionCaptions[language]]);
	});
	test(`@reader ${language}: Holy Thursday today identifies the institution day`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordinarium/qui-pridie-in-cena-domini?w=w011`);
		const panel = page.locator('aside.panel[role="dialog"]');
		await expect(panel.locator('.context-layer > .gloss')).toHaveText(
			language === 'pl' ? 'dzisiaj' : 'today'
		);
		await expect(panel.locator('.context-layer .explanation')).toContainText(
			language === 'pl'
				? 'Nie mówi, że sama męka wydarza się dzisiaj.'
				: 'It does not say that the Passion itself occurs today.'
		);
	});
}

test('@reader pl: the conjunction stands between the two Polish members of the petition', async ({
	page
}) => {
	await page.goto('/app/pl/ordinarium/hanc-igitur-in-cena-domini');
	await setHelp(page, 1);
	await expect(page.locator('button[id="w048"] rt')).toHaveText('i');
	await expect(page.locator('main')).not.toContainText('nakazał, byśmy zostali wyrwani');
});
