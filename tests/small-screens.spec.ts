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

const WIDTHS = [320, 390];
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
