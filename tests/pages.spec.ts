// The educational surfaces around the reading view: lemma pages,
// grammar-concept pages, and the landing.
import pkg from '../package.json' with { type: 'json' };
import { atRoute, expect, offlineUrl, test } from './fixtures';
import { CATALOG } from '../src/lib/catalog';

test('lemma page shows head, senses, derivatives and concordance', async ({ page }) => {
	await page.goto('/app/pl/lemma/panis');
	await expect(page.locator('h1')).toHaveText('panis');
	await expect(page.locator('.head')).toContainText('panis, panis');
	await expect(page.locator('.head')).toContainText('m.');
	await expect(page.locator('[aria-labelledby="lemma-entry-label"]')).toContainText('chleb');
	await expect(page.locator('.grammar')).toHaveText('rzeczownik, deklinacja III');
	await expect(page.locator('.derivatives')).toContainText('kompan, kompania');
	await expect(page.locator('a[href="/app/pl/orationes/pater-noster?w=w022"]')).toHaveText('Panem');
});

test('lemma summary shares the word panel hierarchy without becoming a panel', async ({ page }) => {
	await page.goto('/app/pl/lemma/scrutor');
	const identity = page.locator('main > .identity');
	await expect(identity.locator('h1')).toHaveText('scrutor');
	await expect(identity.locator('.pron')).toContainText('/ˈskru.tɔr/');
	await expect(page.locator('.lexical-summary .layer-label')).toHaveText([
		'hasło',
		'gramatyka',
		'w polszczyźnie'
	]);
	await expect(page.locator('.lexical-summary .head')).toContainText(
		'scrutor, scrutári, scrutátus sum — badać, przeszukiwać, dociekać'
	);
	await expect(page.locator('aside')).toHaveCount(0);
	const summary = await page.locator('.lexical-summary').evaluate((element) => {
		const style = getComputedStyle(element);
		const rows = [...element.querySelectorAll('.layer')];
		const labels = rows.map((row) => row.querySelector('.layer-label')!.getBoundingClientRect());
		const bodies = rows.map((row) => row.querySelector('.layer-body')!.getBoundingClientRect());
		return {
			background: style.backgroundColor,
			pageBackground: getComputedStyle(document.body).backgroundColor,
			labelRights: labels.map((label) => label.right),
			bodyLefts: bodies.map((body) => body.left)
		};
	});
	expect(summary.background).not.toBe(summary.pageBackground);
	expect(new Set(summary.bodyLefts).size).toBe(1);
	for (const labelRight of summary.labelRights) {
		expect(labelRight).toBeLessThanOrEqual(summary.bodyLefts[0]);
	}
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

test('a global lemma note does not pretend that a verse is present', async ({ page }) => {
	await page.goto('/app/pl/lemma/intellectus');
	await expect(page.locator('.note')).toHaveText(
		'Od intellégere — rozumieć, pojmować, rozeznawać.'
	);
	await expect(page.locator('.note')).not.toContainText('w tym wersecie');

	await page.goto('/app/pl/psalmi/118-he?w=w014');
	await expect(page.locator('aside .function')).toContainText(
		'psalmista prosi Boga o dar zrozumienia'
	);
});

test('grammatica index lists the concept tranche in groups', async ({ page }) => {
	await page.goto('/app/pl/grammatica');
	await expect(page.locator('.card')).toHaveCount(11);
	await expect(page.locator('h2', { hasText: 'przypadki' })).toBeVisible();
	await expect(page.locator('a[href="/app/pl/grammatica/ablativus"]')).toBeVisible();
});

test('the prayer-book trail uses one stable local home', async ({ page }) => {
	// The corner held ONE link, the way back — so the grammar pages, whose
	// way back is their own index, relabelled it, and on those pages the
	// book appeared to have been renamed "gramatyka" (owner, 2026-08-07).
	// The name of the book is not a navigation control and does not move.
	await page.goto('/app/pl/grammatica/nominativus');
	const trail = page.locator('nav .trail');
	await expect(trail.locator('li')).toHaveCount(2);
	await expect(trail.locator('a.home')).toHaveAttribute('href', '/app/pl');
	await expect(trail.locator('a.home')).toHaveAttribute('aria-label', 'strona główna modlitewnika');
	await expect(trail.locator('a').last()).toHaveText('gramatyka');

	// The last crumb is the way up; one level up only local home remains.
	await trail.locator('a').last().click();
	await expect(page).toHaveURL(atRoute('/app/pl/grammatica'));
	await expect(page.locator('nav .trail li')).toHaveCount(1);
	await expect(page.locator('nav .trail a.home')).toHaveAttribute('href', '/app/pl');

	// The Ordo's movements are the other page one level down, and they used
	// a device of their own for it — a centred link under the nav — so the
	// same question was answered two ways on two pages (owner, 2026-08-07).
	// One device now, and this crumb declares its language: it is Latin in
	// a Polish interface, and the Polish typography sweep decides what a
	// line is governed by from the nearest [lang].
	await page.goto('/app/pl/ordo/offertorium');
	const ordo = page.locator('nav .trail');
	await expect(ordo.locator('li')).toHaveCount(2);
	await expect(ordo.locator('a').last()).toHaveText('Ordo Missæ');
	await expect(ordo.locator('a').last()).toHaveAttribute('lang', 'la');
	// …and RENDERS in one case, whatever case it is written in. small-caps
	// shrinks lowercase letters and leaves capitals at full height, so the
	// O and the M of "Ordo Missæ" stood over small letters and the crumb
	// read as though it were set larger than "scrutabor" (owner,
	// 2026-08-07 — it is not: both compute to 13.6px). The DOM keeps the
	// proper name; only the paint is lowercased.
	expect(await ordo.locator('a').last().innerText()).toBe('ordo missæ');
	await ordo.locator('a').last().click();
	await expect(page).toHaveURL(atRoute('/app/pl/ordo'));
});

test('the home control keeps its place and centres every crumb', async ({ page }) => {
	const box = async (selector: string) => {
		const rect = await page.locator(selector).boundingBox();
		expect(rect).not.toBeNull();
		return rect!;
	};
	const centre = (rect: { y: number; height: number }) => rect.y + rect.height / 2;

	await page.goto('/app/pl/orationes/gloria-patri');
	const plainHome = await box('nav .trail a.home');

	for (const url of ['/app/pl/grammatica/nominativus', '/app/pl/ordo/offertorium']) {
		await page.goto(url);
		const home = await box('nav .trail a.home');
		const separator = await box('nav .trail .sep');
		const parent = await box('nav .trail li:nth-child(2) a');

		expect(home.x).toBeCloseTo(plainHome.x, 1);
		expect(home.y).toBeCloseTo(plainHome.y, 1);
		expect(Math.abs(centre(separator) - centre(home))).toBeLessThan(1);
		expect(Math.abs(centre(parent) - centre(home))).toBeLessThan(1);
	}
});

test('the home control opens the catalogue in every edition', async ({ page }) => {
	await page.goto('/app/pl/lemma/scrutor');
	const home = page.locator('nav .trail a.home');
	await expect(home).toHaveAttribute('href', '/app/pl');
	await home.click();
	await expect(page).toHaveURL(atRoute('/app/pl'));
	await expect(page.locator('.flow-title')).toHaveText('Ordo Missæ');
});

test('downloaded HTML points home before hydration', async ({ browser }, testInfo) => {
	test.skip(testInfo.project.name !== 'offline', 'the hosted HTML is covered by the shared test');
	const page = await browser.newPage({ javaScriptEnabled: false });
	const root = testInfo.config.configFile!.replace(/[/\\][^/\\]+$/, '');
	await page.goto(offlineUrl(root, '/app/pl/lemma/scrutor'));
	const home = page.locator('nav .trail a.home');
	expect(await home.evaluate((anchor) => (anchor as HTMLAnchorElement).href)).toMatch(
		/^file:\/\/.*\/build-offline\/app\/pl\.html$/
	);
	await home.click();
	await expect(page).toHaveURL(atRoute('/app/pl'));
	await page.close();
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

test('the catalog closes with a colophon naming the edition', async ({ page }) => {
	// Which copy is this, and the way home — on the book's front page,
	// never in the reading chrome. The version comes from the one source.
	await page.goto('/app/pl');
	const colophon = page.locator('.colophon');
	await expect(colophon).toContainText(`v${pkg.version}`);
	await expect(colophon.locator('a')).toHaveAttribute('href', '/pl');
});

test('the psalm page numbers its verses in the margin', async ({ page }) => {
	// The psalter prints its numbers and so do the witnesses ({118:33});
	// they ride in the speaker mark's column, quiet ink, He = vv. 33-40.
	await page.goto('/app/pl/psalmi/118-he');
	const nums = page.locator('.verse .mark');
	await expect(nums).toHaveCount(8);
	await expect(nums.first()).toHaveText('33');
	await expect(nums.last()).toHaveText('40');
});

test('a verse number cites its verse, and the citation is a place', async ({ page }) => {
	await page.goto('/app/pl/psalmi/118-he');
	// tapping the number writes ?v=; tapping again clears it
	await page.locator('#v34 .mark').click();
	await expect(page).toHaveURL(/\?v=34$/);
	await expect(page.locator('#v34 .mark')).toHaveAttribute('aria-pressed', 'true');
	await page.locator('#v34 .mark').click();
	await expect(page).not.toHaveURL(/v=/);
	// and arriving BY the citation opens on the verse it names
	await page.goto('/app/pl/psalmi/118-he?v=40');
	await expect(page.locator('#v40')).toBeInViewport();
	await expect(page.locator('#v40 .mark')).toHaveAttribute('aria-pressed', 'true');
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
	expect(xml).toContain('<loc>https://scrutabor.org/app/pl/orationes/angelus-domini</loc>');
	expect(xml).toContain('<loc>https://scrutabor.org/app/en/orationes/sub-tuum-praesidium</loc>');
	expect(xml).toContain('<loc>https://scrutabor.org/app/en/lemma/oro</loc>');
	expect(xml).toContain('<loc>https://scrutabor.org/app/en/grammatica/pronuntiatio</loc>');
	expect(xml).toContain('<loc>https://scrutabor.org/app/pl/bibliographia</loc>');
	expect(xml).not.toContain('/404');
});

test('the shared bibliography exposes exact sources and their uses', async ({ page }) => {
	await page.goto('/app/pl/bibliographia');
	await expect(page.locator('h1')).toHaveText('bibliografia');
	const missal = page.locator('section', { hasText: 'Missale Romanum (1962)' });
	await expect(missal).toContainText('Ritus servandus in celebratione Missae');
	const blessingUse = missal
		.locator('li', { hasText: 'rubric before Benedicat vos' })
		.getByRole('link', { name: 'Benedícat vos omnípotens Deus', exact: true });
	await expect(blessingUse).toHaveAttribute('href', /ordinarium\/benedictio(?:\.html)?#s01$/);
	await expect(page.getByRole('link', { name: '6, 3' })).toHaveAttribute('rel', /noopener/);

	const wujek = page.locator('section', {
		hasText: 'Biblia w przekładzie ks. Jakuba Wujka (1923)'
	});
	const namingVerse = wujek.locator('li', { hasText: 'Ps 118, 34' });
	await expect(namingVerse).toContainText('Ps 118, 34');
	await expect(
		namingVerse.getByRole('link', { name: 'Psalmus 118, HE', exact: true })
	).toHaveAttribute('href', /psalmi\/118-he(?:\.html)?#v34$/);
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
