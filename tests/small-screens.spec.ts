// Nothing may run off the screen, at any width the book is read at and
// any size it is set to.
//
// This exists because the two are MULTIPLIED, and a bug needs both to
// show: the reading-size setting scales every length in the app, so a row
// that fits a 320px phone at the default breaks at the largest size, and
// one that fits at the largest size breaks on a narrower phone. Nine of
// these were found in one sweep — the wordmark, the parts control twice,
// the folded rows of the ordo, the catalogue cards, the movement heads,
// the concordance rows, the help slider, the nav itself — and not one of
// them was visible at the size and width a developer happens to be using.
import { expect, settled, test } from './fixtures';

// One of each SHAPE of page rather than one of each page: the failures
// are in the layouts, and the layouts repeat.
const PAGES = [
	'/app/pl', // the landing, and its wordmark
	'/app/pl/ordo', // an index of cards with notes hung right
	'/app/pl/ordo/canon', // the flow: folded rows, marks, the parts control
	'/app/pl/ordinarium/confiteor-sacerdotis', // the longest title in the book
	'/app/pl/ordinarium/credo', // the longest text
	'/app/pl/lemma/mater', // a concordance
	'/app/pl/grammatica', // a card index
	'/app/pl/grammatica/nominativus', // the longest three-level breadcrumb
	'/app/pl/grammatica/pronuntiatio', // a prose page with tables
	'/app/en/ordo', // the same shapes with English words in them
	'/app/en/ordinarium/credo'
];

// Phones at both ends, and the tablet widths where a two-column idea would
// first be tempting and a control first has room to spread.
const WIDTHS = [320, 390, 768, 1024];
const SIZES = ['normal', 'larger', 'largest'];

test('nothing runs off the screen, at any width and any text size', async ({ page }) => {
	// 120 combinations, and each one used to cost TWO page loads: a goto to
	// get an origin to write localStorage on, then a reload to make the
	// setting take. The setting outlives a navigation — localStorage is per
	// origin, not per page — so it is written once per size and every goto
	// after it already has it. 240 loads become 123.
	//
	// That is not tidying. Each load waits for hydration and for the
	// webfont, which is 8 seconds here and several times that on a CI
	// runner with two cores, and this sweep ran out of its budget there
	// while passing locally.
	test.setTimeout(180_000);
	const damage: string[] = [];
	for (const size of SIZES) {
		await page.goto('/app/pl');
		await page.evaluate((s) => localStorage.setItem('scrutabor-reading', s), size);
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 760 });
			for (const url of PAGES) {
				// named, so a failure says which of the 120 it was on
				await test.step(`${url} at ${width}px/${size}`, () => page.goto(url));
				const bad = await page.evaluate(() => {
					const vw = document.documentElement.clientWidth;
					const over = document.documentElement.scrollWidth - vw;
					if (over <= 0) return null;
					const blame: string[] = [];
					for (const el of document.querySelectorAll('body *')) {
						const r = el.getBoundingClientRect();
						const inner = el.scrollWidth - el.clientWidth;
						if ((r.right > vw + 0.5 || inner > 1) && r.width > 4 && el.clientWidth > 4)
							blame.push(
								el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0]
							);
					}
					return { over, blame: [...new Set(blame)].slice(-3) };
				});
				if (bad)
					damage.push(`${url} at ${width}px/${size}: +${bad.over}px [${bad.blame.join(', ')}]`);
			}
		}
	}
	expect(damage, `the page scrolls sideways:\n  ${damage.join('\n  ')}`).toEqual([]);
});

test('every menu opens onto the screen, not off the edge of it', async ({ page }) => {
	// A list hung off the END of its pill, which is right until the nav
	// wraps and the pill is near the left edge — measured at -93px, its
	// first letters cut off. Left-anchoring only moves the problem to the
	// last pill, so the list is placed against the viewport. Document
	// overflow does not catch this: content clipped off the LEFT edge does
	// not extend scrollWidth, which is why the sweep above ran clean while
	// the language menu was visibly cut in half.
	const damage: string[] = [];
	for (const size of SIZES) {
		await page.goto('/app/pl/ordo');
		await page.evaluate((s) => localStorage.setItem('scrutabor-reading', s), size);
		for (const width of [...WIDTHS, 1200]) {
			await page.setViewportSize({ width, height: 760 });
			// same as above: the size is already stored, so this is one load
			// and the fixture's goto has waited for it
			await page.goto('/app/pl/ordo');
			for (const name of ['wybór języka', 'wielkość pisma']) {
				await page.getByRole('button', { name: new RegExp(name) }).click();
				const box = await page.evaluate(() => {
					const r = document.querySelector('.menu ul')!.getBoundingClientRect();
					return { left: r.left, right: r.right, vw: document.documentElement.clientWidth };
				});
				if (box.left < -0.5 || box.right > box.vw + 0.5)
					damage.push(
						`${name} at ${width}px/${size}: ${Math.round(box.left)}…${Math.round(box.right)} of ${box.vw}`
					);
				await page.keyboard.press('Escape');
			}
		}
	}
	expect(damage, `a menu opened off the screen:\n  ${damage.join('\n  ')}`).toEqual([]);
});

test('a wide screen keeps every control in its unstacked form', async ({ page }) => {
	// The other half of the sweep, and the half that was missing. Three
	// controls now rearrange themselves when the room runs out, and a
	// rearrangement that fires when it should not is just as wrong as one
	// that does not fire when it should — `container-type: inline-size`
	// applies `contain: inline-size`, so a control sized BY its contents
	// collapses to nothing and every container query matches. That shipped:
	// the parts control stacked on an 1800px screen.
	for (const [width, size] of [
		[1800, 'normal'],
		[1200, 'largest'],
		[1024, 'larger']
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/app/pl/ordo/praeparatio');
		await page.evaluate((s) => localStorage.setItem('scrutabor-reading', s), size);
		await page.reload();
		await settled(page);
		const shape = await page.evaluate(() => {
			const rows = (sel: string) =>
				new Set(
					[...document.querySelectorAll(sel)].map((e) => Math.round(e.getBoundingClientRect().top))
				).size;
			return {
				// per control: two of them sit in this row now, the reader's
				// part and the kind of Mass, and each must keep its own
				// options on one line
				partRows: Math.max(
					rows('.picker.compact[data-kind="role"] .option'),
					rows('.picker.compact[data-kind="mass"] .option')
				),
				labelLines: document.querySelector('.picker.compact .label')!.getClientRects().length,
				modeRows: rows('.help .option')
			};
		});
		const at = `${width}px/${size}`;
		expect(shape.partRows, `${at}: the parts control stacked with room to spare`).toBe(1);
		expect(shape.labelLines, `${at}: its label wrapped with room to spare`).toBe(1);
		expect(shape.modeRows, `${at}: the mode words wrapped with room to spare`).toBe(1);
	}

	// and on the index, each full picker keeps its own options side by side.
	// Two of them stand there — the reader's part and the kind of Mass — so
	// this counts rows WITHIN a control, not across the pair, which of
	// course sit on two rows because they are two settings.
	await page.setViewportSize({ width: 1200, height: 900 });
	await page.goto('/app/pl/ordo');
	const fullRows = await page.evaluate(() =>
		['role', 'mass'].map(
			(kind) =>
				new Set(
					[...document.querySelectorAll(`.picker:not(.compact)[data-kind="${kind}"] .option`)].map(
						(e) => Math.round(e.getBoundingClientRect().top)
					)
				).size
		)
	);
	expect(fullRows, 'a full picker stacked on a wide screen').toEqual([1, 1]);
});

test('each part is drawn in its own slot, not over its separator', async ({ page }) => {
	// The compact control keeps every part at the width of its BOLD form so
	// that choosing one does not nudge its neighbours: a hidden copy sets
	// the width and the visible word is laid over it. The word was laid
	// over the whole BUTTON, which also holds the middot before it — so
	// every unselected word was drawn a few pixels left of its own slot,
	// into the separator. It looked like uneven spacing, which is a hard
	// thing to see and a very easy thing to state: the visible word and the
	// copy that reserves its room are the same box.
	//
	// Both parts of the mechanism are checked here, because a fix for
	// either one alone is easy to reach for: the words must not move when a
	// different part is chosen, and they must sit where their slot is.
	for (const [width, size] of [
		[1280, 'normal'],
		[390, 'largest']
	] as const) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/app/pl/ordo/praeparatio');
		await page.evaluate((s) => localStorage.setItem('scrutabor-reading', s), size);
		await page.reload();
		await settled(page);

		const slots = () =>
			page.evaluate(() =>
				[...document.querySelectorAll('.picker.compact .option')].map((o) => {
					const ghost = o.querySelector('.ghost')!.getBoundingClientRect();
					const real = o.querySelector('.real')!.getBoundingClientRect();
					return {
						word: (o as HTMLElement).dataset.word!,
						offBy: Math.max(Math.abs(ghost.x - real.x), Math.abs(ghost.right - real.right)),
						x: Math.round(ghost.x)
					};
				})
			);

		const before = await slots();
		for (const slot of before)
			expect(slot.offBy, `${width}px/${size}: “${slot.word}” is drawn off its slot`).toBeLessThan(
				0.5
			);

		await page.locator('.picker.compact .option').last().click();
		const after = await slots();
		expect(
			after.map((s) => s.x),
			`${width}px/${size}: choosing a part moved the others`
		).toEqual(before.map((s) => s.x));
		for (const slot of after)
			expect(
				slot.offBy,
				`${width}px/${size}: “${slot.word}” is drawn off its slot once chosen`
			).toBeLessThan(0.5);
	}
});

test('a heading stands across the list it names, not beside the first of it', async ({ page }) => {
	// The lists that stand in two columns above 85rem hold their own
	// heading, and a multi-column flow has no idea it is a heading: it laid
	// "w tekstach" at the head of column one and put the first occurrence of
	// column two level with it, so the two read as a pair (owner,
	// 2026-08-07). column-span lifts it out of the flow.
	//
	// Asserted at BOTH widths, because the fault only exists in the
	// two-column form and a rule that stopped applying there would
	// otherwise still pass on a phone.
	for (const width of [390, 1500]) {
		await page.setViewportSize({ width, height: 900 });
		for (const url of ['/app/pl/lemma/meus', '/app/pl/grammatica/nominativus']) {
			await page.goto(url);
			const shape = await page.evaluate(() => {
				const list = document.querySelector('.in-two')!;
				const h2 = list.querySelector(':scope > h2')!;
				const head = h2.getBoundingClientRect();
				const rows = [...list.children]
					.filter((e) => e !== h2 && e.getBoundingClientRect().height)
					.map((e) => e.getBoundingClientRect());
				return {
					rows: rows.length,
					cols: new Set(rows.map((r) => Math.round(r.left))).size,
					// the heading is as wide as the whole list, not one column
					spans: head.width > list.getBoundingClientRect().width - 1,
					beside: rows.filter((r) => r.top < head.bottom - 0.5).length
				};
			});
			const at = `${url} at ${width}px`;
			expect(shape.rows, `${at}: nothing in the list to arrange`).toBeGreaterThan(1);
			expect(shape.beside, `${at}: a row sits level with the heading`).toBe(0);
			expect(shape.spans, `${at}: the heading is only as wide as one column`).toBe(true);
			expect(shape.cols, `${at}: expected ${width < 1360 ? 'one column' : 'two'}`).toBe(
				width < 1360 ? 1 : 2
			);
		}
	}
});
