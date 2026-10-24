import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

// A first-class feast that takes a Sunday's place commemorates that Sunday in every Mass, low or
// sung (RG 108–109): the feast's Collect, Secret and Postcommunion are each followed by the
// Sunday's own, under its own conclusion (436–437), and the feast's Secret is then not the last
// (480–481). The Sunday is the one the calendar would have kept that day: All Saints 2026 the
// Twenty-third after Pentecost, the Assumption 2027 the Thirteenth. Its orations are read from
// its own formulary, and the heading names that formulary.
const CASES = [
	{
		date: '2026-11-01',
		feast: 'omnium-sanctorum',
		sunday: 'dominica-xxiii-post-pentecosten',
		// The feast's Secret: its terminal and Amen, said quietly here.
		quiet: ['w039', 'w043'],
		// The Sunday's Secret: its terminal and Amen, the last Secret, said aloud.
		audible: ['w033', 'w037'],
		head: {
			pl: 'wspomnienie: 23. Niedziela po Zesłaniu Ducha Świętego',
			en: 'commemoration: 23rd Sunday after Pentecost'
		}
	},
	{
		date: '2027-08-15',
		feast: 'assumptio-beatae-mariae-virginis',
		sunday: 'dominica-xiii-post-pentecosten',
		quiet: ['w042', 'w046'],
		audible: ['w035', 'w039'],
		head: {
			pl: 'wspomnienie: 13. Niedziela po Zesłaniu Ducha Świętego',
			en: 'commemoration: 13th Sunday after Pentecost'
		}
	}
] as const;

async function inForm(page: Page, form: 'lecta' | 'cantu') {
	await page.addInitScript((form) => {
		localStorage.setItem('scrutabor-role', 'sacerdos');
		localStorage.setItem('scrutabor-mass-form', form);
	}, form);
}

const order = (page: Page, ids: string[]) =>
	page
		.locator(ids.map((id) => `[id="${id}"]`).join(', '))
		.evaluateAll((nodes) => nodes.map((node) => node.id));

async function oneAddressEach(page: Page) {
	const ids = await page.locator('main [id]').evaluateAll((nodes) => nodes.map((n) => n.id));
	expect(new Set(ids).size).toBe(ids.length);
}

for (const day of CASES)
	for (const language of ['pl', 'en'] as const)
		for (const form of ['lecta', 'cantu'] as const)
			test(`${language} ${form} ${day.date}: ${day.feast} commemorates ${day.sunday}`, async ({
				page
			}) => {
				await inForm(page, form);
				const dated = `dies=${day.date}`;

				await page.goto(`/app/${language}/ordo/catechumenorum?${dated}`);
				await expect(page.locator(`[id="${day.feast}-collecta.w001"]`)).toBeVisible();
				await expect(page.locator(`[id="${day.sunday}-collecta.w001"]`)).toHaveCount(1);
				await expect(page.locator('.commemoration-head .mark')).toHaveText(day.head[language]);
				await expect(
					page.locator(`.commemoration-head a.part-title[href*="formularium/${day.sunday}"]`)
				).toHaveCount(1);
				expect(
					await order(page, [`${day.feast}-collecta.w001`, `${day.sunday}-collecta.w001`])
				).toEqual([`${day.feast}-collecta.w001`, `${day.sunday}-collecta.w001`]);
				// A privileged commemoration is one sequence in every Mass: nothing is described as
				// an alternative, nothing is owed and the picker announces nothing.
				await expect(page.locator('.variant-head, .variants-note, .unavailable-note')).toHaveCount(
					0
				);
				await expect(
					page.locator(
						'.picker .state.commemoration-only, .picker .state.commemoration-unavailable, .picker .state.commemoration-missing'
					)
				).toHaveCount(0);
				await oneAddressEach(page);

				await page.goto(`/app/${language}/ordo/offertorium?${dated}`);
				await expect(page.locator(`[id="${day.sunday}-secreta.w001"]`)).toHaveCount(1);
				await expect(page.locator('.commemoration-head .mark')).toHaveText(day.head[language]);
				await expect(page.locator('.quiet-note')).toHaveCount(1);
				for (const word of day.quiet)
					await expect(page.locator(`.quiet [id="${day.feast}-secreta.${word}"]`)).toHaveCount(1);
				for (const word of day.audible) {
					await expect(page.locator(`[id="${day.sunday}-secreta.${word}"]`)).toHaveCount(1);
					await expect(page.locator(`.quiet [id="${day.sunday}-secreta.${word}"]`)).toHaveCount(0);
				}
				await oneAddressEach(page);

				await page.goto(`/app/${language}/ordo/conclusio?${dated}`);
				await expect(page.locator(`[id="${day.feast}-postcommunio.w001"]`)).toBeVisible();
				await expect(page.locator(`[id="${day.sunday}-postcommunio.w001"]`)).toHaveCount(1);
				await expect(page.locator('.commemoration-head .mark')).toHaveText(day.head[language]);
				await expect(page).toHaveURL(new RegExp(dated));
			});

for (const language of ['pl', 'en'] as const)
	test(`${language} the impeded Sunday's page says the rule and the Sunday of each date`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/commemoratio/dominica-impedita`);
		await expect(page.locator('h1[lang="la"]')).toHaveText('Dominica impedita');
		await expect(page.locator('.subtitle')).toHaveText(
			language === 'pl' ? 'Niedziela przeszkodzona' : 'Impeded Sunday'
		);
		await expect(page.locator('.rule')).toHaveCount(2);
		// It has no orations of its own to read.
		await expect(page.locator('.proper-part')).toHaveCount(0);
		// Each date stands under its feast, the Mass said that day.
		await expect(page.locator('.resolved-feast')).toHaveCount(7);
		await expect(page.locator('.resolved-dates li')).toHaveCount(75);
		await expect(page.locator('.resolved-dates small')).toHaveCount(0);
		const saints = page.locator('li[data-date="2026-11-01"]');
		await expect(saints.locator('time')).toHaveText(
			language === 'pl' ? '1 listopada 2026' : '1 November 2026'
		);
		await expect(
			saints.locator('a[href*="formularium/dominica-xxiii-post-pentecosten"]')
		).toHaveText(
			language === 'pl' ? '23. Niedziela po Zesłaniu Ducha Świętego' : '23rd Sunday after Pentecost'
		);
		// RG 18: in 2043 the Sunday kept on 1 November is the resumed Fourth after Epiphany.
		await expect(
			page.locator(
				'li[data-date="2043-11-01"] a[href*="formularium/dominica-iv-quae-superfuit-post-epiphaniam"]'
			)
		).toHaveText(
			language === 'pl'
				? 'Przeniesiona IV Niedziela po Objawieniu Pańskim'
				: 'Transferred Fourth Sunday after Epiphany'
		);
		await expect(
			page.locator('section[data-feast="omnium-sanctorum"] .resolved-dates li')
		).toHaveCount(11);
		expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
	});
