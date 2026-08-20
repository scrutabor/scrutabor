// Polish leaves no one-letter word at the end of a line (PWN: an editorial
// convention, absolute in titles and headings). The binder in lib/polish
// handles the data; this sweep is what proves it reached the page — it
// reads the rendered text of every Polish surface the sitemap knows and
// fails on any one-letter word still followed by a breakable space.
// `bare` and not the full fixture: this reads several hundred pages, and
// what it reads — rendered text — is in the prerendered HTML. Waiting on
// every one of them for hydration and for the webfont bought nothing and
// spent the budget it then ran out of, twice, on CI. The pages this DOES
// operate wait for themselves, below. The network guard is the reason it
// still goes through a fixture at all.
import { bare as test, expect, settled } from './fixtures';

// Reads sitemap.xml to find every Polish page. A downloaded copy carries
// no sitemap — nothing there is crawled — so the sweep has nothing to
// enumerate from and this runs against the served site.
test('no Polish surface leaves a one-letter word before a breakable space @online', async ({
	page,
	request
}) => {
	// A fixed budget for a sweep whose work grows with the corpus is a red
	// main waiting for a season to be added, and it has now been exactly
	// that twice. So the budget is derived from the work: measured at ~55 ms
	// a page on the machine this was written on, and CI's runners are
	// slower, so the allowance is 400 ms with a floor for the fixed cost of
	// starting. It is set below, once the sitemap says how many pages there
	// are — until then the default stands.
	const sitemap = await (await request.get('/sitemap.xml')).text();
	// The full pathname after the origin, or the lazy prefix would eat the
	// /app segment and this sweep would knock on landing doors that are
	// really book pages. Both families are Polish surfaces: the landing at
	// /pl and the book at /app/pl.
	const paths = [
		...sitemap.matchAll(/<loc>https?:\/\/[^/]+((?:\/app)?\/pl(?:\/[^<]*)?)<\/loc>/g)
	].map((m) => m[1]);
	// every prerendered Polish page, plus the one surface the sitemap
	// deliberately leaves out
	paths.push('/pl/404');
	expect(paths.length).toBeGreaterThan(150);
	test.setTimeout(40_000 + paths.length * 400);

	const offences: string[] = [];
	for (const path of paths) {
		// A sweep that fails without naming the page it was on is a sweep
		// that costs a CI round trip to diagnose. It cost two.
		await test.step(path, async () => {
			await page.goto(path);
			// Reading pages keep their fullest prose behind the help slider; read
			// at the top step so translations and narratives are in the DOM, and
			// open a word so gloss, lemma note and contextual note render too.
			const modes = page.locator('.help [role="radio"]');
			const word = page.locator('.word').first();
			const operable = (await modes.count()) + (await word.count()) > 0;
			// only a page about to be OPERATED has to be alive, and it is given
			// longer here than anywhere else. Measured across all 1,190 pages,
			// hydration takes 15-42 ms and does not degrade as the sweep goes
			// on — so a page that has not hydrated in twenty seconds is not a
			// slow page, it is a runner with nine workers competing on it, and
			// CI failed exactly once that way. A minute costs nothing when it
			// is not needed and buys the sweep out of a contention flake.
			// Sixty seconds then failed the same way twice more in one day —
			// nine workers on a four-core runner can starve one page past a
			// minute — so the allowance is two, on the same reasoning.
			if (operable) await settled(page, 120_000);
			if (await word.count()) await word.click();
		});

		// No single mode shows every Polish layer any more: słowa carries
		// the glosses and narratives, przekład the translations — and the
		// stored choice persists across the sweep's shared page, so both
		// are set explicitly and both DOMs are scanned.
		const passes = (await page.locator('.help [role="radio"]').count()) ? [1, 2] : [null];
		for (const mode of passes) {
			if (mode !== null) {
				await page.locator('.help [role="radio"]').nth(mode).click();
			}
			offences.push(
				...(
					await page.evaluate(() => {
						const bad: string[] = [];
						const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
						const measure = document.createRange();
						for (let n = walker.nextNode(); n; n = walker.nextNode()) {
							// Only text that is actually laid out can break across a
							// line. This drops metadata the framework mirrors into the
							// body (the document title among it) without having to
							// enumerate tag names.
							measure.selectNodeContents(n);
							if (measure.getClientRects().length === 0) continue;
							// The document title is metadata; while the framework hoists
							// it into <head> a copy can sit in the body mid-hydration.
							// It never line-wraps, and it carries Latin incipits.
							if (n.textContent === document.title) continue;
							// Only Polish is governed by this convention. Text in another
							// language declares itself: Latin prose has its own one-letter
							// words (a fronte, e regione) and IPA rows are transcription,
							// not language at all (und-fonipa).
							const declared = n.parentElement?.closest('[lang]')?.getAttribute('lang');
							if (!declared?.startsWith('pl')) continue;
							const text = n.textContent ?? '';
							for (const m of text.matchAll(/(?:^|\s|[„“"(])([aiouwzAIOUWZ])[ \t]/g)) {
								bad.push(`"${m[1]}" in: ${text.trim().slice(0, 70)}`);
							}
						}
						return bad;
					})
				).map((f) => `${path} — ${f}`)
			);
		}
	}

	expect(offences).toEqual([]);
});
