import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

// A feast on a weekday of Advent takes the weekday's place, and the weekday is commemorated in
// every Mass of the feast, low or sung (RG 21, 24–25, 108–109): the feast's Collect, Secret and
// Postcommunion are each followed by the weekday's, under its own conclusion (436–437), and the
// feast's Secret is then not the last (480–481). A weekday of Advent says the preceding Sunday's
// Mass, so on Tuesday 8 December 2026 the Immaculate Conception says the Second Sunday's
// orations as the weekday's, and the heading names both. The Ember days have a Mass of their
// own (298–299), which this edition does not yet carry: on Friday 21 December 2029, the Ember
// Friday, St Thomas owes the commemoration, says so, and never puts the Sunday's in its place.
const SAID = {
	date: '2026-12-08',
	feast: 'immaculata-conceptio',
	sunday: 'dominica-ii-adventus',
	// The feast's Secret: its terminal and Amen, said quietly here.
	quiet: ['w052', 'w056'],
	// The Sunday's Secret: its terminal and Amen, the last Secret, said aloud.
	audible: ['w036', 'w040'],
	head: {
		pl: 'wspomnienie: Dzień powszedni Adwentu (modlitwy: II Niedziela Adwentu)',
		en: 'commemoration: Weekday of Advent (prayers: Second Sunday of Advent)'
	}
} as const;
const EMBER = {
	date: '2029-12-21',
	feast: 'sancti-thomae-apostoli',
	// The Sunday that would have been said on another weekday of that week.
	sunday: 'dominica-iii-adventus',
	// St Thomas's Secret: its terminal and Amen, quiet because the owed Secret would follow.
	quiet: ['w043', 'w047']
} as const;

const TEXT = {
	pl: {
		missing:
			'tego dnia przypada wspomnienie: Dzień powszedni Adwentu. Jego modlitw nie ma jeszcze w tym wydaniu',
		unavailable:
			'Po modlitwie z formularza dnia następuje wymagane wspomnienie okresowe (de Tempore), którego nie ma jeszcze w tym wydaniu.'
	},
	en: {
		missing:
			'a commemoration is due on this day: Weekday of Advent. Its prayers are not yet in this edition',
		unavailable:
			'The prayer of the day is followed by a required commemoration of the season (de Tempore), which is not yet in this edition.'
	}
} as const;

async function celebrating(page: Page, form: 'lecta' | 'cantu') {
	await page.addInitScript((form) => {
		localStorage.setItem('scrutabor-role', 'sacerdos');
		localStorage.setItem('scrutabor-mass-form', form);
	}, form);
}

const partOf = (page: Page, id: string) =>
	page.locator('section.part').filter({ has: page.locator(`[id="${id}"]`) });

const inOrder = (page: Page, ids: string[]) =>
	page
		.locator(ids.map((id) => `[id="${id}"]`).join(', '))
		.evaluateAll((nodes) => nodes.map((node) => node.id));

async function idsAreUnique(page: Page) {
	const ids = await page.locator('main [id]').evaluateAll((nodes) => nodes.map((n) => n.id));
	expect(new Set(ids).size).toBe(ids.length);
}

const NOTICES =
	'.picker .state.commemoration-only, .picker .state.commemoration-unavailable, .picker .state.commemoration-missing';

for (const language of ['pl', 'en'] as const)
	for (const form of ['lecta', 'cantu'] as const) {
		test(`${language} ${form} ${SAID.date}: the Immaculate Conception says the Advent weekday from ${SAID.sunday}`, async ({
			page
		}) => {
			await celebrating(page, form);
			const dated = `dies=${SAID.date}`;
			for (const [movement, slot] of [
				['catechumenorum', 'collecta'],
				['offertorium', 'secreta'],
				['conclusio', 'postcommunio']
			] as const) {
				await page.goto(`/app/${language}/ordo/${movement}?${dated}`);
				const feast = `${SAID.feast}-${slot}.w001`;
				const weekday = `${SAID.sunday}-${slot}.w001`;
				await expect(page.locator(`[id="${feast}"]`)).toBeVisible();
				await expect(page.locator(`[id="${weekday}"]`)).toHaveCount(1);
				expect(await inOrder(page, [feast, weekday])).toEqual([feast, weekday]);
				const part = partOf(page, feast);
				await expect(part.locator('.commemoration-head')).toHaveCount(1);
				await expect(part.locator('.commemoration-head .mark')).toHaveText(SAID.head[language]);
				// The part title opens the prayer's own page, the Sunday's formulary.
				await expect(
					part.locator(`.commemoration-head a.part-title[href*="formularium/${SAID.sunday}"]`)
				).toHaveCount(1);
				// Privileged: one sequence in every Mass, nothing described as an alternative,
				// nothing owed, and the picker announces nothing.
				await expect(part.locator('.variant-head, .variants-note, .unavailable-note')).toHaveCount(
					0
				);
				await expect(page.locator(NOTICES)).toHaveCount(0);
				await idsAreUnique(page);
				if (slot === 'secreta') {
					await expect(part.locator('.quiet-note')).toHaveCount(1);
					for (const word of SAID.quiet)
						await expect(page.locator(`.quiet [id="${SAID.feast}-secreta.${word}"]`)).toHaveCount(
							1
						);
					for (const word of SAID.audible) {
						await expect(page.locator(`[id="${SAID.sunday}-secreta.${word}"]`)).toHaveCount(1);
						await expect(page.locator(`.quiet [id="${SAID.sunday}-secreta.${word}"]`)).toHaveCount(
							0
						);
					}
				}
			}
			await expect(page).toHaveURL(new RegExp(dated));
		});

		test(`${language} ${form} ${EMBER.date}: St Thomas on the Ember Friday owes the Advent weekday`, async ({
			page
		}) => {
			await celebrating(page, form);
			const text = TEXT[language];
			const dated = `dies=${EMBER.date}`;
			for (const [movement, slot] of [
				['catechumenorum', 'collecta'],
				['offertorium', 'secreta'],
				['conclusio', 'postcommunio']
			] as const) {
				await page.goto(`/app/${language}/ordo/${movement}?${dated}`);
				const feast = `${EMBER.feast}-${slot}.w001`;
				await expect(page.locator(`[id="${feast}"]`)).toBeVisible();
				// The Mass says what it owes, by the commemoration's own title, in the picker and in
				// the slot where the weekday's oration would follow.
				await expect(page.locator('.picker .state.commemoration-missing')).toHaveText(text.missing);
				await expect(
					page.locator(
						'.picker .state.commemoration-only, .picker .state.commemoration-unavailable'
					)
				).toHaveCount(0);
				const part = partOf(page, feast);
				await expect(part.locator('.unavailable-note')).toHaveText(text.unavailable);
				await expect(part.locator('.variant-head, .variants-note')).toHaveCount(0);
				// Nothing stands in for the Ember day: no commemoration, and not the Sunday's prayer.
				await expect(page.locator('.commemoration-head')).toHaveCount(0);
				await expect(page.locator(`[id="${EMBER.sunday}-${slot}.w001"]`)).toHaveCount(0);
				await expect(page.locator('[id*="quatuor-temporum"]')).toHaveCount(0);
				await idsAreUnique(page);
				if (slot === 'secreta') {
					await expect(part.locator('.quiet-note')).toHaveCount(1);
					for (const word of EMBER.quiet)
						await expect(page.locator(`.quiet [id="${EMBER.feast}-secreta.${word}"]`)).toHaveCount(
							1
						);
				}
			}
			await expect(page).toHaveURL(new RegExp(dated));
		});
	}

for (const language of ['pl', 'en'] as const)
	test(`${language} the Advent feria's page lists the three feasts with each date's Sunday or Ember day`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/commemoratio/feria-adventus`);
		await expect(page.locator('h1[lang="la"]')).toHaveText('Feria Adventus');
		await expect(page.locator('.subtitle')).toHaveText(
			language === 'pl' ? 'Dzień powszedni Adwentu' : 'Weekday of Advent'
		);
		await expect(page.locator('.rule')).toHaveCount(2);
		await expect(page.locator('.rule').last()).toContainText(
			language === 'pl' ? 'Suche Dni Adwentu' : 'The Ember days of Advent'
		);
		// It has no orations of its own to read.
		await expect(page.locator('.proper-part')).toHaveCount(0);
		// Each date stands under its feast, the Mass said that day, in civil order.
		await expect(page.locator('.resolved-feast')).toHaveCount(3);
		expect(
			await page
				.locator('.resolved-feast')
				.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-feast')))
		).toEqual(['sancti-andreae-apostoli', 'immaculata-conceptio', 'sancti-thomae-apostoli']);
		await expect(page.locator('.resolved-dates li')).toHaveCount(163);
		// Only the Ember days lack the prayers, and only they are named without a link.
		await expect(page.locator('.resolved-dates small')).toHaveCount(21);
		await expect(page.locator('.resolved-dates [data-absent]')).toHaveCount(21);
		const tuesday = page.locator('li[data-date="2026-12-08"]');
		await expect(tuesday.locator('time')).toHaveText(
			language === 'pl' ? '8 grudnia 2026' : '8 December 2026'
		);
		await expect(tuesday.locator('a[href*="formularium/dominica-ii-adventus"]')).toHaveText(
			language === 'pl' ? 'II Niedziela Adwentu' : 'Second Sunday of Advent'
		);
		await expect(tuesday.locator('small')).toHaveCount(0);
		const thomas = page.locator('section[data-feast="sancti-thomae-apostoli"]');
		await expect(thomas.locator('.resolved-dates li')).toHaveCount(64);
		for (const [date, ember, name] of [
			[
				'2029-12-21',
				'feria-sexta-quatuor-temporum-adventus',
				language === 'pl' ? 'Piątek Suchych Dni Adwentu' : 'Ember Friday of Advent'
			],
			[
				'2030-12-21',
				'sabbato-quatuor-temporum-adventus',
				language === 'pl' ? 'Sobota Suchych Dni Adwentu' : 'Ember Saturday of Advent'
			]
		] as const) {
			const row = thomas.locator(`li[data-date="${date}"]`);
			await expect(row.locator(`[data-absent="${ember}"]`)).toHaveText(name);
			await expect(row.locator('a')).toHaveCount(0);
			await expect(row.locator('small')).toHaveText(
				language === 'pl'
					? 'modlitw nie ma jeszcze w tym wydaniu'
					: 'prayers not yet in this edition'
			);
		}
		// St Thomas on another weekday of the third week says the Third Sunday's prayers.
		await expect(
			thomas.locator('li[data-date="2028-12-21"] a[href*="formularium/dominica-iii-adventus"]')
		).toHaveText(language === 'pl' ? 'III Niedziela Adwentu' : 'Third Sunday of Advent');
		expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
	});
