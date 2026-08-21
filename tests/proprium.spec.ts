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
		// eslint-disable-next-line no-global-assign
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
	await expect(page.locator('.tabella-hint')).toHaveText(
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
	const hint = page.locator('.tabella-hint');
	await expect(hint).toHaveText(/wybierz inny dzień/);

	// a chosen day says nothing — the table already names it (owner,
	// 2026-08-21: drop the trivial hints)
	await picker.locator('select').selectOption(DAY);
	await expect(hint).toHaveCount(0);

	// …and the note comes back when the choice is dropped, because then it
	// is the default again and the default is what it describes.
	await picker.locator('select').selectOption('');
	await expect(hint).toHaveText(/wybierz inny dzień/);
});

test('choosing a day silences the weekday note too', async ({ page }) => {
	// The other half of the same rule: a feria names the week it falls in
	// while nothing is chosen, and says nothing once something is.
	await asIfItWere(page, '2026-12-15T10:00:00');
	await page.goto('/app/pl/ordo');
	const picker = page.locator('.picker.day').first();
	const hint = page.locator('.tabella-hint');
	await expect(hint).toHaveText(/ostatnia niedziela to III Niedziela Adwentu/);
	await picker.locator('select').selectOption(DAY);
	await expect(hint).toHaveCount(0);
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
});

test('picking a day does not make the control flicker @online', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	// The artifact usually arrives in about 30 ms, and a notice that appears
	// and vanishes inside two frames says nothing while jolting the one part
	// of the page that is otherwise still: the label went 200px wide to 291px
	// and straight back on every pick and every reload.
	//
	// The load is held for 120 ms rather than left to the machine. Untimed,
	// this test passed against the defect it exists for — the fetch was so
	// fast that whether the notice flashed at all depended on which frame the
	// sampler woke on. 120 ms is comfortably under the 400 ms the notice waits
	// and comfortably over one frame, so the answer is the same every run.
	// `@online` because it drives a route: the downloaded copy loads the day
	// from a classic script and has no request to hold.
	await page.route('**/artifacts/proprium/**', async (route) => {
		await new Promise((r) => setTimeout(r, 120));
		await route.continue();
	});
	await page.goto(`/app/en/ordo/catechumenorum`);
	await settled(page);
	const watch = page.evaluate(
		() =>
			new Promise<{ sizes: string[]; announced: boolean }>((done) => {
				const sizes: string[] = [];
				let announced = false;
				let n = 0;
				const tick = () => {
					const el = document.querySelector('.picker.day');
					const r = el?.getBoundingClientRect();
					const size = r ? `${Math.round(r.width)}x${Math.round(r.height)}` : '-';
					if (sizes[sizes.length - 1] !== size) sizes.push(size);
					if (el?.querySelector('.state')) announced = true;
					if (++n < 70) requestAnimationFrame(tick);
					else done({ sizes, announced });
				};
				requestAnimationFrame(tick);
			})
	);
	await page.selectOption('.picker.day select', DAY);
	const { sizes, announced } = await watch;
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
	// network pleases — and the FIRST one used to land last and win, so the
	// control read one Sunday over another Sunday's Introit, eight times out
	// of eight in review. The first day's artifact is held long enough that
	// the wrong order is certain rather than likely.
	await page.route('**/artifacts/proprium/en/dominica-i-adventus.json', async (route) => {
		await new Promise((r) => setTimeout(r, 1200));
		await route.continue();
	});
	await page.goto('/app/en/ordo/catechumenorum');
	await settled(page);
	await page.selectOption('.picker.day select', 'dominica-i-adventus');
	await page.waitForTimeout(100);
	await page.selectOption('.picker.day select', 'dominica-ii-adventus');
	// Advent II's own Introit…
	await expect(page.locator('body')).toContainText('Pópulus Sion', { timeout: 10_000 });
	// …and still Advent II's after the held response finally lands.
	await page.waitForTimeout(1500);
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
