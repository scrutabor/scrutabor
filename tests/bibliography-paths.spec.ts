import { expect, setTheme, test } from './fixtures';

for (const language of ['pl', 'en'] as const) {
	test(`${language} bibliography wraps long source paths without losing their links`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/bibliographia`);
		const source = page.locator('li.source').filter({
			has: page.locator('cite', { hasText: 'Divinum Officium: Horae, Latin data' })
		});
		await source.locator('summary').click();
		const body = source.locator('a[href$="/web/www/horas/Latin/Commune/C3a-1.txt"]');
		await expect(body).toBeVisible();
		await expect(body).toContainText('heading 55, reference 56, body 57');
		const prayer = source.locator('a[href$="/web/www/horas/Latin/Psalterium/Common/Prayers.txt"]');
		await expect(prayer).toHaveCount(1);
		const edition = page.locator('li.source').filter({
			has: page.locator('cite', { hasText: 'Biblia Sacra juxta Vulgatam Clementinam' })
		});
		const metadata = edition.locator('.edition-meta');
		await expect(metadata).toContainText('48da7dbf64990b44afb7fb809dc7e28bc119817f');
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ['light', 'dark'] as const) {
				await setTheme(page, theme);
				await page.evaluate(() => document.fonts.ready);
				// A constrained metadata box can still let an unbroken revision
				// escape. Check actual text fragments, not only its wrapper.
				const fragments = await metadata.evaluate((element) => {
					const range = document.createRange();
					range.selectNodeContents(element);
					return Array.from(range.getClientRects(), ({ left, right }) => ({ left, right }));
				});
				expect(fragments.length).toBeGreaterThan(0);
				for (const fragment of fragments) {
					expect(fragment.left).toBeGreaterThanOrEqual(0);
					expect(fragment.right).toBeLessThanOrEqual(width);
				}
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
				for (const locator of [body, prayer]) {
					await locator.scrollIntoViewIfNeeded();
					await locator.focus();
					await expect(locator).toBeFocused();
					const bounds = await locator.boundingBox();
					expect(bounds).not.toBeNull();
					expect(bounds!.x).toBeGreaterThanOrEqual(0);
					expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
				}
			}
		}
	});

	test(`${language} bibliography identifies doctrinal context without merging its uses`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/bibliographia`);
		const section = page.locator(
			'section[aria-labelledby="section-official_documents_and_liturgical_history"]'
		);
		await expect(section.locator('header p')).toContainText(
			language === 'pl' ? 'Dokumenty objaśniające doktrynę' : 'Documents explaining doctrine'
		);
		const source = section.locator('li.source').filter({
			has: page.locator('cite', { hasText: 'Catechismus Catholicae Ecclesiae' })
		});
		await source.locator('summary').click();
		const groups = source.locator('.evidence-group');
		await expect(groups).toHaveCount(3);
		await expect(source.locator('.role')).toHaveText(
			Array(3).fill(
				language === 'pl'
					? 'kontekst doktrynalny lub liturgiczny'
					: 'doctrinal or liturgical context'
			)
		);
		for (const [lemma, paragraph] of [
			['Iesus', '430'],
			['Christus', '436']
		]) {
			const group = groups.filter({ has: page.locator(`a[href$="?l=${lemma}"]`) });
			await expect(group).toHaveCount(1);
			await expect(group.locator('.locator')).toContainText(paragraph);
			await expect(group.locator('.uses a')).toHaveCount(1);
			await expect(group.locator('.locator')).toHaveAttribute(
				'href',
				'https://www.vatican.va/archive/catechism_lt/p1s2c2a2_lt.htm'
			);
		}
		const prayerGroup = groups.filter({ hasText: '2851' });
		await expect(prayerGroup).toHaveCount(1);
		await expect(prayerGroup.locator('.locator')).toContainText('2854');
		await expect(prayerGroup.locator('.uses a')).toHaveCount(2);
		await source.locator('a[href$="?l=Iesus"]').click();
		await expect(page.locator('h1')).toHaveText('Iesus');
		await expect(page.locator('.lexical-summary')).toBeVisible();
	});
}
