// The reading experience: help ladder, panel layers, cross-reference jumps.
import { expect, test } from './fixtures';

const AVE = '/pl/orationes/ave-maria';
const CONFITEOR = '/pl/ordinarium/confiteor';

test('help slider walks the three-step ladder', async ({ page }) => {
	await page.goto(CONFITEOR);
	const slider = page.locator('input[type="range"]');

	// default (1): interlinear glosses and rubric narratives, no translations
	await expect(page.locator('rt').first()).toBeVisible();
	await expect(page.locator('.rubric-narrative').first()).toBeVisible();
	await expect(page.locator('.translation')).toHaveCount(0);

	// 0: bare Latin
	await slider.fill('0');
	await expect(page.locator('rt')).toHaveCount(0);
	await expect(page.locator('.rubric-narrative')).toHaveCount(0);

	// 2: translations join
	await slider.fill('2');
	await expect(page.locator('.translation').first()).toBeVisible();
	await expect(page.locator('.rubric-narrative').first()).toBeVisible();
});

test('word panel shows all three layers', async ({ page }) => {
	await page.goto(AVE);
	await page.locator('#w019').click(); // Mater
	const panel = page.locator('aside');
	await expect(panel.locator('.form')).toHaveText('Mater');
	// layer 1: lexicon — dictionary head linking to the lemma page, senses
	await expect(panel.locator('.head a')).toHaveAttribute('href', '/pl/lemma/mater');
	await expect(panel.locator('.head')).toContainText('mater, matris');
	await expect(panel.locator('.head')).toContainText('— matka');
	// layer 2: parse line with a concept-linked term
	await expect(panel.locator('.morph')).toContainText('wołacz');
	await expect(panel.locator('.morph a.concept')).toHaveAttribute(
		'href',
		'/pl/grammatica/vocativus'
	);
	// layer 3: the contextual note
	await expect(panel.locator('.function')).toContainText('Apozycja');
	// provenance names the machine confirmers (schema 0.7.0 word default)
	await expect(panel.locator('.meta')).toContainText('zaakceptowane');
	await expect(panel.locator('.meta')).toContainText('opracowanie, Whitaker, Collatinus');
});

test('a proper name absent from one analyzer names its true confirmers', async ({ page }) => {
	await page.goto('/pl/ordinarium/confiteor?w=w009'); // Michaéli
	const meta = page.locator('aside .meta');
	await expect(meta).toContainText('opracowanie, Collatinus');
	await expect(meta).not.toContainText('Whitaker,');
});

test('a lemma-level note appears on every token of the lemma', async ({ page }) => {
	await page.goto(`${AVE}?w=w031`); // Amen
	await expect(page.locator('aside .note')).toContainText('Hebrajskie');
});

test('cross-references in notes jump to the referenced word', async ({ page }) => {
	await page.goto(CONFITEOR);
	await page.locator('#w002').click(); // Deo — note compares „Deum” (w065)
	await expect(page.locator('aside .form')).toHaveText('Deo');
	await page.locator('aside .xref', { hasText: 'Deum' }).click();
	await expect(page.locator('aside .form')).toHaveText('Deum');
	await expect(page.locator('#w065')).toBeInViewport();
});

test('the English locale renders its own gloss layer', async ({ page }) => {
	await page.goto('/en/orationes/ave-maria');
	await expect(page.locator('rt').first()).toHaveText('hail');
	await page.locator('#w019').click();
	await expect(page.locator('aside .head')).toContainText('— mother');
});

test('pronunciation line shows both traditions on the Polish interface', async ({ page }) => {
	await page.goto('/pl/orationes/pater-noster?w=w006'); // cælis
	const pron = page.locator('aside .pron');
	await expect(pron).toContainText('cæ-lis');
	await expect(pron).toContainText('rz.');
	await expect(pron).toContainText('/ˈtʃɛ.lis/');
	await expect(pron).toContainText('pol.');
	await expect(pron).toContainText('/ˈtsɛ.lis/');
});

test('pronunciation line shows Roman only on the English interface', async ({ page }) => {
	await page.goto('/en/orationes/pater-noster?w=w006');
	const pron = page.locator('aside .pron');
	await expect(pron).toContainText('/ˈtʃɛ.lis/');
	await expect(pron).not.toContainText('rz.');
	await expect(pron).not.toContainText('pol.');
});

test('identical traditions collapse to one transcription', async ({ page }) => {
	await page.goto('/pl/orationes/ave-maria?w=w019'); // Mater
	const pron = page.locator('aside .pron');
	await expect(pron).toContainText('Ma-ter');
	await expect(pron).toContainText('/ˈma.tɛr/');
	await expect(pron).not.toContainText('rz.');
});

test('the Gloria reads with narrative, panel and provenance', async ({ page }) => {
	await page.goto('/pl/ordinarium/gloria?w=w041'); // Agnus
	const panel = page.locator('aside');
	await expect(panel.locator('.form')).toHaveText('Agnus');
	await expect(panel.locator('.gloss')).toHaveText('Baranku');
	// the nominative-as-address note cross-links its vocative anchor
	await expect(panel.locator('.function')).toContainText('mianownika');
	await expect(panel.locator('.meta')).toContainText('opracowanie, Whitaker, Collatinus');
	// single-analyzer override: déxteram is confirmed by Whitaker's alone,
	// against the document's both-analyzers default
	await page.goto('/pl/ordinarium/gloria?w=w061');
	await expect(panel.locator('.meta')).toContainText('opracowanie, Whitaker');
	await expect(panel.locator('.meta')).not.toContainText('Collatinus');
	// the superlative links its grammar concept and the lemma page resolves
	await page.goto('/en/ordinarium/gloria?w=w074'); // Altissimus
	await expect(panel.locator('.gloss')).toHaveText('the Most High');
	await panel.locator('.head a').click();
	await expect(page).toHaveURL(/lemma\/altus$/);
	await expect(page.locator('.senses')).toContainText('high');
});

test('no token ever fragments across lines, any text, narrow viewport', async ({ page }) => {
	// A token (word + trailing punctuation) is atomic: an inline element
	// that fragments across lines reports multiple client rects — so one
	// rect per token IS the no-orphaned-punctuation invariant, wherever
	// the line breaks happen to fall.
	await page.setViewportSize({ width: 320, height: 900 });
	for (const path of [
		'/pl/ordinarium/gloria',
		'/pl/ordinarium/confiteor',
		'/pl/orationes/pater-noster',
		'/pl/orationes/ave-maria',
		'/pl/orationes/gloria-patri'
	]) {
		await page.goto(path);
		await expect(page.locator('.verse .token').first()).toBeVisible();
		const fragmented = await page.evaluate(() =>
			[...document.querySelectorAll('.verse .token')]
				.filter((t) => t.getClientRects().length !== 1)
				.map((t) => t.querySelector('button')?.id ?? '?')
		);
		expect(fragmented, path).toEqual([]);
	}
});

test('the about sheet is closed at every slider position, opens on demand', async ({ page }) => {
	await page.goto('/pl/ordinarium/gloria');
	const pill = page.locator('.about-pill');
	const sheet = page.locator('aside.about-sheet');
	const slider = page.locator('input[type="range"]');
	// closed by default at all three help levels
	for (const level of ['1', '0', '2']) {
		await slider.fill(level);
		await expect(pill).toBeVisible();
		await expect(sheet).not.toBeVisible();
	}
	// opens as a bottom sheet without moving the text
	const before = await page.locator('.verse').first().boundingBox();
	await pill.click();
	await expect(sheet).toBeVisible();
	await expect(sheet).toContainText('hymn anielski');
	const after = await page.locator('.verse').first().boundingBox();
	expect(after?.y).toBe(before?.y);
	// escape closes it; a fresh load starts closed
	await page.keyboard.press('Escape');
	await expect(sheet).not.toBeVisible();
	await pill.click();
	await page.goto('/pl/ordinarium/gloria');
	await expect(sheet).not.toBeVisible();
});

test('the about sheet and the word panel take turns', async ({ page }) => {
	await page.goto('/pl/ordinarium/gloria?w=w001');
	await expect(page.locator('aside .form')).toHaveText('Glória');
	await page.locator('.about-pill').click();
	await expect(page.locator('aside.about-sheet')).toBeVisible();
	await expect(page.locator('aside .form')).not.toBeVisible();
	await page.locator('#w002').click();
	await expect(page.locator('aside.about-sheet')).not.toBeVisible();
	await expect(page.locator('aside .form')).toHaveText('in');
});

test('the about sheet speaks the interface language', async ({ page }) => {
	await page.goto('/en/orationes/pater-noster');
	const pill = page.locator('.about-pill');
	await expect(pill).toContainText('about this prayer');
	await pill.click();
	await expect(page.locator('aside.about-sheet')).toContainText('Didache');
});

test('the Credo reads with participles in the panel', async ({ page }) => {
	await page.goto('/pl/ordinarium/credo?w=w064'); // incarnátus
	const panel = page.locator('aside');
	await expect(panel.locator('.form')).toHaveText('incarnátus');
	await expect(panel.locator('.morph')).toContainText('imiesłów');
	await expect(panel.locator('.morph')).toContainText('perfectum');
	await expect(panel.locator('.function')).toContainText('incarnátus est');
	// deponent participle keeps its concept link
	await page.goto('/en/ordinarium/credo?w=w083'); // passus
	await expect(panel.locator('.morph')).toContainText('participle');
	await expect(panel.locator('.morph a.concept', { hasText: 'deponent' })).toBeVisible();
	// the feminine dies ruling surfaces in the parse line
	await page.goto('/pl/ordinarium/credo?w=w090'); // die
	await expect(panel.locator('.morph')).toContainText('r. żeński');
	await expect(panel.locator('.function')).toContainText('tértia');
});

/**
 * A word sitting in the bottom third of a short viewport — the case where
 * the panel would cover the very word that was tapped.
 *
 * Scrolls until it finds one instead of assuming the first screen holds
 * text: how tall the header is depends on what controls a reading page
 * carries, and a test that silently found nothing would report a null id
 * rather than the behaviour it is here for.
 */
async function wordNearBottom(page: import('@playwright/test').Page): Promise<string> {
	const pick = () =>
		page.evaluate(() => {
			const vh = window.innerHeight;
			const word = [...document.querySelectorAll('.word')].find((el) => {
				const r = el.getBoundingClientRect();
				return r.top > vh * 0.7 && r.bottom < vh;
			});
			return word?.id ?? null;
		});
	for (let tries = 0; tries < 12; tries++) {
		const id = await pick();
		if (id) return id;
		await page.evaluate(() => window.scrollBy(0, 200));
		await page.waitForTimeout(50);
	}
	throw new Error('no word in the bottom third of the viewport, after scrolling');
}

test('a tapped word near the viewport bottom rises above the panel', async ({ page }) => {
	await page.setViewportSize({ width: 800, height: 520 });
	await page.goto('/pl/ordinarium/credo');
	const id = await wordNearBottom(page);
	await page.locator(`#${id}`).click();
	await expect
		.poll(
			() =>
				page.evaluate((wid) => {
					const r = document.getElementById(wid!)!.getBoundingClientRect();
					const s = document.querySelector('aside')!.getBoundingClientRect();
					return r.bottom <= s.top + 1;
				}, id),
			{ timeout: 3000 }
		)
		.toBe(true);
});

test('the pager walks the book in liturgical order', async ({ page }) => {
	await page.goto('/pl/ordinarium/gloria');
	const pager = page.locator('.pager');
	// the Kyrie stands between the Confiteor and the Gloria, as at Mass
	await expect(pager.locator('a', { hasText: 'Kýrie' })).toBeVisible();
	await pager.locator('a', { hasText: 'Credo' }).click();
	await expect(page).toHaveURL(/ordinarium\/credo$/);
	// crossing the section boundary backwards
	await page.goto('/pl/ordinarium/confiteor');
	await pager.locator('a', { hasText: 'Glória Patri' }).click();
	await expect(page).toHaveURL(/orationes\/gloria-patri$/);
	// arrow keys page too, but never while the slider owns them
	await page.keyboard.press('ArrowRight');
	await expect(page).toHaveURL(/ordinarium\/confiteor$/);
	await page.locator('input[type="range"]').focus();
	await page.keyboard.press('ArrowRight');
	await expect(page).toHaveURL(/ordinarium\/confiteor$/);
	// first text has no previous
	await page.goto('/pl/orationes/pater-noster');
	await expect(page.locator('.pager a')).toHaveCount(1);
});

test.describe('keeping the screen awake', () => {
	test.use({ permissions: ['screen-wake-lock'] });

	test('a text holds the screen open by itself, and lets go off-page', async ({ page }) => {
		// record what the page asks of the real API (which then runs)
		await page.addInitScript(() => {
			const real = navigator.wakeLock;
			(window as unknown as { calls: string[] }).calls = [];
			Object.defineProperty(navigator, 'wakeLock', {
				configurable: true,
				value: {
					request: (type: WakeLockType) => {
						(window as unknown as { calls: string[] }).calls.push(type);
						return real.request(type);
					}
				}
			});
		});

		// the landing is a menu, not a reading surface — nothing is held
		await page.goto('/pl');
		await page.waitForTimeout(150);
		expect(await page.evaluate(() => (window as unknown as { calls: string[] }).calls)).toEqual([]);
		// no switch: the reader is never asked
		await expect(page.locator('button.wake')).toHaveCount(0);

		// opening a text takes the lock without being asked
		await page.locator('a[href="/pl/ordinarium/credo"]').click();
		await expect
			.poll(() => page.evaluate(() => (window as unknown as { calls: string[] }).calls.length))
			.toBeGreaterThan(0);

		// and a movement of the flow does the same (a fresh document, so its
		// own tally starts from nothing). The ordo index is a menu, like the
		// landing, and holds nothing.
		await page.goto('/pl/ordo');
		await page.waitForTimeout(150);
		expect(await page.evaluate(() => (window as unknown as { calls: string[] }).calls)).toEqual([]);
		await page.goto('/pl/ordo/canon');
		await expect
			.poll(() => page.evaluate(() => (window as unknown as { calls: string[] }).calls))
			.toEqual(['screen']);
	});
});

test('the book keeps a ribbon: reopening a text resumes the position', async ({ page }) => {
	await page.goto('/pl/ordinarium/credo');
	// Scroll and wait for the ribbon to actually commit. A fixed pause races
	// hydration: the listener that records the position is attached by the
	// page's own script, and under load a scroll can land before it exists.
	await expect
		.poll(
			async () => {
				// Return to the top first: scrolling to a position the page is
				// already at fires no event, so a retry would be silent.
				await page.evaluate(() => {
					window.scrollTo(0, 0);
					window.scrollTo(0, 600);
				});
				return page.evaluate(() => localStorage.getItem('scrutabor-pos:ordinarium/credo'));
			},
			{ intervals: [1400, 1400, 1400, 1400], timeout: 15000 }
		)
		.not.toBeNull();
	// leave for the catalog and come back — the ribbon holds
	await page.locator('a.back').click();
	await expect(page).toHaveURL(/\/pl$/);
	await page.locator('a[href="/pl/ordinarium/credo"]').click();
	await expect(page).toHaveURL(/credo/);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
	// a deep link outranks the ribbon: the word is centered, not the ribbon restored
	await page.goto('/pl/ordinarium/credo?w=w003');
	await expect(page.locator('aside')).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const r = document.getElementById('w003')?.getBoundingClientRect();
				return !!r && r.top >= 0 && r.bottom <= window.innerHeight;
			})
		)
		.toBe(true);
	// an expired ribbon is ignored — planted from the catalog, where no
	// leave-time save can overwrite it on the way in
	await page.goto('/pl');
	await page.evaluate(() => {
		localStorage.setItem(
			'scrutabor-pos:ordinarium/credo',
			JSON.stringify({ y: 600, t: Date.now() - 13 * 60 * 60 * 1000 })
		);
	});
	await page.goto('/pl/ordinarium/credo');
	await page.waitForTimeout(200);
	expect(await page.evaluate(() => window.scrollY)).toBeLessThan(10);
});

test('closing the panel leaves the page where it is', async ({ page }) => {
	await page.setViewportSize({ width: 800, height: 520 });
	await page.goto('/pl/ordinarium/credo');
	const id = await wordNearBottom(page);
	const before = await page.evaluate(() => window.scrollY);
	await page.locator(`#${id}`).click();
	await expect.poll(() => page.evaluate(() => document.querySelector('aside') !== null)).toBe(true);
	await page.waitForTimeout(700); // let the tap-scroll settle
	const shifted = await page.evaluate(() => window.scrollY);
	expect(shifted).toBeGreaterThan(before);
	// close via Escape (history-entry path) — the page must not move
	await page.keyboard.press('Escape');
	await page.waitForTimeout(400);
	expect(await page.evaluate(() => window.scrollY)).toBe(shifted);
	// and via the browser's own back after reopening
	await page.locator(`#${id}`).click();
	await page.waitForTimeout(700);
	const shifted2 = await page.evaluate(() => window.scrollY);
	await page.goBack();
	await page.waitForTimeout(400);
	expect(await page.evaluate(() => window.scrollY)).toBe(shifted2);
});

test('the part control appears only where it changes something', async ({ page }) => {
	// A page whose text is spoken by one voice from beginning to end has
	// nothing for the reader's part to change — no line is marked as theirs
	// and nothing folds — so the choice is not offered there. Offering a
	// control that does nothing is worse than not offering it.
	await page.goto('/en/ordinarium/praefatio-dialogus');
	await expect(page.getByRole('radio', { name: 'faithful' })).toBeVisible();

	await page.goto('/en/ordinarium/quod-ore-sumpsimus'); // the priest's, throughout
	await expect(page.getByRole('radio', { name: 'faithful' })).toHaveCount(0);
	// and the help slider, which always does something, stays
	await expect(page.locator('input[type="range"]')).toBeVisible();
});

test('the header sits on one centre line', async ({ page }) => {
	// The two labels of the slider are different lengths in both languages
	// — "Latin only" against "full translation", "sama łacina" against
	// "pełny przekład" — so sizing them to their text put the track, and
	// with it the middle stop, off the page's centre. Measured, not
	// eyeballed, and in both languages, because the label lengths differ
	// differently in each.
	for (const url of ['/en/ordinarium/praefatio-dialogus', '/pl/ordinarium/praefatio-dialogus']) {
		await page.goto(url);
		const centres = await page.evaluate(() => {
			const mid = (sel: string) => {
				const el = document.querySelector(sel);
				if (!el) return null;
				const b = el.getBoundingClientRect();
				return (b.left + b.right) / 2;
			};
			return {
				title: mid('h1'),
				track: mid('input[type="range"]'),
				part: mid('.picker.compact'),
				about: mid('.about-pill')
			};
		});
		for (const [what, x] of Object.entries(centres)) {
			if (x === null || what === 'title') continue;
			expect(Math.abs(x - centres.title!), `${what} is off centre in ${url}`).toBeLessThan(1);
		}
	}
});

test('a gloss belongs to the word above it, and is legible', async ({ page }) => {
	// The proportions were backwards: a gloss sat ON its Latin — 0.1px,
	// sometimes touching a descender — with 27px of nothing beneath it, so
	// each pair read as two loose lines instead of a word and its meaning.
	// Proximity is the only thing making that pairing legible, so it is
	// measured: the gap to the next line has to be clearly larger than the
	// gap to the word the gloss belongs to, and neither may be zero.
	await page.goto('/en/ordinarium/corpus-tuum');
	const gaps = await page.evaluate(() => {
		const c = document.createElement('canvas').getContext('2d')!;
		const ink = (el: Element) => {
			const cs = getComputedStyle(el);
			c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
			const m = c.measureText(el.textContent || 'x');
			const probe = document.createElement('span');
			probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
			el.appendChild(probe);
			const base = probe.getBoundingClientRect().top;
			probe.remove();
			return { top: base - m.actualBoundingBoxAscent, bottom: base + m.actualBoundingBoxDescent };
		};
		const verse = document.querySelector('.verse')!;
		const rubies = [...verse.querySelectorAll('ruby')];
		const first = rubies[0];
		const rt = first.querySelector('rt')!;
		const y0 = first.getBoundingClientRect().top;
		const next = rubies.find((r) => r.getBoundingClientRect().top > y0 + 10)!;
		return {
			pair: ink(rt).top - ink(first).bottom,
			between: ink(next).top - ink(rt).bottom,
			size: parseFloat(getComputedStyle(rt).fontSize),
			slope: getComputedStyle(rt).fontStyle
		};
	});
	expect(gaps.pair, 'the gloss is not touching its word').toBeGreaterThan(3);
	expect(gaps.between, 'the next line is further off than the gloss').toBeGreaterThan(
		gaps.pair * 1.5
	);
	expect(gaps.size, 'the gloss is big enough to read').toBeGreaterThan(13);
	expect(gaps.slope, 'and upright at that size').toBe('normal');
});

test('a tapped word is highlighted on the word, not around the gloss', async ({ page }) => {
	// A ruby's box holds its annotation too, so a wash drawn on the word
	// covered both — and once the gloss row was given its own air the
	// annotation hung below that box, leaving a highlight that began above
	// the letters and ended in the middle of the gloss beneath them.
	await page.goto('/en/ordinarium/pater-noster?w=w022');
	const box = await page.evaluate(() => {
		const w = document.querySelector('.word.selected')!;
		const base = w.querySelector('.base')!;
		const rt = w.querySelector('rt')!;
		const c = document.createElement('canvas').getContext('2d')!;
		const cs = getComputedStyle(rt);
		c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
		const probe = document.createElement('span');
		probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
		rt.appendChild(probe);
		const rtBase = probe.getBoundingClientRect().top;
		probe.remove();
		return {
			clearance:
				rtBase -
				c.measureText(rt.textContent ?? '').actualBoundingBoxAscent -
				base.getBoundingClientRect().bottom,
			onBase: getComputedStyle(base).backgroundColor,
			onButton: getComputedStyle(w).backgroundColor
		};
	});
	expect(box.clearance, 'the highlight stops above the gloss').toBeGreaterThan(0);
	expect(box.onBase, 'the wash is on the Latin').not.toBe('rgba(0, 0, 0, 0)');
	expect(box.onButton, 'and not on the whole ruby').toBe('rgba(0, 0, 0, 0)');
});

test('the highlight covers the whole of a raised initial', async ({ page }) => {
	// The base box is sized for text at the reading size, so an initial at
	// 1.75 pokes out of the top of it and Q's tail out of the bottom — the
	// wash covered the word but not the letter that opens it. Padding on an
	// inline element grows the box it paints without touching the line, so
	// the letter is covered and the gloss stays where it is.
	for (const [url, letter] of [
		['/en/ordinarium/libera-nos?w=w001', 'L'], // reaches up
		['/en/ordinarium/quod-ore-sumpsimus?w=w001', 'Q'] // and down
	]) {
		await page.goto(url);
		const cover = await page.evaluate(() => {
			const base = [...document.querySelectorAll('.word.selected .base')].find((b) =>
				b.querySelector('.initial')
			);
			if (!base) return null;
			const ini = base.querySelector('.initial')!;
			const c = document.createElement('canvas').getContext('2d')!;
			const cs = getComputedStyle(ini);
			c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
			const m = c.measureText(ini.textContent ?? '');
			const probe = document.createElement('span');
			probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
			ini.parentElement!.insertBefore(probe, ini.nextSibling);
			const baseline = probe.getBoundingClientRect().top;
			probe.remove();
			const r = base.getBoundingClientRect();
			return {
				top: baseline - m.actualBoundingBoxAscent - r.top,
				bottom: r.bottom - (baseline + m.actualBoundingBoxDescent)
			};
		});
		expect(cover, `${url} has a selected initial`).not.toBeNull();
		expect(cover!.top, `${letter} pokes out of the top of its highlight`).toBeGreaterThan(0);
		expect(cover!.bottom, `${letter} pokes out of the bottom of its highlight`).toBeGreaterThan(0);
	}
});
