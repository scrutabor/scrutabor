import type { Page } from '@playwright/test';
import { expect, setHelp, test } from './fixtures';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };

const cases = [
	['2026-11-29', 'dominica-i-adventus', true, false],
	['2026-04-26', 'dominica-iii-post-pascha', false, false],
	['2026-03-29', 'dominica-ii-passionis', true, false],
	['2026-04-02', 'feria-v-in-cena-domini', false, true],
	['2026-04-04', 'vigilia-paschalis', false, true],
	['2026-05-23', 'vigilia-pentecostes', false, true],
	['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum', true, true],
	['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum-missa-ii', true, true],
	['2026-11-02', 'commemoratio-omnium-fidelium-defunctorum-missa-iii', true, true],
	['2025-12-24', 'vigilia-nativitatis', true, true],
	['2028-12-24', 'vigilia-nativitatis', true, false],
	['2027-07-26', 'sanctae-annae-matris-beatae-mariae-virginis', false, true],
	['2026-11-09', 'dedicatio-archibasilicae-sanctissimi-salvatoris', false, false]
] as const;

async function expectBodies(page: Page, gloria: boolean, credo: boolean) {
	await expect(page.locator('section.part.omitted')).toHaveCount(Number(gloria) + Number(credo));
	for (const [part, omitted] of [
		['gloria', gloria],
		['credo', credo]
	] as const) {
		await expect(page.locator(`[id="${part}.w001"]`)).toHaveCount(omitted ? 0 : 1);
		if (omitted) {
			const section = page.locator('section.part.omitted').filter({
				has: page.locator('.part-title', {
					hasText: part === 'gloria' ? /^Glória in excélsis$/ : /^Credo$/
				})
			});
			await expect(section).toHaveCount(1);
			await expect(section.locator('.part-note')).toHaveCount(1);
			await expect(
				section.locator('.word, .part-text, .verse, .translation, .who, .unfold')
			).toHaveCount(0);
		}
	}
}

for (const lang of ['pl', 'en'] as const) {
	for (const [date, mass, gloria, credo] of cases) {
		test(`${lang} ${date}/${mass}: exact Ordinary omissions survive print`, async ({ page }) => {
			const form = formularies.formularies.find((row) => row.id === mass)!;
			const collect = form.components.find((part) => part.role === 'collecta')!.text.split('/')[1];
			await page.goto(`/app/${lang}/ordo/catechumenorum?dies=${date}&missa=${mass}`);
			await expect(page.locator(`[id="${collect}.w001"]`)).toBeVisible();
			await setHelp(page, 2);
			await expectBodies(page, gloria, credo);
			await page.emulateMedia({ media: 'print' });
			await expectBodies(page, gloria, credo);
			for (const note of await page.locator('section.part.omitted .part-note').all())
				await expect(note).toBeVisible();
		});
	}

	test(`${lang} role, Mass form and reading mode do not change a settled omission`, async ({
		page
	}) => {
		await page.setViewportSize({ width: 375, height: 900 });
		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-04-02`);
		await expect(page.locator('[id="feria-v-in-cena-domini-collecta.w001"]')).toBeVisible();
		const forms = lang === 'pl' ? ['śpiewana', 'cicha'] : ['sung', 'low'];
		const roles =
			lang === 'pl' ? ['wierni', 'usługujący', 'kapłan'] : ['faithful', 'server', 'priest'];
		for (const form of forms) {
			await page.getByRole('radio', { name: form, exact: true }).click();
			for (const role of roles) {
				await page.getByRole('radio', { name: role, exact: true }).click();
				for (const level of [0, 1, 2] as const) {
					await setHelp(page, level);
					await expectBodies(page, false, true);
				}
			}
		}
		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-04-02&missa=none`);
		await expect(page.locator('.day-open')).toHaveAttribute('aria-busy', 'false');
		await expectBodies(page, false, false);
		await page.goto(`/app/${lang}/ordinarium/credo`);
		await expect(page.locator('[id="w001"]')).toHaveCount(1);
		await expect(page.locator('section.part.omitted')).toHaveCount(0);
	});
}
