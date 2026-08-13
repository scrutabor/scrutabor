// The flow view: the Mass in order, for a reader following it in the pew.
import { atRoute, expect, settled, test } from './fixtures';
import { ORDO } from '../src/lib/ordo';

test('the ordo is a map of six movements, walked in order', async ({ page }) => {
	await page.goto('/app/pl/ordo');
	await expect(page.locator('h1')).toHaveText('Ordo Missæ');
	const movements = page.locator('.movement');
	await expect(movements).toHaveCount(6);
	await expect(movements.first()).toContainText('Præparátio');
	await expect(movements.last()).toContainText('Conclúsio');

	// the Mass opens at the foot of the altar…
	await movements.first().click();
	await expect(page).toHaveURL(atRoute('/app/pl/ordo/praeparatio'));
	await expect(page.locator('.part-title').first()).toContainText('Introíbo');

	// …and the pager walks the movements to the end, where the prayers
	// after low Mass close it
	for (const id of ['catechumenorum', 'offertorium', 'canon', 'communio', 'conclusio']) {
		await page.locator('.pager-next').click();
		await expect(page).toHaveURL(atRoute(`/app/pl/ordo/${id}`));
	}
	// the last of the five prayers of Leo XIII, which the conclusion now
	// lists one by one instead of describing as a block still to come
	await expect(page.locator('.part-title').last()).toContainText('Cor Iesu sacratíssimum');
	await expect(page.locator('.pager-next')).toHaveCount(0);

	// every part of the spine appears on exactly one movement page — under
	// its own heading when it is shown, or as a row in the list of what the
	// reader is not saying, which is still the part being named
	let parts = 0;
	for (const m of ORDO) {
		await page.goto(`/app/pl/ordo/${m.id}`);
		parts += await page.locator('.part-title, .unfold-title').count();
	}
	expect(parts).toBe(ORDO.flatMap((m) => m.entries).length);
	await page.goto('/app/pl/ordo/catechumenorum');

	// the texts this edition carries are inlined in full (read at the bare
	// step, where the interlinear glosses do not interleave with the Latin)
	await page.goto('/app/pl/ordo/praeparatio');
	await page.locator('input[type="range"]').fill('0');
	// two Confiteors stand here now; this is the ministers', the one the
	// faithful say
	const confiteor = page.locator('.part', { hasText: 'Confíteor (Ministrórum)' }).first();
	await expect(confiteor.locator('.verse').first()).toContainText('Confíteor Deo omnipoténti');
	// …and their titles lead to the study page
	await expect(confiteor.locator('a.part-title')).toHaveAttribute(
		'href',
		'/app/pl/ordinarium/confiteor'
	);

	// every text this edition carries appears in the flow, on its movement
	for (const [slug, movement] of [
		['confiteor', 'praeparatio'],
		['kyrie', 'catechumenorum'],
		['gloria', 'catechumenorum'],
		['deo-gratias-epistolae', 'catechumenorum'],
		['laus-tibi-christe', 'catechumenorum'],
		['credo', 'catechumenorum'],
		['sanctus', 'canon'],
		['agnus-dei', 'communio']
	]) {
		await page.goto(`/app/pl/ordo/${movement}`);
		await expect(page.locator(`.part a[href="/app/pl/ordinarium/${slug}"]`)).toHaveCount(1);
	}
	await page.goto('/app/pl/ordo/catechumenorum');

	// the day's own texts are marked where they fall
	await expect(page.locator('.mark', { hasText: 'z formularza dnia' }).first()).toBeVisible();

	// A part still to come is marked too, and shows no text of its own.
	// There are none left: the last of them was the block of prayers after
	// low Mass, and with the collect and Cor Iesu sacratíssimum in, every
	// FIXED text the spine names is carried. So the check is on the
	// mechanism rather than on a particular gap, and it comes back the day
	// the spine names something new.
	const remaining = ORDO.find((m) => m.entries.some((e) => e.kind === 'pending'));
	if (remaining) {
		await page.goto(`/app/pl/ordo/${remaining.id}`);
		await expect(page.locator('.mark', { hasText: 'wkrótce w tym wydaniu' }).first()).toBeVisible();
		const pending = page
			.locator('.part')
			.filter({ has: page.locator('.mark') })
			.first();
		await expect(pending.locator('.verse')).toHaveCount(0);
	} else {
		// what remains unshown is the proper of the day, and only that
		const kinds = new Set(ORDO.flatMap((m) => m.entries).map((e) => e.kind));
		expect([...kinds].sort()).toEqual(['proper', 'text']);
	}
});

test('a word in the flow opens its analysis, wherever it stands', async ({ page }) => {
	await page.goto('/app/pl/ordo/communio');
	// a word from the LAST inlined text, to prove every text is wired
	const agnus = page.locator('[id="agnus-dei.w001"]');
	await agnus.click();
	const panel = page.locator('aside');
	await expect(panel.locator('.form')).toHaveText('Agnus');
	await expect(panel.locator('.head a')).toHaveAttribute('href', '/app/pl/lemma/agnus');

	// the deep link addresses text and word together, and survives a reload
	// (a dot is unreserved in a URL, so it makes the round trip unencoded)
	await expect(page).toHaveURL(/\?w=agnus-dei\.w001$/);
	await page.reload();
	await expect(page.locator('aside .form')).toHaveText('Agnus');

	// escape closes it, as everywhere else
	await page.keyboard.press('Escape');
	await expect(panel).toHaveCount(0);
});

test('a deep link into the flow lands on its word, not on the ribbon', async ({ page }) => {
	// leave a ribbon somewhere far from the target
	await page.goto('/app/pl/ordo/catechumenorum');
	await page.evaluate(() => window.scrollTo(0, 3000));
	await page.waitForTimeout(1500);

	await page.goto('/app/pl/ordo/catechumenorum?w=kyrie.w002');
	await expect(page.locator('aside .form')).toHaveText('eléison');
	await expect
		.poll(() =>
			page.evaluate(() => {
				const r = document.getElementById('kyrie.w002')?.getBoundingClientRect();
				return !!r && r.top >= 0 && r.bottom <= window.innerHeight;
			})
		)
		.toBe(true);
});

test('the flow and the reading page number their words apart', async ({ page }) => {
	await page.goto('/app/pl/ordo/catechumenorum');
	// same corpus id in five texts, five distinct DOM ids — no collisions
	const first = await page.locator('.part-text .word').first().getAttribute('id');
	expect(first).toMatch(/^[a-z-]+\.w\d{3}$/);
	const ids = await page.locator('.part-text .word').evaluateAll((els) => els.map((e) => e.id));
	expect(new Set(ids).size).toBe(ids.length);
	// the reading page keeps the bare corpus id, so its deep links are unchanged
	await page.goto('/app/pl/ordinarium/credo');
	expect(await page.locator('.word').first().getAttribute('id')).toBe('w001');
});

test('the help ladder governs the whole flow', async ({ page }) => {
	await page.goto('/app/en/ordo/catechumenorum');
	const slider = page.locator('input[type="range"]');

	// default: interlinear glosses and the what-happens lines
	await expect(page.locator('.part-text rt').first()).toBeVisible();
	await expect(page.locator('.part-note').first()).toBeVisible();
	await expect(page.locator('.translation')).toHaveCount(0);

	await slider.fill('0');
	await expect(page.locator('.part-text rt')).toHaveCount(0);
	await expect(page.locator('.part-note')).toHaveCount(0);

	await slider.fill('2');
	await expect(page.locator('.translation').first()).toBeVisible();
});

test('the landing separates following the Mass from opening a text', async ({ page }) => {
	await page.goto('/app/en');
	const flow = page.locator('a.flow');
	await expect(flow).toContainText('Ordo Missæ');
	// it says which order of Mass this is — the edition, by name and year
	await expect(flow).toContainText('the order of Mass in the Roman Missal of 1962');

	// it stands above the catalog and outside it: no card links to the flow
	const firstSection = page.locator('main section').first();
	expect(
		await flow.evaluate(
			(el, section) => !!(el.compareDocumentPosition(section!) & Node.DOCUMENT_POSITION_FOLLOWING),
			await firstSection.elementHandle()
		)
	).toBe(true);
	await expect(page.locator('.cards a[href$="/ordo"]')).toHaveCount(0);

	await flow.click();
	await expect(page).toHaveURL(atRoute('/app/en/ordo'));
});

test('every prayer the Ordo links to is actually built', async ({ page, request }) => {
	// The prerender list was the CATALOGUE, which orders the shelf but is
	// not the list of what exists: 27 texts — the whole Canon among them —
	// were linked from the Ordo and never built, so on the static site
	// those titles led to a 404 while the dev server served them happily.
	// A route that is linked has to be built, and the only way to know is
	// to follow the links.
	// as the celebrant, so nothing is folded and every part shows its title
	// as the link it is
	await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
	const seen = new Set<string>();
	for (const m of ORDO) {
		await page.goto(`/app/pl/ordo/${m.id}`);
		const hrefs = await page.evaluate(() =>
			[...document.querySelectorAll('a.part-title')].map((a) => a.getAttribute('href')!)
		);
		for (const href of hrefs) seen.add(href);
	}
	expect(seen.size, 'the Ordo links to its texts').toBeGreaterThan(30);

	const missing: string[] = [];
	for (const href of seen) {
		const res = await request.get(href);
		if (!res.ok()) missing.push(`${href} → ${res.status()}`);
	}
	expect(missing).toEqual([]);
});

test('the index answers a change of part in the book’s own voice', async ({ page }) => {
	// The picker's hint is the WHOLE answer the index gives. It stood under
	// a second line that counted the reader's places — "You answer at 16
	// places, and say in full: …" — which said the same thing in the second
	// person, on a page meant for browsing, and no missal does that. The
	// parts are marked where the reader meets them instead.
	await page.goto('/app/en/ordo');
	const hint = page.locator('.picker[data-kind="role"]:not(.compact) .hint');
	await expect(hint).toHaveText('the parts said aloud, with the answers of the faithful');

	await page.getByRole('radio', { name: 'priest' }).click();
	await expect(hint).toHaveText('the whole Ordo Missæ, including the prayers said silently');

	await page.getByRole('radio', { name: 'faithful' }).click();
	await expect(hint).toHaveText('the parts said aloud, with the answers of the faithful');

	// and nothing counts at the reader
	await expect(page.locator('.role-part')).toHaveCount(0);
	await expect(page.locator('main')).not.toContainText('You answer at');
});

test('the narrative names the priest rather than calling him "he"', async ({ page }) => {
	// A prayer book's rubrics name him, and a reader lands in the MIDDLE of
	// this book constantly — every part is its own block and the Ordo jumps
	// between them — so a sentence beginning "He goes on silently" has no
	// antecedent anywhere in view. The corpus lints its own narratives; this
	// covers the spine's notes, which are the app's prose, and catches a
	// corpus fix that was made but never vendored.
	const offenders: string[] = [];
	for (const m of ORDO) {
		await page.goto(`/app/en/ordo/${m.id}`);
		offenders.push(
			...(await page.evaluate(() =>
				[...document.querySelectorAll('.part-note, .unfold-what, .rubric-narrative')]
					.flatMap((el) => (el.textContent ?? '').split(/(?<=[.;])\s+/))
					.filter(
						(s) =>
							/^\W*(He|His)\b/.test(s) ||
							/^\W*(Then|Now|Meanwhile|Here|Next|Again|Afterwards?)\b[^.]{0,24}\bhe\b/.test(s)
					)
					.map((s) => s.slice(0, 60))
			))
		);
	}
	expect(offenders).toEqual([]);
});

test('arrow keys page the Ordo, where a reader is walking the Mass', async ({ page }) => {
	// The individual prayers had this and the flow did not, which is
	// backwards: the Ordo is exactly where the next movement is wanted
	// without reaching for the pager (owner, 2026-08-09).
	await page.goto('/app/pl/ordo/canon');
	await page.keyboard.press('ArrowRight');
	await expect(page).toHaveURL(atRoute('ordo/communio'));

	// Offline the book is file:// and every move is a fresh document, so
	// the next key has to wait for the new page to be hydrated — rendered
	// is not enough, the handler arrives with hydration.
	await settled(page);
	await page.keyboard.press('ArrowLeft');
	await expect(page).toHaveURL(atRoute('ordo/canon'));

	// and a modifier still belongs to the browser, not to the page
	await settled(page);
	const here = page.url();
	await page.keyboard.press('Alt+ArrowRight');
	await expect(page).toHaveURL(here);

	// A word is a <button>, and refusing the arrows to every button took
	// them from the text itself: tap a word in the Canon to read it and the
	// walk through the Mass stopped (owner, 2026-08-09). The role picker
	// keeps its own arrows by role, which is what the handler now asks.
	await settled(page);
	await page.locator('button.word').first().click();
	await expect(page.locator('aside .form')).toBeVisible();
	await page.keyboard.press('ArrowRight');
	await expect(page, 'a selected word does not stop the walk').toHaveURL(atRoute('ordo/communio'));
});

test('an opened aside says it is one, and can be shut again', async ({ page }) => {
	// Folded parts opened INLINE with nothing to mark them as an aside and
	// no way back — the reader could reveal the whole silent Canon and not
	// get their own page back (owner, 2026-08-09).
	await page.goto('/app/pl/ordo/canon');
	const folded = page.locator('.part.folded');
	const before = await folded.count();
	expect(before, 'the pew view folds the silent prayers').toBeGreaterThan(0);

	await page.locator('.unfold').first().click();
	const revealed = page.locator('.part.revealed').first();
	await expect(revealed).toBeVisible();
	await expect(revealed.locator('.aside-mark')).toHaveText('modlitwa kapłana');
	await expect(revealed.locator('.part-text')).toBeVisible();

	await revealed.locator('.refold').click();
	await expect(page.locator('.part.revealed')).toHaveCount(0);
	await expect(page.locator('.part.folded')).toHaveCount(before);
});

test('the reader is told which lines are theirs, and at which Mass', async ({ page }) => {
	// The Missale gives every response at low Mass to the minister and says
	// nothing about the people, so the label read ministrant over lines a
	// congregation was about to say (owner, 2026-08-09). The corpus now
	// carries the 1958 instruction's own attributions, and they differ by
	// the KIND of Mass: the prayers at the foot of the altar are the
	// server's dialogue with the priest at a sung Mass, and the people's
	// second-degree part at a low one.
	await page.goto('/app/pl/ordo/praeparatio');
	await settled(page);
	const names = () => page.locator('.who-name');

	// sung is the default (owner, 2026-08-10): where the traditional rite is
	// celebrated at all it is usually the Sunday Mass, and n. 26 asks that
	// the Sunday parish Mass be sung
	await expect(page.locator('.picker .option.on', { hasText: 'śpiewana' })).toBeVisible();
	await expect(names().filter({ hasText: 'usługujący' }).first()).toBeVisible();

	// at a low Mass the same lines are the faithful's, by n. 31 b
	await page.locator('.option[data-word="cicha"]').click();
	await expect(names().filter({ hasText: 'usługujący i wierni' }).first()).toBeVisible();

	// and a server still sees the rubrical speaker, which is what he needs
	await page.locator('.option[data-word="usługujący"]').click();
	await expect(names().filter({ hasText: 'usługujący' }).first()).toBeVisible();
});

test('the responses everyone makes are marked as such', async ({ page }) => {
	// A newcomer's question is not which lines they MAY say but which ones
	// everybody is about to. That is the first degree of the instruction —
	// nn. 25 a and 31 a — and nothing else carries the mark.
	await page.goto('/app/pl/ordo/canon');
	await settled(page);
	const everyone = page.locator('.who-all');
	await expect(everyone.first()).toBeVisible();
	await expect(everyone.first()).toHaveText('odpowiadają wszyscy');

	// a server is not "everyone": the mark belongs to the pew's view
	await page.locator('.option[data-word="kapłan"]').click();
	await expect(everyone).toHaveCount(0);
});

test('the responses after the readings follow the sourced participation lists', async ({
	page
}) => {
	await page.goto('/app/pl/ordo/catechumenorum');
	await settled(page);
	const deo = page.locator('.part', { hasText: 'Deo grátias' });
	const laus = page.locator('.part', { hasText: 'Laus tibi, Christe' });

	// DMS 25 a names Deo gratias for sung Mass but does not name Laus tibi,
	// Christe. Silence in that list must not be promoted to an attribution.
	await expect(deo.locator('.who-all')).toHaveText('odpowiadają wszyscy');
	await expect(laus.locator('.who-all')).toHaveCount(0);

	// DMS 31 a names both among the first-degree responses at low Mass.
	await page.locator('.option[data-word="cicha"]').click();
	await expect(deo.locator('.who-all')).toHaveText('odpowiadają wszyscy');
	await expect(laus.locator('.who-all')).toHaveText('odpowiadają wszyscy');
});
