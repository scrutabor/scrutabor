// The educational surfaces around the reading view: lemma pages,
// grammar-concept pages, and the landing.
import { atRoute, expect, test } from './fixtures';
import { CATALOG } from '../src/lib/catalog';

test('lemma page shows head, senses, derivatives and concordance', async ({ page }) => {
	await page.goto('/pl/lemma/panis');
	await expect(page.locator('h1')).toHaveText('panis');
	await expect(page.locator('.head')).toContainText('panis, panis');
	await expect(page.locator('.head')).toContainText('m.');
	await expect(page.locator('.pos')).toHaveText('rzeczownik, deklinacja III');
	await expect(page.locator('.senses')).toHaveText('chleb');
	await expect(page.locator('.derivatives')).toContainText('kompan, kompania');
	await expect(page.locator('a[href="/pl/orationes/pater-noster?w=w022"]')).toHaveText('Panem');
});

test('the external dictionary link opens in a new tab', async ({ page }) => {
	await page.goto('/pl/lemma/oro');
	const logeion = page.locator('.external a');
	await expect(logeion).toHaveAttribute('href', 'https://logeion.uchicago.edu/oro');
	await expect(logeion).toHaveAttribute('target', '_blank');
	await expect(logeion).toHaveAttribute('rel', /noopener/);
});

test('the lemma page displays its liturgical headword', async ({ page }) => {
	// the key is bare and normalized (Ioannes); the reader sees it accented
	await page.goto('/pl/lemma/Ioannes');
	await expect(page.locator('h1')).toHaveText('Ioánnes');
});

test('grammatica index lists the concept tranche in groups', async ({ page }) => {
	await page.goto('/pl/grammatica');
	await expect(page.locator('.card')).toHaveCount(11);
	await expect(page.locator('h2', { hasText: 'przypadki' })).toBeVisible();
	await expect(page.locator('a[href="/pl/grammatica/ablativus"]')).toBeVisible();
});

test('a page one level down names its parent without renaming the book', async ({ page }) => {
	// The corner held ONE link, the way back — so the grammar pages, whose
	// way back is their own index, relabelled it, and on those pages the
	// book appeared to have been renamed "gramatyka" (owner, 2026-08-07).
	// The name of the book is not a navigation control and does not move.
	await page.goto('/pl/grammatica/nominativus');
	const trail = page.locator('nav .trail');
	await expect(trail.locator('li')).toHaveCount(2);
	await expect(trail.locator('a').first()).toHaveText('scrutabor');
	await expect(trail.locator('a').first()).toHaveAttribute('href', '/pl');
	await expect(trail.locator('a').nth(1)).toHaveText('gramatyka');

	// the second crumb is the way up, and one level up there is only the book
	await trail.locator('a').nth(1).click();
	await expect(page).toHaveURL(atRoute('/pl/grammatica'));
	await expect(page.locator('nav .trail li')).toHaveCount(1);
	await expect(page.locator('nav .trail a')).toHaveText('scrutabor');
});

test('a concept example deep-links into the prayer', async ({ page }) => {
	await page.goto('/en/grammatica/deponens');
	await expect(page.locator('h1')).toHaveText('deponent');
	await expect(page.locator('.latin-name')).toHaveText('verbum deponens');
	await page.locator('a[href="/en/ordinarium/confiteor?w=w001"]').click();
	await expect(page.locator('aside .form')).toHaveText('Confíteor');
	await expect(page.locator('.word.selected')).toBeInViewport();
});

test('landing shows the catalog and a quiet grammar link', async ({ page }) => {
	await page.goto('/pl');
	// exactly the catalog, nothing dropped and nothing invented
	const texts = CATALOG.flatMap((s) => s.texts);
	// the cards are the texts and nothing else — the flow is not one of them
	await expect(page.locator('.card')).toHaveCount(texts.length);
	for (const t of texts) {
		await expect(page.locator(`.card[href="/pl/${t.category}/${t.slug}"]`)).toContainText(t.title);
	}
	await expect(page.locator('a[href="/pl/grammatica"]')).toBeVisible();
	await expect(page.locator('.motto')).toContainText('scrutabor legem tuam');
});

test('lemma page shows the headword pronunciation', async ({ page }) => {
	await page.goto('/pl/lemma/oro');
	await expect(page.locator('.pron')).toContainText('o-ro');
	await expect(page.locator('.pron')).toContainText('/ˈɔ.rɔ/');
});

test('pronuntiatio page carries the rules and links into the prayers', async ({ page }) => {
	await page.goto('/pl/grammatica/pronuntiatio');
	await expect(page.locator('h1')).toHaveText('wymowa');
	await expect(page.locator('table').first()).toContainText('cælis');
	await page.locator('a[href="/pl/orationes/pater-noster?w=w006"]').click();
	await expect(page.locator('aside .form')).toHaveText('cælis');
});

test('the 404 page speaks both languages, English first @online', async ({ page }) => {
	await page.goto('/404');
	await expect(page.locator('.status')).toHaveText('404');
	const lines = page.locator('.line');
	await expect(lines).toHaveCount(2);
	await expect(lines.first()).toContainText('This page does not exist.');
	await expect(lines.last()).toContainText('Ta strona nie istnieje.');
	await expect(page.locator('a[href="/en"]')).toBeVisible();
	await expect(page.locator('a[href="/pl"]')).toBeVisible();
});

test('pages carry canonical and hreflang alternates without query strings', async ({ page }) => {
	await page.goto('/pl/orationes/pater-noster?w=w008');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'https://scrutabor.org/pl/orationes/pater-noster'
	);
	await expect(page.locator('link[hreflang="en"]')).toHaveAttribute(
		'href',
		'https://scrutabor.org/en/orationes/pater-noster'
	);
	await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute(
		'href',
		'https://scrutabor.org/en/orationes/pater-noster'
	);
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		'content',
		/Pater noster — tekst łaciński/
	);
});

test('the sitemap lists both languages of every surface', async ({ request }) => {
	const res = await request.get('/sitemap.xml');
	expect(res.status()).toBe(200);
	const xml = await res.text();
	expect(xml).toContain('<loc>https://scrutabor.org/pl/orationes/pater-noster</loc>');
	expect(xml).toContain('<loc>https://scrutabor.org/en/lemma/oro</loc>');
	expect(xml).toContain('<loc>https://scrutabor.org/en/grammatica/pronuntiatio</loc>');
	expect(xml).not.toContain('/404');
});

test('the edition page explains the sources and carries the working label', async ({ page }) => {
	await page.goto('/pl/editio');
	await expect(page.locator('h1')).toHaveText('o wydaniu');
	await expect(page.locator('.what a[href*="whitakers-words"]')).toHaveAttribute(
		'target',
		'_blank'
	);
	await expect(page.locator('main')).toContainText('wydaniem roboczym');
	// the landing's quiet label links here; reading pages no longer carry it
	await page.goto('/pl');
	await page.locator('.working a').click();
	await expect(page).toHaveURL(atRoute('/pl/editio'));
	await page.goto('/pl/ordinarium/credo');
	await expect(page.locator('.subtitle')).not.toContainText('robocze');
});

test('the provenance sources are clickable', async ({ page }) => {
	await page.goto('/pl/orationes/pater-noster?w=w001');
	const meta = page.locator('aside .meta');
	await expect(meta.locator('a[href="/pl/editio"]')).toHaveText('opracowanie');
	await expect(meta.locator('a[href*="whitakers-words"]')).toHaveAttribute('target', '_blank');
	await expect(meta.locator('a[href*="collatinus"]')).toHaveAttribute('rel', /noopener/);
});
