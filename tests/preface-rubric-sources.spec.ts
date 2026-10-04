import { expect, test } from './fixtures';

const prefaces = [
	'apostolorum',
	'ascensionis',
	'beatae-mariae-virginis',
	'beatae-mariae-virginis-in-annuntiatione',
	'beatae-mariae-virginis-in-assumptione',
	'beatae-mariae-virginis-in-conceptione-immaculata',
	'beatae-mariae-virginis-in-nativitate',
	'beatae-mariae-virginis-in-transfixione',
	'beatae-mariae-virginis-in-visitatione',
	'communis',
	'd-n-iesu-christi-regis',
	'defunctorum',
	'epiphaniae',
	'nativitatis',
	'quadragesimae',
	'sacratissimi-cordis-iesu',
	'sanctae-crucis',
	'sancti-ioseph-in-festivitate',
	'sancti-ioseph-in-solemnitate',
	'sanctissimae-trinitatis',
	'spiritus-sancti'
] as const;

const rubricSource =
	'a[href="https://archive.org/details/missale-romanum-1962/page/n304/mode/1up"]';

for (const language of ['pl', 'en'] as const) {
	for (const width of [1280, 390]) {
		for (const slug of prefaces) {
			test(`${language} ${slug} cites the Preface hand rubric at ${width}px`, async ({ page }) => {
				await page.setViewportSize({ width, height: 844 });
				await page.goto(`/app/${language}/ordinarium/praefatio-${slug}`);
				await page
					.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
					.click();
				const notes = page.getByRole('dialog').locator('details.source-notes');
				await notes.locator('summary').click();
				const source = notes.locator(rubricSource);
				await expect(source).toHaveCount(1);
				await expect(source).toBeVisible();
				await expect(notes.locator('li').filter({ has: page.locator(rubricSource) })).toContainText(
					'p. 225'
				);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
				await page.keyboard.press('Escape');
				await expect(page.getByRole('dialog')).toHaveCount(0);
			});
		}
		for (const variant of ['in-die', 'in-nocte']) {
			test(`${language} Easter ${variant} does not claim the hand rubric at ${width}px`, async ({
				page
			}) => {
				await page.setViewportSize({ width, height: 844 });
				await page.goto(`/app/${language}/ordinarium/praefatio-paschalis-${variant}`);
				await page
					.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
					.click();
				const notes = page.getByRole('dialog').locator('details.source-notes');
				await notes.locator('summary').click();
				await expect(notes.locator(rubricSource)).toHaveCount(0);
				for (const leaf of [315, 316]) {
					await expect(
						notes.locator(
							`a[href="https://archive.org/details/missale-romanum-1962/page/n${leaf}/mode/1up"]`
						)
					).toHaveCount(1);
				}
			});
		}
	}
}
