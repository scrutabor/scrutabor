// A delayed or invalid proper must not select an unrelated announcement word.
import { expect, noWordInTheAddress, test } from './fixtures';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };

test.use({ serviceWorkers: 'block' });
const DAY = 'dominica-iii-post-pascha';
const READING = `${DAY}-epistola`;
const FORMULA = `lectio-epistolae-beati-petri-apostoli~epistola-annuntiatio~${READING}.w001`;
const sorted = [...formularies.formularies].sort((a, b) => a.order - b.order);
const pack = String(Math.floor(sorted.findIndex((f) => f.id === DAY) / 5) + 1).padStart(2, '0');

for (const lang of ['pl', 'en'] as const) {
	test(`${lang} delayed announcement deep link selects its own word and returns focus @online`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
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
			await page.goto(
				`/app/${lang}/ordo/catechumenorum?dies=2026-04-26&w=${encodeURIComponent(FORMULA)}`
			);
			await arrived;
			await expect(page.locator('main')).toHaveAttribute('aria-busy', 'true');
			await expect(page.locator(`[id="${FORMULA}"]`)).toHaveCount(0);
			await expect(page.locator(`[id="${READING}.w001"]`)).toHaveCount(0);
			await expect(page.getByRole('dialog')).toHaveCount(0);
			release();
			const formula = page.locator(`[id="${FORMULA}"]`);
			await expect(formula).toBeVisible();
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('header h2.form')).toHaveText('Léctio');
			await expect(dialog.locator('.head > a')).toHaveAttribute(
				'href',
				`/app/${lang}/lemma?l=lectio`
			);
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
			await expect(formula).toBeFocused();
		} finally {
			release();
			await page.unroute(pattern);
		}
	});

	for (const fault of ['http', 'language', 'mass', 'delivery'] as const) {
		test(`${lang} ${fault}: an unavailable proper exposes neither announcement nor stale reading @online`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
			const pattern = `**/artifacts/proprium/${lang}/pack-${pack}.json*`;
			let broken = true;
			await page.route(pattern, async (route) => {
				if (!broken) return route.continue();
				if (fault === 'http') return route.fulfill({ status: 503, body: 'unavailable' });
				const response = await route.fetch();
				const value = await response.json();
				if (fault === 'language') value.days[DAY].lang = lang === 'pl' ? 'en' : 'pl';
				else if (fault === 'mass') value.days[DAY].day = 'dominica-in-albis';
				else {
					const gospel = value.days[DAY].parts.find(
						(part: { part: string }) => part.part === 'evangelium'
					);
					const verse = gospel.doc.segments.find((s: { type: string }) => s.type === 'verse');
					verse.delivery.cantu.speaker = 'schola';
				}
				await route.fulfill({ response, json: value });
			});
			await page.goto(
				`/app/${lang}/ordo/catechumenorum?dies=2026-04-26&w=${encodeURIComponent(FORMULA)}`
			);
			await expect(page.locator('.picker .state')).toContainText(
				lang === 'pl' ? 'nie udało' : 'could not'
			);
			await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
			await expect(
				page.locator(
					'[id*="~epistola-annuntiatio~"], [id*="~evangelium-annuntiatio~"], [id*="~evangelium-salutatio~"]'
				)
			).toHaveCount(0);
			await expect(page.locator(`[id="${READING}.w001"]`)).toHaveCount(0);
			await expect(page.locator('.reading-reference')).toHaveCount(0);
			await expect(page.getByRole('dialog')).toHaveCount(0);
			// Fixed prayer openers are not reading announcements and remain usable.
			await expect(
				page.locator('[id="praefatio-dialogus~collecta-introductio.w001"]')
			).toBeVisible();
			// Same choice, now healthy: the real picker must retry, not treat the
			// failed selection as a settled body. This deliberately dispatches the
			// picker's history-entry seam without changing the selected date/Mass.
			broken = false;
			await page.evaluate(() =>
				window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
			);
			const formula = page.locator(`[id="${FORMULA}"]`);
			await expect(formula).toBeVisible();
			await expect(page.locator(`[id="${READING}.w001"]`)).toBeVisible();
			await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('header h2.form')).toHaveText('Léctio');
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
			await noWordInTheAddress(page);
			await expect(formula).toBeFocused();
		});
	}
}
