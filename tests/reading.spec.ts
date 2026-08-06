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
	// Two things about the vertical rhythm, both the owner's calls.
	//
	// A gloss belongs to the Latin ABOVE it, and only proximity says so:
	// tight to its own line, well clear of the next. The floor on the
	// first is the descenders — below about 3px a p or a q touches the
	// gloss under it — so it is measured on the ink, not the boxes.
	//
	// And the rhythm is UNIFORM: a new verse gets no more air than a
	// wrapped line does. It used to get 2.3x more, and that looked
	// arbitrary because it is — whether a verse takes one line or two is
	// a fact about the window, so the page changed shape when the phone
	// turned.
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
		const verses = [...document.querySelectorAll('.verse.glossed')];
		const verse = verses[0];
		const rubies = [...verse.querySelectorAll('ruby')];
		const first = rubies[0];
		const rt = first.querySelector('rt')!;
		const y0 = first.getBoundingClientRect().top;
		const next = rubies.find((r) => r.getBoundingClientRect().top > y0 + 10)!;
		const lastRt = [...verse.querySelectorAll('rt')].pop()!;
		const nextVerse = verses[1].querySelector('ruby')!;
		return {
			pair: ink(rt).top - ink(first).bottom,
			between: ink(next).top - ink(rt).bottom,
			toNextVerse: ink(nextVerse).top - ink(lastRt).bottom,
			size: parseFloat(getComputedStyle(rt).fontSize),
			slope: getComputedStyle(rt).fontStyle
		};
	});
	expect(gaps.pair, 'the gloss is not touching its word').toBeGreaterThan(3);
	expect(gaps.between, 'the next line of the verse stands well clear').toBeGreaterThan(
		gaps.pair * 3
	);
	expect(
		Math.abs(gaps.toNextVerse - gaps.between),
		'a verse break is the same step as a line break'
	).toBeLessThan(2);
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

test('a rubric is set apart from the prayer it interrupts', async ({ page }) => {
	// A rubric is a different voice, in red with a rule down its edge, and
	// it wants a step more air than one line of a prayer takes from the
	// next — which is the ONLY step left in the vertical rhythm now that a
	// verse break is the same as a line break.
	//
	// Ink on both sides, never boxes: the gloss row is shifted down by a
	// relative offset, which moves paint without moving layout, so a
	// glossed verse's box ends ABOVE its own last gloss. Measuring to the
	// next element's box top therefore reads as a negative gap while the
	// page is perfectly well spaced.
	await page.goto('/en/ordinarium/corpus-tuum');
	const gaps = await page.evaluate(() => {
		const c = document.createElement('canvas').getContext('2d')!;
		const metrics = (el: Element) => {
			const cs = getComputedStyle(el);
			c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
			const m = c.measureText(el.textContent || 'x');
			const probe = document.createElement('span');
			probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
			el.appendChild(probe);
			const b = probe.getBoundingClientRect().top;
			probe.remove();
			return { top: b - m.actualBoundingBoxAscent, bottom: b + m.actualBoundingBoxDescent };
		};
		const inkBottom = (el: Element) => metrics(el).bottom;
		/** the ink top of whatever the block starts with — a verse starts
		 * with a ruby base, a rubric with its own prose */
		const inkTop = (el: Element) => metrics(el.querySelector('.base') ?? el).top;
		const kids = [...document.querySelectorAll('main > .verse, main > .rubric, main > .who')];
		const out: { kind: string; gap: number }[] = [];
		for (let i = 1; i < kids.length; i++) {
			const a = kids[i - 1];
			const b = kids[i];
			const rts = [...a.querySelectorAll('rt')];
			const last = rts[rts.length - 1];
			const bottom = last ? inkBottom(last) : a.getBoundingClientRect().bottom;
			out.push({
				kind: `${a.className.split(' ')[0]}→${b.className.split(' ')[0]}`,
				gap: inkTop(b) - bottom
			});
		}
		return out;
	});
	const between = gaps.filter((g) => g.kind === 'verse→verse').map((g) => g.gap);
	const toRubric = gaps.filter((g) => g.kind === 'verse→rubric').map((g) => g.gap);
	expect(between.length, 'the prayer has several lines').toBeGreaterThan(0);
	expect(toRubric.length, 'and a rubric after one of them').toBeGreaterThan(0);
	expect(Math.min(...between), 'no line is crowded against the next').toBeGreaterThan(12);
	// the rubric is the one place the rhythm still steps up
	expect(
		Math.min(...toRubric),
		'a rubric stands further off than the next line of the prayer'
	).toBeGreaterThan(Math.max(...between));
});

test('the three sheets of a reading page are one sheet', async ({ page }) => {
	// The word panel, the introduction and the mark key are three
	// components, and the reader is not supposed to be able to tell: same
	// surface, same width, same card on a wide screen. The mark key had
	// drifted to the page background and full width.
	await page.goto('/pl/ordinarium/pater-noster');
	const box = async (open: () => Promise<void>, sel: string) => {
		await open();
		await expect(page.locator(sel)).toBeVisible();
		return page.locator(sel).evaluate((el) => {
			const b = el.getBoundingClientRect();
			const s = getComputedStyle(el);
			return {
				left: Math.round(b.left),
				width: Math.round(b.width),
				bg: s.backgroundColor,
				radius: s.borderTopLeftRadius
			};
		});
	};

	const about = await box(() => page.locator('.about-pill').click(), 'aside.about-sheet');
	const legend = await box(() => page.locator('.mark').first().click(), '.legend');
	const panel = await box(
		() => page.locator('.word').first().click(),
		'aside.panel, aside:not(.about-sheet)'
	);

	expect(legend, 'the mark key is cut to the same sheet as the introduction').toEqual(about);
	expect(panel.left, 'the word panel too').toBe(about.left);
	expect(panel.width).toBe(about.width);
});

test('the introduction opens right under its own label', async ({ page }) => {
	// The page's top section is spaced with `header { padding-bottom }`,
	// and unqualified that reached the sheet's own <header> as well — 3rem
	// of nothing between "about this prayer" and the prose.
	await page.goto('/pl/orationes/pater-noster');
	await page.locator('.about-pill').click();
	const gap = await page.evaluate(() => {
		const head = document.querySelector('.about-sheet header')!.getBoundingClientRect();
		const text = document.querySelector('.about-text')!.getBoundingClientRect();
		return text.top - head.bottom;
	});
	expect(gap, 'the label and its prose belong together').toBeLessThan(20);
});

test('every line of a prayer starts on the same left edge', async ({ page }) => {
	// The speaker mark hangs out into the margin — .verse pads the column
	// and .verse.marked pulls the first line back out by exactly that much
	// — so a verse that names its voice starts its WORDS where a verse
	// that does not starts its words. It is easy to break from a distance:
	// anything else that sets text-indent on a verse undoes the pull, and
	// then only the marked verses move. So the whole column is measured.
	for (const url of ['/en/ordinarium/credo', '/pl/ordinarium/confiteor', '/pl/ordo/praeparatio']) {
		await page.goto(url);
		const lefts = await page.evaluate(() => {
			const out: number[] = [];
			for (const v of document.querySelectorAll('.verse')) {
				// the WORDS, not the mark: the mark is meant to hang out to the
				// left of the column, and does
				const rects = [...v.querySelectorAll('ruby, .token')].map((e) => e.getBoundingClientRect());
				const lines: number[] = [];
				for (const x of rects) if (!lines.some((l) => Math.abs(l - x.top) < 14)) lines.push(x.top);
				for (const top of lines) {
					const on = rects.filter((x) => Math.abs(x.top - top) < 14);
					out.push(Math.round(Math.min(...on.map((x) => x.left))));
				}
			}
			return out;
		});
		const spread = Math.max(...lefts) - Math.min(...lefts);
		expect(
			spread,
			`the column is ragged on ${url}: ${[...new Set(lefts)].join(', ')}`
		).toBeLessThan(2);
	}
});

test('a reading page takes the screen it is given, prose excepted', async ({ page }) => {
	// The owner's report: on a laptop the app looked mobile-only. It was —
	// the column was a fixed 38rem, so a 1512px screen was 40% used and 10
	// of the Credo's 17 verses wrapped. 38rem is the right measure for
	// PROSE, but a glossed verse is not prose: every Latin word is as wide
	// as the gloss under it, so the line carried a median of 33 Latin
	// characters where ordinary setting wants 45-75. It was short of the
	// limit, not at it.
	//
	// So the verses take the wide column and the prose does not — rubrics,
	// their narratives and the translations are ordinary sentences and ran
	// to 127 characters a line at 56rem.
	const measure = () =>
		page.evaluate(() => {
			const chars = (sel: string) => {
				const el = document.querySelector(sel);
				if (!el) return 0;
				const range = document.createRange();
				range.selectNodeContents(el);
				const rects = [...range.getClientRects()].filter((x) => x.width > 2);
				const perPx = (el.textContent || '').trim().length / rects.reduce((n, x) => n + x.width, 0);
				return Math.round((rects[0]?.width ?? 0) * perPx);
			};
			const counts: number[] = [];
			for (const v of document.querySelectorAll('.verse.glossed')) {
				const lines = new Map<number, number>();
				for (const r of v.querySelectorAll('ruby')) {
					const k = Math.round(r.getBoundingClientRect().top / 14);
					lines.set(k, (lines.get(k) ?? 0) + (r.querySelector('.base')?.textContent?.length ?? 0));
				}
				counts.push(...lines.values());
			}
			counts.sort((a, b) => a - b);
			return {
				column: Math.round(document.querySelector('.page')!.getBoundingClientRect().width),
				latinChars: counts[Math.floor(counts.length / 2)],
				rubric: chars('.rubric-la'),
				narrative: chars('.rubric-narrative'),
				translation: chars('.translation')
			};
		});

	await page.setViewportSize({ width: 1512, height: 982 });
	await page.goto('/pl/ordinarium/credo');
	await page.locator('input[type="range"]').fill('2');
	const wide = await measure();
	expect(wide.column, 'the column grows past the prose measure').toBeGreaterThan(38 * 16);
	expect(wide.latinChars, 'and the Latin line reaches a real measure').toBeGreaterThan(40);
	for (const [what, n] of [
		['the rubric', wide.rubric],
		['its narrative', wide.narrative],
		['the translation', wide.translation]
	] as const) {
		expect(n, `${what} is prose and stays readable`).toBeGreaterThan(40);
		expect(n, `${what} is prose and must not run the full column`).toBeLessThan(80);
	}

	// a phone is unchanged: the column is the screen
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/pl/ordinarium/credo');
	const phone = await measure();
	expect(phone.column, 'the phone still gets the whole width').toBe(390);
});

test('a word begins where its column begins', async ({ page }) => {
	// A word and its gloss share a column as wide as the longer of them.
	// Ruby centres both in it by default, which is invisible mid-line and
	// obvious at the head of one: "Fiat" over "niech się stanie" sat 26px
	// into its column and read as an indent the text does not have.
	//
	// Measured with a zero-width marker spliced in front of the text —
	// element rects and Ranges both report the COLUMN inside a ruby base,
	// not the glyphs, so they cheerfully report perfect alignment while
	// the page shows otherwise.
	await page.setViewportSize({ width: 700, height: 1100 });
	for (const url of ['/pl/orationes/pater-noster', '/en/ordinarium/credo']) {
		await page.goto(url);
		const worst = await page.evaluate(() => {
			let worst = { word: '', inset: 0 };
			for (const ruby of document.querySelectorAll('.verse.glossed ruby')) {
				const base = ruby.querySelector('.base');
				if (!base) continue;
				const m = document.createElement('span');
				m.style.cssText = 'display:inline-block;width:0;height:1em;vertical-align:baseline';
				base.insertBefore(m, base.firstChild);
				const inset = m.getBoundingClientRect().left - ruby.getBoundingClientRect().left;
				m.remove();
				if (inset > worst.inset)
					worst = { word: (base.textContent ?? '').trim().slice(0, 20), inset };
			}
			return worst;
		});
		expect(
			worst.inset,
			`${url}: “${worst.word}” is pushed into its column and reads as an indent`
		).toBeLessThan(4);
	}
});

test('a gloss of several words stays one gloss', async ({ page }) => {
	// The apparatus rests on one gloss standing under one word (Leipzig
	// rule 1), and one Latin word often needs several words to gloss it —
	// 49 of the 163 in the English Credo. "having suffered" broken over
	// two lines reads as two glosses of two different words.
	//
	// Leipzig joins these with periods (`come.out`). That is right for a
	// paper and wrong for someone praying, so the words stay and the break
	// is what goes.
	for (const [w, url] of [
		[280, '/pl/ordinarium/credo'],
		[320, '/en/ordinarium/credo'],
		[390, '/pl/ordo/canon']
	] as const) {
		await page.setViewportSize({ width: w, height: 1100 });
		await page.goto(url);
		const broken = await page.evaluate(() =>
			[...document.querySelectorAll('.verse.glossed rt')]
				.filter((r) => r.getClientRects().length > 1)
				.map((r) => (r.textContent ?? '').trim())
		);
		expect(broken, `${url} at ${w}px broke a gloss across lines`).toEqual([]);
	}
});

test('Latin, gloss and translation share one left edge', async ({ page }) => {
	// Three layers of the same verse, so they start on the same line. Two
	// separate regressions have broken this, both invisible to a test that
	// looks at element rects:
	//
	//   * the wash around a tapped word is drawn with horizontal padding on
	//     the ruby base, and horizontal padding on an inline box is LAYOUT —
	//     it pushed every Latin word 1.6px into its column while the gloss
	//     started at the column edge, so the glosses read as further left;
	//   * the translation block was indented to its own rule rather than to
	//     the verse's column, leaving it 16px left of the Latin.
	//
	// Measured with a zero-width marker, which is the only thing that sees
	// where text actually starts inside a ruby.
	for (const url of ['/en/orationes/pater-noster', '/pl/ordinarium/credo']) {
		await page.setViewportSize({ width: 760, height: 1200 });
		await page.goto(url);
		await page.locator('input[type="range"]').fill('2');
		const edges = await page.evaluate(() => {
			const boxStart = (el: Element) => {
				const s = document.createElement('span');
				s.style.cssText = 'display:inline-block;width:0;height:1em;vertical-align:baseline';
				el.insertBefore(s, el.firstChild);
				const x = s.getBoundingClientRect().left;
				s.remove();
				return x;
			};
			const verse = document.querySelector('.verse.glossed')!;
			const extra = verse.nextElementSibling?.classList.contains('seg-extra')
				? verse.nextElementSibling
				: document.querySelector('.seg-extra')!;
			return {
				latin: Math.round(boxStart(verse.querySelector('.base')!)),
				gloss: Math.round(boxStart(verse.querySelector('rt')!)),
				translation: Math.round(boxStart(extra.querySelector('.translation')!))
			};
		});
		const spread = Math.max(...Object.values(edges)) - Math.min(...Object.values(edges));
		expect(spread, `${url}: the three layers are ragged — ${JSON.stringify(edges)}`).toBeLessThan(
			2
		);
	}
});

test('a translation belongs to the verse above it', async ({ page }) => {
	// It sits one line-step under its own gloss row and clearly further
	// from the next verse. It used to pull itself UP by 0.45rem, which was
	// right while a glossed verse carried 1.42rem beneath it; once the
	// rhythm became uniform that negative jammed the translation into the
	// gloss row and marooned the next verse.
	await page.setViewportSize({ width: 760, height: 1200 });
	await page.goto('/en/orationes/pater-noster');
	await page.locator('input[type="range"]').fill('2');
	const gaps = await page.evaluate(() => {
		const c = document.createElement('canvas').getContext('2d')!;
		const ink = (el: Element) => {
			const cs = getComputedStyle(el);
			c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
			const m = c.measureText((el.textContent || 'x').trim());
			const probe = document.createElement('span');
			probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
			el.appendChild(probe);
			const b = probe.getBoundingClientRect().top;
			probe.remove();
			return { top: b - m.actualBoundingBoxAscent, bottom: b + m.actualBoundingBoxDescent };
		};
		const verses = [...document.querySelectorAll('.verse.glossed')];
		const tr = document.querySelector('.seg-extra .translation')!;
		const lastRt = [...verses[0].querySelectorAll('rt')].pop()!;
		return {
			toItsOwnVerse: ink(tr).top - ink(lastRt).bottom,
			toTheNextVerse: ink(verses[1].querySelector('.base')!).top - ink(tr).bottom
		};
	});
	expect(gaps.toItsOwnVerse, 'not jammed into the gloss row').toBeGreaterThan(8);
	expect(gaps.toTheNextVerse, 'and nearer its own verse than the next').toBeGreaterThan(
		gaps.toItsOwnVerse * 1.25
	);
});

test('the reading size is the only knob', async ({ page }) => {
	// Everything on a reading surface is a multiple of --reading: the type,
	// the rhythm, the mark gutter, and TextBody's own gloss geometry, which
	// used to convert through a hard-coded 1.45 in three places. This turns
	// the knob and re-runs the invariants that matter, which is the whole
	// point of having it be one knob — and is what a large-print setting
	// would rest on.
	await page.setViewportSize({ width: 820, height: 1200 });
	const sizes: Record<string, unknown> = {};
	for (const reading of ['1.45rem', '1.75rem', '2.1rem']) {
		await page.goto('/pl/ordinarium/qui-pridie');
		const m = await page.evaluate((reading) => {
			document.documentElement.style.setProperty('--reading', reading);
			const c = document.createElement('canvas').getContext('2d')!;
			const ink = (el: Element) => {
				const cs = getComputedStyle(el);
				c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
				const t = (el.textContent || 'x').trim();
				const mm = c.measureText(t);
				const probe = document.createElement('span');
				probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
				el.appendChild(probe);
				const b = probe.getBoundingClientRect().top;
				probe.remove();
				return { top: b - mm.actualBoundingBoxAscent, bottom: b + mm.actualBoundingBoxDescent };
			};
			const boxStart = (el: Element) => {
				const s = document.createElement('span');
				s.style.cssText = 'display:inline-block;width:0;height:1em;vertical-align:baseline';
				el.insertBefore(s, el.firstChild);
				const x = s.getBoundingClientRect().left;
				s.remove();
				return x;
			};
			const verses = [...document.querySelectorAll('.verse.glossed')];
			// the pairing is measured on a verse WITHOUT a raised initial: the
			// initial's tail reaches below the line by design, and `sink` gives
			// it room, so it is not the case the gloss/line ratio describes
			const v = verses.find(
				(x) => !x.querySelector('.initial') && x.querySelectorAll('ruby').length > 6
			)!;
			const rubies = [...v.querySelectorAll('ruby')];
			const rt = rubies[0].querySelector('rt')!;
			const y0 = rubies[0].getBoundingClientRect().top;
			const next = rubies.find((r) => r.getBoundingClientRect().top > y0 + 10);
			// the raised initial's tail must still clear the gloss beneath it
			const initial = document.querySelector('.initial');
			return {
				latinPx: parseFloat(getComputedStyle(v).fontSize),
				glossPx: parseFloat(getComputedStyle(rt).fontSize),
				markPx: parseFloat(getComputedStyle(document.querySelector('.mark')!).fontSize),
				pair: +(ink(rt).top - ink(rubies[0].querySelector('.base')!).bottom).toFixed(2),
				between: next ? +(ink(next).top - ink(rt).bottom).toFixed(2) : null,
				edges: [
					Math.round(boxStart(v.querySelector('.base')!)),
					Math.round(boxStart(v.querySelector('rt')!))
				],
				brokenGlosses: [...document.querySelectorAll('.verse.glossed rt')].filter(
					(r) => r.getClientRects().length > 1
				).length,
				splitTokens: [...document.querySelectorAll('.verse .token')].filter(
					(t) => t.getClientRects().length !== 1
				).length,
				initialClears: initial
					? +(ink(rt).top - initial.getBoundingClientRect().bottom).toFixed(2)
					: null
			};
		}, reading);
		sizes[reading] = m;

		expect(m.pair, `${reading}: the gloss touches its word`).toBeGreaterThan(3);
		expect(m.between, `${reading}: the next line is not clear of the gloss`).toBeGreaterThan(
			m.pair
		);
		expect(m.edges[0] - m.edges[1], `${reading}: Latin and gloss are ragged`).toBeLessThan(2);
		expect(m.brokenGlosses, `${reading}: a gloss broke across lines`).toBe(0);
		expect(m.splitTokens, `${reading}: a token fragmented`).toBe(0);
	}

	// and the apparatus grew WITH the face, rather than being left behind
	const [small, mid, large] = Object.values(sizes) as {
		latinPx: number;
		glossPx: number;
		markPx: number;
	}[];
	expect(mid.latinPx, 'the reading face follows the knob').toBeGreaterThan(small.latinPx);
	expect(large.latinPx).toBeGreaterThan(mid.latinPx);
	for (const [what, k] of [
		['the gloss', 'glossPx'],
		['the speaker mark', 'markPx']
	] as const) {
		const ratioSmall = small[k] / small.latinPx;
		const ratioLarge = large[k] / large.latinPx;
		expect(
			Math.abs(ratioLarge - ratioSmall),
			`${what} did not scale with the reading face`
		).toBeLessThan(0.02);
	}
});
