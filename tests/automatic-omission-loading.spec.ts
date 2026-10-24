import { expect, noWordInTheAddress, test } from './fixtures';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };

test.use({ serviceWorkers: 'block' });
const MASS = 'dominica-i-adventus';
const COLLECT = `${MASS}-collecta.w001`;
const sorted = [...formularies.formularies].sort((left, right) => left.order - right.order);
const pack = String(Math.floor(sorted.findIndex((row) => row.id === MASS) / 5) + 1).padStart(
	2,
	'0'
);

for (const lang of ['pl', 'en'] as const) {
	test(`${lang} an omitted-word deep link stays provisional until its real payload arrives @online`, async ({
		page
	}) => {
		let release!: () => void;
		let requested!: () => void;
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		const arrived = new Promise<void>((resolve) => {
			requested = resolve;
		});
		const pattern = `**/artifacts/proprium/${lang}/pack-${pack}.json*`;
		await page.route(pattern, async (route) => {
			requested();
			await held;
			await route.continue();
		});
		try {
			await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-11-29&w=gloria.w001`);
			await arrived;
			await expect(page.locator('main')).toHaveAttribute('aria-busy', 'true');
			await expect(page.locator('section.part.omitted')).toHaveCount(0);
			await expect(page.locator('[id="gloria.w001"]')).toHaveCount(1);
			await expect(page).toHaveURL(/w=gloria\.w001/);
			release();
			await expect(page.locator(`[id="${COLLECT}"]`)).toBeVisible();
			await expect(page.locator('section.part.omitted')).toHaveCount(1);
			await expect(page.locator('[id="gloria.w001"]')).toHaveCount(0);
			await expect(page.getByRole('dialog')).toHaveCount(0);
			await noWordInTheAddress(page);
		} finally {
			release();
			await page.unroute(pattern);
		}
	});

	for (const fault of ['http', 'language', 'mass'] as const) {
		test(`${lang} ${fault}: failure cannot hide Gloria, and actual retry recovers omission @online`, async ({
			page
		}) => {
			const pattern = `**/artifacts/proprium/${lang}/pack-${pack}.json*`;
			await page.route(pattern, async (route) => {
				if (fault === 'http') return route.fulfill({ status: 503, body: 'unavailable' });
				const response = await route.fetch();
				const value = await response.json();
				if (fault === 'language') value.days[MASS].lang = lang === 'pl' ? 'en' : 'pl';
				else value.days[MASS].day = 'dominica-iii-post-pascha';
				await route.fulfill({ response, json: value });
			});
			await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-11-29`);
			await expect(page.locator('.picker .state')).toContainText(
				lang === 'pl' ? 'nie udało' : 'could not'
			);
			await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
			await expect(page.locator(`[id="${COLLECT}"]`)).toHaveCount(0);
			await expect(page.locator('[id="gloria.w001"]')).toHaveCount(1);
			await expect(page.locator('section.part.omitted')).toHaveCount(0);
			await page.unroute(pattern);
			await page.locator('.day-open').click();
			await page
				.getByRole('dialog')
				.getByRole('button', {
					name: lang === 'pl' ? 'Otwórz formularz' : 'Open formulary',
					exact: true
				})
				.click();
			await expect(page.locator(`[id="${COLLECT}"]`)).toBeVisible();
			await expect(page.locator('[id="gloria.w001"]')).toHaveCount(0);
			await expect(page.locator('section.part.omitted')).toHaveCount(1);
		});
	}
}
