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
	await page.getByRole('radio', { name: 'ministranta' }).click();
	await expect(page.getByRole('radio', { name: 'ministranta' })).toHaveAttribute(
		'aria-checked',
		'true'
	);

	await page.goto(CANON);
	await expect(page.locator('.unfold')).toHaveCount(0);
});

test('a line the reader answers is marked as theirs', async ({ page }) => {
	await page.goto('/pl/ordinarium/praefatio-dialogus');

	// each speaker is named once — the mark carries it after that — and the
	// reader's own part is named on the first line that is theirs
	const named = page.locator('.who');
	await expect(named.first()).toContainText('kapłan');
	await expect(named.nth(1)).toContainText('ministrant');
	await expect(named.nth(1)).toContainText('odpowiadasz');
	expect(await page.locator('.verse.answer').count()).toBeGreaterThan(0);
});

test('a dialogue is marked V. and R. down the page, as the books mark it', async ({ page }) => {
	// versiculus and responsum, in red, on EVERY line of an exchange — the
	// marks the typical edition prints and the ones this corpus's own
	// witnesses print most (R. 96 times, V. 74, against S. 36 and M. 15).
	await page.goto('/pl/ordinarium/praefatio-dialogus');
	const marks = page.locator('.verse .mark');
	const verses = await page.locator('.verse').count();
	expect(await marks.count()).toBe(verses);
	await expect(marks.first()).toHaveText('V.');
	await expect(marks.nth(1)).toHaveText('R.');

	// red, and never a tap target: the words are what a reader taps
	const colour = await marks.first().evaluate((el) => getComputedStyle(el).color);
	const rubric = await page.evaluate(() =>
		getComputedStyle(document.documentElement).getPropertyValue('--rubric').trim()
	);
	expect(rubric).not.toBe('');
	await expect(marks.first()).toHaveAttribute('aria-hidden', 'true');
	expect(colour).not.toBe('');
	expect(await marks.first().locator('button').count()).toBe(0);
});

test('the reader can change their part from a text page, and the marks follow', async ({
	page
}) => {
	// The control belongs wherever the reader is, not only on the Ordo
	// index: arriving at a text from a link is the common case.
	await page.goto('/pl/ordinarium/praefatio-dialogus');
	const answered = () =>
		page.evaluate(() =>
			[...document.querySelectorAll('.verse')].map((v) =>
				v.classList.contains('answer') ? (v.querySelector('.mark')?.textContent ?? '?') : ''
			)
		);

	// in the pew, the answering lines are the reader's
	expect((await answered()).filter(Boolean)).toContain('R.');
	expect((await answered()).filter(Boolean)).not.toContain('V.');

	await page.getByRole('radio', { name: 'kapłana' }).click();

	// as the celebrant, his own are — and he does not "answer" them
	expect((await answered()).filter(Boolean)).toContain('V.');
	expect((await answered()).filter(Boolean)).not.toContain('R.');
	await expect(page.locator('.who-yours').first()).toHaveText('odmawiasz');
});

test('the mark does not collide with the words beside it', async ({ page }) => {
	// text-indent INHERITS, and every token is an inline-block with its own
	// first line box: the verse's hanging indent was re-applied inside each
	// one and printed the words on top of each other. Boxes, not opinions.
	//
	// Measure the WORDS, not the tokens. The indent moves the glyphs inside
	// each inline-block, not the block itself — with the bug present the
	// token boxes still tile neatly while the words inside them sit 2rem to
	// the left, on top of each other. A test on token boxes passes happily
	// through the very fault it was written for (proved by mutation).
	await page.goto('/pl/ordinarium/iudica-me');
	const overlaps = await page.evaluate(() => {
		const bad: string[] = [];
		for (const verse of document.querySelectorAll('.verse')) {
			const boxes = [...verse.querySelectorAll('.word')].map((t) => t.getBoundingClientRect());
			for (let i = 1; i < boxes.length; i++) {
				const a = boxes[i - 1];
				const b = boxes[i];
				// same line, and the next token starts before the last one ended
				if (Math.abs(a.top - b.top) < 2 && b.left < a.right - 0.5) {
					bad.push(`${verse.textContent?.slice(0, 30)}: word ${i}`);
				}
			}
		}
		return bad;
	});
	expect(overlaps).toEqual([]);
});

test('a text the sources say nothing about stays unmarked', async ({ page }) => {
	// The devotional prayers are said by whoever prays them: no celebrant,
	// no server. The corpus leaves them unattributed on purpose, and the
	// page must render nothing rather than invent a speaker.
	await page.goto('/pl/orationes/gloria-patri');
	await expect(page.locator('.verse').first()).toBeVisible();
	await expect(page.locator('.who')).toHaveCount(0);

	await expect(page.locator('.verse .mark')).toHaveCount(0);
	// and it opens with the red initial the books give a prayer
	await expect(page.locator('.initial').first()).toHaveText('G'); // Glória Patri

	// while an exchange, whose sources do mark the voices, is marked on
	// every line, with the names given once each
	await page.goto('/pl/ordinarium/ite-missa-est');
	const verses = await page.locator('.verse').count();
	expect(await page.locator('.verse .mark').count()).toBe(verses);
	expect(await page.locator('.who-name').count()).toBeLessThan(verses);
});

test('the mark prints where the voice turns, and again after every rubric', async ({ page }) => {
	// Two halves of one rule, both the owner's, both about never making a
	// reader work out where the last mark stopped applying.

	// Not on every line of one voice: the petitions of the Pater noster run
	// on unmarked under the V. that opened them, and keep the text column,
	// which is what says they are still his.
	await page.goto('/pl/ordinarium/pater-noster');
	const petitions = await page.evaluate(() =>
		[...document.querySelectorAll('.verse')].map((v) => ({
			mark: v.querySelector('.mark')?.textContent ?? '',
			left: Math.round(v.querySelector('.word')!.getBoundingClientRect().left)
		}))
	);
	const run = petitions.slice(4, 8); // Sanctificétur … Panem nostrum
	expect(run.every((p) => p.mark === '')).toBe(true);
	expect(new Set(run.map((p) => p.left)).size, 'the column holds').toBe(1);

	// But yes after a rubric: Per ipsum has a direction between every phrase
	// of its doxology, so the reader comes back to the Latin each time and
	// is told each time whose it is.
	await page.goto('/pl/ordinarium/per-ipsum');
	await expect(page.locator('.initial')).toHaveText('P');
	const marks = await page.evaluate(() =>
		[...document.querySelectorAll('.verse')].map((v) => v.querySelector('.mark')?.textContent ?? '')
	);
	expect(marks.every(Boolean), 'a rubric before every line, so a mark on every line').toBe(true);
	expect(marks.at(-1)).toBe('R.');

	// the initial is part of its word: the whole form is still there to be
	// read aloud, copied, and tapped
	await expect(page.locator('.word').first()).toHaveText(/^Per/);
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

test('the mark explains itself to a reader meeting it for the first time', async ({ page }) => {
	// V. and R. are Latin abbreviations, and a first-time reader has no way
	// to know that from the letter. They are marked up as abbreviations,
	// with the word they stand for and who says the line.
	await page.goto('/pl/ordinarium/pater-noster');
	const first = page.locator('.mark').first();
	expect(await first.evaluate((el) => el.tagName)).toBe('ABBR');
	await expect(first).toHaveAttribute('title', /Vers[íi]culus/);
	await expect(page.locator('.mark', { hasText: 'R.' }).first()).toHaveAttribute(
		'title',
		/Respons[óo]rium/
	);
	// and it must not look like a link while it does it
	expect(await first.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('none');
});
