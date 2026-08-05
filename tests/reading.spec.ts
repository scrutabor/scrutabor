// The reading experience: help ladder, panel layers, cross-reference jumps.
import { expect, test } from '@playwright/test';

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
	// single-analyzer override on Jesu
	await page.goto('/pl/ordinarium/gloria?w=w037');
	await expect(panel.locator('.meta')).toContainText('opracowanie, Collatinus');
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

test('a tapped word near the viewport bottom rises above the panel', async ({ page }) => {
	await page.setViewportSize({ width: 800, height: 520 });
	await page.goto('/pl/ordinarium/credo');
	const id = await page.evaluate(() => {
		const vh = window.innerHeight;
		const word = [...document.querySelectorAll('.word')].find((el) => {
			const r = el.getBoundingClientRect();
			return r.top > vh * 0.7 && r.bottom < vh;
		});
		return word?.id ?? null;
	});
	expect(id).not.toBeNull();
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
	await expect(pager.locator('a', { hasText: 'Confíteor' })).toBeVisible();
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
