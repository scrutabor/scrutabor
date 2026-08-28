// Following the Mass from the pew: what is said aloud, what the reader's
// own part is, and what the priest prays silently.
//
// The rule these guard is that nothing is ever HIDDEN. The silent prayers
// fold to a line naming what is happening and open on one tap, and a
// reader who serves or celebrates sees everything from the start.
import { expect, test } from './fixtures';

const CANON = '/app/pl/ordo/canon';

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
	await page.goto('/app/pl/ordo');
	await page.getByRole('radio', { name: 'usługujący' }).click();
	await expect(page.getByRole('radio', { name: 'usługujący' })).toHaveAttribute(
		'aria-checked',
		'true'
	);

	await page.goto(CANON);
	await expect(page.locator('.unfold')).toHaveCount(0);
});

test('a line the reader answers is marked as theirs', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/praefatio-dialogus');

	// Each speaker is named once — the mark carries it after that. A reader
	// in the pew is named for their OWN lines: Et cum spiritu tuo is one of
	// the responses the 1958 instruction asks that every congregation be
	// able to make (n. 25 a at a sung Mass, n. 31 a at a low one), so the
	// line that used to be labelled ministrant over a congregation about to
	// say it now says who is saying it (owner, 2026-08-09).
	const named = page.locator('.who');
	await expect(named.first()).toContainText('kapłan');
	await expect(named.nth(1)).toContainText('wierni');
	await expect(page.locator('.who-yours')).toHaveCount(0);
	expect(await page.locator('.verse.answer').count()).toBeGreaterThan(0);
});

test('a Proper chant resolves delivery and conditional participation by Mass form', async ({
	page
}) => {
	await page.goto('/app/pl/proprium/dominica-iv-adventus-introitus');

	// Proper pages need the controls because both the delivery and the
	// faithful's faculty change with the form of Mass.
	await expect(page.getByRole('radio', { name: 'wierni' })).toBeVisible();
	await expect(page.getByRole('radio', { name: 'śpiewana' })).toBeVisible();

	// At sung Mass the schola delivers the chant. DMS 25 c permits trained
	// faithful to join; it does not make the line their unconditional answer.
	await expect(page.locator('.who-name').first()).toHaveText('schola');
	await expect(page.locator('.who-join').first()).toHaveText('wierni mogą dołączyć');
	await expect(page.locator('.verse.answer')).toHaveCount(0);
	await expect(page.locator('.verse .mark').first()).toHaveText('R.');

	// The same text is read by the priest at low Mass, while the fourth-degree
	// faculty remains explicitly conditional.
	await page.getByRole('radio', { name: 'cicha' }).click();
	await expect(page.locator('.who-name').first()).toHaveText('kapłan');
	await expect(page.locator('.who-join').first()).toHaveText('wierni mogą dołączyć');
	await expect(page.locator('.verse.answer')).toHaveCount(0);
	await expect(page.locator('.verse .mark').first()).toHaveText('V.');
});

test('a dialogue is marked V. and R. down the page, as the books mark it', async ({ page }) => {
	// versiculus and responsum, in red, on EVERY line of an exchange — the
	// marks the typical edition prints and the ones this corpus's own
	// witnesses print most (R. 96 times, V. 74, against S. 36 and M. 15).
	await page.goto('/app/pl/ordinarium/praefatio-dialogus');
	const marks = page.locator('.verse .mark');
	const verses = await page.locator('.verse').count();
	expect(await marks.count()).toBe(verses);
	await expect(marks.first()).toHaveText('V.');
	await expect(marks.nth(1)).toHaveText('R.');

	// red, and it carries its own name for anyone who cannot see the colour
	const rubric = await page.evaluate(() =>
		getComputedStyle(document.documentElement).getPropertyValue('--rubric').trim()
	);
	expect(rubric).not.toBe('');
	await expect(marks.first()).toHaveAttribute('aria-label', /Vers[íi]culus/);
	expect(await marks.first().evaluate((el) => getComputedStyle(el).color)).not.toBe('');
});

test('an Ordinary prayer shared with the faithful is named without a false versicle mark', async ({
	page
}) => {
	// The Missale gives the Credo to the celebrant; the 1958 Instruction
	// gives the faithful the whole Ordinary too (25 b at sung Mass, 31 c at
	// low Mass). Both are true. A V. plus the former label “wierni” made
	// those truths look contradictory and called a profession a versicle.
	for (const slug of ['gloria', 'credo', 'sanctus', 'agnus-dei']) {
		await page.goto(`/app/pl/ordinarium/${slug}`);
		await expect(page.locator('.who-name').first()).toHaveText('kapłan i wierni');
		await expect(page.locator('.verse .mark')).toHaveCount(0);
		await expect(page.locator('.picker[data-kind="role"]')).toHaveCount(0);
	}

	// A persisted viewpoint cannot change the objective attribution or the
	// nature of the text. It only marks the reader's own part where there is
	// a real distinction to make.
	await page.evaluate(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
	await page.goto('/app/pl/ordinarium/credo');
	await expect(page.locator('.who-name').first()).toHaveText('kapłan i wierni');
	await expect(page.locator('.verse .mark')).toHaveCount(0);
	await page.evaluate(() => localStorage.setItem('scrutabor-role', 'minister'));
	await page.goto('/app/pl/ordinarium/sanctus');
	await expect(page.locator('.who-name').first()).toHaveText('kapłan i wierni');
	await expect(page.locator('.verse.answer')).toHaveCount(5);
	await page.evaluate(() => localStorage.setItem('scrutabor-role', 'populus'));

	// The sung Kyrie is likewise the faithful's whole Ordinary; at low Mass
	// they have the server's alternating lines, so V./R. remain useful there.
	await page.goto('/app/pl/ordinarium/kyrie');
	await expect(page.locator('.who-name').first()).toHaveText('wierni');
	await expect(page.locator('.verse .mark')).toHaveCount(0);
	await page.locator('.option[data-word="cicha"]').click();
	await expect(page.locator('.verse .mark').first()).toHaveText('V.');

	// The ministers' Confiteor becomes a shared prayer only in a low Mass
	// (31 b). Its objective attribution remains stable while the reader's
	// own-part emphasis changes.
	await page.goto('/app/pl/ordinarium/confiteor');
	await page.locator('.option[data-word="śpiewana"]').click();
	await expect(page.locator('.who-name').first()).toHaveText('usługujący');
	await page.locator('.option[data-word="cicha"]').click();
	await expect(page.locator('.who-name').first()).toHaveText('usługujący i wierni');
	await page.locator('.option[data-word="kapłan"]').click();
	await expect(page.locator('.who-name').first()).toHaveText('usługujący i wierni');
	await expect(page.locator('.verse .mark')).toHaveCount(0);
});

test('the reader can change their part from a text page, and the marks follow', async ({
	page
}) => {
	// The control belongs wherever the reader is, not only on the Ordo
	// index: arriving at a text from a link is the common case.
	await page.goto('/app/pl/ordinarium/praefatio-dialogus');
	const answered = () =>
		page.evaluate(() =>
			[...document.querySelectorAll('.verse')].map((v) =>
				v.classList.contains('answer') ? (v.querySelector('.mark')?.textContent ?? '?') : ''
			)
		);

	// in the pew, the answering lines are the reader's
	expect((await answered()).filter(Boolean)).toContain('R.');
	expect((await answered()).filter(Boolean)).not.toContain('V.');
	const attribution = await page.locator('.who').allTextContents();

	await page.getByRole('radio', { name: 'kapłan' }).click();

	// as the celebrant, his own are — and he does not "answer" them
	expect((await answered()).filter(Boolean)).toContain('V.');
	expect((await answered()).filter(Boolean)).not.toContain('R.');
	// and nothing is said about it in words: the marks carry it
	await expect(page.locator('.who-yours')).toHaveCount(0);
	// The objective attribution and participation notes do not change with
	// the reader's viewpoint; only the own-part emphasis does.
	await expect(page.locator('.who')).toHaveText(attribution);
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
	await page.goto('/app/pl/ordinarium/iudica-me');
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
	await page.goto('/app/pl/orationes/gloria-patri');
	await expect(page.locator('.verse').first()).toBeVisible();
	await expect(page.locator('.who')).toHaveCount(0);

	await expect(page.locator('.verse .mark')).toHaveCount(0);
	// and it opens with the red initial the books give a prayer
	await expect(page.locator('.initial').first()).toHaveText('G'); // Glória Patri

	// while an exchange, whose sources do mark the voices, is marked on
	// every line, with the names given once each
	await page.goto('/app/pl/ordinarium/ite-missa-est');
	const verses = await page.locator('.verse').count();
	expect(await page.locator('.verse .mark').count()).toBe(verses);
	expect(await page.locator('.who-name').count()).toBeLessThan(verses);
});

test('a prayer everyone says is not marked either, though it is attributed', async ({ page }) => {
	// The Ave María: an unattributed first half, then "Sancta María" and the
	// rest given to omnes. The turn from nobody to everyone printed an O.
	// beside a line that was already the reader's, with no name anywhere to
	// say what the letter meant (owner, 2026-08-07: "a bit confusing").
	//
	// A mark tells voices apart. Where the only voice is everyone — the one
	// speaker a priest, a server and a reader in the pew all own — there is
	// nobody to be told apart from.
	await page.goto('/app/pl/orationes/ave-maria');
	await expect(page.locator('.verse')).toHaveCount(2);
	await expect(page.locator('.verse .mark')).toHaveCount(0);
	await expect(page.locator('.who')).toHaveCount(0);

	// But a prayer said throughout by the PRIEST keeps its mark, because
	// there the letter says something the reader needs: not yours.
	await page.goto('/app/pl/ordinarium/te-igitur');
	await expect(page.locator('.verse .mark').first()).toHaveText('V.');
});

test('the mark prints where the voice turns, and again after every rubric', async ({ page }) => {
	// Two halves of one rule, both the owner's, both about never making a
	// reader work out where the last mark stopped applying.

	// Not on every line of one voice: the petitions of the Pater noster run
	// on unmarked under the V. that opened them, and keep the text column,
	// which is what says they are still his.
	await page.goto('/app/pl/ordinarium/pater-noster');
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
	await page.goto('/app/pl/ordinarium/per-ipsum');
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

	await page.goto('/app/pl/ordo/canon');
	expect(await saidAloud(page), 'the Canon doxology ends aloud').toBe(true);

	await page.goto('/app/pl/ordo/communio');
	expect(await saidAloud(page), 'the embolism ends aloud').toBe(true);
});

test('a wholly silent prayer still folds', async ({ page }) => {
	await page.goto('/app/pl/ordo/canon');
	// Te ígitur carries no aloud line at all, so the pew gets the note
	const folds = page.locator('.unfold');
	expect(await folds.count()).toBeGreaterThan(5);
});

test('the mark explains itself when asked', async ({ page }) => {
	// V. and R. are Latin abbreviations and a first-time reader has no way
	// to get that from the letter. It was a tooltip first, and the owner's
	// verdict was that a help cursor with a slow native tooltip invites a
	// click and then does nothing. So the mark is a button, and it opens
	// the whole key: a reader who does not know V. does not know R. either.
	await page.goto('/app/pl/ordinarium/pater-noster');
	const mark = page.locator('.mark').first();
	expect(await mark.evaluate((el) => el.tagName)).toBe('BUTTON');
	await expect(page.locator('.legend')).toHaveCount(0);

	await mark.click();
	const legend = page.locator('.legend');
	await expect(legend).toBeVisible();
	await expect(legend).toContainText('Versículus');
	await expect(legend).toContainText('Respónsum');
	await expect(legend).toContainText('Omnes');

	// it closes, and it does not sit on top of the word panel
	await legend.getByRole('button').click();
	await expect(legend).toHaveCount(0);
	await page.locator('.word').first().click();
	await expect(page.locator('aside.panel, aside')).toBeVisible();
	await page.locator('.mark').first().click();
	await expect(page.locator('.legend')).toBeVisible();
});

test('the reader’s own lines are the red ones, and the other voice recedes', async ({ page }) => {
	// The choice of part has to change the PAGE, not only its labels: red
	// is kept for the lines the reader says, so "which of these do I say?"
	// is answered by the colour rather than worked out.
	await page.goto('/app/pl/ordinarium/praefatio-dialogus');
	const colours = () =>
		page.evaluate(() =>
			[...document.querySelectorAll('.verse .mark')].map((m) => ({
				mark: m.textContent,
				red: m.classList.contains('yours')
			}))
		);

	// in the pew, the answers are the reader's
	const pew = await colours();
	expect(pew.filter((c) => c.red).every((c) => c.mark === 'R.')).toBe(true);
	expect(pew.some((c) => c.mark === 'V.' && !c.red)).toBe(true);

	// as the celebrant, it is the other way round
	await page.getByRole('radio', { name: 'kapłan' }).click();
	const priest = await colours();
	expect(priest.filter((c) => c.red).every((c) => c.mark === 'V.')).toBe(true);
	expect(priest.some((c) => c.mark === 'R.' && !c.red)).toBe(true);

	// and the two really are different colours on the page
	const [redInk, quietInk] = await page.evaluate(() => {
		const marks = [...document.querySelectorAll('.verse .mark')];
		const mine = marks.find((m) => m.classList.contains('yours'))!;
		const theirs = marks.find((m) => !m.classList.contains('yours'))!;
		return [getComputedStyle(mine).color, getComputedStyle(theirs).color];
	});
	expect(redInk).not.toBe(quietInk);
});

test('no opening initial lands on the letters beside it', async ({ page }) => {
	// The correction for a letter set at 1.75em among letters set at 1 is
	// arithmetic, and arithmetic can be wrong: the first version scaled the
	// difference where it should have cleared the whole overhang, and Q
	// went on driving its tail into "uod" while every test passed. So
	// measure the ink, on every letter that opens a prayer in this corpus.
	const pages = [
		'/app/en/ordinarium/quod-ore-sumpsimus', // Q — the tail
		'/app/en/ordinarium/agnus-dei', // A — the diagonal
		'/app/en/ordinarium/te-igitur', // T — the arm
		'/app/en/ordinarium/per-ipsum', // P — a closed bowl, the other case
		'/app/en/ordinarium/ecce-agnus-dei', // E
		'/app/en/ordinarium/aufer-a-nobis' // A again, another word after it
	];
	for (const url of pages) {
		await page.goto(url);
		const seen = await page.evaluate(() => {
			const ini = document.querySelector('.verse .initial');
			if (!ini) return null;
			const cs = getComputedStyle(ini);
			const box = ini.getBoundingClientRect();
			const c = document.createElement('canvas').getContext('2d')!;
			c.font = `${cs.fontSize} ${cs.fontFamily}`;
			const m = c.measureText(ini.textContent ?? '');
			const inkRight = box.left + m.actualBoundingBoxRight;
			const ruby = ini.closest('ruby')!;
			const r = document.createRange();
			r.setStartAfter(ini);
			const holder = ini.parentElement!;
			r.setEnd(holder, holder.childNodes.length);
			const rest = r.getClientRects()[0];
			// and how far its tail reaches into the gloss line below
			const rt = ruby.querySelector('rt');
			let tailIntoGloss = 0;
			if (rt) {
				const probe = document.createElement('span');
				probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
				// the initial sits inside the base span, not directly in the ruby
				ini.parentElement!.insertBefore(probe, ini.nextSibling);
				const baseline = probe.getBoundingClientRect().top;
				probe.remove();
				const p2 = document.createElement('span');
				p2.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
				rt.appendChild(p2);
				const rtBaseline = p2.getBoundingClientRect().top;
				p2.remove();
				const rtCs = getComputedStyle(rt);
				c.font = `${rtCs.fontSize} ${rtCs.fontFamily}`;
				const rtInkTop = rtBaseline - c.measureText(rt.textContent ?? '').actualBoundingBoxAscent;
				c.font = `${cs.fontSize} ${cs.fontFamily}`;
				tailIntoGloss =
					baseline + c.measureText(ini.textContent ?? '').actualBoundingBoxDescent - rtInkTop;
			}
			return {
				letter: ini.textContent,
				tailIntoGloss,
				overlap: rest ? inkRight - rest.left : null,
				// and it must not open a hole either: a whole space would read
				// as a word break, as "P ax" did
				gap: rest ? rest.left - inkRight : null
			};
		});
		expect(seen, `${url} has an opening initial`).not.toBeNull();
		expect(seen!.overlap, `${seen!.letter} in ${url} sits on the next letter`).toBeLessThanOrEqual(
			0.5
		);
		expect(seen!.gap, `${seen!.letter} in ${url} opens a word-sized hole`).toBeLessThan(9);
		expect(
			seen!.tailIntoGloss,
			`${seen!.letter} in ${url} drops its tail into the gloss line`
		).toBeLessThanOrEqual(0.5);
	}
});

test('a descending initial keeps its size, and the gloss row gives way', async ({ page }) => {
	// Shrinking Q was the wrong answer: an initial two-thirds the size of
	// every other one is a worse fault than the collision it fixed. The
	// LINE gives way instead — the whole gloss row of that verse sinks by
	// what the tail needs, so the glosses stay level with each other, which
	// is the alignment a reader can actually see.
	await page.goto('/app/en/ordinarium/quod-ore-sumpsimus');
	const q = await page.evaluate(() =>
		parseFloat(getComputedStyle(document.querySelector('.initial')!).fontSize)
	);
	await page.goto('/app/en/ordinarium/per-ipsum');
	const p = await page.evaluate(() =>
		parseFloat(getComputedStyle(document.querySelector('.initial')!).fontSize)
	);
	expect(q, 'Q is set no smaller than P').toBeCloseTo(p, 1);

	// and every gloss on the line the initial opens sits level with its own
	await page.goto('/app/en/ordinarium/quod-ore-sumpsimus');
	const tops = await page.evaluate(() => {
		const verse = document.querySelector('.verse .initial')!.closest('.verse')!;
		return [...verse.querySelectorAll('rt')]
			.slice(0, 4)
			.map((r) => Math.round(r.getBoundingClientRect().top));
	});
	expect(new Set(tops).size, 'the gloss row is level').toBe(1);
});

test('choosing a part does not shift the parts beside it', async ({ page }) => {
	// The chosen part is set bold, and bold is wider: each label was
	// nudging its neighbours a couple of pixels sideways as the reader
	// moved along the row, which made the row look loose. Every option now
	// reserves the width of its own bold form whether or not it is chosen,
	// so only the weight changes.
	// iudica-me, not the Confiteor: the ministers' Confiteor is said by one
	// speaker from beginning to end, so it offers no part to choose — the
	// corpus review corrected its speaker map in 2026-08, and the picker
	// correctly disappeared with it.
	await page.goto('/app/en/ordinarium/iudica-me');
	const lefts = () =>
		page.$$eval('.picker .option', (els) =>
			els.map((e) => Math.round(e.getBoundingClientRect().left))
		);

	const first = await lefts();
	// the gate must never pass by matching nothing — it did once, when the
	// selector outlived the compact form it named
	expect(first.length).toBeGreaterThan(0);
	for (const name of ['server', 'priest', 'faithful']) {
		await page.getByRole('radio', { name }).click();
		expect(await lefts(), `the row moved after choosing ${name}`).toEqual(first);
	}
});

test('the mark key is dismissed the way every other sheet is', async ({ page }) => {
	// It arrived last and got only its own close button: a tap outside and
	// Escape, which dismiss the word panel and the introduction, left it
	// sitting there. Three sheets open from one page; a reader should not
	// have to learn which one needs the ×.
	for (const url of ['/app/pl/ordinarium/pater-noster', '/app/pl/ordo/praeparatio']) {
		await page.goto(url);

		await page.locator('.mark').first().click();
		await expect(page.locator('.legend'), `${url}: does not open`).toBeVisible();
		await page.locator('h1').click();
		await expect(page.locator('.legend'), `${url}: survives a tap outside`).toHaveCount(0);

		await page.locator('.mark').first().click();
		await expect(page.locator('.legend')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.locator('.legend'), `${url}: survives Escape`).toHaveCount(0);
	}
});
