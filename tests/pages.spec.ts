// The educational surfaces around the reading view: lemma pages,
// grammar-concept pages, and the landing.
import { atRoute, expect, test } from './fixtures';
import { CATALOG } from '../src/lib/catalog';

test('lemma page shows head, senses, derivatives and concordance', async ({ page }) => {
	await page.goto('/app/pl/lemma/panis');
	await expect(page.locator('h1')).toHaveText('panis');
	await expect(page.locator('.head')).toContainText('panis, panis');
	await expect(page.locator('.head')).toContainText('m.');
	await expect(page.locator('.pos')).toHaveText('rzeczownik, deklinacja III');
	await expect(page.locator('.senses')).toHaveText('chleb');
	await expect(page.locator('.derivatives')).toContainText('kompan, kompania');
	await expect(page.locator('a[href="/app/pl/orationes/pater-noster?w=w022"]')).toHaveText('Panem');
});

test('the external dictionary link opens in a new tab', async ({ page }) => {
	await page.goto('/app/pl/lemma/oro');
	const logeion = page.locator('.external a');
	await expect(logeion).toHaveAttribute('href', 'https://logeion.uchicago.edu/oro');
	await expect(logeion).toHaveAttribute('target', '_blank');
	await expect(logeion).toHaveAttribute('rel', /noopener/);
});

test('the lemma page displays its liturgical headword', async ({ page }) => {
	// the key is bare and normalized (Ioannes); the reader sees it accented
	await page.goto('/app/pl/lemma/Ioannes');
	await expect(page.locator('h1')).toHaveText('Ioánnes');
});

test('grammatica index lists the concept tranche in groups', async ({ page }) => {
	await page.goto('/app/pl/grammatica');
	await expect(page.locator('.card')).toHaveCount(11);
	await expect(page.locator('h2', { hasText: 'przypadki' })).toBeVisible();
	await expect(page.locator('a[href="/app/pl/grammatica/ablativus"]')).toBeVisible();
});

test('a page one level down names its parent without renaming the book', async ({ page }) => {
	// The corner held ONE link, the way back — so the grammar pages, whose
	// way back is their own index, relabelled it, and on those pages the
	// book appeared to have been renamed "gramatyka" (owner, 2026-08-07).
	// The name of the book is not a navigation control and does not move.
	await page.goto('/app/pl/grammatica/nominativus');
	const trail = page.locator('nav .trail');
	await expect(trail.locator('li')).toHaveCount(2);
	await expect(trail.locator('a').first()).toHaveText('scrutabor');
	await expect(trail.locator('a').first()).toHaveAttribute('href', '/app/pl');
	await expect(trail.locator('a').nth(1)).toHaveText('gramatyka');

	// the second crumb is the way up, and one level up there is only the book
	await trail.locator('a').nth(1).click();
	await expect(page).toHaveURL(atRoute('/app/pl/grammatica'));
	await expect(page.locator('nav .trail li')).toHaveCount(1);
	await expect(page.locator('nav .trail a')).toHaveText('scrutabor');

	// The Ordo's movements are the other page one level down, and they used
	// a device of their own for it — a centred link under the nav — so the
	// same question was answered two ways on two pages (owner, 2026-08-07).
	// One device now, and this crumb declares its language: it is Latin in
	// a Polish interface, and the Polish typography sweep decides what a
	// line is governed by from the nearest [lang].
	await page.goto('/app/pl/ordo/offertorium');
	const ordo = page.locator('nav .trail');
	await expect(ordo.locator('li')).toHaveCount(2);
	await expect(ordo.locator('a').nth(1)).toHaveText('Ordo Missæ');
	await expect(ordo.locator('a').nth(1)).toHaveAttribute('lang', 'la');
	// …and RENDERS in one case, whatever case it is written in. small-caps
	// shrinks lowercase letters and leaves capitals at full height, so the
	// O and the M of "Ordo Missæ" stood over small letters and the crumb
	// read as though it were set larger than "scrutabor" (owner,
	// 2026-08-07 — it is not: both compute to 13.6px). The DOM keeps the
	// proper name; only the paint is lowercased.
	expect(await ordo.locator('a').nth(1).innerText()).toBe('ordo missæ');
	await ordo.locator('a').nth(1).click();
	await expect(page).toHaveURL(atRoute('/app/pl/ordo'));
});

test('every kind of page opens on the same line', async ({ page }) => {
	// The chrome is shared and the spacing under it was not. The Ordo's
	// movements held their h1 0.2rem below the nav instead of the 1.8rem
	// every other page takes, because the centred link that used to sit
	// between them supplied the difference — so removing that link left the
	// title 3px under the settings row while five other page kinds sat at
	// 29. A distance that is a fact about a DELETED element is exactly the
	// kind of drift this catches.
	const gaps: Record<string, number> = {};
	for (const url of [
		'/app/pl/ordo', // an index
		'/app/pl/ordo/offertorium', // the flow
		'/app/pl/ordinarium/credo', // a reading page
		'/app/pl/grammatica/nominativus', // one level down
		'/app/pl/lemma/mater', // a lemma
		'/app/pl/editio' // the colophon
	]) {
		await page.goto(url);
		gaps[url] = await page.evaluate(() => {
			const nav = document.querySelector('nav')!.getBoundingClientRect();
			return Math.round(document.querySelector('h1')!.getBoundingClientRect().top - nav.bottom);
		});
	}
	expect(
		new Set(Object.values(gaps)).size,
		`the pages open differently: ${JSON.stringify(gaps)}`
	).toBe(1);
});

test('a concept example deep-links into the prayer', async ({ page }) => {
	await page.goto('/app/en/grammatica/deponens');
	await expect(page.locator('h1')).toHaveText('deponent');
	await expect(page.locator('.latin-name')).toHaveText('verbum deponens');
	await page.locator('a[href="/app/en/ordinarium/confiteor?w=w001"]').click();
	await expect(page.locator('aside .form')).toHaveText('Confíteor');
	await expect(page.locator('.word.selected')).toBeInViewport();
});

test('landing shows the catalog and a quiet grammar link', async ({ page }) => {
	await page.goto('/app/pl');
	// exactly the catalog, nothing dropped and nothing invented
	const texts = CATALOG.flatMap((s) => s.texts);
	// the cards are the texts and nothing else — the flow is not one of them
	await expect(page.locator('.card')).toHaveCount(texts.length);
	for (const t of texts) {
		await expect(page.locator(`.card[href="/app/pl/${t.category}/${t.slug}"]`)).toContainText(
			t.title
		);
	}
	await expect(page.locator('a[href="/app/pl/grammatica"]')).toBeVisible();
	await expect(page.locator('.motto')).toContainText('scrutabor legem tuam');
});

test('lemma page shows the headword pronunciation', async ({ page }) => {
	await page.goto('/app/pl/lemma/oro');
	await expect(page.locator('.pron')).toContainText('o-ro');
	await expect(page.locator('.pron')).toContainText('/ˈɔ.rɔ/');
});

test('pronuntiatio page carries the rules and links into the prayers', async ({ page }) => {
	await page.goto('/app/pl/grammatica/pronuntiatio');
	await expect(page.locator('h1')).toHaveText('wymowa');
	await expect(page.locator('table').first()).toContainText('cælis');
	await page.locator('a[href="/app/pl/orationes/pater-noster?w=w006"]').click();
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
	await page.goto('/app/pl/orationes/pater-noster?w=w008');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'https://scrutabor.org/app/pl/orationes/pater-noster'
	);
	await expect(page.locator('link[hreflang="en"]')).toHaveAttribute(
		'href',
		'https://scrutabor.org/app/en/orationes/pater-noster'
	);
	await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute(
		'href',
		'https://scrutabor.org/app/en/orationes/pater-noster'
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
	// two families of surface: the landing pages at the origin root, and the
	// book under /app
	expect(xml).toContain('<loc>https://scrutabor.org/pl</loc>');
	expect(xml).toContain('<loc>https://scrutabor.org/en/privacy</loc>');
	expect(xml).toContain('<loc>https://scrutabor.org/app/pl/orationes/pater-noster</loc>');
	expect(xml).toContain('<loc>https://scrutabor.org/app/en/lemma/oro</loc>');
	expect(xml).toContain('<loc>https://scrutabor.org/app/en/grammatica/pronuntiatio</loc>');
	expect(xml).not.toContain('/404');
});

test('the edition page explains the sources and carries the working label', async ({ page }) => {
	await page.goto('/app/pl/editio');
	await expect(page.locator('h1')).toHaveText('o wydaniu');
	await expect(page.locator('.what a[href*="whitakers-words"]')).toHaveAttribute(
		'target',
		'_blank'
	);
	await expect(page.locator('main')).toContainText('wydaniem roboczym');
	// the landing's quiet label links here; reading pages no longer carry it
	await page.goto('/app/pl');
	await page.locator('.working a').click();
	await expect(page).toHaveURL(atRoute('/app/pl/editio'));
	await page.goto('/app/pl/ordinarium/credo');
	await expect(page.locator('.subtitle')).not.toContainText('robocze');
});

test('the provenance sources are clickable', async ({ page }) => {
	await page.goto('/app/pl/orationes/pater-noster?w=w001');
	const meta = page.locator('aside .meta');
	await expect(meta.locator('a[href="/app/pl/editio"]')).toHaveText('opracowanie');
	await expect(meta.locator('a[href*="whitakers-words"]')).toHaveAttribute('target', '_blank');
	await expect(meta.locator('a[href*="collatinus"]')).toHaveAttribute('rel', /noopener/);
});
