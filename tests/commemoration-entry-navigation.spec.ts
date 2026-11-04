import { atRoute, expect, settled, test } from './fixtures';

const cases = [
	{
		date: '2026-04-25',
		mass: 'sancti-marci-evangelistae',
		movement: 'offertorium',
		slug: 'dominica-i-passionis-secreta',
		selectedWord: 'w001',
		owner: 'commemoratio/litaniae-maiores',
		title: 'Litaniæ maiores'
	},
	{
		date: '2027-05-31',
		mass: 'beata-maria-virgo-regina',
		movement: 'offertorium',
		slug: 'sanctae-petronillae-secreta',
		selectedWord: 'w003',
		groupForms: ['Accépta', 'tibi', 'sit'],
		owner: 'commemoratio/sancta-petronilla',
		title: 'S. Petronillæ Virginis'
	},
	{
		date: '2043-11-01',
		mass: 'omnium-sanctorum',
		movement: 'offertorium',
		slug: 'dominica-iv-post-epiphaniam-secreta',
		selectedWord: 'w001',
		owner: 'formularium/dominica-iv-quae-superfuit-post-epiphaniam',
		title: 'Dominica IV quæ superfuit post Epiphaniam'
	},
	{
		date: '2030-09-08',
		mass: 'dominica-xiii-post-pentecosten',
		movement: 'conclusio',
		slug: 'visitatio-beatae-mariae-virginis-postcommunio',
		selectedWord: 'w001',
		owner: 'formularium/nativitas-beatae-mariae-virginis',
		title: 'In Nativitate Beatæ Mariæ Virginis'
	}
];

for (const lang of ['pl', 'en'] as const)
	for (const form of ['lecta', 'cantu'] as const)
		for (const row of cases)
			test(`${lang} ${form} ${row.date}: commemoration entry and card keep their own context`, async ({
				page
			}) => {
				await page.addInitScript((form) => {
					localStorage.setItem('scrutabor-role', 'sacerdos');
					localStorage.setItem('scrutabor-help', '1');
					localStorage.setItem('scrutabor-mass-form', form);
				}, form);
				await page.goto(`/app/${lang}/ordo/${row.movement}?dies=${row.date}&missa=${row.mass}`);
				const href = `/app/${lang}/${row.owner}#text-proprium-${row.slug}`;
				const link = page.locator('.commemoration-head a.part-title');
				await expect(link).toHaveCount(1);
				await expect(link).toHaveAttribute('href', href);
				// The explicit Mass is this date's default: wait for the existing URL normalization.
				await expect(page).toHaveURL(new RegExp(`/ordo/${row.movement}\\?dies=${row.date}$`));
				const source = page.url();
				await link.click();
				await expect(page.locator('h1[lang="la"]')).toHaveText(row.title);
				await expect(page.locator(`[id="text-proprium-${row.slug}"]`)).toHaveCount(1);
				await expect(page).not.toHaveURL(/[?&](dies|missa)=/);
				await page.locator(`[id="${row.slug}.w001"]`).click();
				await expect(page.getByRole('dialog')).toBeVisible();
				if (row.groupForms) {
					await expect(page.getByRole('dialog').locator('.construction-title')).toHaveText(
						row.groupForms
					);
				}
				await expect(page).toHaveURL(
					atRoute(
						`/app/${lang}/${row.owner}`,
						`?w=${row.slug}.${row.selectedWord}#text-proprium-${row.slug}`
					)
				);
				await page.keyboard.press('Escape');
				await expect(page.getByRole('dialog')).not.toBeVisible();
				await expect(page).toHaveURL(new RegExp(`${row.owner}#text-proprium-${row.slug}$`));
				await page.goBack();
				await expect(page).toHaveURL(source);
				await expect(page.locator('.commemoration-head a.part-title')).toHaveAttribute(
					'href',
					href
				);
			});

for (const lang of ['pl', 'en'] as const)
	test(`${lang}: canonical source word still opens its Mass owner`, async ({ page }) => {
		await page.goto(
			`/app/${lang}/formularium/dominica-i-passionis?w=dominica-i-passionis-secreta.w001#text-proprium-dominica-i-passionis-secreta`
		);
		await expect(page.locator('h1[lang="la"]')).toHaveText('Dominica I Passionis');
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page).toHaveURL(
			/formularium\/dominica-i-passionis\?w=dominica-i-passionis-secreta\.w001/
		);
	});

// A full-document link can show its static text before the new runtime is
// ready. One real word activation must survive that interval, rather than
// relying on a second click after hydration.
test.describe('a word intent during document boot', () => {
	test.use({ serviceWorkers: 'block' });
	for (const host of ['', ' @static-host'])
		for (const activation of [
			'pointer',
			'keyboard',
			'deep link',
			'navigation',
			'history',
			'escape'
		] as const) {
			test(
				`the first word activation after a commemoration link survives hydration: ${activation} @online${host}`,
				{ tag: '@reader' },
				async ({ page }) => {
					await page.addInitScript(() => {
						localStorage.setItem('scrutabor-role', 'sacerdos');
						localStorage.setItem('scrutabor-help', '1');
						localStorage.setItem('scrutabor-mass-form', 'lecta');
					});
					await page.goto('/app/en/ordo/conclusio?dies=2030-09-08');
					const source = page.url();
					let release!: () => void;
					const held = new Promise<void>((resolve) => {
						release = resolve;
					});
					let requests = 0;
					const hold = async (route: import('@playwright/test').Route) => {
						requests += 1;
						await held;
						await route.continue();
					};
					await page.route('**/*.js', hold);
					const entry = page.locator('.commemoration-head a.part-title');
					if (activation === 'deep link')
						await entry.evaluate((link) => {
							const url = new URL((link as HTMLAnchorElement).href);
							url.searchParams.set('w', 'visitatio-beatae-mariae-virginis-postcommunio.w001');
							(link as HTMLAnchorElement).href = url.href;
						});
					const navigation = entry.click();
					try {
						await expect(page.locator('h1[lang="la"]')).toHaveText(
							'In Nativitate Beatæ Mariæ Virginis'
						);
						await expect.poll(() => requests).toBeGreaterThan(0);
						await expect(page.locator('html')).not.toHaveAttribute('data-hydrated', 'true');
						const first = page.locator('[id="visitatio-beatae-mariae-virginis-postcommunio.w001"]');
						if (activation === 'keyboard') {
							await first.focus();
							await first.press('Enter');
						} else await first.click();
						if (activation === 'escape') await page.keyboard.press('Escape');
						if (activation === 'history') {
							await page.goBack();
							await expect(page).toHaveURL(source);
						}
						if (activation === 'navigation') {
							await page.locator('a[href="/app/en/formularium/exaltatio-sanctae-crucis"]').click();
							await expect(page).toHaveURL(/formularium\/exaltatio-sanctae-crucis$/);
						}
						release();
						await navigation;
						await settled(page);
						if (
							activation === 'navigation' ||
							activation === 'history' ||
							activation === 'escape'
						) {
							await expect(page.getByRole('dialog')).toHaveCount(0);
							await expect(page).not.toHaveURL(/[?&]w=/);
							return;
						}
						await expect(page.getByRole('dialog')).toBeVisible();
						await expect(page.locator('aside .form')).toHaveText('Súmpsimus');
						await expect(page).toHaveURL(
							/\?w=visitatio-beatae-mariae-virginis-postcommunio\.w001#text-proprium-visitatio-beatae-mariae-virginis-postcommunio$/
						);
						await page.keyboard.press('Escape');
						await expect(page.getByRole('dialog')).not.toBeVisible();
						await expect(page).not.toHaveURL(/[?&]w=/);
						await page.goBack();
						await expect(page).toHaveURL(source);
					} finally {
						release();
						await navigation;
						await page.unroute('**/*.js', hold);
					}
				}
			);
		}
});
