import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

// St Petronilla, an ordinary commemoration, is made in a low Mass and in a sung conventual Mass
// of the Queenship and not in a sung Mass that is not conventual (RG 108). The low/sung control
// does not say whether a sung Mass is conventual, so a sung Mass shows both sequences, each
// labelled, and no setting chooses between them. On 31 May 2079 the impeded Vigil of the
// Ascension, absent from this edition, takes the place: that Mass is announced as incomplete.
const QUEEN = 'beata-maria-virgo-regina';
const DAY = 'dies=2027-05-31';
const MARKED = 'dies=2079-05-31';
const OTHER = '~cantu-non-conventualis';
const PETRONILLA = [
	'sanctae-petronillae-collecta',
	'sanctae-petronillae-secreta',
	'sanctae-petronillae-postcommunio'
];

const TEXT = {
	pl: {
		head: 'wspomnienie: Świętej Petroneli, Dziewicy',
		title: 'Świętej Petroneli, Dziewicy',
		variants: [
			'We Mszy śpiewanej wspomnienie zależy od tego, czy jest to Msza konwentualna. Pokazano oba warianty.'
		],
		situations: ['we Mszy śpiewanej konwentualnej', 'we Mszy śpiewanej niekonwentualnej'],
		unavailable:
			'Po modlitwie z formularza dnia następuje wymagane wspomnienie okresowe (de Tempore), którego nie ma jeszcze w tym wydaniu.',
		day: (where: string) =>
			`${where} wymaga wspomnienia okresowego (de Tempore), którego nie ma jeszcze w tym wydaniu. Pomija się inne wspomnienie: Świętej Petroneli, Dziewicy`,
		mass: 'ta Msza',
		conventual: 'śpiewana Msza konwentualna',
		low: 'cicha',
		sung: 'śpiewana'
	},
	en: {
		head: 'commemoration: Saint Petronilla, Virgin',
		title: 'Saint Petronilla, Virgin',
		variants: [
			'In a sung Mass the commemoration depends on whether the Mass is conventual. Both forms are shown.'
		],
		situations: ['in a sung conventual Mass', 'in a sung Mass that is not conventual'],
		unavailable:
			'The prayer of the day is followed by a required commemoration of the season (de Tempore), which is not yet in this edition.',
		day: (where: string) =>
			`${where} requires a commemoration of the season (de Tempore) that is not yet in this edition. The other commemoration is omitted: Saint Petronilla, Virgin`,
		mass: 'this Mass',
		conventual: 'a sung conventual Mass',
		low: 'low',
		sung: 'sung'
	}
} as const;

async function as(page: Page, form: 'lecta' | 'cantu') {
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

async function uniqueAddresses(page: Page) {
	const ids = await page.locator('main [id]').evaluateAll((nodes) => nodes.map((n) => n.id));
	expect(new Set(ids).size).toBe(ids.length);
}

for (const language of ['pl', 'en'] as const) {
	const text = TEXT[language];

	test(`${language} a low Mass of the Queenship makes St Petronilla's commemoration`, async ({
		page
	}) => {
		await as(page, 'lecta');
		await page.goto(`/app/${language}/ordo/catechumenorum?${DAY}`);
		await expect(page.locator(`[id="${QUEEN}-collecta.w001"]`)).toBeVisible();
		await expect(page.locator(`[id="${PETRONILLA[0]}.w001"]`)).toHaveCount(1);
		await expect(page.locator('.commemoration-head .mark')).toHaveText(text.head);
		await expect(
			page.locator(`.commemoration-head a.part-title[href*="sancta-petronilla"]`)
		).toHaveCount(1);
		await expect(page.locator('.variant-head, .variants-note, .unavailable-note')).toHaveCount(0);
		expect(await order(page, [`${QUEEN}-collecta.w001`, `${PETRONILLA[0]}.w001`])).toEqual([
			`${QUEEN}-collecta.w001`,
			`${PETRONILLA[0]}.w001`
		]);
		await page.goto(`/app/${language}/ordo/offertorium?${DAY}`);
		await expect(page.locator(`[id="${PETRONILLA[1]}.w001"]`)).toHaveCount(1);
		// RG 480–481: the Mass's Secret is not the last and ends quietly; St Petronilla's ends aloud.
		await expect(page.locator('.quiet-note')).toHaveCount(1);
		await expect(page.locator(`.quiet [id="${QUEEN}-secreta.w037"]`)).toHaveCount(1);
		await expect(page.locator(`.quiet [id="${QUEEN}-secreta.w041"]`)).toHaveCount(1);
		await expect(page.locator(`.quiet [id="${PETRONILLA[1]}.w037"]`)).toHaveCount(0);
		await expect(page.locator(`.quiet [id="${PETRONILLA[1]}.w041"]`)).toHaveCount(0);
		await page.goto(`/app/${language}/ordo/conclusio?${DAY}`);
		await expect(page.locator(`[id="${PETRONILLA[2]}.w001"]`)).toHaveCount(1);
		await expect(page.locator('.commemoration-head .mark')).toHaveText(text.head);
		await expect(page.locator('.picker .state.commemoration-unavailable')).toHaveCount(0);
	});

	test(`${language} a sung Mass of the Queenship describes the conventual and the other`, async ({
		page
	}) => {
		await as(page, 'cantu');
		await page.goto(`/app/${language}/ordo/catechumenorum?${DAY}`);
		await expect(page.locator(`[id="${QUEEN}-collecta.w001"]`)).toBeVisible();
		const collect = part(page, `${QUEEN}-collecta.w001`);
		await expect(collect.locator('.variants-note')).toHaveText(text.variants);
		await expect(collect.locator('.variant-head')).toHaveText(text.situations);
		expect(
			await order(page, [
				`${QUEEN}-collecta.w001`,
				`${PETRONILLA[0]}.w001`,
				`${QUEEN}-collecta${OTHER}.w001`
			])
		).toEqual([
			`${QUEEN}-collecta.w001`,
			`${PETRONILLA[0]}.w001`,
			`${QUEEN}-collecta${OTHER}.w001`
		]);
		// One commemoration, in the conventual sequence only, and one introduction before both.
		await expect(collect.locator('.commemoration-head')).toHaveCount(1);
		await expect(collect.locator('[id="aufer-a-nobis~collecta-introductio.w001"]')).toHaveCount(1);
		await uniqueAddresses(page);

		await page.goto(`/app/${language}/ordo/offertorium?${DAY}`);
		const secret = part(page, `${QUEEN}-secreta.w001`);
		await expect(secret.locator('.variant-head')).toHaveText(text.situations);
		// Only the conventual sequence has a Secret that is not the last.
		await expect(secret.locator('.quiet-note')).toHaveCount(1);
		await expect(page.locator(`.quiet [id="${QUEEN}-secreta.w041"]`)).toHaveCount(1);
		await expect(page.locator(`[id="${QUEEN}-secreta${OTHER}.w041"]`)).toHaveCount(1);
		await expect(page.locator(`.quiet [id="${QUEEN}-secreta${OTHER}.w041"]`)).toHaveCount(0);
		await expect(page.locator(`.quiet [id="${PETRONILLA[1]}.w041"]`)).toHaveCount(0);
		await uniqueAddresses(page);

		// The low/sung control selects again and never keeps the other form's sequence.
		await page.getByRole('radio', { name: new RegExp(`${text.low}$`) }).click();
		await expect(secret.locator('.variant-head')).toHaveCount(0);
		await expect(page.locator(`[id="${QUEEN}-secreta${OTHER}.w001"]`)).toHaveCount(0);
		await expect(page.locator(`[id="${PETRONILLA[1]}.w001"]`)).toHaveCount(1);
	});

	test(`${language} a required commemoration this edition lacks is announced, never shown as none`, async ({
		page
	}) => {
		await as(page, 'lecta');
		await page.goto(`/app/${language}/ordo/catechumenorum?${MARKED}`);
		await expect(page.locator(`[id="${QUEEN}-collecta.w001"]`)).toBeVisible();
		await expect(page.locator('.picker .state.commemoration-unavailable')).toHaveText(
			text.day(text.mass)
		);
		await expect(part(page, `${QUEEN}-collecta.w001`).locator('.unavailable-note')).toHaveText(
			text.unavailable
		);
		await expect(page.locator(`[id="${PETRONILLA[0]}.w001"]`)).toHaveCount(0);
		await expect(page.locator('.commemoration-head')).toHaveCount(0);
		await expect(page.locator('.picker .state.commemoration-only')).toHaveCount(0);

		await page.goto(`/app/${language}/ordo/offertorium?${MARKED}`);
		// The Secret the missing commemoration brings follows the Mass's own, which ends quietly.
		await expect(page.locator('.quiet-note')).toHaveCount(1);
		await expect(page.locator(`.quiet [id="${QUEEN}-secreta.w041"]`)).toHaveCount(1);

		await page.getByRole('radio', { name: new RegExp(`${text.sung}$`) }).click();
		await expect(page.locator('.picker .state.commemoration-unavailable')).toHaveText(
			text.day(text.conventual)
		);
		const secret = part(page, `${QUEEN}-secreta.w001`);
		await expect(secret.locator('.variant-head')).toHaveText(text.situations);
		await expect(secret.locator('.unavailable-note')).toHaveCount(1);
		await expect(page.locator(`.quiet [id="${QUEEN}-secreta${OTHER}.w041"]`)).toHaveCount(0);
		await expect(page.locator(`[id="${PETRONILLA[1]}.w001"]`)).toHaveCount(0);
	});

	test(`${language} St Petronilla's commemoration page reads her three orations as one set`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/commemoratio/sancta-petronilla`);
		await expect(page.locator('h1[lang="la"]')).toHaveText('S. Petronillæ Virginis');
		await expect(page.locator('.subtitle')).toHaveText(text.title);
		await expect(page.locator('.proper-part')).toHaveCount(3);
		for (const slug of PETRONILLA) await expect(page.locator(`[id="${slug}.w001"]`)).toHaveCount(1);
	});
}

test('an ordinary commemoration is not announced where its day is impeded or unrepresented', async ({
	page
}) => {
	// Trinity Sunday: the Mass is in this edition and St Petronilla gives way to it.
	await page.goto('/app/pl/ordo/catechumenorum?dies=2026-05-31');
	await expect(page.locator('[id="sanctissimae-trinitatis-collecta.w001"]')).toBeVisible();
	await expect(page.locator(`[id="${PETRONILLA[0]}.w001"]`)).toHaveCount(0);
	await expect(page.locator('.picker .state.commemoration-only')).toHaveCount(0);
	// Wednesday of the Pentecost octave: no Mass in this edition, and an ordinary commemoration
	// has no published decision there, so it is not announced as falling on the day.
	await page.goto('/app/pl/ordo/catechumenorum?dies=2034-05-31');
	await expect(page.locator('.day-open')).toHaveAttribute('aria-busy', 'false');
	await expect(page.locator('#day-value')).toHaveText('bez dostępnego formularza');
	await expect(page.locator('.picker .state.commemoration-only')).toHaveCount(0);
	// The Ordinary chosen alone on St Mark's day: its Mass is in this edition, so no notice says
	// that the Mass of the day is missing.
	await page.goto('/app/pl/ordo/catechumenorum?dies=2026-04-25&missa=none');
	await expect(page.locator('.day-open')).toHaveAttribute('aria-busy', 'false');
	await expect(page.locator('#day-value')).toHaveText('bez formularza');
	await expect(page.locator('.picker .state.commemoration-only')).toHaveCount(0);
	// The privileged Greater Litanies on a date without a Mass are still announced.
	await page.goto('/app/pl/ordo/catechumenorum?dies=2030-04-25');
	await expect(page.locator('.picker .state.commemoration-only')).toContainText('Litanie Większe');
});
