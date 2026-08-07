// Polish leaves no one-letter word at the end of a line (PWN: an editorial
// convention, absolute in titles and headings). The binder in lib/polish
// handles the data; this sweep is what proves it reached the page — it
// reads the rendered text of every Polish surface the sitemap knows and
// fails on any one-letter word still followed by a breakable space.
import { expect, test } from './fixtures';

// Reads sitemap.xml to find every Polish page. A downloaded copy carries
// no sitemap — nothing there is crawled — so the sweep has nothing to
// enumerate from and this runs against the served site.
test('no Polish surface leaves a one-letter word before a breakable space @online', async ({
	page,
	request
}) => {
	test.setTimeout(180_000);

	const sitemap = await (await request.get('/sitemap.xml')).text();
	const paths = [...sitemap.matchAll(/<loc>[^<]*?(\/pl(?:\/[^<]*)?)<\/loc>/g)].map((m) => m[1]);
	// every prerendered Polish page, plus the one surface the sitemap
	// deliberately leaves out
	paths.push('/pl/404');
	expect(paths.length).toBeGreaterThan(150);

	const offences: string[] = [];
	for (const path of paths) {
		await page.goto(path);
		// Reading pages keep their fullest prose behind the help slider; read
		// at the top step so translations and narratives are in the DOM, and
		// open a word so gloss, lemma note and contextual note render too.
		const slider = page.locator('input[type="range"]');
		if (await slider.count()) await slider.fill('2');
		const word = page.locator('.word').first();
		if (await word.count()) await word.click();

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

	expect(offences).toEqual([]);
});
