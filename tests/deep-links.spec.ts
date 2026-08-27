// A link must show what it names. Every case here arrived broken through a
// real address: a search result into the extended prayer form landed on a
// page rendering only the antiphon, a lemma link into a folded Hail Mary
// opened a panel over words absent from the DOM, and a stale selector both
// lingered in the address bar and silently cost the reader their place.
import { atRoute, expect, test } from './fixtures';

test.describe('links into the extended prayer form @online', () => {
	test('a verse selection behind the basic form opens the extended form', async ({ page }) => {
		await page.goto('/app/pl/orationes/sub-tuum-praesidium?s=s02');
		await expect(page.locator('#s02.segment-selected')).toBeVisible();
		await expect(page.getByRole('button', { name: 'forma rozszerzona' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(page.locator('#s02')).toBeInViewport();
	});

	test('a word link behind the basic form opens the extended form and its panel', async ({
		page
	}) => {
		// w027 (Mediátrix) lives in s02, outside the antiphon.
		await page.goto('/app/pl/orationes/sub-tuum-praesidium?w=w027');
		await expect(page.getByRole('button', { name: 'forma rozszerzona' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(page.locator('#w027.selected')).toBeVisible();
		await expect(page.locator('aside')).toBeVisible();
	});

	test('the reader can still return to the basic form by hand', async ({ page }) => {
		await page.goto('/app/pl/orationes/sub-tuum-praesidium?s=s02');
		await page.getByRole('button', { name: 'antyfona' }).click();
		await expect(page.locator('#s02')).toHaveCount(0);
	});
});

test.describe('links into a folded repeated prayer @online', () => {
	test('a cited fold opens with its words visible and selected', async ({ page }) => {
		await page.goto('/app/pl/orationes/angelus-domini?s=s03');
		const fold = page.locator('#s03');
		await expect(fold).toBeVisible();
		await expect(fold).toHaveClass(/segment-selected/);
		// The full Hail Mary, not the four-word incipit.
		await expect(fold.locator('button.word')).toHaveCount(31);
		await expect(fold.getByRole('button', { name: 'zwiń powtórzoną modlitwę' })).toBeVisible();
	});

	test('a word link into a fold opens the fold and the panel on the word', async ({ page }) => {
		await page.goto('/app/pl/orationes/angelus-domini?w=w025');
		await expect(page.locator('#w025.selected')).toBeVisible();
		await expect(page.locator('aside')).toBeVisible();
	});

	test('the reader can fold a cited repetition back down', async ({ page }) => {
		await page.goto('/app/pl/orationes/angelus-domini?s=s06');
		const fold = page.locator('#s06');
		await expect(fold.locator('button.word')).toHaveCount(31);
		await fold.getByRole('button', { name: 'zwiń powtórzoną modlitwę' }).click();
		await expect(fold.locator('button.word')).toHaveCount(4);
	});
});

test.describe('selector hygiene @online', () => {
	test('a stale selector is stripped and does not cost the reading position', async ({ page }) => {
		await page.goto('/app/pl/orationes/angelus-domini?s=s99');
		await expect(page).toHaveURL(atRoute('/app/pl/orationes/angelus-domini'));
		await expect(page.locator('.segment-selected')).toHaveCount(0);
	});

	test('a reversed range straightens in the address', async ({ page }) => {
		await page.goto('/app/pl/orationes/angelus-domini?s=s12-s10');
		await expect(page).toHaveURL(atRoute('/app/pl/orationes/angelus-domini', '?s=s10-s12'));
		await expect(page.locator('.segment-selected')).toHaveCount(3);
	});

	test('junk selectors neither crash nor linger', async ({ page }) => {
		for (const raw of ['s01-s02-s03', 's01..s02', '%20', 's99']) {
			await page.goto(`/app/pl/orationes/angelus-domini?s=${raw}`);
			await expect(page).toHaveURL(atRoute('/app/pl/orationes/angelus-domini'));
		}
	});

	test('the oldest published address resolves to its surviving verse', async ({ page }) => {
		// v0.9 published #ave1 anchors; the retirement record now carries
		// them to the verse that holds their content, and the address
		// canonicalizes to the living id.
		await page.goto('/app/pl/orationes/angelus-domini?s=ave1');
		await expect(page).toHaveURL(atRoute('/app/pl/orationes/angelus-domini', '?s=s03'));
		await expect(page.locator('#s03.segment-selected')).toBeVisible();
		await expect(page.locator('#s03 button.word')).toHaveCount(31);
	});

	test('selecting verses clears a cited psalter verse, state and address together', async ({
		page
	}) => {
		await page.goto('/app/pl/psalmi/118-he?v=36');
		await expect(page.locator('.cited')).toHaveCount(1);
		const verse = page.locator('p.verse').first();
		const box = await verse.boundingBox();
		await page.mouse.click(box!.x + box!.width - 4, box!.y + box!.height / 2);
		await expect(page.locator('.segment-selected')).toHaveCount(1);
		await expect(page.locator('.cited')).toHaveCount(0);
		expect(new URL(page.url()).searchParams.get('v')).toBeNull();
	});
});

test.describe('selection interaction @online', () => {
	test('tapping a verse with the word sheet open selects and dismisses', async ({ page }) => {
		await page.goto('/app/pl/orationes/angelus-domini');
		await page.locator('#w001').click();
		await expect(page.locator('aside')).toBeVisible();
		// A verse ABOVE the sheet: the tap must reach the page, not the
		// sheet; an occluded verse would only test the sheet's surface.
		const verse = page.locator('#s01');
		const box = await verse.boundingBox();
		await page.mouse.click(box!.x + box!.width - 4, box!.y + box!.height / 2);
		await expect(page.locator('#s01.segment-selected')).toBeVisible();
		await expect(page.locator('aside')).toHaveCount(0);
	});

	test('selection names say what activation does', async ({ page }) => {
		await page.goto('/app/pl/orationes/angelus-domini?s=s10-s12');
		const inRange = page.locator('#s11 .segment-control');
		await expect(inRange).toHaveAttribute('aria-label', 'zawęź wybór do tego wersetu');
		await page.goto('/app/pl/orationes/angelus-domini?s=s10');
		await expect(page.locator('#s10 .segment-control')).toHaveAttribute(
			'aria-label',
			'usuń wybór tego wersetu'
		);
		const plain = page.locator('#s11 .segment-control');
		await expect(plain).toHaveAttribute('aria-label', 'wybierz ten werset');
		expect(await plain.getAttribute('aria-label')).not.toContain('Shift');
	});

	test('the range gesture is explained once, in the mark key', async ({ page }) => {
		await page.goto('/app/pl/ordinarium/iudica-me');
		await page.locator('button.mark').first().click();
		await expect(page.getByText('Shift z kliknięciem zaznacza zakres')).toBeVisible();
	});
});

test.describe('litany selection geometry @online', () => {
	test('a selected invocation-response pair keeps its outer corners', async ({ page }) => {
		await page.goto('/app/pl/litaniae/lauretanae');
		const pair = page.locator('p.verse[id]').nth(6);
		const pairId = await pair.getAttribute('id');
		await pair.scrollIntoViewIfNeeded();
		const box = await pair.boundingBox();
		await page.mouse.click(box!.x + box!.width - 4, box!.y + box!.height / 2);
		await expect(page.locator(`#${pairId}.segment-selected`)).toBeVisible();
		// Alone in its row, a selected litany line joins nothing: its render
		// neighbour above and below is another ROW, and neither is selected.
		await expect(page.locator('.segment-joins-before')).toHaveCount(0);
		await expect(page.locator('.segment-joins-after')).toHaveCount(0);
	});
});

test.describe('interlinear word names @online', () => {
	test('a word control names the Latin and the gloss apart', async ({ page }) => {
		await page.goto('/app/pl/orationes/sub-tuum-praesidium');
		const word = page.locator('#w001');
		await expect(word).toHaveAttribute('aria-label', 'Sub — pod');
	});
});

test.describe('query survives a fast follow @online', () => {
	test('typing and tapping a result inside the debounce keeps ?q for Back', async ({ page }) => {
		// The address write rides the search debounce; following a result
		// FLUSHES it. Without the flush, a reader who taps within 250 ms of
		// typing came Back to an empty search box — locally invisible, caught
		// on slower CI runners.
		await page.goto('/app/pl/search');
		await page.getByRole('searchbox').fill('Ojcze nasz');
		await page.locator('.results a').first().click();
		await expect(page).not.toHaveURL(/\/search/);
		await page.goBack();
		await expect(page.getByRole('searchbox')).toHaveValue('Ojcze nasz');
		expect(new URL(page.url()).searchParams.get('q')).toBe('Ojcze nasz');
	});
});
