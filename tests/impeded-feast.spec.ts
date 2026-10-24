import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

// A second-class feast kept off its day by a second-class Sunday is commemorated in the Sunday's
// Mass (RG 16, 108–109): the Sunday's Collect, Secret and Postcommunion are each followed by the
// feast's own, under its own conclusion (436–437), and the Sunday's Secret is then not the last
// (480–481). The commemoration is ordinary: made in a low Mass and in a sung conventual Mass,
// omitted in a sung Mass that is not conventual. The low/sung control does not say whether a sung
// Mass is conventual, so a sung Mass shows both sequences, each labelled, as for St Petronilla.
// The feast is the one the calendar assigns to the date: St John in 2026 at the Sunday within the
// Christmas octave, St James in 2027 at the Tenth Sunday after Pentecost. Its orations are read
// from its own formulary, and the heading names that formulary.
const OTHER = '~cantu-non-conventualis';
const CASES = [
	{
		date: '2026-12-27',
		sunday: 'dominica-infra-octavam-nativitatis',
		feast: 'sancti-ioannis-apostoli-et-evangelistae',
		// The Sunday's Secret: its terminal and Amen, said quietly where the feast's follows.
		quiet: ['w039', 'w043'],
		// The feast's Secret: its terminal and Amen, the last Secret, said aloud.
		audible: ['w032', 'w036'],
		head: {
			pl: 'wspomnienie: Świętego Jana Apostoła i Ewangelisty',
			en: 'commemoration: Saint John, Apostle and Evangelist'
		}
	},
	{
		date: '2027-07-25',
		sunday: 'dominica-x-post-pentecosten',
		feast: 'sancti-iacobi-apostoli',
		quiet: ['w037', 'w041'],
		audible: ['w041', 'w045'],
		head: {
			pl: 'wspomnienie: Świętego Jakuba Apostoła',
			en: 'commemoration: Saint James the Apostle'
		}
	}
] as const;

const TEXT = {
	pl: {
		variants: [
			'We Mszy śpiewanej wspomnienie zależy od tego, czy jest to Msza konwentualna. Pokazano oba warianty.'
		],
		situations: ['we Mszy śpiewanej konwentualnej', 'we Mszy śpiewanej niekonwentualnej'],
		low: 'cicha'
	},
	en: {
		variants: [
			'In a sung Mass the commemoration depends on whether the Mass is conventual. Both forms are shown.'
		],
		situations: ['in a sung conventual Mass', 'in a sung Mass that is not conventual'],
		low: 'low'
	}
} as const;

async function inForm(page: Page, form: 'lecta' | 'cantu') {
	await page.addInitScript((form) => {
		localStorage.setItem('scrutabor-role', 'sacerdos');
		localStorage.setItem('scrutabor-mass-form', form);
	}, form);
}

const part = (page: Page, id: string) =>
	page.locator('section.part').filter({ has: page.locator(`[id="${id}"]`) });

const order = (page: Page, ids: string[]) =>
	page
		.locator(ids.map((id) => `[id="${id}"]`).join(', '))
		.evaluateAll((nodes) => nodes.map((node) => node.id));

async function oneAddressEach(page: Page) {
	const ids = await page.locator('main [id]').evaluateAll((nodes) => nodes.map((n) => n.id));
	expect(new Set(ids).size).toBe(ids.length);
}

for (const day of CASES)
	for (const language of ['pl', 'en'] as const) {
		const text = TEXT[language];
		const dated = `dies=${day.date}`;

		test(`${language} lecta ${day.date}: ${day.sunday} commemorates ${day.feast}`, async ({
			page
		}) => {
			await inForm(page, 'lecta');

			await page.goto(`/app/${language}/ordo/catechumenorum?${dated}`);
			await expect(page.locator(`[id="${day.sunday}-collecta.w001"]`)).toBeVisible();
			await expect(page.locator(`[id="${day.feast}-collecta.w001"]`)).toHaveCount(1);
			await expect(page.locator('.commemoration-head .mark')).toHaveText(day.head[language]);
			await expect(
				page.locator(`.commemoration-head a.part-title[href*="formularium/${day.feast}"]`)
			).toHaveCount(1);
			expect(
				await order(page, [`${day.sunday}-collecta.w001`, `${day.feast}-collecta.w001`])
			).toEqual([`${day.sunday}-collecta.w001`, `${day.feast}-collecta.w001`]);
			// A low Mass makes the commemoration in one sequence: nothing is described as an
			// alternative, nothing is owed and the picker announces nothing.
			await expect(page.locator('.variant-head, .variants-note, .unavailable-note')).toHaveCount(0);
			await expect(
				page.locator(
					'.picker .state.commemoration-only, .picker .state.commemoration-unavailable, .picker .state.commemoration-missing'
				)
			).toHaveCount(0);
			await oneAddressEach(page);

			await page.goto(`/app/${language}/ordo/offertorium?${dated}`);
			await expect(page.locator(`[id="${day.feast}-secreta.w001"]`)).toHaveCount(1);
			await expect(page.locator('.commemoration-head .mark')).toHaveText(day.head[language]);
			await expect(page.locator('.quiet-note')).toHaveCount(1);
			for (const word of day.quiet)
				await expect(page.locator(`.quiet [id="${day.sunday}-secreta.${word}"]`)).toHaveCount(1);
			for (const word of day.audible) {
				await expect(page.locator(`[id="${day.feast}-secreta.${word}"]`)).toHaveCount(1);
				await expect(page.locator(`.quiet [id="${day.feast}-secreta.${word}"]`)).toHaveCount(0);
			}
			await oneAddressEach(page);

			await page.goto(`/app/${language}/ordo/conclusio?${dated}`);
			await expect(page.locator(`[id="${day.sunday}-postcommunio.w001"]`)).toBeVisible();
			await expect(page.locator(`[id="${day.feast}-postcommunio.w001"]`)).toHaveCount(1);
			await expect(page.locator('.commemoration-head .mark')).toHaveText(day.head[language]);
			await expect(page).toHaveURL(new RegExp(dated));
		});

		test(`${language} cantu ${day.date}: ${day.sunday} describes the conventual and the other`, async ({
			page
		}) => {
			await inForm(page, 'cantu');

			await page.goto(`/app/${language}/ordo/catechumenorum?${dated}`);
			await expect(page.locator(`[id="${day.sunday}-collecta.w001"]`)).toBeVisible();
			const collect = part(page, `${day.sunday}-collecta.w001`);
			await expect(collect.locator('.variants-note')).toHaveText(text.variants);
			await expect(collect.locator('.variant-head')).toHaveText(text.situations);
			expect(
				await order(page, [
					`${day.sunday}-collecta.w001`,
					`${day.feast}-collecta.w001`,
					`${day.sunday}-collecta${OTHER}.w001`
				])
			).toEqual([
				`${day.sunday}-collecta.w001`,
				`${day.feast}-collecta.w001`,
				`${day.sunday}-collecta${OTHER}.w001`
			]);
			// One commemoration, in the conventual sequence only; the other omits it.
			await expect(collect.locator('.commemoration-head')).toHaveCount(1);
			await expect(collect.locator('.commemoration-head .mark')).toHaveText(day.head[language]);
			await expect(page.locator(`[id="${day.feast}-collecta${OTHER}.w001"]`)).toHaveCount(0);
			await oneAddressEach(page);

			await page.goto(`/app/${language}/ordo/offertorium?${dated}`);
			const secret = part(page, `${day.sunday}-secreta.w001`);
			await expect(secret.locator('.variant-head')).toHaveText(text.situations);
			// Only the conventual sequence has a Secret that is not the last.
			await expect(secret.locator('.quiet-note')).toHaveCount(1);
			for (const word of day.quiet) {
				await expect(page.locator(`.quiet [id="${day.sunday}-secreta.${word}"]`)).toHaveCount(1);
				await expect(page.locator(`[id="${day.sunday}-secreta${OTHER}.${word}"]`)).toHaveCount(1);
				await expect(
					page.locator(`.quiet [id="${day.sunday}-secreta${OTHER}.${word}"]`)
				).toHaveCount(0);
			}
			for (const word of day.audible)
				await expect(page.locator(`.quiet [id="${day.feast}-secreta.${word}"]`)).toHaveCount(0);
			await oneAddressEach(page);

			await page.goto(`/app/${language}/ordo/conclusio?${dated}`);
			const postcommunion = part(page, `${day.sunday}-postcommunio.w001`);
			await expect(postcommunion.locator('.variant-head')).toHaveText(text.situations);
			await expect(postcommunion.locator('.commemoration-head')).toHaveCount(1);
			expect(
				await order(page, [
					`${day.sunday}-postcommunio.w001`,
					`${day.feast}-postcommunio.w001`,
					`${day.sunday}-postcommunio${OTHER}.w001`
				])
			).toEqual([
				`${day.sunday}-postcommunio.w001`,
				`${day.feast}-postcommunio.w001`,
				`${day.sunday}-postcommunio${OTHER}.w001`
			]);
			await oneAddressEach(page);

			// The low/sung control selects again and never keeps the other form's sequence.
			await page.getByRole('radio', { name: new RegExp(`${text.low}$`) }).click();
			await expect(postcommunion.locator('.variant-head')).toHaveCount(0);
			await expect(page.locator(`[id="${day.sunday}-postcommunio${OTHER}.w001"]`)).toHaveCount(0);
			await expect(page.locator(`[id="${day.feast}-postcommunio.w001"]`)).toHaveCount(1);
		});
	}

for (const language of ['pl', 'en'] as const)
	test(`${language} the Chair of St Peter keeps its in-text rubric inside the commemoration`, async ({
		page
	}) => {
		// The Chair's orations join St Paul's under one conclusion with a printed rubric between
		// them. Commemorated at Sexagesima in 2060, the rubric renders inside the commemoration
		// exactly as it does in the Chair's own Mass (22 February 2028, before Lent).
		const rubric = '[id="cathedra-sancti-petri-collecta-s03"]';
		const words = 'Et fit commemoratio Sancti Pauli Apostoli sub unica conclusione:';
		await inForm(page, 'lecta');

		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2028-02-22`);
		await expect(page.locator('[id="cathedra-sancti-petri-collecta.w001"]')).toBeVisible();
		await expect(page.locator('.commemoration-head')).toHaveCount(0);
		await expect(page.locator(rubric)).toHaveClass(/\brubric\b/);
		await expect(page.locator(`${rubric} .rubric-la`)).toHaveText(words);
		const own = await page.locator(rubric).evaluate((node) => ({
			className: node.className,
			text: (node as HTMLElement).innerText
		}));

		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2060-02-22`);
		const collect = part(page, 'dominica-in-sexagesima-collecta.w001');
		await expect(collect.locator('.commemoration-head .mark')).toHaveText(
			language === 'pl'
				? 'wspomnienie: Katedry Świętego Piotra Apostoła'
				: 'commemoration: Chair of Saint Peter the Apostle'
		);
		await expect(collect.locator(rubric)).toHaveCount(1);
		await expect(collect.locator(`${rubric} .rubric-la`)).toHaveText(words);
		expect(
			await collect.locator(rubric).evaluate((node) => ({
				className: node.className,
				text: (node as HTMLElement).innerText
			}))
		).toEqual(own);
		const ids = [
			'dominica-in-sexagesima-collecta.w001',
			'cathedra-sancti-petri-collecta.w001',
			'cathedra-sancti-petri-collecta-s03',
			'cathedra-sancti-petri-collecta.w043'
		];
		expect(await order(page, ids)).toEqual(ids);
		await oneAddressEach(page);
	});

for (const language of ['pl', 'en'] as const)
	test(`${language} the impeded feast's page lists each feast with its dates and Sundays`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/commemoratio/festum-impeditum`);
		await expect(page.locator('h1[lang="la"]')).toHaveText('Festum impeditum');
		await expect(page.locator('.subtitle')).toHaveText(
			language === 'pl' ? 'Święto przeszkodzone' : 'Impeded Feast'
		);
		await expect(page.locator('.rule')).toHaveCount(2);
		// It has no orations of its own to read.
		await expect(page.locator('.proper-part')).toHaveCount(0);
		// Each date stands under its feast, the formulary commemorated, in civil order from the Chair.
		await expect(page.locator('.resolved-feast')).toHaveCount(20);
		await expect(page.locator('.resolved-feast').first()).toHaveAttribute(
			'data-feast',
			'cathedra-sancti-petri'
		);
		await expect(page.locator('.resolved-feast').last()).toHaveAttribute(
			'data-feast',
			'sanctorum-innocentium-martyrum'
		);
		await expect(page.locator('.resolved-dates li')).toHaveCount(206);
		await expect(page.locator('.resolved-dates small')).toHaveCount(0);
		const john = page.locator('section[data-feast="sancti-ioannis-apostoli-et-evangelistae"]');
		await expect(john.locator('h3 a')).toHaveAttribute(
			'href',
			`/app/${language}/formularium/sancti-ioannis-apostoli-et-evangelistae`
		);
		await expect(john.locator('h3 a')).toHaveText(
			language === 'pl'
				? 'Świętego Jana Apostoła i Ewangelisty'
				: 'Saint John, Apostle and Evangelist'
		);
		const christmas = john.locator('li[data-date="2026-12-27"]');
		await expect(christmas.locator('time')).toHaveText(
			language === 'pl' ? '27 grudnia 2026' : '27 December 2026'
		);
		// The Sunday whose Mass is said that day, linked to its own formulary.
		await expect(
			christmas.locator('a[href*="formularium/dominica-infra-octavam-nativitatis"]')
		).toHaveText(
			language === 'pl'
				? 'Niedziela w Oktawie Narodzenia Pańskiego'
				: 'Sunday within the Octave of the Nativity of the Lord'
		);
		const james = page.locator('section[data-feast="sancti-iacobi-apostoli"]');
		await expect(james.locator('.resolved-dates li')).toHaveCount(12);
		await expect(
			james.locator('li[data-date="2027-07-25"] a[href*="formularium/dominica-x-post-pentecosten"]')
		).toHaveText(
			language === 'pl' ? '10. Niedziela po Zesłaniu Ducha Świętego' : '10th Sunday after Pentecost'
		);
		expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
	});
