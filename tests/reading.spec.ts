// The reading experience: help ladder, panel layers, cross-reference jumps.
import type { Page } from '@playwright/test';
import { atRoute, expect, settled, test } from './fixtures';

const AVE = '/app/pl/orationes/ave-maria';
const CONFITEOR = '/app/pl/ordinarium/confiteor';

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

test('standalone Ordinary prayers omit process rubrics but keep textual directions', async ({
	page
}) => {
	// The catalogue is a shelf of prayers, not a second walk through Mass.
	// Opening rubrics depend on the preceding action ("then", "when the
	// Preface is finished") and belong in Ordo Missæ. Directions attached
	// to words within a prayer still help when that prayer is opened alone.
	for (const slug of ['kyrie', 'gloria', 'sanctus']) {
		await page.goto(`/app/pl/ordinarium/${slug}`);
		await expect(page.locator('main > .rubric')).toHaveCount(0);
	}

	await page.goto('/app/pl/ordinarium/confiteor');
	await expect(page.locator('main > .rubric')).toHaveCount(1);
	await expect(page.locator('main > .rubric')).toContainText('Percutiunt sibi pectus ter');

	await page.goto('/app/pl/ordinarium/credo');
	await expect(page.locator('main > .rubric')).toHaveCount(1);
	await expect(page.locator('main > .rubric')).toContainText('Hic genuflectitur');

	await page.goto('/app/pl/ordinarium/agnus-dei');
	await expect(page.locator('main > .rubric')).toHaveCount(1);
	await expect(page.locator('main > .rubric')).toContainText('In Missis Defunctorum');

	// The continuous Ordo retains the complete ritual context.
	await page.goto('/app/pl/ordo/catechumenorum');
	await expect(
		page.locator('.rubric-la', {
			hasText: 'Qua finita, iunctis manibus, et alternatim cum Ministris, dicit'
		})
	).toBeVisible();
});

test('the standalone Kyrie does not contradict its participation label', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/kyrie');
	await expect(page.locator('.rubric-narrative')).toHaveCount(0);
	await expect(page.locator('.who-name')).toHaveText('wierni');
});

test('a suppressed opening rubric leaves no empty ritual step', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/kyrie');
	const gap = await page.evaluate(() => {
		const header = document.querySelector('header')!.getBoundingClientRect();
		const first = document.querySelector('main > :not(.rubric-anchor)')!.getBoundingClientRect();
		return first.top - header.bottom;
	});
	expect(gap).toBeLessThan(8);
});

test('a speaker label clears the raised initial below it', async ({ page }) => {
	for (const width of [390, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/app/pl/ordinarium/confiteor');

		for (const help of ['0', '1']) {
			await page.locator('input[type="range"]').fill(help);
			const clearance = await page.evaluate(() => {
				const label = document.querySelector('main .who')!.getBoundingClientRect();
				const initial = document.querySelector('main .initial')!.getBoundingClientRect();
				return initial.top - label.bottom;
			});
			expect(clearance, `${width}px viewport, help ${help}`).toBeGreaterThan(1.5);
		}
	}
});

test('a prayer identifies its translation sources once after the text', async ({ page }) => {
	await page.goto('/app/pl/psalmi/118-he');
	await page.locator('input[type="range"]').fill('2');
	const verse = page.locator('#v34 + .seg-extra');
	await expect(verse.locator('.translation')).toContainText('Daj mi zrozumienie');
	await expect(page.locator('.seg-extra details.source-notes')).toHaveCount(0);
	const sources = page.locator('main .translation-sources details.source-notes');
	await expect(sources).toHaveCount(1);
	await expect(sources.getByText('źródła', { exact: true })).toBeVisible();
	await sources.locator('summary').click();
	await expect(sources).toContainText('Biblia w przekładzie ks. Jakuba Wujka (1923)');
	await expect(sources).toContainText('Ps 118, 34');
	await expect(sources.getByRole('link', { name: 'pełna bibliografia' })).toHaveAttribute(
		'href',
		'/app/pl/bibliographia'
	);
});

test('a litany prints long response series once and keeps deep-linked repetitions available', async ({
	page
}) => {
	await page.goto('/app/pl/litaniae/lauretanae');

	// Four Miserere and fifty-five Ora responses become two prayer-book
	// conventions: the first response followed by an ellipsis.
	await expect(page.locator('#s007')).toBeVisible();
	await expect(page.locator('#s009')).toBeHidden();
	await expect(page.locator('#s015')).toBeVisible();
	await expect(page.locator('#s017')).toBeHidden();
	await expect(page.locator('.response-continuation > [aria-hidden="true"]')).toHaveText([
		'…',
		'…'
	]);

	// Concordance links retain their exact occurrence. Selecting one of the
	// compacted responses reveals that line and opens the ordinary word panel.
	await page.goto('/app/pl/litaniae/lauretanae?w=w044');
	await expect(page.locator('#s017')).toBeVisible();
	await expect(page.locator('#w044')).toHaveClass(/selected/);
	await expect(page.locator('aside')).toBeVisible();

	await page.locator('input[type="range"]').fill('2');
	await expect(page.locator('main .translation-sources details.source-notes')).toHaveCount(1);
	await expect(page.locator('.seg-extra details.source-notes')).toHaveCount(0);
});

test('word panel separates context, dictionary, grammar and verification', async ({ page }) => {
	await page.goto(AVE);
	await page.locator('#w019').click(); // Mater
	const panel = page.locator('aside');
	await expect(panel.locator('.form')).toHaveText('Mater');
	// Pronunciation belongs to the selected form and is available before
	// contextual or reference material requires any scrolling.
	await expect(panel.locator('header .pronunciation-lead .pron')).toBeVisible();
	await expect(panel.locator('.layer .pron')).toHaveCount(0);
	const headingRows = await panel.locator('header').evaluate((header) => {
		const title = header.querySelector('.form')!.getBoundingClientRect();
		const pronunciation = header.querySelector('.pronunciation-lead')!.getBoundingClientRect();
		const titleStyle = getComputedStyle(header.querySelector('.form')!);
		const pronunciationStyle = getComputedStyle(header.querySelector('.pronunciation-lead')!);
		return {
			titleCenter: title.top + title.height / 2,
			pronunciationCenter: pronunciation.top + pronunciation.height / 2,
			titleAlign: titleStyle.textAlign,
			pronunciationAlign: pronunciationStyle.textAlign
		};
	});
	expect(Math.abs(headingRows.pronunciationCenter - headingRows.titleCenter)).toBeLessThanOrEqual(
		3
	);
	expect(headingRows.titleAlign).toBe('left');
	expect(headingRows.pronunciationAlign).toBe('left');
	await expect(panel.locator('.layer-label')).toHaveText(['hasło', 'forma']);
	await expect(panel.locator('.head')).not.toContainText('›');
	// The answer to the reading question comes first.
	await expect(panel.locator('.context-layer')).toHaveAttribute(
		'aria-label',
		'znaczenie w\u00a0kontekście'
	);
	await expect(panel.locator('.context-layer .gloss')).toHaveText('Matko');
	await expect(panel.locator('.context-layer .function')).toContainText('Apozycja');
	// Meaning and explanation read as one ordinary editorial line, like the
	// dictionary prose below. Weight and the dash express their hierarchy;
	// wrapping is left to normal inline text flow.
	const contextType = await panel.locator('.context-layer').evaluate((layer) => {
		const gloss = getComputedStyle(layer.querySelector('.gloss')!);
		const fn = getComputedStyle(layer.querySelector('.function')!);
		const copyStyle = getComputedStyle(layer.querySelector('.context-copy')!);
		const copy = layer.querySelector('.context-copy')!.getBoundingClientRect();
		const title = layer.closest('aside')!.querySelector('.form')!.getBoundingClientRect();
		return {
			glossFamily: gloss.fontFamily,
			functionFamily: fn.fontFamily,
			glossSize: parseFloat(gloss.fontSize),
			functionSize: parseFloat(fn.fontSize),
			glossStyle: gloss.fontStyle,
			glossWeight: Number(gloss.fontWeight),
			functionWeight: Number(fn.fontWeight),
			functionColor: fn.color,
			functionLineHeight: fn.lineHeight,
			copyDisplay: copyStyle.display,
			copyLeft: copy.left,
			titleLeft: title.left
		};
	});
	expect(contextType.glossFamily).toBe(contextType.functionFamily);
	expect(contextType.glossSize).toBeCloseTo(contextType.functionSize, 1);
	expect(contextType.glossStyle).toBe('normal');
	expect(contextType.glossWeight).toBeGreaterThan(contextType.functionWeight);
	expect(contextType.copyDisplay).toBe('block');
	expect(contextType.copyLeft).toBeCloseTo(contextType.titleLeft, 1);
	await expect(panel.locator('.context-separator')).toHaveText('—');
	// The dictionary identity is a separate layer.
	await expect(panel.locator('.head a')).toHaveAttribute('href', '/app/pl/lemma/mater');
	await expect(panel.locator('.head')).toContainText('mater, matris');
	await expect(panel.locator('.head')).toContainText('— matka');
	// So is the strict parse, with its concept-linked term.
	await expect(panel.locator('.morph')).toContainText('wołacz');
	await expect(panel.locator('.morph a.concept')).toHaveAttribute(
		'href',
		'/app/pl/grammatica/vocativus'
	);
	const referenceType = await panel.evaluate((card) => {
		const head = getComputedStyle(card.querySelector('.head')!);
		const morph = getComputedStyle(card.querySelector('.morph')!);
		return {
			headSize: parseFloat(head.fontSize),
			morphSize: parseFloat(morph.fontSize),
			headColor: head.color,
			morphColor: morph.color,
			headLineHeight: head.lineHeight,
			morphLineHeight: morph.lineHeight
		};
	});
	expect(referenceType.headSize).toBeCloseTo(referenceType.morphSize, 1);
	expect(referenceType.headColor).toBe(referenceType.morphColor);
	expect(referenceType.headLineHeight).toBe(referenceType.morphLineHeight);
	expect(contextType.functionSize).toBeCloseTo(referenceType.headSize, 1);
	expect(contextType.functionColor).toBe(referenceType.headColor);
	expect(contextType.functionLineHeight).toBe(referenceType.headLineHeight);
	// The compact heading is a wide-panel improvement. On a phone the full
	// pronunciation gets its own row instead of being squeezed beside the
	// selected form and the close button.
	await page.setViewportSize({ width: 375, height: 800 });
	const narrowHeading = await panel.locator('header').evaluate((header) => {
		const title = header.querySelector('.form')!.getBoundingClientRect();
		const pronunciation = header.querySelector('.pronunciation-lead')!.getBoundingClientRect();
		const copy = header
			.parentElement!.querySelector('.context-layer .context-copy')!
			.getBoundingClientRect();
		return {
			titleBottom: title.bottom,
			pronunciationTop: pronunciation.top,
			titleLeft: title.left,
			copyLeft: copy.left
		};
	});
	expect(narrowHeading.pronunciationTop).toBeGreaterThanOrEqual(narrowHeading.titleBottom);
	expect(narrowHeading.copyLeft).toBeCloseTo(narrowHeading.titleLeft, 1);
	// The short technical provenance line remains visible without acquiring
	// another heading of its own.
	const verification = panel.locator('.verification');
	await expect(verification.locator('summary')).toHaveCount(0);
	await expect(verification.locator('.meta')).toBeVisible();
	await expect(verification.locator('.meta')).toContainText('zaakceptowane');
	await expect(verification.locator('.meta')).toContainText('opracowanie, Whitaker, Collatinus');
});

test('dictionary and grammar layers keep a modest shared indent', async ({ page }) => {
	// The label column used to grow into a broad empty field at the largest
	// reading size. Keep the two bodies aligned, but close enough to their
	// short labels that they still read as one row.
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/app/pl/orationes/pater-noster?w=w007');
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.reload();
	await settled(page);

	const geometry = await page.locator('aside .layer:not(.context-layer)').evaluateAll((layers) => {
		const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
		return {
			root,
			rows: layers.map((layer) => {
				const row = layer.getBoundingClientRect();
				const body = layer.querySelector('.layer-body')!.getBoundingClientRect();
				return { indent: body.left - row.left, left: body.left };
			})
		};
	});
	expect(geometry.rows).toHaveLength(2);
	expect(geometry.rows[0].left).toBeCloseTo(geometry.rows[1].left, 1);
	for (const row of geometry.rows) {
		expect(row.indent, 'the label column became an oversized empty field').toBeLessThanOrEqual(
			geometry.root * 5.3
		);
	}
});

test('a proper name absent from one analyzer names its true confirmers', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/confiteor?w=w009'); // Michaéli
	const meta = page.locator('aside .meta');
	await expect(meta).toContainText('opracowanie, Collatinus');
	await expect(meta).not.toContainText('Whitaker,');
});

test('a lemma-level note appears on every token of the lemma', async ({ page }) => {
	await page.goto(`${AVE}?w=w031`); // Amen
	const panel = page.locator('aside');
	await expect(panel.locator('.note')).toContainText('Hebrajskie');
	const dictionaryType = await panel.evaluate((card) => {
		const head = getComputedStyle(card.querySelector('.head')!);
		const note = getComputedStyle(card.querySelector('.note')!);
		return {
			headSize: parseFloat(head.fontSize),
			noteSize: parseFloat(note.fontSize),
			headColor: head.color,
			noteColor: note.color,
			headLineHeight: head.lineHeight,
			noteLineHeight: note.lineHeight
		};
	});
	expect(dictionaryType.noteSize).toBeCloseTo(dictionaryType.headSize, 1);
	expect(dictionaryType.noteColor).toBe(dictionaryType.headColor);
	expect(dictionaryType.noteLineHeight).toBe(dictionaryType.headLineHeight);
});

test('cross-references in notes jump to the referenced word', async ({ page }) => {
	await page.goto(CONFITEOR);
	await page.locator('#w006').click(); // semper — note points to „Vírgini” (w007)
	await expect(page.locator('aside .form')).toHaveText('semper');
	await page.locator('aside .xref', { hasText: 'Vírgini' }).click();
	await expect(page.locator('aside .form')).toHaveText('Vírgini');
	await expect(page.locator('#w007')).toBeInViewport();
});

test('the English locale renders its own gloss layer', async ({ page }) => {
	await page.goto('/app/en/orationes/ave-maria');
	await expect(page.locator('rt').first()).toHaveText('hail');
	await page.locator('#w019').click();
	await expect(page.locator('aside .head')).toContainText('— mother');
});

test('pronunciation line shows both traditions on the Polish interface', async ({ page }) => {
	await page.goto('/app/pl/orationes/pater-noster?w=w006'); // cælis
	const pron = page.locator('aside .pron');
	await expect(pron).toContainText('cæ-lis');
	await expect(pron).toContainText('rz.');
	await expect(pron).toContainText('/ˈtʃɛ.lis/');
	await expect(pron).toContainText('pol.');
	await expect(pron).toContainText('/ˈtsɛ.lis/');
});

test('a pronunciation moves to the next line as one unit', async ({ page }) => {
	// At the largest reading size Sanctificétur used to split the Roman IPA
	// inside /…/ when the remaining part of the line was too short. A label,
	// transcription and its preceding middot travel together instead.
	await page.setViewportSize({ width: 800, height: 600 });
	await page.goto('/app/pl/orationes/pater-noster?w=w007');
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.reload();
	await settled(page);

	const units = page.locator('aside .pron-unit');
	await expect(units).toHaveCount(2);
	const fragments = await units.evaluateAll((items) =>
		items.map((item) => item.getClientRects().length)
	);
	expect(fragments, 'an IPA transcription split across lines').toEqual([1, 1]);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth
		),
		'keeping the transcription together caused horizontal scrolling'
	).toBe(false);
});

test('pronunciation line shows Roman only on the English interface', async ({ page }) => {
	await page.goto('/app/en/orationes/pater-noster?w=w006');
	const pron = page.locator('aside .pron');
	await expect(pron).toContainText('/ˈtʃɛ.lis/');
	await expect(pron).not.toContainText('rz.');
	await expect(pron).not.toContainText('pol.');
});

test('identical traditions collapse to one transcription', async ({ page }) => {
	await page.goto('/app/pl/orationes/ave-maria?w=w019'); // Mater
	const pron = page.locator('aside .pron');
	await expect(pron).toContainText('Ma-ter');
	await expect(pron).toContainText('/ˈma.tɛr/');
	await expect(pron).not.toContainText('rz.');
});

test('the Gloria reads with narrative, panel and provenance', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/gloria?w=w041'); // Agnus
	const panel = page.locator('aside');
	await expect(panel.locator('.form')).toHaveText('Agnus');
	await expect(panel.locator('.gloss')).toHaveText('Baranku');
	// the nominative-as-address note cross-links its vocative anchor
	await expect(panel.locator('.function')).toContainText('Mianownik');
	await expect(panel.locator('.meta')).toContainText('opracowanie, Whitaker, Collatinus');
	// single-analyzer override: déxteram is confirmed by Whitaker's alone,
	// against the document's both-analyzers default
	await page.goto('/app/pl/ordinarium/gloria?w=w061');
	await expect(panel.locator('.meta')).toContainText('opracowanie, Whitaker');
	await expect(panel.locator('.meta')).not.toContainText('Collatinus');
	// the superlative links its grammar concept and the lemma page resolves
	await page.goto('/app/en/ordinarium/gloria?w=w074'); // Altissimus
	await expect(panel.locator('.gloss')).toHaveText('Most High');
	await panel.locator('.head a').click();
	await expect(page).toHaveURL(atRoute('lemma/altus'));
	await expect(page.locator('.head-senses')).toContainText('high');
});

test('no token ever fragments across lines, any text, narrow viewport', async ({ page }) => {
	// A token (word + trailing punctuation) is atomic: an inline element
	// that fragments across lines reports multiple client rects — so one
	// rect per token IS the no-orphaned-punctuation invariant, wherever
	// the line breaks happen to fall.
	await page.setViewportSize({ width: 320, height: 900 });
	for (const path of [
		'/app/pl/ordinarium/gloria',
		'/app/pl/ordinarium/confiteor',
		'/app/pl/orationes/pater-noster',
		'/app/pl/orationes/ave-maria',
		'/app/pl/orationes/gloria-patri',
		'/app/pl/orationes/angelus-domini',
		'/app/pl/orationes/sub-tuum-praesidium'
	]) {
		await page.goto(path);
		await page.locator('details.repeated-prayer').evaluateAll((details) => {
			for (const detail of details) (detail as HTMLDetailsElement).open = true;
		});
		await expect(page.locator('.verse .token').first()).toBeVisible();
		const fragmented = await page.evaluate(() =>
			[...document.querySelectorAll('.verse .token')]
				.filter((t) => t.getClientRects().length !== 1)
				.map((t) => t.querySelector('button')?.id ?? '?')
		);
		expect(fragmented, path).toEqual([]);
	}
});

test('Angelus keeps responses visible and folds the repeated Ave Maria texts', async ({ page }) => {
	await page.goto('/app/pl/orationes/angelus-domini');
	await expect(page.getByRole('button', { name: /Versículus.*prowadzącej/ }).first()).toBeVisible();
	await expect(page.getByRole('button', { name: /Responsórium.*wiernych/ }).first()).toBeVisible();
	await expect(page.locator('.who-name')).toHaveCount(0);
	await page
		.getByRole('button', { name: /Versículus.*prowadzącej/ })
		.first()
		.click();
	await expect(page.getByText('werset osoby prowadzącej modlitwę')).toBeVisible();
	await expect(page.getByText('mówią wszyscy razem')).toHaveCount(0);
	await page.getByRole('button', { name: 'Zamknij' }).click();
	const repetitions = page.locator('details.repeated-prayer');
	await expect(repetitions).toHaveCount(3);
	await expect(repetitions.first().locator('summary')).toContainText('Ave María, grátia plena…');
	const foldGeometry = await repetitions.first().evaluate((detail) => {
		const title = detail.querySelector<HTMLElement>('.repeated-title')!;
		const action = detail.querySelector<HTMLElement>('.repeated-action')!;
		const previous = detail.previousElementSibling!;
		const next = detail.nextElementSibling!;
		const titleRect = title.getBoundingClientRect();
		const actionRect = action.getBoundingClientRect();
		const previousGlosses = [...previous.querySelectorAll('rt')].map((rt) =>
			rt.getBoundingClientRect()
		);
		const nextLatin = next.querySelector<HTMLElement>('.base')!.getBoundingClientRect();
		return {
			controlOffset:
				Math.abs(titleRect.top + titleRect.bottom - actionRect.top - actionRect.bottom) / 2,
			spaceOffset: Math.abs(
				titleRect.top -
					Math.max(...previousGlosses.map((rect) => rect.bottom)) -
					(nextLatin.top - titleRect.bottom)
			)
		};
	});
	expect(foldGeometry.controlOffset).toBeLessThanOrEqual(1);
	// The self-contained file artifact uses a slightly different font metric,
	// but the two pieces of whitespace must still read as one balanced gap.
	expect(foldGeometry.spaceOffset).toBeLessThanOrEqual(8);
	await expect(repetitions.first()).not.toHaveAttribute('open', '');
	const summaryGap = () =>
		repetitions.first().evaluate((detail) => {
			const summary = detail.querySelector('summary')!;
			return (
				summary.getBoundingClientRect().top -
				detail.previousElementSibling!.getBoundingClientRect().bottom
			);
		});
	const foldedSummaryGap = await summaryGap();
	await repetitions.first().locator('summary').click();
	await expect(repetitions.first()).toHaveAttribute('open', '');
	const openSummaryGap = await summaryGap();
	expect(Math.abs(openSummaryGap - foldedSummaryGap)).toBeLessThanOrEqual(1);
	await expect(repetitions.first().locator('.mark')).toHaveCount(0);
	await expect(repetitions.first().getByRole('button', { name: /^Ave / })).toBeVisible();
});

test('Sub tuum separates the antiphon from the extended form', async ({ page }) => {
	await page.goto('/app/pl/orationes/sub-tuum-praesidium');
	const shortForm = page.getByRole('button', { name: 'antyfona' });
	const longForm = page.getByRole('button', { name: 'forma rozszerzona' });
	await expect(shortForm).toHaveAttribute('aria-pressed', 'true');
	await expect(longForm).toHaveAttribute('aria-pressed', 'false');
	await expect(page.locator('button#w025')).toHaveCount(0);
	await longForm.click();
	await expect(longForm).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('button#w001')).toHaveCount(1);
	await expect(page.locator('button#w025')).toBeVisible();
	await page.getByRole('button', { name: 'o modlitwie' }).click();
	await expect(page.getByRole('complementary', { name: 'o modlitwie' })).toContainText(
		'Podstawową formę stanowi antyfona'
	);
	await page.goto('/app/pl/orationes/angelus-domini');
	await page.goto('/app/pl/orationes/sub-tuum-praesidium');
	await expect(page.getByRole('button', { name: 'forma rozszerzona' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await page.reload();
	await expect(page.getByRole('button', { name: 'forma rozszerzona' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(page.locator('button#w025')).toBeVisible();
});

test('the about sheet is closed at every slider position, opens on demand', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/gloria');
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
	await expect(sheet).toContainText('pieśni aniołów');
	const after = await page.locator('.verse').first().boundingBox();
	expect(after?.y).toBe(before?.y);
	// escape closes it; a fresh load starts closed
	await page.keyboard.press('Escape');
	await expect(sheet).not.toBeVisible();
	await pill.click();
	await page.goto('/app/pl/ordinarium/gloria');
	await expect(sheet).not.toBeVisible();
});

test('the about sheet and the word panel take turns', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/gloria?w=w001');
	await expect(page.locator('aside .form')).toHaveText('Glória');
	await page.locator('.about-pill').click();
	await expect(page.locator('aside.about-sheet')).toBeVisible();
	await expect(page.locator('aside .form')).not.toBeVisible();
	await page.locator('#w002').click();
	await expect(page.locator('aside.about-sheet')).not.toBeVisible();
	await expect(page.locator('aside .form')).toHaveText('in');
});

test('the about sheet speaks the interface language', async ({ page }) => {
	await page.goto('/app/en/orationes/pater-noster');
	const pill = page.locator('.about-pill');
	await expect(pill).toContainText('about this prayer');
	await pill.click();
	await expect(page.locator('aside.about-sheet')).toContainText("Lord's Prayer");
});

test('a doctrinal distinction shows its exact source only on request', async ({ page }) => {
	await page.goto('/app/en/ordinarium/misereatur');
	await page.locator('.about-pill').click();
	const sources = page.locator('aside.about-sheet details.source-notes');
	await expect(sources.locator('summary')).toHaveText('sources');
	await expect(sources.getByRole('link')).not.toBeVisible();
	await sources.locator('summary').click();
	await expect(
		sources.getByRole('link', { name: 'Catechismus Catholicae Ecclesiae' })
	).toHaveAttribute('href', 'https://press.vatican.va/archive/catechism_lt/p2s2c2a4_lt.htm');
	await expect(sources).toContainText('n. 1449');
});

test('the Credo reads with participles in the panel', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/credo?w=w064'); // incarnátus
	const panel = page.locator('aside');
	await expect(panel.locator('.form')).toHaveText('incarnátus');
	await expect(panel.locator('.morph')).toContainText('imiesłów');
	await expect(panel.locator('.morph')).toContainText('perfectum');
	await expect(panel.locator('.function')).toContainText('incarnátus est');
	// deponent participle keeps its concept link
	await page.goto('/app/en/ordinarium/credo?w=w083'); // passus
	await expect(panel.locator('.morph')).toContainText('participle');
	await expect(panel.locator('.morph a.concept', { hasText: 'deponent' })).toBeVisible();
	// the feminine dies ruling surfaces in the parse line
	await page.goto('/app/pl/ordinarium/credo?w=w090'); // die
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
	await page.goto('/app/pl/ordinarium/credo');
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
	await page.goto('/app/pl/ordinarium/gloria');
	const pager = page.locator('.pager');
	// the Kyrie stands between the Confiteor and the Gloria, as at Mass
	await expect(pager.locator('a', { hasText: 'Kýrie' })).toBeVisible();
	await pager.locator('a', { hasText: 'Credo' }).click();
	await expect(page).toHaveURL(atRoute('ordinarium/credo'));
	// crossing the section boundary backwards, into the last litany
	await page.goto('/app/pl/ordinarium/confiteor');
	await pager.locator('a', { hasText: 'Nóminis Iesu' }).click();
	await expect(page).toHaveURL(atRoute('litaniae/sanctissimi-nominis-iesu'));
	// arrow keys page too, but never while the slider owns them.
	// The URL arriving is not the page being ready to answer a key: this
	// navigation was a CLICK, so it did not go through the fixture's goto,
	// and in the folder it is a real document load. An assertion after one
	// is safe because assertions retry — a keystroke is not, and this one
	// landed on a page with nothing listening yet, on CI, in the offline
	// project, while every local run passed.
	await settled(page);
	await page.keyboard.press('ArrowRight');
	await expect(page).toHaveURL(atRoute('ordinarium/confiteor'));
	// and that key was a navigation too, so the same applies — the more so
	// here, where the assertion is that NOTHING happens: an unhydrated page
	// would give exactly that answer for the wrong reason
	await settled(page);
	await page.locator('input[type="range"]').focus();
	await page.keyboard.press('ArrowRight');
	await expect(page).toHaveURL(atRoute('ordinarium/confiteor'));
	// first text has no previous
	await page.goto('/app/pl/orationes/pater-noster');
	await expect(page.locator('.pager a')).toHaveCount(1);
});

test('selecting a word does not take the arrow keys away', async ({ page }) => {
	// Every word in the book is a <button>, and the pager's key handler
	// refused arrows whenever a BUTTON held focus — meant to keep them for
	// the radio groups, it took them from the text itself. Tap a word to
	// read its analysis and the arrows went dead (owner, 2026-08-09).
	//
	// Asserted as an EQUIVALENCE rather than against a hardcoded next text:
	// what the arrows do is the book's business, and this test's business
	// is only that selecting a word does not change it.
	await page.goto('/app/pl/ordinarium/confiteor');
	await settled(page);
	await page.keyboard.press('ArrowRight');
	// the navigation is client-side; page.url() is only true once it lands
	await page.waitForURL((u) => !u.pathname.includes('confiteor'));
	const paged = new URL(page.url()).pathname;

	await page.goto('/app/pl/ordinarium/confiteor');
	await settled(page);
	await page.locator('button.word').first().click();
	await expect(page.locator('aside .form')).toBeVisible();
	await page.keyboard.press('ArrowRight');
	await expect(page, 'with a word selected the arrow still pages').toHaveURL(
		(u) => u.pathname === paged
	);
});

test('the focus ring marks the word, not the line it sits on', async ({ page }) => {
	// A word's button is an inline box around a ruby, so its own box is the
	// whole line — 2.3 of the reading size — and the ring drew a rectangle
	// that swallowed the gloss row of the line above (owner, 2026-08-09).
	// It goes on the base, which is the shape the selection wash uses.
	await page.goto('/app/pl/ordinarium/confiteor');
	await settled(page);
	// TABBED to, not focused programmatically: :focus-visible is the whole
	// point of the rule, and only a real keyboard route turns it on.
	for (let i = 0; i < 60; i++) {
		await page.keyboard.press('Tab');
		if (await page.evaluate(() => document.activeElement?.classList.contains('word'))) break;
	}

	const m = await page.evaluate(() => {
		const w = document.activeElement as HTMLElement;
		const base = w.querySelector('.base') as HTMLElement;
		const ring = getComputedStyle(base, '::before');
		// where the ring's OUTERMOST edge falls, in page coordinates.
		// The tint's inset is READ from the rendered pseudo-element rather
		// than copied from the stylesheet, so the two cannot drift apart.
		const tint = base.getBoundingClientRect();
		const pad = (parseFloat(ring.width) - tint.width) / 2;
		const offset = parseFloat(ring.outlineOffset);
		const outer = { left: tint.left - pad - offset, right: tint.right + pad + offset };
		// the neighbouring words, whose letters the ring must not reach into
		const words = [...document.querySelectorAll('button.word')];
		const i = words.indexOf(w as HTMLButtonElement);
		const inkOf = (b: Element | undefined) => {
			if (!b) return null;
			const r = document.createRange();
			r.selectNodeContents(b.querySelector('.base')!);
			return r.getBoundingClientRect();
		};
		const prev = inkOf(words[i - 1]),
			next = inkOf(words[i + 1]);
		return {
			isWord: w.classList.contains('word'),
			focusVisible: w.matches(':focus-visible'),
			onTheButton: getComputedStyle(w).outlineStyle,
			onTheWord: ring.outlineStyle,
			offset,
			width: parseFloat(ring.outlineWidth),
			lineBox: w.getBoundingClientRect().height,
			wordBox: tint.height,
			clearsPrev: prev ? outer.left - prev.right : Infinity,
			clearsNext: next ? next.left - outer.right : Infinity,
			stacking: { position: getComputedStyle(w).position, zIndex: getComputedStyle(w).zIndex }
		};
	});

	expect(m.isWord, 'tabbing reaches a word').toBe(true);
	expect(m.focusVisible, 'and gives it a visible focus').toBe(true);
	expect(m.onTheButton, 'no ring on the line box').toBe('none');
	expect(m.onTheWord, 'a ring on the word').toBe('solid');
	// the reason the two are not interchangeable
	expect(m.lineBox, 'the line box is the taller of the two').toBeGreaterThan(m.wordBox + 8);

	// Drawn INSIDE the tint. Offset outward and the page shows through
	// between the two, and the ring reaches into the words on either side
	// (owner, 2026-08-09) — the words are set 1.4px apart, so there is no
	// room to spend outward at all.
	expect(m.offset, 'the ring is inset by its own width, not offset out').toBeLessThanOrEqual(
		-m.width
	);
	expect(m.clearsPrev, 'the ring clears the word before it').toBeGreaterThan(0);
	expect(m.clearsNext, 'the ring clears the word after it').toBeGreaterThan(0);

	// And nothing paints over it. Tints are pseudo-elements at one depth,
	// where equal z-index paints in DOM order, so the word AFTER the
	// focused one drew its tint across the ring's right stroke and it came
	// back thinner than the other three (owner, 2026-08-09).
	expect(m.stacking.position, 'the focused word is positioned').toBe('relative');
	expect(m.stacking.zIndex, 'and stacks above its neighbours').not.toBe('auto');
});

test('two tinted words meet exactly, with no page between them', async ({ page }) => {
	// The tint is half the gap between two words, so a selected word and a
	// focused one beside it stand edge to edge. Wider and every tint lay
	// across both its neighbours', which is how the word after a focused
	// one came to paint over its ring; narrower and a line of page showed
	// between a ring and the tint beside it (owner, 2026-08-09).
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/app/pl/ordinarium/confiteor');
	// a word must be tinted for its ::before to exist at all
	await page.locator('button.word').first().click();

	const m = await page.evaluate(() => {
		const sel = document.querySelector('button.word.selected .base')!;
		// read the inset off the rendered tint, never off the stylesheet
		const pad =
			(parseFloat(getComputedStyle(sel, '::before').width) - sel.getBoundingClientRect().width) / 2;
		const words = [...document.querySelectorAll('button.word')];
		const em = parseFloat(getComputedStyle(sel).fontSize);
		let widestGap = 0;
		for (let i = 0; i < words.length - 1; i++) {
			const a = words[i].querySelector('.base')!.getBoundingClientRect();
			const b = words[i + 1].querySelector('.base')!.getBoundingClientRect();
			if (Math.abs(a.top - b.top) > 2) continue; // same line only
			widestGap = Math.max(widestGap, b.left - a.right);
		}
		return { pad, widestGap, em };
	});

	expect(m.pad, 'the tint has an inset to read').toBeGreaterThan(0);
	// Stated against the gap this renderer actually produces, not against a
	// pixel count: the gap is 0.0625em on a Mac and 0.079em on the Linux
	// runner, and a test written to the first number went red on the second.
	expect(2 * m.pad, 'two tints reach each other').toBeGreaterThanOrEqual(m.widestGap);
	expect(
		(2 * m.pad - m.widestGap) / m.em,
		'and do not overlap enough to read as one band'
	).toBeLessThan(0.06);
});

test('a modified arrow belongs to the browser, not to the pager', async ({ page }) => {
	// Cmd+← is Back on a Mac and Alt+← is Back everywhere else, and the
	// pager swallowed both: the reader pressed Back and arrived at the
	// NEXT prayer instead (owner, 2026-08-07). It checked which key and
	// never which modifiers.
	//
	// Loaded straight into this page, so there is nothing behind it in
	// history: whatever the browser makes of the chord, the one thing that
	// must not happen is a move through the book. Sancte Míchaël is what
	// a bare ArrowLeft would reach from here, which is what the test above
	// asserts it still does.
	await page.goto('/app/pl/ordinarium/confiteor');
	for (const chord of [
		'Meta+ArrowLeft',
		'Alt+ArrowLeft',
		'Control+ArrowRight',
		'Shift+ArrowRight'
	]) {
		await page.keyboard.press(chord);
		await expect(page, `${chord} paged the book`).toHaveURL(atRoute('ordinarium/confiteor'));
	}
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
		await page.goto('/app/pl');
		await page.waitForTimeout(150);
		expect(await page.evaluate(() => (window as unknown as { calls: string[] }).calls)).toEqual([]);
		// no switch: the reader is never asked
		await expect(page.locator('button.wake')).toHaveCount(0);

		// opening a text takes the lock without being asked
		await page.locator('a[href="/app/pl/ordinarium/credo"]').click();
		await expect
			.poll(() => page.evaluate(() => (window as unknown as { calls: string[] }).calls.length))
			.toBeGreaterThan(0);

		// and a movement of the flow does the same (a fresh document, so its
		// own tally starts from nothing). The ordo index is a menu, like the
		// landing, and holds nothing.
		await page.goto('/app/pl/ordo');
		await page.waitForTimeout(150);
		expect(await page.evaluate(() => (window as unknown as { calls: string[] }).calls)).toEqual([]);
		await page.goto('/app/pl/ordo/canon');
		await expect
			.poll(() => page.evaluate(() => (window as unknown as { calls: string[] }).calls))
			.toEqual(['screen']);
	});
});

test('the book keeps a ribbon: reopening a text resumes the position', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/credo');
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
	await page.getByRole('link', { name: 'strona główna modlitewnika' }).click();
	await expect(page).toHaveURL(atRoute('/app/pl'));
	await page.locator('a[href="/app/pl/ordinarium/credo"]').click();
	await expect(page).toHaveURL(/credo/);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
	// a deep link outranks the ribbon: the word is centered, not the ribbon restored
	await page.goto('/app/pl/ordinarium/credo?w=w003');
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
	await page.goto('/app/pl');
	await page.evaluate(() => {
		localStorage.setItem(
			'scrutabor-pos:ordinarium/credo',
			JSON.stringify({ y: 600, t: Date.now() - 13 * 60 * 60 * 1000 })
		);
	});
	await page.goto('/app/pl/ordinarium/credo');
	await page.waitForTimeout(200);
	expect(await page.evaluate(() => window.scrollY)).toBeLessThan(10);
});

test('closing the panel leaves the page where it is', async ({ page }) => {
	await page.setViewportSize({ width: 800, height: 520 });
	await page.goto('/app/pl/ordinarium/credo');
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
	await page.goto('/app/en/ordinarium/praefatio-dialogus');
	await expect(page.getByRole('radio', { name: 'faithful' })).toBeVisible();
	// One missal speaker, but a real participation change: at Low Mass the
	// faithful may say the ministers' Confiteor with the server (DMS 31 b).
	await page.goto('/app/en/ordinarium/confiteor');
	await expect(page.getByRole('radio', { name: 'faithful' })).toBeVisible();
	await expect(page.getByRole('radio', { name: 'low' })).toBeVisible();

	await page.goto('/app/en/ordinarium/quod-ore-sumpsimus'); // the priest's, throughout
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
	await page.goto('/app/en/ordinarium/corpus-tuum');
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
		const baseEl = w.querySelector('.base')!;
		const st = getComputedStyle(baseEl, '::before');
		const b = baseEl.getBoundingClientRect();
		const box = {
			left: b.left + parseFloat(st.left),
			right: b.right - parseFloat(st.right),
			top: b.top + parseFloat(st.top)
		};
		const base = b;
		return {
			bg: st.backgroundColor,
			baseBg: getComputedStyle(w.querySelector('.base')!).backgroundColor,
			air: { left: base.left - box.left, right: box.right - base.right, top: base.top - box.top }
		};
	});
	expect(m.bg, 'the wash paints').not.toBe('rgba(0, 0, 0, 0)');
	expect(m.baseBg, 'and only once — the base itself carries none').toBe('rgba(0, 0, 0, 0)');
	expect(m.air.left, 'air before the letters').toBeGreaterThan(0);
	expect(m.air.right, 'air after them').toBeGreaterThan(0);
	expect(m.air.top, 'air above them').toBeGreaterThan(0);
});

test('the highlight covers the whole of a raised initial', async ({ page }) => {
	// The base box is sized for text at the reading size, so an initial at
	// 1.75 pokes out of the top of it and Q's tail out of the bottom — the
	// wash covered the word but not the letter that opens it. Padding on an
	// inline element grows the box it paints without touching the line, so
	// the letter is covered and the gloss stays where it is.
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
			const baseEl = w.querySelector('.base')!;
			const st = getComputedStyle(baseEl, '::before');
			const b = baseEl.getBoundingClientRect();
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
	await page.locator('input[type="range"]').fill('2');
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
	for (const url of ['/app/en/orationes/pater-noster', '/app/pl/ordinarium/credo']) {
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
	await page.goto('/app/en/orationes/pater-noster');
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
		await page.goto('/app/pl/ordinarium/qui-pridie');
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

test('the highlight marks the word AND its gloss', async ({ page }) => {
	// A ruby base is stretched to its column, and the column is as wide as
	// the longer of the word and its gloss — so a short word under a long
	// gloss came back with a box far wider than itself and nothing said
	// why. Measured: the glyphs of „Fiat" are 34px inside an 89px box, and
	// no inner span can hug them (ruby stretches its base's inline content,
	// and an inline-block that escaped that would disturb the line box the
	// raised initial depends on).
	//
	// So the box was right and the MEANING was missing: it marks the pair.
	// The two halves have to be continuous — a gap between them would read
	// as two marks rather than one.
	// One box must hold the pair in BOTH width cases — the base stretches
	// to the ruby column and the annotation does not, so the per-element
	// tint held only while the gloss was the longer half.
	for (const [url, kind] of [
		['/app/pl/orationes/pater-noster?w=w013', 'gloss longer'],
		['/app/pl/psalmi/118-he?w=w016', 'word longer']
	] as const) {
		await page.goto(url);
		const m = await page.evaluate(() => {
			const w = document.querySelector('button.word.selected')!;
			const baseEl = w.querySelector('.base')!;
			const st = getComputedStyle(baseEl, '::before');
			const b = baseEl.getBoundingClientRect();
			const box = {
				left: b.left + parseFloat(st.left),
				right: b.right - parseFloat(st.right),
				top: b.top + parseFloat(st.top),
				bottom: b.bottom - parseFloat(st.bottom)
			};
			const covers = (r: DOMRect) =>
				box.left <= r.left + 0.5 &&
				box.right >= r.right - 0.5 &&
				box.top <= r.top + 0.5 &&
				box.bottom >= r.bottom - 0.5;
			const rt = w.querySelector('rt')!.getBoundingClientRect();
			return {
				bg: st.backgroundColor,
				word: covers(w.querySelector('.base')!.getBoundingClientRect()),
				gloss: covers(rt),
				glossAir: box.bottom - rt.bottom
			};
		});
		expect(m.bg, `${kind}: the wash paints`).not.toBe('rgba(0, 0, 0, 0)');
		expect(m.word, `${kind}: the word sits inside the box`).toBe(true);
		expect(m.gloss, `${kind}: and so does its gloss`).toBe(true);
		expect(m.glossAir, `${kind}: with air under its descenders`).toBeGreaterThan(1);
	}

	// with no gloss showing, there is nothing to mark but the word
	await page.goto('/app/pl/orationes/pater-noster?w=w013');
	await page.locator('input[type="range"]').fill('0');
	await expect(page.locator('.word.selected rt')).toHaveCount(0);
	const bare = await page.evaluate(
		() =>
			getComputedStyle(document.querySelector('button.word.selected .base')!, '::before')
				.backgroundColor
	);
	expect(bare, 'the word is still marked with the glosses off').not.toBe('rgba(0, 0, 0, 0)');
});

// The reader measures in GLYPHS; the box model measures in boxes, and on
// this page they disagree by a lot. A glossed verse carries line-height
// 2.3, so a third of a line of air sits ABOVE its first Latin glyph,
// inside its own box where no neighbouring margin can see it — and its
// gloss row hangs past the bottom of that box the other way. An earlier
// version of this test measured Range rects, reported 27 above and 22
// below, and passed while the owner was looking at 26 above and 45 below.
//
// So: line box -> baseline via the font's own ascent -> ink via
// actualBoundingBox. Half-leading is not ink.
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
		// a verse's ink includes its gloss row, painted below its own box
		const edgeOf = (el: Element, side: 'top' | 'bottom') => {
			if (!el.classList.contains('verse')) return edge(el, side);
			const parts = [...el.querySelectorAll('.base, rt')];
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
	// every position of the help slider, since each shows a different
	// line-height.
	await page.goto('/app/pl/ordinarium/confiteor');

	for (const help of ['0', '1', '2']) {
		await page.locator('input[type="range"]').fill(help);
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
	// Vertical padding on an INLINE box paints and reserves nothing — it
	// does not grow the line — so a drop cap rises out of the top of its
	// line and into whatever stands above it. Every speaker label on this
	// movement sat 20px clear of its verse except the four before a drop
	// cap, which had 13 (owner, 2026-08-10).
	//
	// Asserted as SPACE PAINTED == SPACE RESERVED, which is what the fix
	// claims, rather than as a gap in pixels. The obvious measurement is
	// the trap here: an initial is set at line-height 0, so its box says
	// nothing about where its ink is, and comparing rects reports a label
	// eight pixels INSIDE a verse that looks perfectly clear.
	await page.goto('/app/en/ordo/praeparatio');

	const m = await page.evaluate(() => {
		const verses = [...document.querySelectorAll('.verse')];
		const withCap = verses.find((v) => v.querySelector('.initial'))!;
		const plain = verses.find((v) => !v.querySelector('.initial'))!;
		return {
			painted: parseFloat(getComputedStyle(withCap.querySelector('.base')!).paddingTop),
			reserved: parseFloat(getComputedStyle(withCap).marginTop),
			plainReserves: parseFloat(getComputedStyle(plain).marginTop)
		};
	});

	expect(m.painted, 'the initial is padded for').toBeGreaterThan(0);
	expect(m.reserved, 'and the verse reserves exactly that').toBeCloseTo(m.painted, 0);
	// and no verse pays for a letter it does not carry
	expect(m.plainReserves, 'a verse without an initial reserves nothing').toBe(0);
});

test('a translation is attached to its verse without touching it', async ({ page }) => {
	// 0.345 of a line of margin bought 7px of daylight, because the gloss
	// row it follows hangs past the box that margin hangs from — the
	// translation sat almost on the glosses (owner, 2026-08-09).
	//
	// Both bounds matter. Too little air and it touches; too much and it
	// stops belonging to the verse above, which is the one thing its
	// position has to say.
	await page.goto('/app/pl/ordinarium/confiteor');
	await page.locator('input[type="range"]').fill('2');
	const { translations } = await inkGaps(page);

	expect(translations.length, 'the text has translations between verses').toBeGreaterThan(0);
	for (const g of translations) {
		expect(g.above, `"${g.txt}" clears the gloss row (${Math.round(g.above)}px)`).toBeGreaterThan(
			10
		);
		expect(
			g.below / g.above,
			`"${g.txt}" is nearer its own verse (${Math.round(g.above)} above, ${Math.round(g.below)} below)`
		).toBeGreaterThan(1.4);
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

	for (const help of ['0', '1', '2']) {
		await page.locator('input[type="range"]').fill(help);
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
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/app/pl/ordinarium/orate-fratres');
	await page.locator('input[type=range]').fill('2');

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

test('a translation does not wrap where its own Latin did not', async ({ page }) => {
	// The symptom that started it: capped at 56ch, the translation broke at
	// little more than half the width the line above it used, and each of
	// this psalm's verses wrapped though its Latin had not.
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/app/pl/ordinarium/lavabo');
	await page.locator('input[type=range]').fill('2');

	const m = await page.evaluate(() => {
		const all = [...document.querySelectorAll('.translation')] as HTMLElement[];
		const lh = parseFloat(getComputedStyle(all[0]).lineHeight);
		return {
			wrapped: all.filter((t) => Math.round(t.getBoundingClientRect().height / lh) > 1).length,
			total: all.length
		};
	});

	expect(m.total, 'the psalm carries its translations').toBeGreaterThan(5);
	expect(m.wrapped, `${m.wrapped} of ${m.total} wrapped where their Latin did not`).toBe(0);
});
