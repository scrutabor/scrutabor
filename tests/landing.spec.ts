// The landing: the site's front door, and the acquisition surface the
// app stores will point at. It exists only on the served site — the
// downloaded folder is the book alone — so the whole file is @online.
// Its axe sweep lives with the others in a11y.spec.
import pkg from '../package.json' with { type: 'json' };
import type { Locator } from '@playwright/test';
import { atRoute, expect, test } from './fixtures';

async function analysisTree(locator: Locator) {
	return locator.evaluate((root) => {
		function serialize(node: Node): unknown {
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent?.replace(/\s+/g, ' ').trim();
				return text || null;
			}
			if (!(node instanceof Element)) return null;
			return {
				tag: node.tagName.toLowerCase(),
				attributes: Object.fromEntries(
					[...node.attributes]
						.map(({ name, value }) => [name, value] as const)
						.sort(([a], [b]) => a.localeCompare(b))
				),
				children: [...node.childNodes].map(serialize).filter((child) => child !== null)
			};
		}
		return serialize(root);
	});
}

test.describe('landing @online', () => {
	test('the CTA opens the book in the landing language', async ({ page }) => {
		await page.goto('/pl');
		await page.getByRole('link', { name: /Otwórz modlitewnik/ }).click();
		await page.waitForURL(atRoute('/app/pl'));
		// the catalog, alive — not merely a URL
		await expect(page.locator('.flow-title')).toHaveText('Ordo Missæ');
	});

	test('the language menu switches the landing, not the book', async ({ page }) => {
		await page.goto('/pl');
		await page.getByRole('button', { name: 'wybór języka' }).click();
		await page.locator('.menu ul a', { hasText: 'English' }).click();
		await page.waitForURL(atRoute('/en'));
		await expect(page.getByRole('link', { name: 'Open the prayer book' })).toBeVisible();
	});

	test('hreflang binds the two landings and the root', async ({ page, request }) => {
		for (const lang of ['pl', 'en']) {
			await page.goto(`/${lang}`);
			await expect(page.locator(`link[rel="canonical"]`)).toHaveAttribute(
				'href',
				`https://scrutabor.org/${lang}`
			);
			for (const l of ['pl', 'en']) {
				await expect(page.locator(`link[rel="alternate"][hreflang="${l}"]`)).toHaveAttribute(
					'href',
					`https://scrutabor.org/${l}`
				);
			}
			await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
				'href',
				'https://scrutabor.org/en'
			);
		}
		// the root router carries the pair too, for crawlers that land there
		const root = await (await request.get('/')).text();
		expect(root).toContain('hreflang="pl" href="https://scrutabor.org/pl"');
		expect(root).toContain('hreflang="en" href="https://scrutabor.org/en"');
	});

	test('the specimen is the book itself: the real control over the real verse', async ({
		page
	}) => {
		// Not a picture of the mechanism — the mechanism: psalmi.118-he's
		// verse 34 from the corpus, TextBody, and the same reading-mode
		// control a reading page carries.
		await page.goto('/pl');
		// by the level's identity, not its position: the display order is
		// łaciński · dwujęzyczny · interlinearny while the stored values keep meaning
		const radio = (level: number) => page.locator(`.specimen .help [data-level="${level}"]`);
		await expect(page.locator('.specimen .help .real')).toHaveText([
			'łaciński',
			'dwujęzyczny',
			'interlinearny'
		]);
		await expect(radio(1)).toHaveAttribute('aria-checked', 'true');
		// the real corpus text: liturgical accents, and the colon the
		// witnesses print where the brand motto prints a comma
		await expect(page.locator('.specimen')).toContainText('scrutábor');
		await expect(page.locator('.specimen')).toContainText('tuam:');
		// łaciński: bare
		await radio(0).click();
		await expect(page.locator('.specimen rt')).toHaveCount(0);
		// interlinearny: all fourteen glosses (the consecutive et as "a")
		await radio(1).click();
		await expect(page.locator('.specimen rt')).toHaveCount(14);
		await expect(page.locator('.specimen rt').nth(3)).toHaveText('a');
		// dwujęzyczny: the verse's own translation, the glosses yielding
		await radio(2).click();
		await expect(page.locator('.specimen .translation')).toContainText('Daj mi zrozumienie');
		await expect(page.locator('.specimen rt')).toHaveCount(0);

		await page.goto('/en');
		await expect(page.locator('.specimen .help .real')).toHaveText([
			'Latin',
			'bilingual',
			'interlinear'
		]);
		await page.locator('.specimen .help [data-level="2"]').click();
		await expect(page.locator('.specimen .translation')).toContainText('Give me understanding');
	});

	test('the analysis box stands open on scrutábor, and taps re-aim it', async ({ page }) => {
		await page.goto('/pl');
		// Pre-selected on the name-word: the app's actual WordPanel is
		// already in the page. Only its placement changes, so it has no close
		// button and does not overlay the verse.
		const panel = page.locator('aside.word-panel-inline');
		await expect(panel.locator('.form')).toHaveText('scrutábor');
		await expect(panel.locator('a[href="/app/pl/lemma/scrutor"]')).toBeVisible();
		await expect(panel.locator('.layer-label')).toHaveText(['hasło', 'forma']);
		await expect(panel.locator('.pronunciation-lead .pron')).toBeVisible();
		await expect(panel.locator('.close')).toHaveCount(0);
		expect(await panel.evaluate((el) => getComputedStyle(el).position)).toBe('static');
		// the tapped word carries the selection wash
		await expect(page.locator('#w016')).toHaveClass(/selected/);
		// a tap re-aims the box at another word
		await page.locator('#w017').click();
		await expect(panel.locator('.form')).toHaveText('legem');
	});

	test('the specimen grows downward without moving preceding content', async ({ page }) => {
		// The inline analysis varies substantially by word. It belongs to normal
		// document flow: content preceding it must stay anchored, while the footer
		// must follow its real height. Walk every word in both languages and at
		// both ends of the reading-size control rather than protecting only the
		// three forms that first exposed the movement on a tall monitor.
		await page.setViewportSize({ width: 3840, height: 2160 });
		for (const size of ['normal', 'largest']) {
			for (const lang of ['pl', 'en']) {
				await page.goto(`/${lang}`);
				await page.evaluate((step) => localStorage.setItem('scrutabor-reading', step), size);
				await page.reload();

				const ids = await page
					.locator('.specimen button[id^="w"]')
					.evaluateAll((words) => words.map((word) => word.id));
				expect(ids).toHaveLength(14);

				const readGeometry = () =>
					page.evaluate(() => {
						const top = (selector: string) =>
							document.querySelector(selector)!.getBoundingClientRect().top + scrollY;
						const specimen = top('.specimen');
						const panel = top('.word-panel-inline');
						const panelHeight = document
							.querySelector('.word-panel-inline')!
							.getBoundingClientRect().height;
						const footer = top('footer');
						return {
							title: top('main h1'),
							ways: top('.ways'),
							specimen: top('.specimen-section'),
							panel,
							panelHeight,
							panelOffset: panel - specimen,
							footer,
							footerAfterPanel: footer - panel - panelHeight,
							analysisHeight: document
								.querySelector('.word-panel-inline .inner')!
								.getBoundingClientRect().height
						};
					});

				const samples: Array<Record<string, number>> = [];
				for (const id of ids) {
					await page.locator(`#${id}`).click();
					samples.push(await readGeometry());
				}

				const spread = (rows: Array<Record<string, number>>, field: string) => {
					const values = rows.map((sample) => sample[field]);
					return Math.max(...values) - Math.min(...values);
				};
				expect(
					spread(samples, 'analysisHeight'),
					`${lang}/${size}: the test words did not exercise different analysis heights`
				).toBeGreaterThan(20);
				for (const anchor of ['title', 'ways', 'specimen', 'panel']) {
					expect(
						spread(samples, anchor),
						`${lang}/${size}: ${anchor} moved when the selected word changed`
					).toBeLessThanOrEqual(1);
				}
				expect(
					spread(samples, 'footer'),
					`${lang}/${size}: the footer did not follow the changing analysis height`
				).toBeGreaterThan(20);
				expect(
					spread(samples, 'footerAfterPanel'),
					`${lang}/${size}: the spacing after the analysis changed`
				).toBeLessThanOrEqual(1);

				// Reading modes change the text above the panel. The panel and footer
				// should both move down in flow, without re-aiming the title or the
				// start of the specimen around the new total height.
				const modeSamples: Array<Record<string, number>> = [];
				for (const level of [0, 1, 2]) {
					await page.locator(`.specimen .help [data-level="${level}"]`).click();
					modeSamples.push(await readGeometry());
				}
				expect(
					spread(modeSamples, 'panelOffset'),
					`${lang}/${size}: the modes did not exercise different text heights`
				).toBeGreaterThan(20);
				for (const anchor of ['title', 'ways', 'specimen']) {
					expect(
						spread(modeSamples, anchor),
						`${lang}/${size}: ${anchor} moved when the reading mode changed`
					).toBeLessThanOrEqual(1);
				}
				for (const follower of ['panel', 'footer']) {
					expect(
						spread(modeSamples, follower),
						`${lang}/${size}: ${follower} did not follow the changing specimen text`
					).toBeGreaterThan(20);
				}
				expect(
					spread(modeSamples, 'footerAfterPanel'),
					`${lang}/${size}: the spacing after the panel changed with the reading mode`
				).toBeLessThanOrEqual(1);
			}
		}
	});

	test('a lemma opened from the specimen has a stable prayer-book home', async ({ page }) => {
		await page.goto('/pl');
		await page.locator('aside.word-panel-inline a[href="/app/pl/lemma/scrutor"]').click();
		await page.waitForURL(atRoute('/app/pl/lemma/scrutor'));
		const trail = page.locator('nav .trail');
		await expect(trail.locator('a')).toHaveCount(1);
		await expect(trail.locator('a.home')).toHaveAttribute('href', '/app/pl');
		await expect(trail.locator('a.home')).toHaveAttribute(
			'aria-label',
			'strona główna modlitewnika'
		);
	});

	test('the landing and reader render one analysis component', async ({ page }) => {
		await page.goto('/pl');
		const landing = await analysisTree(page.locator('.word-panel-inline .word-analysis'));

		await page.goto('/app/pl/psalmi/118-he?w=w016');
		const reader = await analysisTree(page.locator('aside.panel .word-analysis'));
		expect(landing).toEqual(reader);
	});

	test('a sourced word note keeps its reference one disclosure away', async ({ page }) => {
		await page.goto('/pl');
		await page.locator('#w020').click();
		const sources = page.locator('.word-panel-inline details.source-notes');
		await expect(sources.locator('summary')).toHaveText('źródła');
		await expect(sources.getByRole('link')).not.toBeVisible();
		await sources.locator('summary').click();
		await expect(sources.getByRole('link', { name: 'Allen and Greenough' })).toHaveAttribute(
			'href',
			'https://dcc.dickinson.edu/grammar/latin/present-system'
		);
		await expect(sources).toContainText('§§ 168 d–e, 187');
	});

	test('the specimen citation reaches the psalm page', async ({ page }) => {
		await page.goto('/pl');
		await expect(page.locator('.stanza-link a')).toHaveAttribute(
			'href',
			'/app/pl/psalmi/118-he?v=34'
		);
		await page.locator('.stanza-link a').click();
		await page.waitForURL(/\/app\/pl\/psalmi\/118-he\?v=34$/);
		await expect(page.locator('h1')).toHaveText('Psalmus 118, HE');
	});

	test('every way in stands in one row, ready or announced', async ({ page }) => {
		await page.goto('/pl');
		// two doors open today: the web (loud, full-width) and the zip —
		// the PWA offer belongs to the browser once the reader is in the
		// app, and the landing cannot honestly make it
		await expect(page.locator('a.way')).toHaveCount(2);
		await expect(page.locator('.way.primary')).toHaveAttribute('href', '/app/pl');
		// three are announced: named, quiet, and NOT links — a door that
		// opens nothing must not invite the hand
		await expect(page.locator('.way.soon')).toHaveCount(3);
		for (const channel of ['Google Play', 'App Store', 'F-Droid']) {
			const tile = page.locator('.way.soon', { hasText: channel });
			await expect(tile).toContainText('wkrótce');
			expect(await tile.evaluate((el) => el.tagName)).toBe('DIV');
		}
	});

	test('the row of ways lines up, whatever each tile carries', async ({ page }) => {
		// The tiles were all one height and their contents were centred inside
		// it, so the download tile — the only one with a fourth line, naming
		// the edition — sat nine pixels above every other tile's icon and
		// title. The boxes lined up and nothing in them did, which is what the
		// owner saw (2026-08-07) and what no test could see. Both languages,
		// because the English notes are the longer ones.
		for (const lang of ['pl', 'en']) {
			await page.setViewportSize({ width: 1280, height: 900 });
			await page.goto(`/${lang}`);
			const bands = await page.locator('.ways').evaluate((row) => {
				const round = (n: number) => Math.round(n);
				return [...row.querySelectorAll('.way')].map((way) => ({
					icon: round(way.querySelector('svg')!.getBoundingClientRect().top),
					title: round(way.querySelector('.way-title')!.getBoundingClientRect().top),
					note: round(way.querySelector('.way-note')!.getBoundingClientRect().top)
				}));
			});
			expect(bands.length).toBe(5);
			for (const band of ['icon', 'title', 'note'] as const) {
				const tops = bands.map((b) => b[band]);
				// A pixel of slack, and no more. Icons of different shapes round
				// their heights differently and that is invisible; the defect
				// this holds was nine pixels, and so is anything like it.
				expect(
					Math.max(...tops) - Math.min(...tops),
					`${lang}: the ${band}s do not share a line — ${tops.join(', ')}`
				).toBeLessThanOrEqual(1);
			}
		}
	});

	test('the ways that are not open yet are not dressed as buttons', async ({ page }) => {
		// A border and a filled surface are what say "press me". The announced
		// channels have neither — they stand in the row as the names they are
		// (owner, 2026-08-07: "the unavailable tiles look active"). The markup
		// has always had them as non-links, which is the half a screen reader
		// hears; this is the half everyone else sees.
		await page.goto('/pl');
		const dressed = await page.locator('.ways').evaluate((row) =>
			[...row.querySelectorAll('.way')].map((way) => {
				const style = getComputedStyle(way);
				return {
					soon: way.classList.contains('soon'),
					bordered: style.borderTopWidth !== '0px' && style.borderTopColor !== 'rgba(0, 0, 0, 0)',
					filled: style.backgroundColor !== 'rgba(0, 0, 0, 0)'
				};
			})
		);
		for (const way of dressed) {
			if (way.soon)
				expect(way.bordered || way.filled, 'an announced channel looks live').toBe(false);
			else expect(way.bordered, 'an open door has lost its plate').toBe(true);
		}
	});

	test('the download door points at its own version of the release asset', async ({ page }) => {
		// The zip travels with each GitHub release under a versioned name,
		// and the landing (deployed only on release) links the exact asset
		// of its own version — so this asserts the address against the one
		// source, package.json, and the release ritual owns the file.
		const { version } = pkg;
		await page.goto('/en');
		const zip = page.locator('a.way', { hasText: 'ZIP file' });
		await expect(zip).toHaveAttribute(
			'href',
			`https://github.com/scrutabor/scrutabor/releases/download/v${version}/Scrutabor-v${version}.zip`
		);
		await expect(zip).toContainText('a copy to keep');
		await expect(zip).toContainText(`v${version}`);
	});

	test('the privacy page states the promise in both languages', async ({ page }) => {
		await page.goto('/pl/privacy');
		await expect(page.locator('h1')).toHaveText('Prywatność');
		// The promise as it now stands: no cookie, no tracking. Counting
		// pages opened is not either of those, and the page says so in full
		// a paragraph down (tests/privacy.spec.ts).
		await expect(page.locator('.lede')).toContainText('nie używa plików cookie');
		await page.goto('/en/privacy');
		await expect(page.locator('h1')).toHaveText('Privacy');
		await expect(page.locator('.lede')).toContainText('uses no cookies');
		await expect(page.locator('.trail a.back')).toHaveAttribute('href', '/en');
		// the store-facing URL must not silently become a 404 shell
		expect((await page.request.get('/en/privacy')).status()).toBe(200);
	});

	test('the support page offers real contact in both languages', async ({ page }) => {
		await page.goto('/pl/support');
		await expect(page.locator('h1')).toHaveText('Kontakt');
		// the way back stands top-left as on every page of the book, but
		// here home is the landing, not the catalog
		await expect(page.locator('.trail a.back')).toHaveAttribute('href', '/pl');
		// the two channel descriptions share one left edge (a grid, not
		// per-row flex — and not the .what class, which app.css centres)
		const edges = await page
			.locator('.channel-note')
			.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
		expect(edges[0]).toBe(edges[1]);
		await expect(
			page.locator('a[href="https://github.com/scrutabor/scrutabor/issues"]')
		).toBeVisible();
		// the project's own address, not a personal one — the stores and
		// the readers both get the same door
		await expect(page.locator('a[href="mailto:contact@scrutabor.org"]')).toBeVisible();
		await page.goto('/en/support');
		await expect(page.locator('h1')).toHaveText('Contact');
		expect((await page.request.get('/en/support')).status()).toBe(200);
	});

	test('the landing subpages stand centered on a wide screen', async ({ page }) => {
		// Both subpages cap their column at 34rem inside a wider stretch-flex
		// page; without margin-inline auto the block hugs the left and the
		// misalignment only shows past the page's own max-width.
		await page.setViewportSize({ width: 1920, height: 900 });
		for (const path of ['/pl/support', '/en/privacy']) {
			await page.goto(path);
			const centre = await page.locator('main').evaluate((el) => {
				const r = el.getBoundingClientRect();
				return Math.round(r.x + r.width / 2);
			});
			expect(centre, `${path} main centre at 1920px`).toBe(960);
		}
	});

	test('nothing runs off a 320px screen at the largest reading size', async ({ page }) => {
		// The sweep in small-screens.spec walks the BOOK: every page it names
		// sits under /app, so the landing and its subpages were the one shape
		// nobody measured at a phone's width — and two faults were waiting
		// there at once. The help slider under the specimen never took its
		// narrow layout, because its container query had no container to
		// answer and "full translation" ran off the edge of an English phone.
		// The support page sets its channels as a grid on a track that cannot
		// break, and pushed the whole page 40px sideways. Largest print on the
		// narrowest phone is the reader this book is set for.
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto('/pl');
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		const damage: string[] = [];
		for (const path of ['/pl', '/en', '/pl/support', '/en/support']) {
			await page.goto(path);
			// the setting took: 22.4px is the largest of the three steps
			await expect(page.locator('html')).toHaveCSS('font-size', '22.4px');
			const over = await page.evaluate(() => {
				const de = document.documentElement;
				return de.scrollWidth - de.clientWidth;
			});
			if (over > 0) damage.push(`${path}: +${over}px`);
		}
		expect(damage, `the page scrolls sideways:\n  ${damage.join('\n  ')}`).toEqual([]);
	});

	test('the footer reaches the public source', async ({ page }) => {
		await page.goto('/en');
		await expect(page.getByRole('link', { name: 'source code on GitHub' })).toHaveAttribute(
			'href',
			'https://github.com/scrutabor'
		);
	});
});
