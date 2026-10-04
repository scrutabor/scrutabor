// Reading geometry, typography and selection surfaces.
import type { Page } from '@playwright/test';
import { setHelp, expect, test } from './fixtures';
import { interlinearGeometry } from './interlinear-geometry';

test('the header sits on one centre line', async ({ page }) => {
	// The row's controls centre on the title's own line — measured, not
	// eyeballed, and in both languages, because the words' lengths differ
	// differently in each (the rule survives the slider it was written
	// for: the mode words replaced the track, the centring stays).
	for (const url of [
		'/app/en/ordinarium/praefatio-dialogus',
		'/app/pl/ordinarium/praefatio-dialogus'
	]) {
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
				help: mid('.help'),
				part: mid('.picker'),
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
	await page.goto('/app/en/ordinarium/corpus-tuum');
	await page.evaluate(() => document.fonts.ready);
	const geometry = await page.locator('main').evaluate(interlinearGeometry);
	const first = geometry[0];
	const verse = geometry.filter((unit) => unit.verseId === first.verseId);
	const next = verse.find(
		(unit) => unit.sourceInk.baselines[0] > first.sourceInk.baselines[0] + 10
	)!;
	const nextVerse = geometry.find((unit) => unit.verseId !== first.verseId)!;
	expect(next, 'the first verse contains a wrapped reading line').toBeDefined();
	expect(nextVerse, 'a second verse exists').toBeDefined();
	const gaps = {
		pair: first.clearance,
		between: next.sourceInk.top - first.captionInk.bottom,
		// Different words have different ascenders. Comparing viscéribus' ink
		// with et's made an equal baseline step look 5px uneven. Measure row
		// advance independently of letter shape, retaining ink proximity above.
		lineStep: next.sourceInk.baselines[0] - first.sourceInk.baselines[0],
		verseStep: nextVerse.sourceInk.baselines[0] - verse.at(-1)!.sourceInk.baselines.at(-1)!
	};
	const captionStyle = await page
		.locator('rt')
		.first()
		.evaluate((element) => {
			const style = getComputedStyle(element);
			return { size: parseFloat(style.fontSize), slope: style.fontStyle };
		});
	expect(gaps.pair, 'the gloss is not touching its word').toBeGreaterThan(3);
	expect(gaps.between, 'the next line of the verse stands well clear').toBeGreaterThan(
		gaps.pair * 3
	);
	expect(
		Math.abs(gaps.verseStep - gaps.lineStep),
		'a verse break is the same step as a line break'
	).toBeLessThan(2);
	expect(captionStyle.size, 'the gloss is big enough to read').toBeGreaterThan(13);
	expect(captionStyle.slope, 'and upright at that size').toBe('normal');
});

test('a selection copies the Latin alone, no apparatus interleaved', async ({ page }) => {
	// The glosses are apparatus, not text: swept into a selection they
	// came out as "Dadaj mihimi intelléctum,zrozumienie…" (the owner
	// pasted it). The annotation and the margin marks exclude themselves;
	// what a reader copies is what the book prints as the text.
	await page.goto('/app/pl/psalmi/118-he');
	const text = await page.evaluate(() => {
		const verse = document.querySelector('.verse')!;
		const range = document.createRange();
		range.selectNodeContents(verse);
		const sel = getSelection()!;
		sel.removeAllRanges();
		sel.addRange(range);
		return sel.toString().trim();
	});
	expect(text).toBe(
		'Legem pone mihi, Dómine, viam iustificatiónum tuárum: et exquíram eam semper.'
	);
});

test('the highlight is one box, with air around the letters', async ({ page }) => {
	// The wash is a single rectangle painted behind the button — the ruby
	// column plus a little air — not a tint on base and rt separately:
	// those two boxes only agree in width while the gloss is the longer
	// half, and a word longer than its gloss came back as two ragged
	// rectangles (the owner saw it on scrutábor).
	await page.goto('/app/en/ordinarium/pater-noster?w=w022');
	const m = await page.evaluate(() => {
		const w = document.querySelector('button.word.selected')!;
		const token = w.closest('.token')!;
		const st = getComputedStyle(token, '::before');
		const b = token.getBoundingClientRect();
		const box = {
			left: b.left + parseFloat(st.left),
			right: b.right - parseFloat(st.right),
			top: b.top + parseFloat(st.top)
		};
		return {
			bg: st.backgroundColor,
			baseBg: getComputedStyle(w.querySelector('.base')!).backgroundColor,
			air: { left: b.left - box.left, right: box.right - b.right }
		};
	});
	expect(m.bg, 'the wash paints').not.toBe('rgba(0, 0, 0, 0)');
	expect(m.baseBg, 'and only once — the base itself carries none').toBe('rgba(0, 0, 0, 0)');
	expect(m.air.left, 'air before the letters').toBeGreaterThan(0);
	expect(m.air.right, 'air after them').toBeGreaterThan(0);
});

test('the highlight covers the whole of a raised initial', async ({ page }) => {
	// A raised initial protrudes beyond the physical line box. Its measured
	// reservation expands the permanent selection surface without changing
	// the token's dimensions or the line rhythm.
	for (const [url, letter] of [
		['/app/en/ordinarium/libera-nos?w=w001', 'L'], // reaches up
		['/app/en/ordinarium/quod-ore-sumpsimus?w=w001', 'Q'] // and down
	]) {
		await page.goto(url);
		const cover = await page.evaluate(() => {
			const w = [...document.querySelectorAll('button.word.selected')].find((b) =>
				b.querySelector('.initial')
			);
			if (!w) return null;
			const ini = w.querySelector('.initial')!;
			const c = document.createElement('canvas').getContext('2d')!;
			const cs = getComputedStyle(ini);
			c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
			const m = c.measureText(ini.textContent ?? '');
			const probe = document.createElement('span');
			probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
			ini.parentElement!.insertBefore(probe, ini.nextSibling);
			const baseline = probe.getBoundingClientRect().top;
			probe.remove();
			const token = w.closest('.token')!;
			const st = getComputedStyle(token, '::before');
			const b = token.getBoundingClientRect();
			return {
				top: baseline - m.actualBoundingBoxAscent - (b.top + parseFloat(st.top)),
				bottom: b.bottom - parseFloat(st.bottom) - (baseline + m.actualBoundingBoxDescent)
			};
		});
		expect(cover, `${url} has a selected initial`).not.toBeNull();
		expect(cover!.top, `${letter} pokes out of the top of its highlight`).toBeGreaterThan(0);
		expect(cover!.bottom, `${letter} pokes out of the bottom of its highlight`).toBeGreaterThan(0);
	}
});

test('a later word in an initialled verse does not inherit the initial highlight', async ({
	page
}) => {
	// The opening O needs a taller selection surface. Sancto is several wrapped
	// lines later in that same verse and must keep an ordinary surface: inheriting
	// the O's reservation made its hover/selection wash cover the gloss above.
	await page.setViewportSize({ width: 1440, height: 900 });
	const id = 'sancti-matthaei-apostoli-et-evangelistae-introitus.w032';
	await page.goto(`/app/pl/formularium/sancti-matthaei-apostoli-et-evangelistae?w=${id}`);
	await setHelp(page, 1);
	const selected = page.locator(`[id="${id}"]`);
	await expect(selected).toHaveClass(/selected/);

	const geometry = await selected.evaluate((word) => {
		const token = word.closest('.token')!;
		const verse = token.closest('.verse')!;
		const tokenBox = token.getBoundingClientRect();
		const wash = getComputedStyle(token, '::before');
		const previousTokens = [...verse.querySelectorAll('.token')].filter(
			(candidate) => candidate.getBoundingClientRect().top < tokenBox.top - 2
		);
		const previousLineTop = Math.max(
			...previousTokens.map((candidate) => candidate.getBoundingClientRect().top)
		);
		const previousGlossBottom = Math.max(
			...previousTokens
				.filter(
					(candidate) => Math.abs(candidate.getBoundingClientRect().top - previousLineTop) < 2
				)
				.flatMap((candidate) => [...candidate.querySelectorAll('rt')])
				.map((annotation) => annotation.getBoundingClientRect().bottom)
		);
		return {
			verseHasInitial: verse.querySelector('.initial') !== null,
			wordHasInitial: token.querySelector('.initial') !== null,
			washTop: tokenBox.top + Number.parseFloat(wash.top),
			previousGlossBottom,
			wordInset: Number.parseFloat(wash.top)
		};
	});

	expect(geometry.verseHasInitial).toBe(true);
	expect(geometry.wordHasInitial).toBe(false);
	expect(geometry.wordInset, 'the later word inherited the initial reservation').toBeGreaterThan(0);
	expect(
		geometry.washTop,
		'the later word highlight reaches visibly into the gloss above'
	).toBeGreaterThanOrEqual(geometry.previousGlossBottom - 1.5);
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
	await page.goto('/app/en/ordinarium/corpus-tuum');
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
	await page.goto('/app/pl/ordinarium/pater-noster');
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
	await page.goto('/app/pl/orationes/pater-noster');
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
	for (const url of [
		'/app/en/ordinarium/credo',
		'/app/pl/ordinarium/confiteor',
		'/app/pl/ordo/praeparatio'
	]) {
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

test('a reading page takes the screen it is given', async ({ page }) => {
	// The owner's report: on a laptop the app looked mobile-only. It was —
	// the column was a fixed 38rem, so a 1512px screen was 40% used and 10
	// of the Credo's 17 verses wrapped. 38rem is the right measure for
	// PROSE, but a glossed verse is not prose: every Latin word is as wide
	// as the gloss under it, so the line carried a median of 33 Latin
	// characters where ordinary setting wants 45-75. It was short of the
	// limit, not at it.
	//
	// This test used to carry a second half — "prose excepted" — holding
	// the rubrics and translations to a `ch` measure inside that wide
	// column. The owner withdrew the exception on 2026-08-09: every kind of
	// text now ends where the Latin ends, and that is asserted on the
	// EDGES, in px, by 'every kind of text ends where the Latin ends'.
	const measure = () =>
		page.evaluate(() => {
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
				latinChars: counts[Math.floor(counts.length / 2)]
			};
		});

	await page.setViewportSize({ width: 1512, height: 982 });
	await page.goto('/app/pl/ordinarium/credo');
	// interlinearnie: this test is about the GLOSSED measure the frame clamp was
	// sized for (the bare modes read at their own scale and measure,
	// asserted by the columns and book-measure tests)
	await setHelp(page, 1);
	const wide = await measure();
	expect(wide.column, 'the column grows past the prose measure').toBeGreaterThan(38 * 16);
	expect(wide.latinChars, 'and the Latin line reaches a real measure').toBeGreaterThan(40);

	// a phone is unchanged: the column is the screen
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/app/pl/ordinarium/credo');
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
	for (const url of ['/app/pl/orationes/pater-noster', '/app/en/ordinarium/credo']) {
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
		[280, '/app/pl/ordinarium/credo'],
		[320, '/app/en/ordinarium/credo'],
		[390, '/app/pl/ordo/canon']
	] as const) {
		await page.setViewportSize({ width: w, height: 1100 });
		await page.goto(url);
		const geometry = await page.locator('main').evaluate(interlinearGeometry);
		expect(geometry.length).toBeGreaterThan(0);
		const broken = geometry.filter(
			(unit) => unit.captionUnwrappedWidth < unit.availableWidth - 2 && unit.captionInk.rows > 1
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
	// At słowa the two layers are the Latin and its glosses; at stacked
	// przekład the Latin and its translation. Both pairs share one left
	// edge — the raggedness this test was written against.
	for (const url of ['/app/en/orationes/pater-noster', '/app/pl/ordinarium/credo']) {
		await page.setViewportSize({ width: 760, height: 1200 });
		await page.goto(url);
		await setHelp(page, 1);
		const glossed = await page.evaluate(() => {
			const boxStart = (el: Element) => {
				const s = document.createElement('span');
				s.style.cssText = 'display:inline-block;width:0;height:1em;vertical-align:baseline';
				el.insertBefore(s, el.firstChild);
				const x = s.getBoundingClientRect().left;
				s.remove();
				return x;
			};
			const verse = document.querySelector('.verse.glossed')!;
			return {
				latin: Math.round(boxStart(verse.querySelector('.base')!)),
				gloss: Math.round(boxStart(verse.querySelector('.caption-content')!))
			};
		});
		expect(
			Math.abs(glossed.latin - glossed.gloss),
			`${url}: gloss ragged against its Latin — ${JSON.stringify(glossed)}`
		).toBeLessThan(2);

		await setHelp(page, 2);
		const stacked = await page.evaluate(() => {
			const boxStart = (el: Element) => {
				const s = document.createElement('span');
				s.style.cssText = 'display:inline-block;width:0;height:1em;vertical-align:baseline';
				el.insertBefore(s, el.firstChild);
				const x = s.getBoundingClientRect().left;
				s.remove();
				return x;
			};
			const verse = document.querySelector('.verse')!;
			const extra = verse.nextElementSibling?.classList.contains('seg-extra')
				? verse.nextElementSibling
				: document.querySelector('.seg-extra')!;
			return {
				latin: Math.round(boxStart(verse.querySelector('.base')!)),
				translation: Math.round(boxStart(extra.querySelector('.translation')!))
			};
		});
		expect(
			Math.abs(stacked.latin - stacked.translation),
			`${url}: translation ragged against its Latin — ${JSON.stringify(stacked)}`
		).toBeLessThan(2);
	}
});

test('a stacked translation belongs to the verse above it', async ({ page }) => {
	// The narrow face of przekład: the translation sits close under its
	// own verse and clearly further from the next. There is no gloss row
	// in this mode any more — the margins that spent a year compensating
	// for one were retired with it, and the bounds here were set from ink
	// measurements of the fresh spacing (about 15-20px above against ~37
	// below at the default size).
	await page.setViewportSize({ width: 760, height: 1200 });
	await page.goto('/app/en/orationes/pater-noster');
	await setHelp(page, 2);
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
		const verses = [...document.querySelectorAll('.verse')];
		const tr = document.querySelector('.seg-extra .translation')!;
		const lastBase = [...verses[0].querySelectorAll('.base')].pop()!;
		return {
			toItsOwnVerse: ink(tr).top - ink(lastBase).bottom,
			toTheNextVerse: ink(verses[1].querySelector('.base')!).top - ink(tr).bottom
		};
	});
	expect(gaps.toItsOwnVerse, 'not touching its own verse').toBeGreaterThan(8);
	expect(gaps.toItsOwnVerse, 'not drifting from its own verse').toBeLessThan(26);
	expect(gaps.toTheNextVerse, 'and nearer its own verse than the next').toBeGreaterThan(
		gaps.toItsOwnVerse * 1.5
	);
});

test('the bilingual columns align verse and translation on one baseline', async ({ page }) => {
	// The wide face of przekład: the missal spread. Parity of type and
	// leading is what MAKES the rows true, and this holds it — the first
	// baseline of every translation sits on the first baseline of its own
	// verse, the raised initial's row included (the initial skips its
	// margin reservation in columns for exactly this reason). Probe spans
	// on the baseline, the one measurement a tall glyph cannot poison.
	await page.setViewportSize({ width: 1512, height: 1000 });
	await page.goto('/app/pl/ordinarium/gloria');
	await setHelp(page, 2);
	await expect(page.locator('.columns')).toBeVisible();
	const deltas = await page.evaluate(() => {
		const baselineOf = (el: Element) => {
			const probe = document.createElement('span');
			probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
			el.prepend(probe);
			const y = probe.getBoundingClientRect().top;
			probe.remove();
			return y;
		};
		const out: number[] = [];
		document.querySelectorAll('.columns > .verse').forEach((v) => {
			const sx = v.nextElementSibling;
			if (!sx || !sx.classList.contains('seg-extra')) return;
			const tr = sx.querySelector('.translation')!;
			const p = v.querySelector('p') ?? v;
			out.push(Math.abs(baselineOf(tr) - baselineOf(p)));
		});
		return out;
	});
	expect(deltas.length, 'the Gloria pairs its verses').toBeGreaterThan(8);
	for (const d of deltas) expect(d, 'a row drifted off its baseline').toBeLessThan(0.6);
});

test('the bare modes read at the bare scale, on the book measure', async ({ page }) => {
	// The day's two headline numbers, pinned: the bare modes read at 0.84
	// of the study size with 1.5 leading (the study face stays 1.45rem
	// with source leading 1.3 plus its intrinsic annotation row), and bare text is capped at the
	// 36rem book measure, centred on the title's axis. Nothing else
	// asserted these — the geometry shipped ungated for half a day.
	await page.setViewportSize({ width: 1512, height: 982 });
	await page.goto('/app/pl/ordinarium/credo');

	await setHelp(page, 0);
	const bare = await page.evaluate(() => {
		const v = document.querySelector('.measure .verse')!;
		const cs = getComputedStyle(v);
		const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
		const m = document.querySelector('.measure')!.getBoundingClientRect();
		const page = document.querySelector('.page h1')!.getBoundingClientRect();
		return {
			font: parseFloat(cs.fontSize) / root,
			leading: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize),
			measureRem: m.width / root,
			offCentre: Math.abs((m.left + m.right) / 2 - (page.left + page.right) / 2)
		};
	});
	expect(bare.font, 'the bare scale is 0.84 of the reading size').toBeCloseTo(1.45 * 0.84, 2);
	expect(bare.leading, 'the bare leading is 1.5').toBeCloseTo(1.5, 2);
	expect(bare.measureRem, 'bare text is capped at the book measure').toBeLessThanOrEqual(36.01);
	expect(bare.offCentre, 'the measure sits on the title axis').toBeLessThan(1);

	// and the study face is untouched by the bare knob
	await setHelp(page, 1);
	const study = await page.evaluate(() => {
		const cs = getComputedStyle(document.querySelector('.verse.glossed')!);
		const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
		return {
			font: parseFloat(cs.fontSize) / root,
			leading: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)
		};
	});
	expect(study.font, 'the study face keeps the full reading size').toBeCloseTo(1.45, 2);
	expect(study.leading, 'source leading matches the intrinsic reading pairs').toBeCloseTo(1.3, 2);
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
		await page.goto('/app/pl/ordinarium/qui-pridie');
		const markPx = await page.evaluate((reading) => {
			document.documentElement.style.setProperty('--reading', reading);
			return parseFloat(getComputedStyle(document.querySelector('.mark')!).fontSize);
		}, reading);
		await page.evaluate(() => document.fonts.ready);
		const units = await page.locator('main').evaluate(interlinearGeometry);
		expect(units.length).toBeGreaterThan(6);
		const first = units.find(
			(unit) =>
				units.filter((other) => other.verseId === unit.verseId).length > 6 &&
				!units.some((other) => other.verseId === unit.verseId && other.initial)
		)!;
		expect(first, 'a non-initial verse supplies the spacing control').toBeDefined();
		const next = units.find(
			(unit) =>
				unit.verseId === first.verseId &&
				unit.sourceInk.baselines[0] > first.sourceInk.baselines[0] + 10
		)!;
		expect(next, 'the control verse wraps').toBeDefined();
		sizes[reading] = { latinPx: first.fontSize, glossPx: first.captionFontSize, markPx };
		expect(first.clearance, `${reading}: the gloss touches its word`).toBeGreaterThan(3);
		expect(
			next.sourceInk.top - first.captionInk.bottom,
			`${reading}: the next line is not clear of the gloss`
		).toBeGreaterThan(first.clearance);
		for (const unit of units) {
			expect(Math.abs(unit.sourceLeft - unit.captionLeft), `${reading}: ragged pair`).toBeLessThan(
				2
			);
			expect(unit.captionInk.rows, `${reading}: a gloss broke across lines`).toBe(1);
			expect(unit.sourceInk.rows, `${reading}: a source fragmented`).toBe(1);
		}
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

test('the highlight marks the word AND its gloss', async ({ page }) => {
	// One continuous wash covers the visible Latin and caption, whichever is
	// wider. Font leading outside the painted glyphs is not part of this claim.
	for (const [url, kind] of [
		['/app/pl/orationes/pater-noster?w=w013', 'gloss longer'],
		['/app/pl/psalmi/118-he?w=w016', 'word longer']
	] as const) {
		await page.goto(url);
		const [unit] = await page.locator('.token.word-selected').evaluate(interlinearGeometry);
		expect(unit.paint, `${kind}: a selection surface exists`).not.toBeNull();
		const paint = unit.paint!;
		expect(paint.background, `${kind}: the wash paints`).not.toBe('rgba(0, 0, 0, 0)');
		for (const ink of [unit.sourceInk, unit.captionInk]) {
			expect(paint.left).toBeLessThanOrEqual(ink.left + 0.5);
			expect(paint.right).toBeGreaterThanOrEqual(ink.right - 0.5);
			expect(paint.top).toBeLessThanOrEqual(ink.top + 0.5);
			expect(paint.bottom).toBeGreaterThanOrEqual(ink.bottom - 0.5);
		}
		expect(paint.bottom - unit.captionInk.bottom, `${kind}: air under descenders`).toBeGreaterThan(
			1
		);
	}

	// with no gloss showing, there is nothing to mark but the word
	await page.goto('/app/pl/orationes/pater-noster?w=w013');
	await setHelp(page, 0);
	await expect(page.locator('.word.selected rt')).toHaveCount(0);
	const bare = await page.evaluate(
		() =>
			getComputedStyle(document.querySelector('.token.word-selected')!, '::before').backgroundColor
	);
	expect(bare, 'the word is still marked with the glosses off').not.toBe('rgba(0, 0, 0, 0)');
});

test('word selection outranks desktop hover and a phone tap', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 800 });
	await page.goto('/app/pl/orationes/angelus-domini?s=s02&w=w008');
	await setHelp(page, 1);

	const selectedBackground = () =>
		page.evaluate(
			() =>
				getComputedStyle(document.querySelector('.token.word-selected')!, '::before')
					.backgroundColor
		);
	const landed = await selectedBackground();
	await page.locator('#w008').hover();
	expect(await selectedBackground(), 'hover does not visually deselect the current word').toBe(
		landed
	);

	// A tap leaves :hover sticky in mobile browsers. That transient state
	// must never dilute the stronger, persistent selection state.
	await page.locator('#w009').click();
	await expect(page.locator('#w009')).toHaveClass(/selected/);
	expect(
		await page.locator('#w009').evaluate((word) => word.matches(':hover')),
		'the regression is exercised with sticky hover still active'
	).toBe(true);
	expect(await selectedBackground(), 'a tapped word is as distinct as a deep-linked word').toBe(
		landed
	);
});

// Measure visible ink on both sides of structural blocks. Range/font boxes
// contain ascender and descender space that the reader does not see.
const inkGaps = (page: Page) =>
	page.evaluate(() => {
		const ctx = document.createElement('canvas').getContext('2d')!;
		const edge = (el: Element, side: 'top' | 'bottom') => {
			const cs = getComputedStyle(el);
			const r = document.createRange();
			r.selectNodeContents(el);
			const rects = [...r.getClientRects()].filter((x) => x.height > 0);
			if (!rects.length) return null;
			const box = side === 'top' ? rects[0] : rects[rects.length - 1];
			ctx.font = cs.font;
			const m = ctx.measureText((el.textContent || 'Hxg').trim() || 'Hxg');
			const half = (box.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
			const base = box.top + half + m.fontBoundingBoxAscent;
			return side === 'top' ? base - m.actualBoundingBoxAscent : base + m.actualBoundingBoxDescent;
		};
		// Include both source and the actual caption, not rt's generated break.
		const edgeOf = (el: Element, side: 'top' | 'bottom') => {
			if (!el.classList.contains('verse')) return edge(el, side);
			const parts = [...el.querySelectorAll('.base, .caption-content')];
			const vals = (parts.length ? parts : [el])
				.map((e) => edge(e, side))
				.filter((x): x is number => x != null);
			return side === 'top' ? Math.min(...vals) : Math.max(...vals);
		};

		const rubrics: { above: number; below: number; txt: string }[] = [];
		document.querySelectorAll('.rubric').forEach((rb) => {
			const p = rb.previousElementSibling,
				n = rb.nextElementSibling;
			if (!p || !n || !n.classList.contains('verse')) return;
			const la = rb.querySelector('.rubric-la')!;
			const last = rb.querySelector('.rubric-narrative') ?? la;
			rubrics.push({
				above: edge(la, 'top')! - edgeOf(p, 'bottom')!,
				below: edgeOf(n, 'top')! - edge(last, 'bottom')!,
				txt: la.textContent!.trim().slice(0, 24)
			});
		});

		const labels: { above: number; below: number; txt: string }[] = [];
		document.querySelectorAll('.who').forEach((w) => {
			const p = w.previousElementSibling,
				n = w.nextElementSibling;
			if (!p || !n || !n.classList.contains('verse')) return;
			// A rubric or translation can end in a collapsed source disclosure.
			// Range rectangles include that disclosure's hidden contents in Chromium,
			// although no reader sees them. Measure from its visible summary instead.
			const visiblePrevious = p.classList.contains('rubric')
				? (p.querySelector('.rubric-narrative') ?? p.querySelector('.rubric-la') ?? p)
				: p.classList.contains('seg-extra')
					? (p.querySelector('.source-notes summary') ?? p.querySelector('.translation') ?? p)
					: p;
			labels.push({
				above: edge(w, 'top')! - edgeOf(visiblePrevious, 'bottom')!,
				below: edgeOf(n, 'top')! - edge(w, 'bottom')!,
				txt: w.textContent!.trim().slice(0, 24)
			});
		});

		const translations: { above: number; below: number; txt: string }[] = [];
		document.querySelectorAll('.seg-extra').forEach((sx) => {
			const p = sx.previousElementSibling,
				n = sx.nextElementSibling;
			const tr = sx.querySelector('.translation');
			if (!p || !n || !tr || !n.classList.contains('verse')) return;
			translations.push({
				above: edge(tr, 'top')! - edgeOf(p, 'bottom')!,
				below: edgeOf(n, 'top')! - edge(tr, 'bottom')!,
				txt: tr.textContent!.trim().slice(0, 24)
			});
		});
		return { rubrics, translations, labels };
	});

test('a rubric sits centrally between the verses it parts', async ({ page }) => {
	// It was 29px from the verse above and 18 from the one below; corrected,
	// it drifted back to 26/45 as soon as the glosses were showing, because
	// the correction was sized for the gloss row's overhang alone and the
	// leading is the larger half of it (owner, 2026-08-09). Balanced at
	// every reading mode, since each shows a different line-height.
	await page.goto('/app/pl/ordinarium/confiteor');

	for (const help of [0, 1, 2] as const) {
		await setHelp(page, help);
		const { rubrics } = await inkGaps(page);
		expect(rubrics.length, `a rubric stands between verses at help ${help}`).toBeGreaterThan(0);
		for (const g of rubrics) {
			expect(
				Math.max(g.above, g.below) / Math.min(g.above, g.below),
				`"${g.txt}" at help ${help}: ${Math.round(g.above)} above, ${Math.round(g.below)} below`
			).toBeLessThan(1.3);
		}
	}
});

test('a verse reserves the space its raised initial paints', async ({ page }) => {
	// The token paints the wash; the verse reserves the initial's extra reach.
	// Measure real ink rather than an obsolete inline-padding implementation.
	await page.goto('/app/en/ordo/praeparatio');
	const token = page.locator('.verse.glossed > .token:has(.initial)').first();
	await token.locator('button').hover();
	const [geometry] = await token.evaluate(interlinearGeometry);
	const m = await page.evaluate(() => {
		const verses = [...document.querySelectorAll('.verse')];
		const withCap = verses.find((v) => v.querySelector('.initial'))!;
		const plain = verses.find((v) => !v.querySelector('.initial'))!;
		return {
			painted: -parseFloat(
				getComputedStyle(withCap.querySelector('.token:has(.initial)')!, '::before').top
			),
			reserved: parseFloat(getComputedStyle(withCap).marginTop),
			plainReserves: parseFloat(getComputedStyle(plain).marginTop)
		};
	});

	expect(m.painted, 'the initial has a reserved paint reach').toBeGreaterThan(0);
	expect(m.reserved, 'and the verse reserves exactly that').toBeCloseTo(m.painted, 0);
	expect(geometry.sourceInk.count).toBeGreaterThan(0);
	expect(geometry.paint).not.toBeNull();
	expect(geometry.paint!.top, 'the complete raised initial is painted').toBeLessThan(
		geometry.sourceInk.top
	);
	// and no verse pays for a letter it does not carry
	expect(m.plainReserves, 'a verse without an initial reserves nothing').toBe(0);
});

test('a translation is attached to its verse without touching it', async ({ page }) => {
	// The stacked przekład, on a text with rubrics between the verses.
	// Both bounds matter: too little air and it touches, too much and it
	// stops belonging to the verse above, which is the one thing its
	// position has to say. The viewport is pinned narrow — wide, przekład
	// becomes the columns, whose alignment has its own test.
	await page.setViewportSize({ width: 760, height: 1200 });
	await page.goto('/app/pl/ordinarium/confiteor');
	await setHelp(page, 2);
	const { translations } = await inkGaps(page);

	expect(translations.length, 'the text has translations between verses').toBeGreaterThan(0);
	for (const g of translations) {
		expect(g.above, `"${g.txt}" touches its verse (${Math.round(g.above)}px)`).toBeGreaterThan(10);
		expect(g.above, `"${g.txt}" drifts from its verse (${Math.round(g.above)}px)`).toBeLessThan(26);
		expect(
			g.below / g.above,
			`"${g.txt}" is nearer its own verse (${Math.round(g.above)} above, ${Math.round(g.below)} below)`
		).toBeGreaterThan(1.5);
	}
});

test('a speaker label belongs to the verse below it', async ({ page }) => {
	// The label names the verse UNDER it, and has to look like it does.
	// Measured in glyphs it was the wrong way round as soon as the glosses
	// showed — 40 above and 22 below on bare Latin, 20 and 28 with the
	// glosses on, where it read as the tail of the verse above (owner,
	// 2026-08-09). Two causes, both invisible to the box model: the gloss
	// row hangs past the box above, and a glossed verse keeps a third of a
	// line of leading over its first glyph below.
	await page.goto('/app/pl/ordo/praeparatio');

	for (const help of [0, 1, 2] as const) {
		await setHelp(page, help);
		const { labels } = await inkGaps(page);
		expect(labels.length, `a label stands over a verse at help ${help}`).toBeGreaterThan(0);
		for (const g of labels) {
			expect(
				g.above,
				`"${g.txt}" at help ${help} clears what is above it (${Math.round(g.above)}px)`
			).toBeGreaterThan(10);
			expect(
				g.above / g.below,
				`"${g.txt}" at help ${help}: ${Math.round(g.above)} above, ${Math.round(g.below)} below`
			).toBeGreaterThan(1.2);
		}
	}
});

test('every kind of text ends where the Latin ends', async ({ page }) => {
	// One right margin on the page, not four (owner, 2026-08-09). Verse,
	// rubric, narrative and translation all run to the column's right
	// edge; none of them carries a measure of its own.
	//
	// This asserts EDGES, in px, deliberately. The rule it replaced was
	// three per-block `ch` caps tuned to land together — and `ch` is the
	// width of a zero in whatever font actually loaded, so the three that
	// sat within 4px on a Mac sat 40px apart on the Linux runner.
	// Pinned to the STACKED przekład: in the bilingual columns the two
	// languages have a right edge each, by design — the one-margin rule
	// is the one-column rule.
	await page.setViewportSize({ width: 760, height: 900 });
	await page.goto('/app/pl/ordinarium/orate-fratres');
	await setHelp(page, 2);

	const edges = await page.evaluate(() => {
		// the right edge of a block's CONTENT box — where its line can reach
		const contentRight = (el: Element) => {
			const cs = getComputedStyle(el);
			return (
				el.getBoundingClientRect().right -
				parseFloat(cs.paddingRight) -
				parseFloat(cs.borderRightWidth)
			);
		};
		const of = (sel: string) =>
			[...document.querySelectorAll(sel)].map((e) => Math.round(contentRight(e)));
		return {
			verse: of('.verse'),
			rubricLa: of('.rubric-la'),
			narrative: of('.rubric-narrative'),
			translation: of('.translation')
		};
	});

	expect(edges.verse.length, 'the page carries verses').toBeGreaterThan(0);
	const latin = Math.max(...edges.verse);

	for (const kind of ['rubricLa', 'narrative', 'translation'] as const) {
		expect(edges[kind].length, `the page carries ${kind}`).toBeGreaterThan(0);
		for (const right of edges[kind]) {
			expect(right, `${kind} ends where the Latin ends (Latin ${latin})`).toBeGreaterThan(
				latin - 2
			);
			expect(right, `${kind} does not overrun the Latin (Latin ${latin})`).toBeLessThan(latin + 2);
		}
	}
});

test('a translation wraps to its column, never to a private cap', async ({ page }) => {
	// The symptom that started this rule: capped at 56ch, translations
	// broke at little more than half the width their column offered. The
	// original assertion — "does not wrap where its Latin did not" — was
	// only ever true on wide screens: Polish runs longer than its Latin,
	// so on a narrow page an UNCAPPED translation can honestly wrap under
	// a one-line verse. What is invariant at every width is the cap's
	// absence itself: a translation that wraps used its whole measure
	// first. (text-wrap: pretty may hold the last word back — one word of
	// slack is the difference between an orphan spared and a cap.)
	await page.setViewportSize({ width: 760, height: 900 });
	await page.goto('/app/pl/ordinarium/lavabo');
	await setHelp(page, 2);

	const m = await page.evaluate(() => {
		const offences: string[] = [];
		let total = 0;
		document.querySelectorAll('.seg-extra .translation').forEach((tr) => {
			total += 1;
			// line boxes come from a RANGE — a block's own getClientRects is
			// one rect, and a first version of this test skipped every
			// translation through that hole
			const range = document.createRange();
			range.selectNodeContents(tr);
			const lines = [...range.getClientRects()].filter((r) => r.height > 4);
			if (lines.length < 2) return;
			const box = tr.getBoundingClientRect();
			const cs = getComputedStyle(tr);
			const avail = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
			const widest = Math.max(...lines.map((r) => r.width));
			if (widest < avail * 0.8) {
				offences.push(
					`${tr.textContent!.trim().slice(0, 40)} (${Math.round(widest)}/${Math.round(avail)})`
				);
			}
		});
		return { offences, total };
	});

	expect(m.total, 'the psalm carries its translations').toBeGreaterThan(5);
	expect(m.offences, 'a translation broke short of its measure').toEqual([]);
});
