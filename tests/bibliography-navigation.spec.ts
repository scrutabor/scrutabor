import { expect, test } from './fixtures';

for (const transport of ['', '@static-host '] as const) {
	for (const lang of ['pl', 'en'] as const) {
		test(`${transport}${lang}: bibliography opens a shared Proper at its canonical owner`, async ({
			page
		}) => {
			await page.goto(`/app/${lang}/bibliographia`);
			const section = page.locator('section[aria-labelledby="section-latin_textual_sources"]');
			const source = section.locator('li.source').filter({
				has: page.locator('cite', {
					hasText: /^Missale Romanum ex decreto SS\. Concilii Tridentini restitutum$/
				})
			});
			await source.locator('summary').click();
			const slug = 'dominica-iii-post-epiphaniam-offertorium';
			const link = source
				.locator(
					`.uses a[href="/app/${lang}/formularium/dominica-iii-post-epiphaniam#text-proprium-${slug}"]`
				)
				.first();
			await expect(link).toBeVisible();
			await link.click();
			await expect(page.locator(`#text-proprium-${slug}`)).toBeVisible();
			await expect(page.locator('.help')).toBeVisible();
			await expect(page).not.toHaveTitle(/^404/);
		});

		test(`${transport}${lang}: bibliography opens the exact Proper word card`, async ({ page }) => {
			await page.goto(`/app/${lang}/bibliographia`);
			const source = page
				.locator('section[aria-labelledby="section-latin_textual_sources"] li.source')
				.filter({
					has: page.locator('cite', {
						hasText: /^Missale Romanum ex decreto SS\. Concilii Tridentini restitutum$/
					})
				});
			await source.locator('summary').click();
			const slug = 'commemoratio-baptismatis-domini-collecta';
			const href = `/app/${lang}/formularium/commemoratio-baptismatis-domini?w=${slug}.w022#text-proprium-${slug}`;
			await source.locator(`.uses a[href="${href}"]`).first().click();
			const panel = page.locator('aside.panel[role="dialog"]');
			await expect(panel.locator('.form')).toHaveText(
				lang === 'en' ? 'Qui tecum vivit et regnat' : 'Qui'
			);
			if (lang === 'en')
				await expect(panel.locator('.construction-title')).toHaveText([
					'Qui',
					'tecum',
					'vivit',
					'et',
					'regnat'
				]);
			await page.keyboard.press('Escape');
			await expect(panel).toHaveCount(0);
			await expect(page.locator(`#text-proprium-${slug}`)).toBeVisible();
		});
	}

	test(`${transport}English bibliography opens a new Proper translation segment`, async ({
		page
	}) => {
		await page.goto('/app/en/bibliographia');
		const source = page.locator('li.source').filter({
			has: page.locator('cite', {
				hasText: /^The Missal for the Use of the Laity, new edition improved$/
			})
		});
		await source.locator('summary').click();
		const slug = 'feria-v-in-cena-domini-collecta';
		await source
			.locator(
				`.uses a[href="/app/en/formularium/feria-v-in-cena-domini?s=${slug}.s01#text-proprium-${slug}"]`
			)
			.click();
		await expect(page.locator(`[id="${slug}-s01"].segment-selected`)).toBeVisible();
		await expect(page.locator('.segment-selected')).toHaveCount(1);
	});

	test(`${transport}English bibliography preserves a Proper verse range`, async ({ page }) => {
		await page.goto('/app/en/bibliographia');
		const source = page.locator('li.source').filter({
			has: page.locator('cite', {
				hasText: /^The Missal for the Laity, According to the Use of the Holy Roman Church$/
			})
		});
		await source.locator('summary').click();
		const slug = 'dominica-i-adventus-alleluia';
		await source
			.locator(
				`.uses a[href="/app/en/formularium/dominica-i-adventus?s=${slug}.s02-s04#text-proprium-${slug}"]`
			)
			.click();
		const selected = page.locator('.segment-selected');
		await expect(selected).toHaveCount(3);
		expect(await selected.evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(
			['s02', 's03', 's04'].map((id) => `${slug}-${id}`)
		);
	});
}

for (const transport of ['', '@static-host '] as const) {
	for (const lang of ['pl', 'en'] as const) {
		test(`${transport}${lang}: a text-level source link does not claim complete printed coverage`, async ({
			page
		}) => {
			await page.goto(`/app/${lang}/bibliographia`);
			const source = page
				.locator('section[aria-labelledby="section-latin_textual_sources"] li.source')
				.filter({
					has: page.locator('cite', {
						hasText: /^Missale Romanum ex decreto SS\. Concilii Tridentini restitutum$/
					})
				});
			await source.locator('summary').click();
			const href = `/app/${lang}/formularium/dominica-ii-post-pascha#text-proprium-dominica-ii-post-pascha-collecta`;
			const use = source.locator('.uses li').filter({
				has: page.locator(`a[href="${href}"]`)
			});
			await expect(use).toHaveCount(1);
			await expect(use.locator('span')).toHaveText(lang === 'pl' ? '— tekst' : '— text');
			await use.locator('a').click();
			await expect(page.locator('#text-proprium-dominica-ii-post-pascha-collecta')).toBeVisible();
		});
	}
}
