// Following the Mass from the pew: what is said aloud, what you answer,
// and what the priest prays silently.
//
// The rule these guard is that nothing is ever HIDDEN. The silent prayers
// fold to a line naming what is happening and open on one tap, and a
// reader who serves or celebrates sees everything from the start.
import { expect, test } from './fixtures';

const CANON = '/pl/ordo/canon';

test('the pew sees what is said aloud, and the silent prayers folded', async ({ page }) => {
	await page.goto(CANON);

	// the preface dialogue is aloud: its words are on the page
	await expect(page.getByText('Dóminus', { exact: false }).first()).toBeVisible();

	// the Canon's own prayers are folded, each behind what it is
	const folds = page.locator('.unfold');
	await expect(folds.first()).toBeVisible();
	expect(await folds.count()).toBeGreaterThan(8);
	await expect(folds.first()).toContainText('po cichu');
});

test('one tap opens a silent prayer, and it stays open', async ({ page }) => {
	await page.goto(CANON);
	const before = await page.locator('.word').count();
	const folds = page.locator('.unfold');
	const foldsBefore = await folds.count();

	await folds.first().click();

	// the words arrive, and that fold is gone rather than sitting under them
	await expect.poll(() => page.locator('.word').count()).toBeGreaterThan(before);
	await expect.poll(() => folds.count()).toBe(foldsBefore - 1);
});

test('a server and a priest are shown everything from the start', async ({ page }) => {
	for (const role of ['minister', 'sacerdos']) {
		await page.addInitScript((r) => localStorage.setItem('scrutabor-role', r), role);
		await page.goto(CANON);
		await expect(page.locator('.unfold')).toHaveCount(0);
		expect(await page.locator('.word').count(), `${role} sees the Canon`).toBeGreaterThan(300);
	}
});

test('the role survives leaving the page', async ({ page }) => {
	await page.goto('/pl/ordo');
	await page.getByRole('radio', { name: 'ministrant' }).click();
	await expect(page.getByRole('radio', { name: 'ministrant' })).toHaveAttribute(
		'aria-checked',
		'true'
	);

	await page.goto(CANON);
	await expect(page.locator('.unfold')).toHaveCount(0);
});

test('a line the reader answers is marked as theirs', async ({ page }) => {
	await page.goto('/pl/ordinarium/praefatio-dialogus');

	// the priest's line and the answering one are named, and only the
	// answer carries the reader's mark
	const marks = page.locator('.who');
	await expect(marks.first()).toContainText('kapłan');
	await expect(marks.nth(1)).toContainText('ministrant');
	await expect(marks.nth(1)).toContainText('odpowiadasz');
	expect(await page.locator('.verse.answer').count()).toBeGreaterThan(0);
});

test('a segment the sources have not been read for stays unmarked', async ({ page }) => {
	// Ite, missa est: its dialogue is attributed, the dismissal itself is
	// not — the corpus leaves it empty rather than guessing, and the page
	// must say nothing rather than invent a speaker.
	await page.goto('/pl/ordinarium/ite-missa-est');
	const verses = await page.locator('.verse').count();
	const marked = await page.locator('.who').count();
	expect(marked).toBeGreaterThan(0);
	expect(marked).toBeLessThan(verses);
});

test('a silent prayer that ends aloud is not folded away', async ({ page }) => {
	// The embolism and the Canon's doxology are said silently and then end
	// aloud with Per ómnia sǽcula sæculórum, which the people answer. The
	// corpus knows that line by line (Rubricae generales 511); folding on
	// the prayer as a whole would hide the one line the reader is there to
	// say. Each word is its own element, so look for the words.
	const saidAloud = (page: import('@playwright/test').Page) =>
		page.evaluate(() =>
			[...document.querySelectorAll('.word')].some((w) => /sǽcula/.test(w.textContent ?? ''))
		);

	await page.goto('/pl/ordo/canon');
	expect(await saidAloud(page), 'the Canon doxology ends aloud').toBe(true);

	await page.goto('/pl/ordo/communio');
	expect(await saidAloud(page), 'the embolism ends aloud').toBe(true);
});

test('a wholly silent prayer still folds', async ({ page }) => {
	await page.goto('/pl/ordo/canon');
	// Te ígitur carries no aloud line at all, so the pew gets the note
	const folds = page.locator('.unfold');
	expect(await folds.count()).toBeGreaterThan(5);
});
