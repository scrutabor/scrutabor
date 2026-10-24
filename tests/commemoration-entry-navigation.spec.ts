import { atRoute, expect, test } from './fixtures';

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
