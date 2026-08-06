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
import { expect, test } from './fixtures';

// One of each SHAPE of page rather than one of each page: the failures
// are in the layouts, and the layouts repeat.
const PAGES = [
	'/pl', // the landing, and its wordmark
	'/pl/ordo', // an index of cards with notes hung right
	'/pl/ordo/canon', // the flow: folded rows, marks, the parts control
	'/pl/ordinarium/confiteor-sacerdotis', // the longest title in the book
	'/pl/ordinarium/credo', // the longest text
	'/pl/lemma/mater', // a concordance
	'/pl/grammatica', // a card index
	'/pl/grammatica/pronuntiatio', // a prose page with tables
	'/en/ordo', // the same shapes with English words in them
	'/en/ordinarium/credo'
];

// Phones at both ends, and the tablet widths where a two-column idea would
// first be tempting and a control first has room to spread.
const WIDTHS = [320, 390, 768, 1024];
const SIZES = ['normal', 'larger', 'largest'];

test('nothing runs off the screen, at any width and any text size', async ({ page }) => {
	const damage: string[] = [];
	for (const size of SIZES) {
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 760 });
			for (const url of PAGES) {
				await page.goto(url);
				await page.evaluate((s) => localStorage.setItem('scrutabor-reading', s), size);
				await page.reload();
				await page.waitForSelector('html[data-hydrated]');
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
		for (const width of [...WIDTHS, 1200]) {
			await page.setViewportSize({ width, height: 760 });
			await page.goto('/pl/ordo');
			await page.evaluate((s) => localStorage.setItem('scrutabor-reading', s), size);
			await page.reload();
			await page.waitForSelector('html[data-hydrated]');
			for (const name of ['wybór języka', 'wielkość pisma']) {
				await page.getByRole('button', { name: new RegExp(name) }).click();
				const box = await page.evaluate(() => {
					const r = document.querySelector('[role="listbox"]')!.getBoundingClientRect();
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
		await page.goto('/pl/ordo/praeparatio');
		await page.evaluate((s) => localStorage.setItem('scrutabor-reading', s), size);
		await page.reload();
		await page.waitForSelector('html[data-hydrated]');
		const shape = await page.evaluate(() => {
			const rows = (sel: string) =>
				new Set(
					[...document.querySelectorAll(sel)].map((e) => Math.round(e.getBoundingClientRect().top))
				).size;
			const help = document.querySelector('.help')!.getBoundingClientRect();
			const track = document.querySelector('input[type="range"]')!.getBoundingClientRect();
			return {
				partRows: rows('.picker.compact .option'),
				labelLines: document.querySelector('.picker.compact .label')!.getClientRects().length,
				trackSpansTheRow: track.width > help.width * 0.9
			};
		});
		const at = `${width}px/${size}`;
		expect(shape.partRows, `${at}: the parts control stacked with room to spare`).toBe(1);
		expect(shape.labelLines, `${at}: its label wrapped with room to spare`).toBe(1);
		expect(shape.trackSpansTheRow, `${at}: the help slider stacked with room to spare`).toBe(false);
	}

	// and on the index, the full picker keeps its three parts side by side
	await page.setViewportSize({ width: 1200, height: 900 });
	await page.goto('/pl/ordo');
	const fullRows = await page.evaluate(
		() =>
			new Set(
				[...document.querySelectorAll('.picker:not(.compact) .option')].map((e) =>
					Math.round(e.getBoundingClientRect().top)
				)
			).size
	);
	expect(fullRows, 'the full parts control stacked on a wide screen').toBe(1);
});
