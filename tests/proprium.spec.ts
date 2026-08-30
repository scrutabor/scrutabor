// The day fills the Ordo's own slots.
//
// This spec is UNTAGGED on purpose, which is what makes it run twice: once
// against the site and once against the downloaded copy over file://, where
// there is no origin and no server. (`@online` would exclude it from the
// second run — the very run that matters here.)
// That second run is the point. The day is FETCHED rather than built into the
// page (decisions #27, revised 2026-08-18), and a fetch of an absolute path is
// exactly the kind of thing that works on the site and silently fails in the
// zip — which is where offline was supposed to matter most.
import { expect, settled, test } from './fixtures';

const DAY = 'dominica-i-adventus';
/** A date this edition has no formulary for, so the picker opens empty. Every
 * test here pins the clock — the book opens on TODAY, so what the control
 * shows otherwise depends on the day the machine happens to hold.
 * scripts/clock-pinned.test.ts holds that rule over this file. */
const OUTSIDE_ADVENT = '2026-08-19T10:00:00';

// The whole reason the calendar was built: a reader at Mass on Sunday morning
// opens the book and the proper is already right. The clock is fixed rather
// than waited for — the real one spends most of the year outside the four
// Sundays this edition carries.
async function asIfItWere(page: import('@playwright/test').Page, when: string): Promise<void> {
	await page.addInitScript((iso: string) => {
		const fixed = new Date(iso).valueOf();
		const Real = Date;
		(globalThis as unknown as { Date: unknown }).Date = class extends Real {
			constructor(...args: ConstructorParameters<typeof Date>) {
				super(...(args.length ? args : ([fixed] as unknown as ConstructorParameters<typeof Date>)));
			}
			static now() {
				return fixed;
			}
		};
	}, when);
}

test('the Ordo shows placeholders until a day is chosen', async ({ page }) => {
	// PINNED, like every other test here. It was left on the wall clock, and
	// since the book now opens on today there are no placeholders left to see
	// on a Sunday this edition carries: it would have gone red on 2026-11-29
	// and every Advent Sunday after it. A failure that arrives with the season
	// and clears by Monday is the kind that teaches everyone to ignore a gate.
	await asIfItWere(page, '2026-08-19T10:00:00');
	await page.goto('/app/pl/ordo/catechumenorum');
	// The slot is named and described, and carries no text of its own.
	await expect(page.getByText('z formularza dnia').first()).toBeVisible();
	await expect(page.locator('body')).not.toContainText('wzniosłem');
});

test('the book opens on today when today is a day it carries', async ({ page }) => {
	await asIfItWere(page, '2026-12-13T10:00:00');
	await page.goto('/app/pl/ordo');
	const picker = page.locator('.picker.day').first();
	await expect(picker.locator('select')).toHaveValue('dominica-iii-adventus');
	await expect(picker.locator('.sizer')).toHaveText(/dziś/);
});

test('a day this edition has not reached is named, not guessed at', async ({ page }) => {
	// A Tuesday in Advent. The temporal cycle gives a feria no Mass of its own,
	// and which Mass it takes is a rubric this edition has not read — so the
	// week is named and nothing is claimed.
	await asIfItWere(page, '2026-12-15T10:00:00');
	await page.goto('/app/pl/ordo');
	const picker = page.locator('.picker.day').first();
	await expect(picker.locator('select')).toHaveValue('');
	// the status lives behind the day row's icon now (owner, 2026-08-21):
	// one tap, a sheet, and the week is named
	await picker.locator('.status-why').click();
	await expect(page.locator('.day-status-sheet')).toContainText(
		'dziś dzień powszedni — ostatnia niedziela to III Niedziela Adwentu'
	);
});

test('the note about today gives way to the day the reader picks', async ({ page }) => {
	// It did not, and the owner found it on the live page. The note explaining
	// that today's formulary is not here yet was derived from the clock alone,
	// and sat ahead of the branch that reads the choice — so once today fell
	// outside the four Sundays this edition carries, which is eleven months of
	// the year, the hint stayed frozen on "wybierz inny dzień" while the reader
	// was looking at the day they had just chosen.
	//
	// A fixed date OUTSIDE Advent, because that is the state the defect needs
	// and the real clock only offers it for most of the year rather than all.
	await asIfItWere(page, '2026-08-19T10:00:00');
	await page.goto('/app/pl/ordo');
	const picker = page.locator('.picker.day').first();
	const why = picker.locator('.status-why');
	await why.click();
	await expect(page.locator('.day-status-sheet')).toContainText(/można wybrać inny dzień/);

	// a chosen day says nothing — the row already names it (owner,
	// 2026-08-21: drop the trivial hints): the icon leaves, and the open
	// sheet leaves with its subject
	await picker.locator('select').selectOption(DAY);
	await expect(page.locator('.day-status-sheet')).toHaveCount(0);
	await expect(why).toHaveCount(0);

	// …and the icon comes back when the choice is dropped, because then it
	// is the default again and the default is what it describes.
	await picker.locator('select').selectOption('');
	await why.click();
	await expect(page.locator('.day-status-sheet')).toContainText(/można wybrać inny dzień/);
});

test('choosing a day silences the weekday note too', async ({ page }) => {
	// The other half of the same rule: a feria names the week it falls in
	// while nothing is chosen, and says nothing once something is.
	await asIfItWere(page, '2026-12-15T10:00:00');
	await page.goto('/app/pl/ordo');
	const picker = page.locator('.picker.day').first();
	await picker.locator('.status-why').click();
	await expect(page.locator('.day-status-sheet')).toContainText(
		/ostatnia niedziela to III Niedziela Adwentu/
	);
	await picker.locator('select').selectOption(DAY);
	await expect(page.locator('.day-status-sheet')).toHaveCount(0);
	await expect(picker.locator('.status-why')).toHaveCount(0);
});

test('a day chosen yesterday does not still be showing tomorrow', async ({ page }) => {
	// Walking the six movements has to keep the day. A choice made last Sunday
	// must not still be showing Advent in Lent, now that the book can say what
	// today is.
	await page.goto('/app/pl/ordo');
	await page.evaluate(() =>
		localStorage.setItem(
			'scrutabor-day',
			JSON.stringify({ d: 'dominica-i-adventus', on: '2020-01-01' })
		)
	);
	await asIfItWere(page, '2026-12-13T10:00:00');
	await page.goto('/app/pl/ordo');
	await expect(page.locator('.picker.day select').first()).toHaveValue('dominica-iii-adventus');
});

test('choosing a day fills the slots without leaving the page', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo/catechumenorum');
	const marker = await page.evaluate(() => performance.getEntriesByType('navigation')[0].startTime);

	await page.getByLabel(/dzień/i).selectOption(DAY);
	// The introit's own words, which only the day can supply.
	await expect(page.locator('body')).toContainText('wzniosłem', { timeout: 15000 });

	// Same document: no navigation, which is half the reason for fetching.
	const after = await page.evaluate(() => performance.getEntriesByType('navigation')[0].startTime);
	expect(after).toBe(marker);
});

test('the chant slot carries gradual and alleluia together', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto(`/app/pl/ordo/catechumenorum?dies=${DAY}`);
	// One Ordo slot, two texts: Univérsi is the gradual, Osténde the alleluia.
	await expect(page.locator('body')).toContainText('Univérsi', { timeout: 15000 });
	await expect(page.locator('body')).toContainText('Osténde');
});

test('a shared link restores the day and the word', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto(`/app/pl/ordo/catechumenorum?dies=${DAY}&w=${DAY}-introitus.w014`);
	// The day arrived…
	await expect(page.locator('body')).toContainText('wzniosłem', { timeout: 15000 });
	// …and the panel opened on a word the day brought with it, which also
	// proves the fetched dictionary reached the panel: without the merge the
	// parse would be missing even though the word is on the page.
	await expect(page.locator('body')).toContainText('tryb łączący', { timeout: 15000 });
	await expect(page.locator('[id="dominica-i-adventus-introitus.w014"]')).toBeInViewport();
});

test('a gesture before the proper arrives ends deep-link settling @online', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.route('**/artifacts/proprium/pl/dominica-i-adventus.json', async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 2500));
		await route.continue();
	});
	await page.goto(`/app/pl/ordo/catechumenorum?dies=${DAY}&w=${DAY}-introitus.w014`);
	await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
	await page.mouse.wheel(0, 200);

	const word = page.locator('[id="dominica-i-adventus-introitus.w014"]');
	await expect(word).toBeVisible({ timeout: 10_000 });
	await expect(word).not.toBeInViewport();
});

test('picking a day does not make the control flicker @online', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	// Give the page a response already held in memory, then freeze its clock:
	// the 400 ms slow-load timer cannot win because the runner was starved.
	// A MutationObserver sees every state inserted into the live region, even
	// if it is removed before a screenshot or animation-frame sampler wakes.
	const artifactPath = '/artifacts/proprium/en/dominica-i-adventus.json';
	const artifact = await page.request.get(artifactPath);
	expect(artifact.ok()).toBe(true);
	const artifactBody = await artifact.body();
	await page.route(`**${artifactPath}`, (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: artifactBody })
	);
	await page.goto(`/app/en/ordo/catechumenorum`);
	await settled(page);
	await page.evaluate(() => document.fonts.ready);
	await page.clock.install();
	await page.clock.pauseAt(await page.evaluate(() => Date.now()));
	await page.evaluate(() => {
		const picker = document.querySelector('.picker.day');
		if (!(picker instanceof HTMLElement)) throw new Error('day picker not found');
		const probe = {
			sizes: [] as string[],
			announced: false,
			observer: null as MutationObserver | null
		};
		const record = () => {
			const r = picker.getBoundingClientRect();
			const size = `${Math.round(r.width)}x${Math.round(r.height)}`;
			if (probe.sizes.at(-1) !== size) probe.sizes.push(size);
			if (picker.querySelector('.state')) probe.announced = true;
		};
		probe.observer = new MutationObserver((records) => {
			for (const mutation of records) {
				for (const node of mutation.addedNodes) {
					if (node instanceof Element && (node.matches('.state') || node.querySelector('.state')))
						probe.announced = true;
				}
			}
			record();
		});
		probe.observer.observe(picker, {
			attributes: true,
			characterData: true,
			childList: true,
			subtree: true
		});
		record();
		(
			window as unknown as {
				__dayPickerProbe: typeof probe & { record: () => void };
			}
		).__dayPickerProbe = Object.assign(probe, { record });
	});
	await page.selectOption('.picker.day select', DAY);
	await expect(page.locator('body')).toContainText('Ad te levávi');
	const { sizes, announced } = await page.evaluate(() => {
		const probe = (
			window as unknown as {
				__dayPickerProbe: {
					sizes: string[];
					announced: boolean;
					observer: MutationObserver;
					record: () => void;
				};
			}
		).__dayPickerProbe;
		probe.record();
		probe.observer.disconnect();
		return { sizes: probe.sizes, announced: probe.announced };
	});
	// A load this fast is not worth announcing, so nothing is said and nothing
	// is moved by saying it.
	expect(announced).toBe(false);
	// The control may settle wider — the day names are longer than "no proper"
	// and the chosen one is set in the rubric weight — but it must not take a
	// size it then abandons, which is what a flicker is.
	expect(sizes.length, sizes.join(' -> ')).toBeLessThanOrEqual(2);
	expect(new Set(sizes).size, sizes.join(' -> ')).toBe(sizes.length);
});

test('a slow day still says it is loading @online', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	// The notice is delayed, not removed: hold the artifact and it appears,
	// which is the case it exists for.
	await page.route('**/artifacts/proprium/**', async (route) => {
		await new Promise((r) => setTimeout(r, 1500));
		await route.continue();
	});
	await page.goto(`/app/en/ordo/catechumenorum`);
	await settled(page);
	await page.selectOption('.picker.day select', DAY);
	await expect(page.locator('.picker.day .state')).toBeVisible();
	await expect(page.locator('.picker.day .state')).toBeHidden({ timeout: 10_000 });
});

test('a corrected pick is not overtaken by the first one @online', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	// The reader picks a Sunday and corrects themselves while the first
	// artifact is still in flight. Responses come back in whatever order the
	// network pleases. Hold the first response on an explicit promise, wait for
	// the second day to be fully in place, then release the first and wait for
	// its response and the browser's next render turn. No wall-clock pause can
	// pass before the superseded response has actually been processed.
	let sawFirstRequest!: () => void;
	let releaseFirstRequest!: () => void;
	const firstRequested = new Promise<void>((resolve) => (sawFirstRequest = resolve));
	const firstReleased = new Promise<void>((resolve) => (releaseFirstRequest = resolve));
	await page.route('**/artifacts/proprium/en/dominica-i-adventus.json', async (route) => {
		sawFirstRequest();
		await firstReleased;
		await route.continue();
	});
	await page.goto('/app/en/ordo/catechumenorum');
	await settled(page);
	await page.selectOption('.picker.day select', 'dominica-i-adventus');
	await firstRequested;
	await page.selectOption('.picker.day select', 'dominica-ii-adventus');
	// Advent II's own Introit…
	await expect(page.locator('body')).toContainText('Pópulus Sion', { timeout: 10_000 });
	// …and still Advent II's after the held response has really landed and
	// the page has had a render turn in which to apply it.
	const firstResponse = page.waitForResponse((response) =>
		response.url().endsWith('/proprium/en/dominica-i-adventus.json')
	);
	releaseFirstRequest();
	await (await firstResponse).finished();
	await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
	await expect(page.locator('.picker.day select')).toHaveValue('dominica-ii-adventus');
	await expect(page.locator('body')).toContainText('Pópulus Sion');
	await expect(page.locator('body')).not.toContainText('Ad te levávi');
});

test('a mangled ?dies= is answered and not remembered', async ({ page }) => {
	// Pinned to a Sunday the edition carries, because the second half of the
	// question is whether the book still opens on today AFTER meeting the bad
	// link — one visit used to write the value into storage and blank the
	// day until midnight.
	await asIfItWere(page, '2026-12-13T10:00:00');
	await page.goto('/app/pl/ordo/catechumenorum?dies=garbage-day');
	await settled(page);
	// The dayless view: an id that names nothing is a mangled link, and
	// "could not be loaded" would promise a retry that cannot succeed.
	await expect(page.locator('.picker.day select').first()).toHaveValue('');
	await expect(page.locator('.picker.day .state')).toHaveCount(0);
	await page.goto('/app/pl/ordo');
	await settled(page);
	await expect(page.locator('.picker.day select').first()).toHaveValue('dominica-iii-adventus');
});

test('a real day this edition has not written says so', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	// in-octava-nativitatis is in the calendar's own table — a REAL day, not
	// a typo — so the answer names the absence instead of reporting a failure
	// or silently substituting another Mass.
	await page.goto('/app/en/ordo/catechumenorum?dies=in-octava-nativitatis');
	await settled(page);
	await expect(page.locator('.picker.day .state').first()).toHaveText('not yet in this edition');
	// and it is not remembered: the next arrival is the reader's own book
	await page.goto('/app/en/ordo');
	await settled(page);
	await expect(page.locator('.picker.day select').first()).toHaveValue('');
});

// THE OPEN LIST IS NOT THE CONTROL.
//
// A native list takes its colours from the select it hangs off, so every
// colour the control wears is inherited by all sixty days and by their
// season headings. Two rules fed it: the rubric a chosen day puts on the
// control, and a hover rule that reddened the control under the pointer.
// Either one turned the whole open year red (owner, 2026-08-29).
//
// The list is painted outside the document and no test can read it. What a
// test CAN read is the inheritance that fed it — the computed colour of
// every <option> and <optgroup> — and that is where the defect lived.
//
// TWO LISTS ARE CHECKED, because the book now has two. Where the engine
// offers `appearance: base-select` AND the platform stamp asked for it, the
// list is drawn by the page (Chrome on Windows, whose own list takes no
// padding and no radius). Everywhere else it is the platform's, and the
// pick is left to the platform's own highlight. The stamp is an attribute,
// so BOTH arms run on any machine rather than whichever one the runner
// happens to be standing on.
const NATIVE = 'the platform draws the list';
const STYLED = 'the page draws the list';

/** Every row of the list, and the control it hangs off, as the page has
 * computed them. The wanted colours are read from a probe carrying the
 * tokens rather than written here as hex: this asserts what the list is
 * made of, not what the palette currently measures. */
async function readList(picker: import('@playwright/test').Locator) {
	return picker.evaluate((el) => {
		const probe = document.createElement('span');
		probe.style.color = 'var(--ink)';
		probe.style.backgroundColor = 'var(--surface)';
		probe.style.borderColor = 'var(--ink-soft)';
		probe.style.outlineColor = 'var(--rubric)';
		el.append(probe);
		const probed = getComputedStyle(probe);
		const want = {
			ink: probed.color,
			surface: probed.backgroundColor,
			soft: probed.borderTopColor,
			rubric: probed.outlineColor
		};
		probe.remove();

		const control = el.querySelector('select')!;
		const style = (n: Element) => getComputedStyle(n);
		return {
			want,
			rows: [...control.querySelectorAll('option, optgroup')].map((n) => {
				const option = n instanceof HTMLOptionElement ? n : null;
				return {
					kind: option ? 'option' : 'group',
					name: option
						? `option:${option.value || '(none)'}`
						: `group:${(n as HTMLOptGroupElement).label}`,
					chosen: !!option?.selected,
					color: style(n).color,
					background: style(n).backgroundColor
				};
			}),
			options: control.querySelectorAll('option').length,
			groups: control.querySelectorAll('optgroup').length,
			control: style(control).color,
			caret: getComputedStyle(el.querySelector('.field')!, '::after').color
		};
	});
}

for (const theme of ['light', 'dark'] as const) {
	for (const list of [NATIVE, STYLED] as const) {
		test(`the day list stays neutral under the pointer — ${theme}, ${list}`, async ({ page }) => {
			await asIfItWere(page, OUTSIDE_ADVENT);
			await page.goto('/app/pl/ordo');

			const styled = await page.evaluate(
				({ t, wantStyled }) => {
					document.documentElement.dataset.theme = t;
					// The stamp app.html writes before first paint, set by hand so
					// both lists are exercised wherever this runs.
					if (wantStyled) document.documentElement.dataset.platform = 'windows';
					else delete document.documentElement.dataset.platform;
					return wantStyled && CSS.supports('appearance', 'base-select');
				},
				{ t: theme, wantStyled: list === STYLED }
			);

			// A run that cannot reach the styled list says so rather than
			// passing quietly on the other one's assertions.
			test.skip(list === STYLED && !styled, 'this engine has no appearance: base-select');

			const picker = page.locator('.picker.day').first();
			const select = picker.locator('select');

			// AT REST: no day chosen, no pointer on the control.
			await expect(select).toHaveValue('');
			await page.mouse.move(0, 0);
			const resting = await readList(picker);

			// The denominator, before any colour is compared. A list of no rows
			// and a year of no seasons would pass everything below.
			expect(resting.options, 'the days were examined').toBeGreaterThan(1);
			expect(resting.groups, 'the season headings were examined').toBeGreaterThan(0);
			expect(resting.control, 'nothing is chosen, so the control is quiet').toBe(resting.want.soft);

			// UNDER THE POINTER, with a day chosen — the two states that used to
			// reach inside the list, together.
			await select.selectOption(DAY);
			await expect(picker).toHaveClass(/\bon\b/);
			await select.hover();
			expect(
				await select.evaluate((s) => s.matches(':hover')),
				'the regression needs the pointer actually on the control'
			).toBe(true);
			const active = await readList(picker);

			expect(active.control, 'a chosen day is still set in the rubric').toBe(active.want.rubric);
			expect(active.caret, 'and hover still marks the caret').toBe(active.want.rubric);

			// THE RULE, in one sentence: pointing at the control and choosing a
			// day may recolour the rows the PICK moved between, and nothing else.
			// On the platform's list it may recolour nothing at all, because
			// there the pick is the platform's own highlight to draw.
			const moved = (key: 'color' | 'chosen') =>
				active.rows
					.filter((r, i) => r[key] !== resting.rows[i][key])
					.map((r) => r.name)
					.sort();
			const picked = moved('chosen');
			expect(picked, 'the pick left the empty row for the day').toEqual(
				[`option:${DAY}`, 'option:(none)'].sort()
			);
			expect(moved('color'), 'only those rows may change colour').toEqual(
				list === STYLED ? picked : []
			);

			// AND WHAT THE ROWS ARE MADE OF. A day is the page's own ink; a
			// season heading is the quiet layer the tabella's labels use; the
			// list is drawn on the page's surface, not the platform default.
			const inks = (kind: string) => [
				...new Set(active.rows.filter((r) => r.kind === kind && !r.chosen).map((r) => r.color))
			];
			expect(inks('option'), 'every unchosen day keeps neutral ink').toEqual([active.want.ink]);
			expect(inks('group'), 'every season heading keeps the quiet ink').toEqual([active.want.soft]);
			expect(
				[...new Set(active.rows.map((r) => r.background))],
				'on the page surface, not the platform default'
			).toEqual([active.want.surface]);

			const chosen = active.rows.filter((r) => r.chosen);
			expect(
				chosen.map((r) => r.name),
				'exactly one day is chosen'
			).toEqual([`option:${DAY}`]);
			expect(chosen[0].color, 'and it is marked as the book marks a choice').toBe(
				list === STYLED ? active.want.rubric : active.want.ink
			);
		});
	}
}

test('the Windows day list treatment does not restyle unrelated selects', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo');
	const appearances = await page.evaluate(() => {
		document.documentElement.dataset.platform = 'windows';
		const unrelated = document.createElement('select');
		unrelated.setAttribute('aria-label', 'test control outside the day picker');
		unrelated.append(new Option('one', 'one'));
		document.body.append(unrelated);

		return {
			supported: CSS.supports('appearance', 'base-select'),
			day: getComputedStyle(document.querySelector('.picker.day select')!).appearance,
			unrelated: getComputedStyle(unrelated).appearance
		};
	});
	test.skip(!appearances.supported, 'this engine has no appearance: base-select');

	expect(appearances.day, 'the Windows day list uses the customizable native select').toBe(
		'base-select'
	);
	expect(appearances.unrelated, 'a different form control keeps its native rendering').not.toBe(
		'base-select'
	);
});

// A CONTRAST THEME TAKES THE COLOURS AWAY, and the page's own list has to
// survive that. Where the page draws the list it marks the chosen day in
// the rubric on the wash and hides the platform's checkmark, because the
// book says "this one" in its own voice. Under forced colours both the
// rubric and the wash are forced to the reader's plain text on plain
// ground — measured 2026-08-29: every row came back identical — and the
// mark that was hidden was the only thing left that a contrast theme
// cannot erase. So it comes back, and this holds it back.
test('the chosen day is still marked when colour is taken away', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo');
	// Forced colours are emulated on the page in this Playwright, not
	// declared as a test option.
	await page.emulateMedia({ forcedColors: 'active' });
	const styled = await page.evaluate(() => {
		document.documentElement.dataset.platform = 'windows';
		return CSS.supports('appearance', 'base-select');
	});
	test.skip(!styled, 'this engine has no appearance: base-select');

	const select = page.locator('.picker.day select');
	await select.selectOption(DAY);

	const seen = await page.evaluate(() => {
		const rows = [...document.querySelectorAll('.picker.day option')];
		const chosen = rows.find((o) => (o as HTMLOptionElement).selected)!;
		const style = (n: Element, p?: string) => getComputedStyle(n, p);
		return {
			forced: matchMedia('(forced-colors: active)').matches,
			rows: rows.length,
			inks: [...new Set(rows.map((r) => style(r).color))],
			grounds: [...new Set(rows.map((r) => style(r).backgroundColor))],
			mark: style(chosen, '::checkmark').display,
			weight: style(chosen).fontWeight
		};
	});

	// The premise, stated rather than assumed: this really is a page
	// whose colours have been taken away.
	expect(seen.forced, 'the contrast theme is in force').toBe(true);
	expect(seen.rows, 'the days were examined').toBeGreaterThan(1);
	expect(seen.inks, 'colour can no longer tell one row from another').toHaveLength(1);
	expect(seen.grounds, 'nor can the ground under it').toHaveLength(1);

	// …so the choice must be carried by something that is not a colour.
	expect(seen.mark, "the platform's own mark is back").not.toBe('none');
	expect(seen.weight, 'and the chosen day still carries the heavier weight').toBe('600');
});
