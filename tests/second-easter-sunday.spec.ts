import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';

const constructions = [
	{
		name: 'divine causation',
		part: 'collecta',
		word: 'w021',
		count: 4,
		pl: 'za Twoją sprawą cieszyli się wiecznymi radościami',
		en: 'may be granted by You the enjoyment of everlasting joys'
	},
	{
		name: 'the same hired worker is not the shepherd',
		part: 'evangelium',
		word: 'w021',
		count: 5,
		pl: 'który przy tym nie jest pasterzem',
		en: 'who is also not a shepherd'
	},
	{
		name: 'the sheep do not belong to that worker',
		part: 'evangelium',
		word: 'w026',
		count: 5,
		pl: 'do którego owce nie należą',
		en: 'to whom the sheep do not belong'
	},
	{
		name: 'the judge judges unjustly',
		part: 'epistola',
		word: 'w036',
		count: 3,
		pl: 'temu, kto sądził Go niesprawiedliwie',
		en: 'to the one who judged Him unjustly'
	},
	{
		name: 'the offering brings the blessing',
		part: 'secreta',
		word: 'w001',
		count: 8,
		pl: 'Niech święta ofiara zawsze przynosi nam, Panie, zbawienne błogosławieństwo',
		en: 'Lord, may the sacred offering always bring us a saving blessing'
	},
	{
		name: 'receiving the life-giving grace',
		part: 'postcommunio',
		word: 'w007',
		count: 4,
		pl: 'otrzymując łaskę, przez którą dajesz życie',
		en: 'receiving the grace of Your life-giving work'
	}
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const [width, theme] of [
		[320, 'dark'],
		[1280, 'light']
	] as const) {
		for (const construction of constructions) {
			test(`@reader ${language} Second Easter Sunday: ${construction.name} at ${width}px`, async ({
				page
			}) => {
				await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/formularium/dominica-ii-post-pascha`);
				await setTheme(page, theme);
				await setHelp(page, 1);
				const id = `dominica-ii-post-pascha-${construction.part}.${construction.word}`;
				const group = page.locator('.token-group').filter({ has: page.locator(`[id="${id}"]`) });
				await expectSharedGloss(
					page,
					group,
					construction.count,
					construction[language],
					undefined,
					{
						neighborInk: true
					}
				);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			});
		}
	}

	test(`@reader ${language} Second Easter Sunday preserves the Secret's sung ending and response`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
		await page.goto(`/app/${language}/ordo/offertorium?dies=2026-04-19`);
		await setHelp(page, 2);
		await expect(
			page.locator('[id="dominica-ii-post-pascha-secreta-s02"] + .seg-extra .translation')
		).toHaveText(language === 'pl' ? 'na wieki wieków.' : 'forever and ever.');
		await expect(
			page.locator('[id="dominica-ii-post-pascha-secreta-s03"] + .seg-extra .translation')
		).toHaveText('Amen.');
	});
}

test('@reader English Second Easter Sunday distinguishes surrender from trust and a single wound', async ({
	page
}) => {
	await page.goto('/app/en/formularium/dominica-ii-post-pascha');
	await setHelp(page, 1);
	for (const [word, count, gloss] of [
		['w034', 2, 'but handed Himself over'],
		['w054', 2, 'by His wound']
	] as const) {
		const group = page.locator('.token-group').filter({
			has: page.locator(`[id="dominica-ii-post-pascha-epistola.${word}"]`)
		});
		await expectSharedGloss(page, group, count, gloss);
	}
	await setHelp(page, 2);
	await expect(
		page.locator('#text-proprium-dominica-ii-post-pascha-epistola .translation')
	).toContainText('handed Himself over to the one who judged Him unjustly');
});

test('@reader Polish Second Easter Sunday invokes the name without acting on another behalf', async ({
	page
}) => {
	await page.goto('/app/pl/formularium/dominica-ii-post-pascha');
	await setHelp(page, 2);
	await expect(
		page.locator('#text-proprium-dominica-ii-post-pascha-offertorium .translation')
	).toContainText('w imię Twoje');
	await expect(
		page.locator('#text-proprium-dominica-ii-post-pascha-evangelium .translation')
	).toContainText('i znam Moje owce, a Moje owce znają Mnie');
});
