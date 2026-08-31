// The educational surfaces around the reading view: lemma pages,
// grammar-concept pages, and the landing.
import pkg from '../package.json' with { type: 'json' };
import rootManifest from '../src/lib/data/manifest.json' with { type: 'json' };
import englishManifest from '../src/lib/data/languages/en/manifest.json' with { type: 'json' };
import polishManifest from '../src/lib/data/languages/pl/manifest.json' with { type: 'json' };
import { CATALOG_ORDER } from '../src/lib/catalog-order';
import { CONCEPTS } from '../src/lib/grammar';
import { atRoute, bare as bareTest, expect, offlineUrl, settled, test } from './fixtures';

const LATIN_TITLES = new Map(
	rootManifest.texts.map((text) => [text.id.replace('.', '/'), text.title])
);
const LANGUAGE_TITLES = {
	pl: new Map(polishManifest.texts.map((text) => [text.id.replace('.', '/'), text.title])),
	en: new Map(englishManifest.texts.map((text) => [text.id.replace('.', '/'), text.title]))
};

test('the catalogue becomes a balanced book spread from laptop width up', async ({ page }) => {
	const shape = async () =>
		page.evaluate(() => {
			const spread = document.querySelector('.catalog-spread')!.getBoundingClientRect();
			const hero = document.querySelector('.catalog-hero')!.getBoundingClientRect();
			const flow = document.querySelector('a.flow')!.getBoundingClientRect();
			const primary = document.querySelector('.catalog-primary')!.getBoundingClientRect();
			const secondary = document.querySelector('.catalog-secondary')!.getBoundingClientRect();
			const cards = [...document.querySelectorAll('.catalog-spread .card')].map((card) =>
				card.getBoundingClientRect()
			);
			return {
				spreadWidth: spread.width,
				heroTop: hero.top,
				// The way into the Mass stands above the spread, on its centre
				// line — not at the head of either column.
				flowBottom: flow.bottom,
				flowOffCentre: Math.abs((flow.left + flow.right) / 2 - (spread.left + spread.right) / 2),
				spreadTop: spread.top,
				primaryLeft: primary.left,
				secondaryLeft: secondary.left,
				primaryRight: primary.right,
				cardOverflow: cards.some(
					(card) => card.left < spread.left - 0.5 || card.right > spread.right + 0.5
				)
			};
		});

	// Below the breakpoint the columns stack, and nothing changes.
	await page.setViewportSize({ width: 1180, height: 1000 });
	await page.goto('/app/pl');
	const narrow = await shape();
	expect(narrow.secondaryLeft).toBeCloseTo(narrow.primaryLeft, 0);

	for (const width of [1280, 1512, 1920]) {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/app/pl');
		const wide = await shape();
		expect(wide.secondaryLeft).toBeGreaterThan(wide.primaryRight + 30);
		expect(wide.cardOverflow).toBe(false);
		expect(wide.flowBottom).toBeLessThanOrEqual(wide.spreadTop);
		expect(wide.flowOffCentre).toBeLessThan(1);
	}

	await page.setViewportSize({ width: 3840, height: 2160 });
	await page.goto('/app/pl');
	const fourK = await shape();
	expect(fourK.heroTop).toBeLessThan(120);
});

// The frame is the book's binding: a reader leaving a prayer for the index,
// the grammar or the bibliography must not watch the page change width. It
// drifted once already — four pages carried their own prose caps (30, 32, 34
// and 38rem) and the catalogue widened its own frame to 88rem — so the
// invariant is measured rather than remembered.
test('every page holds the same frame, and prose the same measure', async ({ page }) => {
	const ROUTES = [
		'/app/pl',
		'/app/pl/ordo',
		'/app/pl/orationes/pater-noster',
		'/app/pl/litaniae/lauretanae',
		'/app/pl/psalmi/118-he',
		'/app/pl/lemma/noster',
		'/app/pl/grammatica',
		'/app/pl/grammatica/vocativus',
		'/app/pl/grammatica/pronuntiatio',
		'/app/pl/editio',
		'/app/pl/bibliographia',
		'/app/pl/search'
	];
	await page.setViewportSize({ width: 1512, height: 1000 });

	const frames: Record<string, number> = {};
	const measures: Record<string, number> = {};
	for (const route of ROUTES) {
		await page.goto(route);
		const seen = await page.evaluate(() => {
			const el = document.querySelector('.page')!;
			const box = el.getBoundingClientRect();
			const cs = getComputedStyle(el);
			const prose = document.querySelector('main .what, main .spot, main .fine');
			return {
				frame: box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
				prose: prose ? prose.getBoundingClientRect().width : null
			};
		});
		frames[route] = Math.round(seen.frame);
		if (seen.prose !== null) measures[route] = Math.round(seen.prose);
	}

	const reference = frames['/app/pl/orationes/pater-noster'];
	expect(reference).toBeGreaterThan(700);
	for (const [route, width] of Object.entries(frames)) {
		expect(`${route}: ${width}`).toBe(`${route}: ${reference}`);
	}

	// Prose is narrower than the frame on purpose, but it is ONE width.
	const proseWidths = Object.values(measures);
	expect(proseWidths.length).toBeGreaterThan(2);
	for (const [route, width] of Object.entries(measures)) {
		expect(`${route}: ${width}`).toBe(`${route}: ${proseWidths[0]}`);
		expect(width).toBeLessThan(reference);
	}
});

test('the catalogue motto cites the psalm and opens it', async ({ page }) => {
	await page.goto('/app/pl');
	const cite = page.locator('.catalog-hero .motto-ref a');
	await expect(cite).toHaveAttribute('href', /psalmi\/118-he(?:\.html)?\?v=34$/);
	await cite.click();
	await expect(page).toHaveURL(atRoute('/app/pl/psalmi/118-he', '?v=34'));
	await expect(page.locator('h1')).toHaveText('Psalmus 118, HE');
});

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
	await expect(page.locator('aside .gloss')).toHaveText('zrozumienie');
	await expect(page.locator('aside .explanation')).toHaveCount(0);
});

test('grammatica index lists the concept tranche in groups', async ({ page }) => {
	await page.goto('/app/pl/grammatica');
	await expect(page.locator('h1')).toHaveText('Gramatyka');
	await expect(page.locator('.card')).toHaveCount(11);
	await expect(page.locator('h2', { hasText: 'przypadki' })).toBeVisible();
	await expect(page.locator('a[href="/app/pl/grammatica/ablativus"]')).toBeVisible();
	await expect(page.locator('a[href="/app/pl/grammatica/pronuntiatio"]')).toHaveText(
		/wymowa\s+pronuntiatio/
	);
});

test('reference-page titles consistently begin with a capital letter', async ({ page }) => {
	const routes = [
		'search',
		'grammatica',
		'grammatica/pronuntiatio',
		'bibliographia',
		'editio',
		...CONCEPTS.map((concept) => `grammatica/${concept.id}`)
	];
	for (const lang of ['pl', 'en'] as const) {
		for (const route of routes) {
			await page.goto(`/app/${lang}/${route}`);
			const heading = (await page.locator('h1').textContent())!.trim();
			const firstLetter = heading.match(/\p{L}/u)?.[0];
			expect(firstLetter, `${lang}/${route}: ${heading}`).toBe(
				firstLetter?.toLocaleUpperCase(lang)
			);
		}
	}
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
	await expect(trail.locator('a').last()).toHaveText('Gramatyka');

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

test('the downloaded copy is dressed before its script runs @folder', async ({
	browser
}, testInfo) => {
	// It replaced a test that read the prerendered HTML of a folder page, and
	// the folder has no prerendered pages any more. What is worth holding in
	// its place is the property that replaced it: the shell LINKS the one
	// stylesheet rather than letting the runtime inject it. Injected, the
	// document computes its styles twice — the browser's defaults, then ours —
	// and `body` carries a quarter second `color` transition for the theme
	// toggle, so every page in the copy opened by fading up from black. With
	// scripting off nothing can inject anything, which is exactly the state
	// that tells the two apart.
	const page = await browser.newPage({ javaScriptEnabled: false });
	const root = testInfo.config.configFile!.replace(/[/\\][^/\\]+$/, '');
	await page.goto(offlineUrl(root, '/app/pl'));
	const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
	expect(ground, 'the shell painted the browser default, not the book').toBe('rgb(247, 241, 230)');
	await page.close();
});

bareTest('a failed application chunk releases the stored-mode hold @online', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('scrutabor-help', '0'));
	await page.route('**/_app/immutable/**/*.js', (route) => route.abort());
	await page.goto('/app/pl/orationes/pater-noster');

	await expect(page.locator('html')).not.toHaveAttribute('data-hydrated', 'true');
	await expect(page.locator('main')).toContainText('Sanctificétur');
	await expect(page.locator('main')).toBeVisible({ timeout: 5_000 });
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
	await expect(page.locator('h1')).toHaveText('Deponent');
	await expect(page.locator('.latin-name')).toHaveText('verbum deponens');
	await page.locator('a[href="/app/en/ordinarium/confiteor?w=w001"]').click();
	await expect(page.locator('aside .form')).toHaveText('Confíteor');
	await expect(page.locator('.word.selected')).toBeInViewport();
});

test('landing shows the catalog and separates reference pages from edition status', async ({
	page
}) => {
	await page.goto('/app/pl');
	// exactly the catalog, nothing dropped and nothing invented
	const texts = CATALOG_ORDER.flatMap((section) =>
		section.texts.map((slug) => ({ category: section.category, slug }))
	);
	// the cards are the texts and nothing else — the flow is not one of them
	await expect(page.locator('.catalog-spread .card')).toHaveCount(texts.length);
	for (const t of texts) {
		const key = `${t.category}/${t.slug}`;
		await expect(page.locator(`.card[href="/app/pl/${t.category}/${t.slug}"]`)).toContainText(
			LATIN_TITLES.get(key)!
		);
	}
	const references = page.locator('.footer-links');
	await expect(references.locator('.footer-link')).toHaveCount(2);
	await expect(references.locator('.footer-arrow')).toHaveCount(0);
	await expect(references.locator('a[href="/app/pl/grammatica"]')).toContainText(
		'Pojęcia, składnia i wymowa'
	);
	await expect(references.locator('a[href="/app/pl/bibliographia"]')).toContainText(
		'Świadectwa tekstu, przekładu i kontekstu'
	);
	await expect(page.locator('.working')).toContainText(
		'Wydanie robocze przed przeglądem eksperckim'
	);
	const footerGeometry = await page.locator('.catalog-footer').evaluate((footer) => {
		const frame = footer.getBoundingClientRect();
		const links = [...footer.querySelectorAll('.footer-link')].map((link) =>
			link.getBoundingClientRect()
		);
		return {
			frameLeft: frame.left,
			frameRight: frame.right,
			firstLeft: links[0].left,
			lastRight: links.at(-1)!.right,
			widths: links.map((link) => link.width)
		};
	});
	expect(Math.abs(footerGeometry.firstLeft - footerGeometry.frameLeft)).toBeLessThanOrEqual(1);
	expect(Math.abs(footerGeometry.lastRight - footerGeometry.frameRight)).toBeLessThanOrEqual(1);
	expect(Math.abs(footerGeometry.widths[0] - footerGeometry.widths[1])).toBeLessThanOrEqual(1);
	const prayerTitleSize = await page
		.locator('.catalog-spread .card-title')
		.first()
		.evaluate((title) => getComputedStyle(title).fontSize);
	for (const link of await references.locator('.footer-link').all()) {
		const typography = await link.evaluate((element) => {
			const title = element.querySelector('.card-title')!;
			const note = element.querySelector('.hung-note')!;
			return {
				titleSize: getComputedStyle(title).fontSize,
				noteAlign: getComputedStyle(note).textAlign
			};
		});
		expect(typography.titleSize).toBe(prayerTitleSize);
		expect(typography.noteAlign).toBe('right');
	}
	await expect(page.locator('.motto')).toContainText('scrutabor legem tuam');

	await page.goto('/app/en');
	await expect(page.locator('.footer-links')).toContainText(
		'Grammar Concepts, syntax, and pronunciation'
	);
	await expect(page.locator('.footer-links')).toContainText(
		'Bibliography Textual, translation, and contextual witnesses'
	);
	await expect(page.locator('.working')).toContainText('Working edition awaiting expert review');
});

test('every reading names itself below its Latin title', async ({ page }) => {
	for (const section of CATALOG_ORDER) {
		for (const slug of section.texts) {
			const key = `${section.category}/${slug}`;
			for (const lang of ['pl', 'en'] as const) {
				await page.goto(`/app/${lang}/${section.category}/${slug}`);
				await expect(page.locator('header .subtitle')).toHaveText(
					LANGUAGE_TITLES[lang].get(key) ?? LATIN_TITLES.get(key)!
				);
				await expect(page.locator('header .subtitle')).not.toHaveText(section.label[lang]);
			}
		}
	}

	// Ordo movements already carry a useful, more specific structural label.
	await page.goto('/app/pl/ordo/praeparatio');
	await expect(page.locator('header .subtitle')).toHaveText('Modlitwy u stopni ołtarza');
});

test('lemma page shows the headword pronunciation', async ({ page }) => {
	await page.goto('/app/pl/lemma/oro');
	await expect(page.locator('.pron')).toContainText('o-ro');
	await expect(page.locator('.pron')).toContainText('/ˈɔ.rɔ/');
});

test('pronuntiatio page carries the rules and links into the prayers', async ({ page }) => {
	await page.goto('/app/pl/grammatica/pronuntiatio');
	await expect(page.locator('h1')).toHaveText('Wymowa');
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

test('the sitemap lists both languages of every surface @online', async ({ request }) => {
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

test('the audited bibliography groups sources by role and loads exact uses on disclosure', async ({
	page
}) => {
	await page.goto('/app/pl/bibliographia');
	await expect(page.locator('h1')).toHaveText('Bibliografia');
	await expect(page.locator('.source-section h2')).toHaveText([
		'Łacińskie świadectwa tekstu',
		'Świadectwa brzmienia przekładu',
		'Dokumenty urzędowe i historia liturgii',
		'Pismo Święte, język i opracowania'
	]);
	const firstHeading = await page.locator('.source-section h2').first().boundingBox();
	const firstNote = await page.locator('.source-section > header p').first().boundingBox();
	expect(firstHeading).not.toBeNull();
	expect(firstNote).not.toBeNull();
	expect(firstNote!.y - (firstHeading!.y + firstHeading!.height)).toBeGreaterThanOrEqual(10);
	const sources = page.locator('.source details');
	expect(await sources.count()).toBeGreaterThan(0);
	await expect(page.locator('.source details[open]')).toHaveCount(0);
	await expect(page.locator('main')).not.toContainText('Powściągliwość i Praca');
	await expect(page.locator('main')).not.toContainText('De musica sacra et sacra liturgia');

	const breviary = page
		.locator('.source-section')
		.filter({ has: page.getByRole('heading', { name: 'Łacińskie świadectwa tekstu' }) })
		.locator('details', {
			hasText: 'Breviarium Romanum ex decreto SS. Concilii Tridentini restitutum'
		});
	await expect(breviary.locator('.source-body')).not.toBeVisible();
	await breviary.locator('summary').click();
	await expect(breviary).toHaveAttribute('open', '');
	await expect(breviary.locator('.evidence-group').first()).toBeVisible();
	await expect(breviary.locator('.source-body')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
	await expect(breviary.locator('.evidence-group').first()).toHaveCSS(
		'background-color',
		'rgba(0, 0, 0, 0)'
	);
	await expect(breviary).toContainText('świadectwo tekstu łacińskiego');
	await expect(breviary).not.toContainText('zatwierdzonym wydaniu');
	await expect(
		breviary.getByRole('link', { name: 'Magnificat (Pieśń Maryi)' }).first()
	).toHaveAttribute('href', /orationes\/magnificat/);

	const compendium = page
		.locator('.source-section')
		.filter({ has: page.getByRole('heading', { name: 'Łacińskie świadectwa tekstu' }) })
		.locator('details', { hasText: 'Compendium of the Catechism of the Catholic Church' });
	await compendium.locator('summary').click();
	await expect(compendium).toContainText('świadectwo tekstu łacińskiego');
	await expect(compendium).not.toContainText('wydaniu urzędowym');

	const gazeta = page.locator('details', {
		hasText: 'Gazeta Kościelna, R. 9, nr 16'
	});
	await gazeta.locator('summary').click();
	await expect(gazeta).toContainText('druk. s. 167 · PDF s. 3');
	await expect(gazeta.getByRole('link', { name: /druk\. s\. 167/ })).toHaveAttribute(
		'href',
		/edition\/913560/
	);
	await expect(gazeta.getByRole('link', { name: 'Anioł Pański' })).toHaveAttribute(
		'href',
		/orationes\/angelus-domini\?s=s07-s08$/
	);

	await page.goto('/app/en/bibliographia');
	await expect(page.locator('h1')).toHaveText('Bibliography');
	await expect(page.locator('.latin-name')).toHaveCount(0);
	await expect(page.locator('.source-section h2')).toHaveText([
		'Latin textual witnesses',
		'Translation wording witnesses',
		'Official documents and liturgical history',
		'Scripture, language, and scholarship'
	]);
	await expect(page.locator('.source details[open]')).toHaveCount(0);
});

test('the edition page explains the sources and carries the working label', async ({ page }) => {
	await page.goto('/app/pl/editio');
	await expect(page.locator('h1')).toHaveText('O\u00a0wydaniu');
	await expect(page.locator('.latin-name')).toHaveCount(0);
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

test('no title outgrows the narrowest phone, at any print size', async ({ page }) => {
	// The knob scales the root, so a heading grows with the reader's choice
	// while the screen does not. At the largest print `Missa Catechumenórum`
	// was one 421px word in a 253px measure and took the page 135px sideways
	// with it — 43 of 205 surfaces did the same, and it is the large-print
	// reader who meets them, which is the reader the setting is for.
	await page.setViewportSize({ width: 320, height: 800 });
	await page.goto(`/app/en`);
	await settled(page);
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	// the longest title in the book, and the two other surfaces that carry a
	// heading of a different kind
	for (const path of [
		'/app/en/ordo/catechumenorum',
		'/app/pl/ordo/catechumenorum',
		'/app/en/ordo'
	]) {
		await page.goto(path);
		const measured = await page.evaluate(() => {
			const de = document.documentElement;
			const h = document.querySelector('h1')!;
			return { sideways: de.scrollWidth - de.clientWidth, over: h.scrollWidth - h.clientWidth };
		});
		expect(measured.over, `${path}: the title itself`).toBeLessThanOrEqual(0);
		expect(measured.sideways, `${path}: the page`).toBe(0);
	}
});
