import { expect, setTheme, test } from './fixtures';

for (const language of ['pl', 'en'] as const) {
	test(`${language} bibliography wraps long source paths without losing their links`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/bibliographia`);
		const source = page.locator('li.source').filter({
			has: page.locator('cite', { hasText: 'Divinum Officium. Horae (Latine)' })
		});
		await source.locator('summary').click();
		const body = source.locator(
			'a.passage[href$="/web/www/horas/Latin/Commune/C3a-1.txt#L55-L57"]'
		);
		await expect(body).toHaveText(
			`Offertorium · Horae/Commune/C3a-1.txt · ${language === 'pl' ? 'w.' : 'lines'} 55–57`
		);
		const prayer = source.locator(
			'a.passage[href$="/web/www/horas/Latin/Psalterium/Common/Prayers.txt#L204-L206"]'
		);
		await expect(prayer).toHaveText(
			`Qui vivis · Horae/Psalterium/Common/Prayers.txt · ${language === 'pl' ? 'w.' : 'lines'} 204–206`
		);
		const edition = page.locator('li.source').filter({
			has: page.getByText('Biblia sacra juxta Vulgatam Clementinam', { exact: true })
		});
		const metadata = edition.locator('.edition-meta');
		await expect(metadata).toContainText('Michael Tweedale');
		await edition.locator('summary').click();
		const bible = edition.locator('a.locator');
		await expect(bible).toHaveAttribute(
			'href',
			'https://api.bitbucket.org/2.0/repositories/clementinetextproject/website/src/48da7dbf64990b44afb7fb809dc7e28bc119817f/htdocs/vulgata-2col.pdf#page=13'
		);
		await expect(body).toHaveAttribute('href', /\/44667ff518b8ff1439780470828b39714f5306a2\//);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ['light', 'dark'] as const) {
				await setTheme(page, theme);
				await page.evaluate(() => document.fonts.ready);
				// A constrained metadata box can still let a bibliographic field
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
				for (const locator of [body, prayer, bible]) {
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
			language === 'pl' ? 'Dokumenty objaśniające naukę Kościoła' : 'Documents on Church teaching'
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
		for (const [lemma, paragraph, anchor] of [
			['Iesus', '430', 'I.%20Iesus'],
			['Christus', '436', 'II.%20Christus']
		]) {
			const group = groups.filter({ has: page.locator(`a[href$="?l=${lemma}"]`) });
			await expect(group).toHaveCount(1);
			await expect(group.locator('.locator')).toContainText(paragraph);
			await expect(group.locator('.uses a')).toHaveCount(1);
			await expect(group.locator('.locator')).toHaveAttribute(
				'href',
				`https://www.vatican.va/archive/catechism_lt/p1s2c2a2_lt.htm#${anchor}`
			);
		}
		const prayerGroup = groups.filter({ hasText: '2851' });
		await expect(prayerGroup).toHaveCount(1);
		await expect(prayerGroup.locator('.locator')).toContainText('2854');
		await expect(prayerGroup.locator('.locator')).toHaveAttribute(
			'href',
			'https://www.vatican.va/archive/catechism_lt/p4s2a3_lt.htm#VII.%20%C2%AB%20Sed%20libera%20nos%20a%20Malo%20%C2%BB'
		);
		await expect(prayerGroup.locator('.uses a')).toHaveCount(2);
		await source.locator('a[href$="?l=Iesus"]').click();
		await expect(page.locator('h1')).toHaveText('Iesus');
		await expect(page.locator('.lexical-summary')).toBeVisible();
	});
}

test('English prayer books open the cited pages of their respective scans', async ({ page }) => {
	await page.goto('/app/en/bibliographia');
	const translations = page.locator('section[aria-labelledby="section-wording_witnesses"]');
	const family = translations.locator('li.source').filter({
		has: page.locator('cite', { hasText: 'The Family Prayer-Book' })
	});
	await family.locator('summary').click();
	const record =
		'https://commons.wikimedia.org/wiki/File:The_family_prayer-book,' +
		'_containing_all_the_public_and_private_devotions_in_use_amongst_' +
		'English_Catholics._(IA_TheFamilyPrayerBookContaining).pdf';
	const confession = family.getByRole('link', { name: /threefold confession of Christ/ });
	await expect(confession).toContainText('pp. 65–66 · PDF pp. 96–97');
	await expect(confession).toHaveAttribute('href', record + '?page=96');
	const addresses = await family
		.locator('a.locator')
		.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
	expect([...new Set(addresses)].sort()).toEqual(
		[33, 83, 96, 97, 109, 110, 250].map((leaf) => record + '?page=' + leaf).sort()
	);

	const guide = translations.locator('li.source').filter({
		has: page.locator('cite', { hasText: 'The Catholic Girl’s Guide' })
	});
	await guide.locator('summary').click();
	const holyName = guide.getByRole('link', { name: 'p. 544 · PDF p. 552', exact: true });
	await expect(holyName).toHaveCount(2);
	const scan = 'https://archive.org/download/catholicgirlsgui00lasa/catholicgirlsgui00lasa.pdf';
	for (const link of await holyName.all())
		await expect(link).toHaveAttribute('href', scan + '#page=552');
	await expect(guide.locator('a.locator:not([href^="' + scan + '#page="])')).toHaveCount(0);
});
