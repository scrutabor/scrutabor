import { atRoute, expect, setHelp, test } from './fixtures';
import type { Page } from '@playwright/test';

const cases = [
	{
		date: '2026-04-02',
		mass: 'feria-v-in-cena-domini',
		agnus: 'agnus-dei-in-cena-domini',
		omitted: ['qui-dixisti']
	},
	{
		date: '2026-04-04',
		mass: 'vigilia-paschalis',
		agnus: null,
		omitted: ['agnus-dei', 'qui-dixisti']
	}
] as const;
const part = (page: Page, id: string) => page.locator(`section.part[data-part="${id}"]`);
const reference = (lang: string) => (lang === 'pl' ? /wglądu/ : /reference only/);
async function prepare(page: Page, form = 'lecta') {
	await page.addInitScript((form) => {
		localStorage.setItem('scrutabor-role', 'sacerdos');
		localStorage.setItem('scrutabor-mass-form', form);
	}, form);
}
async function retained(page: Page) {
	for (const id of ['pax-domini', 'haec-commixtio', 'fili-dei-vivi', 'perceptio-corporis'])
		await expect(part(page, id).locator(`[id="${id}.w001"]`)).toBeVisible();
	await expect(part(page, 'pax-domini').locator('.word .base')).toHaveCount(9);
	await expect(part(page, 'pax-domini').locator('[id="pax-domini.w001"] .base')).toHaveText('Pax');
}
async function omitted(page: Page, id: string) {
	const section = part(page, id);
	await expect(section).toHaveClass(/\bomitted\b/);
	await expect(section.locator('.word')).toHaveCount(0);
	await expect(section.locator('.rubric')).toHaveCount(0);
	await expect(section.locator('button.unfold')).toHaveCount(0);
	await expect(section.locator('.part-title')).toHaveAttribute(
		'href',
		new RegExp(`/ordinarium/${id}(?:\\?|$)`)
	);
	return section;
}

for (const lang of ['pl', 'en'] as const)
	for (const host of ['', ' @static-host']) {
		for (const form of ['lecta', 'cantu'] as const)
			test(`${lang} ${form} Triduum has the received Agnus, omits the peace prayer and preserves the audible greeting @reader${host}`, async ({
				page,
				browserName
			}, testInfo) => {
				await prepare(page, form);
				for (const row of cases) {
					await page.goto(`/app/${lang}/ordo/communio?dies=${row.date}`);
					for (const mode of [0, 1, 2] as const) {
						await setHelp(page, mode);
						for (const id of row.omitted) await omitted(page, id);
						const peace = part(page, 'qui-dixisti').locator('.part-note').first();
						await expect(peace).toContainText('Pax Domini');
						await expect(peace).toContainText(lang === 'pl' ? 'pocałunek pokoju' : 'kiss of peace');
						await retained(page);
						if (row.agnus) {
							const agnus = part(page, 'agnus-dei');
							await expect(agnus.locator('.word .base')).toHaveCount(24);
							await expect(agnus.locator(`[id="${row.agnus}.w017"] .base`)).toHaveText('Agnus');
							await expect(agnus.locator(`[id="${row.agnus}.w023"] .base`)).toHaveText('miserére');
							await expect(agnus.locator(`[id="${row.agnus}.w024"] .base`)).toHaveText('nobis.');
							await expect(
								agnus.locator('.word .base').filter({ hasText: /^miserére$/ })
							).toHaveCount(3);
							await expect(agnus.locator('.part-title')).toHaveAttribute(
								'href',
								new RegExp(`/ordinarium/${row.agnus}$`)
							);
							await expect(agnus.locator('[id^="agnus-dei.w"]')).toHaveCount(0);
						}
					}
					if (form === 'lecta')
						await page.screenshot({
							path: testInfo.outputPath(`${lang}-${row.mass}.png`),
							fullPage: true
						});
					await page.emulateMedia({ media: 'print' });
					for (const id of row.omitted) {
						await expect(part(page, id).locator('.word')).toHaveCount(0);
						await expect(part(page, id).locator('.part-note').first()).toBeVisible();
					}
					await retained(page);
					if (browserName === 'chromium' && form === 'lecta')
						await page.pdf({
							path: testInfo.outputPath(`${lang}-${row.mass}.pdf`),
							format: 'A4',
							printBackground: true
						});
					await page.emulateMedia({ media: 'screen' });
					await page.goto(`/app/${lang}/ordo/communio?dies=${row.date}&missa=none`);
					await expect(part(page, 'agnus-dei').locator('[id^="agnus-dei.w"]')).toHaveCount(25);
					await expect(part(page, 'qui-dixisti').locator('[id="qui-dixisti.w001"]')).toBeVisible();
					await page.goto(`/app/${lang}/ordo/communio?dies=2026-04-05`);
					await expect(part(page, 'agnus-dei').locator('[id^="agnus-dei.w"]')).toHaveCount(25);
					await expect(part(page, 'qui-dixisti').locator('[id="qui-dixisti.w001"]')).toBeVisible();
				}
			});

		for (const row of cases)
			test(`${lang} ${row.mass} omitted citations lead to complete canonical study and preserve the dated return @reader${host}`, async ({
				page
			}) => {
				await prepare(page);
				for (const id of row.omitted)
					for (const query of [`w=${id}.w001`, `s=${id}.s02`]) {
						await page.goto(`/app/${lang}/ordo/communio?dies=${row.date}&${query}`);
						const source = page.url();
						await expect(page.getByRole('dialog')).toHaveCount(0);
						const section = await omitted(page, id);
						const link = section.locator('.part-title');
						const canonicalQuery = query.replace(`${id}.`, '');
						await expect(link).toHaveAttribute(
							'href',
							new RegExp(`/ordinarium/${id}\\?${canonicalQuery}$`)
						);
						await link.click();
						await expect(page).toHaveURL(
							atRoute(`/app/${lang}/ordinarium/${id}`, `?${canonicalQuery}`)
						);
						await expect(page.locator(`[id="w001"]`)).toBeVisible();
						if (query.startsWith('w=')) {
							await expect(page.getByRole('dialog')).toBeVisible();
							await page.keyboard.press('Escape');
						} else await expect(page.locator('.verse.segment-selected').first()).toBeVisible();
						await page.goBack();
						await expect(page).toHaveURL(source);
						await omitted(page, id);
					}
			});

		for (const row of cases)
			test(`${lang} ${row.mass} held and failed transport makes no settled omission claim and recovers @online @reader${host}`, async ({
				page
			}) => {
				await prepare(page);
				let release!: () => void;
				let requests = 0;
				const held = new Promise<void>((resolve) => {
					release = resolve;
				});
				const pattern = `**/artifacts/proprium/${lang}/pack-*.json*`;
				const hold = async (route: import('@playwright/test').Route) => {
					requests += 1;
					await held;
					await route.fulfill({ status: 503, body: 'unavailable' });
				};
				await page.route(pattern, hold);
				try {
					await page.goto(`/app/${lang}/ordo/communio?dies=${row.date}&w=qui-dixisti.w001`);
					await expect.poll(() => requests).toBeGreaterThan(0);
					await expect(page.locator('main')).toHaveAttribute('aria-busy', 'true');
					const peace = part(page, 'qui-dixisti');
					await expect(peace.locator('.part-note').first()).toContainText(reference(lang));
					await expect(peace.locator('[id="qui-dixisti.w001"]')).toBeVisible();
					await expect(peace).not.toHaveClass(/\bomitted\b/);
					const agnus = part(page, 'agnus-dei');
					await expect(agnus.locator('.part-note').first()).toContainText(reference(lang));
					await expect(agnus).not.toHaveClass(/\bomitted\b/);
					release();
					await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
					await expect(page.locator('.picker .state')).toContainText(
						lang === 'pl' ? /nie udało/ : /could/
					);
					await expect(peace.locator('.part-note').first()).toContainText(reference(lang));
					await expect(agnus.locator('.part-note').first()).toContainText(reference(lang));
					await page.unroute(pattern, hold);
					await page.evaluate(() =>
						window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
					);
					for (const id of row.omitted) await omitted(page, id);
					await expect(page.getByRole('dialog')).toHaveCount(0);
					await expect(page).toHaveURL(/w=qui-dixisti\.w001/);
					await retained(page);
				} finally {
					release();
					await page.unroute(pattern, hold);
				}
			});
	}
