// The day picker fills the Ordo's own slots. Untagged tests also run against
// the downloaded copy, where there is no server and the route lives in a hash.
import { expect, settled, test } from './fixtures';

// These two scenarios deliberately hold network responses. The production
// worker would correctly satisfy them from its own cache before Playwright's
// route can see them, which tests the worker rather than the request race.
test.use({ serviceWorkers: 'block' });

const DAY = 'dominica-i-adventus';
const OUTSIDE_ADVENT = '2026-08-19T10:00:00';

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

async function openPicker(page: import('@playwright/test').Page) {
	await page.locator('.picker.day .day-open').first().click();
	return page.getByRole('dialog', { name: /Wybór dnia|Choose a day/ });
}

async function pickFormulary(page: import('@playwright/test').Page, id: string): Promise<void> {
	const dialog = await openPicker(page);
	await dialog.getByRole('tab', { name: /Lista i wyszukiwanie|List and search/ }).click();
	await dialog.locator(`[data-formulary="${id}"]`).click();
	await dialog.locator('.modal-actions .primary').click();
}

async function pickDate(page: import('@playwright/test').Page, date: string): Promise<void> {
	const dialog = await openPicker(page);
	await selectCalendarDate(dialog, date);
	await dialog.locator('.modal-actions .primary').click();
}

async function selectCalendarDate(
	dialog: import('@playwright/test').Locator,
	date: string
): Promise<void> {
	const selected = await dialog
		.locator('.date-cell[aria-pressed="true"]')
		.getAttribute('data-date');
	if (!selected) throw new Error('the calendar has no selected date');
	const [fromYear, fromMonth] = selected.split('-').map(Number);
	const [toYear, toMonth] = date.split('-').map(Number);
	const distance = (toYear - fromYear) * 12 + toMonth - fromMonth;
	const direction =
		distance < 0
			? dialog.getByRole('button', { name: /poprzedni miesiąc|previous month/ })
			: dialog.getByRole('button', { name: /następny miesiąc|next month/ });
	for (let step = 0; step < Math.abs(distance); step += 1) await direction.click();
	await dialog.locator(`[data-date="${date}"]`).click();
}

test('the Ordo shows placeholders when the chosen date has no resolved formulary', async ({
	page
}) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo/catechumenorum');
	await expect(page.getByText('z formularza dnia').first()).toBeVisible();
	await expect(page.locator('body')).not.toContainText('wzniosłem');
	await expect(page.locator('.picker.day .day-open')).toContainText('19 sierpnia 2026');
});

test('the book opens on today without repeating that it is today', async ({ page }) => {
	await asIfItWere(page, '2026-12-13T10:00:00');
	await page.goto('/app/pl/ordo');
	const picker = page.locator('.picker.day .day-open').first();
	await expect(picker).not.toContainText('dziś');
	await expect(picker).toContainText('III Niedziela Adwentu');
	await expect(picker).toContainText('13 grudnia 2026');
});

test('a reader can ask about a date without knowing its feast', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo');
	await pickDate(page, '2026-09-08');
	await expect(page).toHaveURL(/\?dies=2026-09-08$/);
	await expect(page.locator('.picker.day .day-open')).toContainText(
		'Narodzenie Najświętszej Maryi Panny'
	);
	await expect(page.locator('.picker.day .day-open')).toContainText('8 września 2026');
});

test('a date outside the available calendar data is explained plainly', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo');
	const dialog = await openPicker(page);
	await expect(dialog).toContainText('Kalendarz jeszcze niedostępny');
	await expect(dialog).toContainText(
		'To wydanie nie zawiera jeszcze pełnych danych kalendarzowych dla wybranego dnia.'
	);
	await expect(dialog).not.toContainText('zgadywania');
	await expect(dialog).toContainText('12. Niedziela po Zesłaniu Ducha Świętego');
	await dialog.getByRole('button', { name: 'Otwórz bez formularza' }).click();
	await expect(page).toHaveURL(/\?dies=2026-08-19$/);
});

test('a resolved day whose texts are absent says exactly that', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo');
	const dialog = await openPicker(page);
	await selectCalendarDate(dialog, '2027-03-28');
	await expect(dialog).toContainText('Dzień rozpoznany, formularz jeszcze niedostępny');
	await dialog.getByRole('button', { name: 'Otwórz bez formularza' }).click();
	await expect(page.locator('.picker.day .state')).toHaveText('jeszcze nie w tym wydaniu');
});

test('Christmas Eve and the octave day open directly from their dates', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo/catechumenorum');
	await pickDate(page, '2026-12-24');
	await expect(page).toHaveURL(/dies=2026-12-24/);
	await expect(page.locator('.picker.day .day-open')).toContainText('Wigilia Narodzenia Pańskiego');
	await expect(page.getByRole('button', { name: /Crástina/ })).toHaveCount(0);

	await pickDate(page, '2027-01-01');
	await expect(page).toHaveURL(/dies=2027-01-01/);
	await expect(page.locator('.picker.day .day-open')).toContainText('Oktawa Narodzenia Pańskiego');
});

test('the Epiphany cycle opens from dates without requiring the feast name', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo/catechumenorum?dies=2027-01-03');
	await expect(page.locator('.picker.day .day-open')).toContainText('Najświętszego Imienia Jezus');

	await page.goto('/app/pl/ordo/catechumenorum?dies=2027-01-06');
	await expect(page.locator('.picker.day .day-open')).toContainText('Objawienie Pańskie');

	await page.goto('/app/pl/ordo/catechumenorum?dies=2027-01-10');
	await expect(page.locator('.picker.day .day-open')).toContainText('Świętej Rodziny');

	await page.goto('/app/pl/ordo/catechumenorum?dies=2027-01-13');
	await expect(page.locator('.picker.day .day-open')).toContainText('Wspomnienie Chrztu');
});

test('the pre-Lent Sundays open from dates without requiring their names', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo/catechumenorum?dies=2027-01-24');
	await expect(page.locator('.picker.day .day-open')).toContainText('Niedziela Siedemdziesiątnicy');

	await page.goto('/app/pl/ordo/catechumenorum?dies=2027-01-31');
	await expect(page.locator('.picker.day .day-open')).toContainText('Niedziela Sześćdziesiątnicy');

	await page.goto('/app/pl/ordo/catechumenorum?dies=2027-02-07');
	await expect(page.locator('.picker.day .day-open')).toContainText('Niedziela Pięćdziesiątnicy');
});

test('the first four Sundays of Lent open from dates without requiring their names', async ({
	page
}) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	for (const [date, title] of [
		['2027-02-14', '1. Niedziela Wielkiego Postu'],
		['2027-02-21', '2. Niedziela Wielkiego Postu'],
		['2027-02-28', '3. Niedziela Wielkiego Postu'],
		['2027-03-07', '4. Niedziela Wielkiego Postu']
	]) {
		await page.goto(`/app/pl/ordo/catechumenorum?dies=${date}`);
		await expect(page.locator('.picker.day .day-open')).toContainText(title);
	}
});

test('both Passiontide Sundays open from dates without requiring their names', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	for (const [date, title] of [
		['2027-03-14', '1. Niedziela Męki Pańskiej'],
		['2027-03-21', 'Niedziela Palmowa']
	]) {
		await page.goto(`/app/pl/ordo/catechumenorum?dies=${date}`);
		await expect(page.locator('.picker.day .day-open')).toContainText(title);
		await expect(page.locator('.picker.day .state')).toHaveCount(0);
	}
});

test('the Vigil Alleluia appears when Christmas Eve falls on Sunday', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo/catechumenorum?dies=2028-12-24');
	await expect(page.locator('.picker.day .day-open')).toContainText('Wigilia Narodzenia Pańskiego');
	await expect(page.getByRole('button', { name: /Crástina/ })).toBeVisible();
});

test('Christmas Day offers all three Masses and defaults to the Mass in the day', async ({
	page
}) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo');
	const dialog = await openPicker(page);
	await selectCalendarDate(dialog, '2026-12-25');
	await expect(dialog.locator('input[name="day-variant"]')).toHaveCount(3);
	await expect(dialog.locator('input[value="nativitas-domini-in-die"]')).toBeChecked();
	await dialog.locator('input[value="nativitas-domini-in-nocte"]').check();
	await dialog.getByRole('button', { name: 'Otwórz formularz' }).click();
	await expect(page).toHaveURL(/dies=nativitas-domini-in-nocte/);
});

test('list search finds an observance and its Mass variants', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo');
	const dialog = await openPicker(page);
	await dialog.getByRole('tab', { name: 'Lista i wyszukiwanie' }).click();
	await dialog.getByPlaceholder('Wpisz nazwę święta lub niedzieli').fill('Wiernych Zmarłych');
	await expect(dialog.locator('[data-formulary*="commemoratio-omnium"]')).toHaveCount(3);
	await dialog
		.locator('[data-formulary="commemoratio-omnium-fidelium-defunctorum-missa-ii"]')
		.click();
	await dialog.locator('.modal-actions .primary').click();
	await expect(page).toHaveURL(/dies=commemoratio-omnium-fidelium-defunctorum-missa-ii/);
});

test('a multi-Mass date offers each Mass without complicating the date URL', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo');
	const dialog = await openPicker(page);
	await selectCalendarDate(dialog, '2026-11-02');
	await expect(dialog.locator('input[name="day-variant"]')).toHaveCount(3);
	await dialog.locator('input[value="commemoratio-omnium-fidelium-defunctorum-missa-iii"]').check();
	await dialog.getByRole('button', { name: 'Otwórz formularz' }).click();
	await expect(page).toHaveURL(/dies=commemoratio-omnium-fidelium-defunctorum-missa-iii/);
});

test('the calendar begins with Sunday and needs no second date control', async ({ page }) => {
	await asIfItWere(page, '2026-09-01T10:00:00');
	await page.goto('/app/pl/ordo');
	const dialog = await openPicker(page);
	await expect(dialog.locator('input[type="date"]')).toHaveCount(0);
	expect(
		await dialog
			.locator('.weekday')
			.evaluateAll((days) => days.map((day) => day.getAttribute('title')))
	).toEqual(['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota']);
	await expect(dialog.locator('.calendar-grid .date-cell').first()).toHaveAttribute(
		'data-date',
		'2026-08-30'
	);
	await expect(
		dialog.locator('.calendar-footer').getByRole('button', { name: 'Dzisiaj' })
	).toBeVisible();
});

test('the folded day control gives its date room without looking like a dropdown', async ({
	page
}) => {
	await asIfItWere(page, '2026-09-06T10:00:00');
	await page.goto('/app/pl/ordo');
	const picker = page.locator('.picker.day .day-open');
	const spacing = await picker.evaluate((button) => {
		const title = button.querySelector('.choice-title')!.getBoundingClientRect();
		const date = button.querySelector('.choice-date')!.getBoundingClientRect();
		const copy = button.querySelector('.choice-copy')!.getBoundingClientRect();
		const icon = button.querySelector('.calendar-icon')!.getBoundingClientRect();
		return {
			gap: date.top - title.bottom,
			dateSize: Number.parseFloat(getComputedStyle(button.querySelector('.choice-date')!).fontSize),
			iconGap: icon.left - copy.right,
			iconCenterOffset: Math.abs(icon.top + icon.height / 2 - (copy.top + copy.height / 2))
		};
	});
	expect(spacing.gap).toBeGreaterThanOrEqual(2);
	expect(spacing.dateSize).toBeGreaterThanOrEqual(12);
	expect(spacing.iconGap).toBeGreaterThanOrEqual(14);
	expect(spacing.iconCenterOffset).toBeLessThan(2);
	await expect(picker.locator('.chevron')).toHaveCount(0);
	await expect(picker.locator('.calendar-icon')).toBeVisible();
});

test('a formulary without a date keeps its calendar icon centred on the single line', async ({
	page
}) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo?dies=dominica-iii-adventus');
	const picker = page.locator('.picker.day .day-open');
	await expect(picker).toContainText('III Niedziela Adwentu');
	await expect(picker.locator('.choice-date')).toHaveCount(0);
	const offset = await picker.evaluate((button) => {
		const copy = button.querySelector('.choice-copy')!.getBoundingClientRect();
		const icon = button.querySelector('.calendar-icon')!.getBoundingClientRect();
		return Math.abs(icon.top + icon.height / 2 - (copy.top + copy.height / 2));
	});
	expect(offset).toBeLessThan(0.5);
});

test('the list offers a quiet way to open the Ordo without a formulary', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto(`/app/pl/ordo?dies=${DAY}`);
	const dialog = await openPicker(page);
	await expect(dialog.locator('.modal-actions').getByRole('button')).toHaveCount(2);
	await dialog.getByRole('tab', { name: 'Lista i wyszukiwanie' }).click();
	const without = dialog.getByRole('button', { name: 'Otwórz bez formularza' });
	await expect(without).toHaveClass(/secondary/);
	await without.click();
	await expect(page).not.toHaveURL(/dies=/);
});

test('the calendar presents a simple title and a lower-right action bar', async ({ page }) => {
	await asIfItWere(page, '2026-09-11T10:00:00');
	await page.goto('/app/pl/ordo');
	const dialog = await openPicker(page);
	await expect(dialog.getByRole('heading', { name: 'Wybór dnia' })).toBeVisible();
	await expect(dialog).not.toContainText('Ordo Missae');
	await selectCalendarDate(dialog, '2026-09-15');
	await expect(dialog).not.toContainText('II klasy');

	const actions = dialog.locator('.modal-actions');
	const without = actions.getByRole('button', { name: 'Otwórz bez formularza' });
	const withFormulary = actions.getByRole('button', { name: 'Otwórz formularz' });
	await expect(without).toBeVisible();
	await expect(withFormulary).toBeEnabled();
	const layout = await dialog.evaluate((element) => {
		const box = (selector: string) => element.querySelector(selector)!.getBoundingClientRect();
		const modal = element.getBoundingClientRect();
		const actionBar = box('.modal-actions');
		const secondary = box('.modal-actions .secondary');
		const primary = box('.modal-actions .primary');
		const month = box('.month-nav h3');
		const arrows = [...element.querySelectorAll('.month-nav button')].map((button) =>
			button.getBoundingClientRect()
		);
		return {
			actionsAtRight: Math.abs(actionBar.right - primary.right),
			actionsAtBottom: modal.bottom - actionBar.bottom,
			secondaryBeforePrimary: secondary.right < primary.left,
			arrowOffsets: arrows.map((arrow) =>
				Math.abs(arrow.top + arrow.height / 2 - (month.top + month.height / 2))
			),
			title: element.querySelector('#day-dialog-title')!.textContent
		};
	});
	expect(layout.actionsAtRight).toBeLessThan(1);
	expect(layout.actionsAtBottom).toBeLessThan(40);
	expect(layout.secondaryBeforePrimary).toBe(true);
	expect(Math.max(...layout.arrowOffsets)).toBeLessThan(1);
	expect(layout.title).toBe('Wybór dnia');
});

test('switching picker views keeps the modal and tabs in place', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo');
	const dialog = await openPicker(page);
	const tabs = dialog.locator('.tabs');
	const before = { dialog: await dialog.boundingBox(), tabs: await tabs.boundingBox() };
	await dialog.getByRole('tab', { name: 'Lista i wyszukiwanie' }).click();
	const after = { dialog: await dialog.boundingBox(), tabs: await tabs.boundingBox() };
	expect(before.dialog).not.toBeNull();
	expect(before.tabs).not.toBeNull();
	expect(after.dialog).not.toBeNull();
	expect(after.tabs).not.toBeNull();
	expect(after.dialog!.y).toBeCloseTo(before.dialog!.y, 0);
	expect(after.dialog!.height).toBeCloseTo(before.dialog!.height, 0);
	expect(after.tabs!.y).toBeCloseTo(before.tabs!.y, 0);
});

test('the modal traps focus, closes with Escape, and returns focus to its opener', async ({
	page
}) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo');
	const opener = page.locator('.picker.day .day-open');
	await opener.focus();
	const dialog = await openPicker(page);
	await expect(dialog).toBeFocused();
	await dialog.press('Shift+Tab');
	await expect(dialog.locator('.modal-actions .secondary')).toBeFocused();
	await dialog.press('Escape');
	await expect(dialog).toHaveCount(0);
	await expect(opener).toBeFocused();
});

test('choosing a day fills the slots without leaving the page', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo/catechumenorum');
	const marker = await page.evaluate(() => performance.getEntriesByType('navigation')[0].startTime);
	await pickFormulary(page, DAY);
	await expect(page.locator('body')).toContainText('wzniosłem', { timeout: 15_000 });
	const after = await page.evaluate(() => performance.getEntriesByType('navigation')[0].startTime);
	expect(after).toBe(marker);
});

test('a date link restores the calendar answer and proper', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo/catechumenorum?dies=2025-11-30');
	await expect(page.locator('body')).toContainText('wzniosłem', { timeout: 15_000 });
	await expect(page.locator('.picker.day .day-open')).toContainText('I Niedziela Adwentu');
});

test('the chant slot carries gradual and alleluia together', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto(`/app/pl/ordo/catechumenorum?dies=${DAY}`);
	await expect(page.locator('body')).toContainText('Univérsi', { timeout: 15_000 });
	await expect(page.locator('body')).toContainText('Osténde');
});

test('a shared link restores the day and the word', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto(`/app/pl/ordo/catechumenorum?dies=${DAY}&w=${DAY}-introitus.w014`);
	await expect(page.locator('body')).toContainText('wzniosłem', { timeout: 15_000 });
	await expect(page.locator('body')).toContainText('tryb łączący', { timeout: 15_000 });
	await expect(page.locator(`[id="${DAY}-introitus.w014"]`)).toBeInViewport();
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
	const word = page.locator(`[id="${DAY}-introitus.w014"]`);
	await expect(word).toBeVisible({ timeout: 10_000 });
	await expect(word).not.toBeInViewport();
});

test('a quick proper load does not announce a transient state @online', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	const artifactPath = '/artifacts/proprium/en/dominica-i-adventus.json';
	const artifact = await page.request.get(artifactPath);
	expect(artifact.ok()).toBe(true);
	const artifactBody = await artifact.body();
	await page.route(`**${artifactPath}`, (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: artifactBody })
	);
	await page.goto('/app/en/ordo/catechumenorum');
	await settled(page);
	await page.evaluate(() => {
		const picker = document.querySelector('.picker.day');
		if (!(picker instanceof HTMLElement)) throw new Error('day picker not found');
		const probe = { announced: false, observer: null as MutationObserver | null };
		probe.observer = new MutationObserver((records) => {
			for (const mutation of records) {
				for (const node of mutation.addedNodes) {
					if (node instanceof Element && (node.matches('.state') || node.querySelector('.state')))
						probe.announced = true;
				}
			}
		});
		probe.observer.observe(picker, { childList: true, subtree: true });
		(window as unknown as { __dayPickerProbe: typeof probe }).__dayPickerProbe = probe;
	});
	await pickFormulary(page, DAY);
	await expect(page.locator('body')).toContainText('Ad te levávi');
	const announced = await page.evaluate(() => {
		const probe = (
			window as unknown as { __dayPickerProbe: { announced: boolean; observer: MutationObserver } }
		).__dayPickerProbe;
		probe.observer.disconnect();
		return probe.announced;
	});
	expect(announced).toBe(false);
});

test('a slow day still says it is loading @online', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.route('**/artifacts/proprium/**', async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 1500));
		await route.continue();
	});
	await page.goto('/app/en/ordo/catechumenorum');
	await settled(page);
	await pickFormulary(page, DAY);
	await expect(page.locator('.picker.day .state')).toBeVisible();
	await expect(page.locator('.picker.day .state')).toBeHidden({ timeout: 10_000 });
});

test('a corrected pick is not overtaken by the first one @online', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
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
	await pickFormulary(page, 'dominica-i-adventus');
	await firstRequested;
	await pickFormulary(page, 'dominica-ii-adventus');
	await expect(page.locator('body')).toContainText('Pópulus Sion', { timeout: 10_000 });
	const firstResponse = page.waitForResponse((response) =>
		response.url().endsWith('/proprium/en/dominica-i-adventus.json')
	);
	releaseFirstRequest();
	await (await firstResponse).finished();
	await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
	await expect(page.locator('.picker.day .day-open')).toContainText('Second Sunday of Advent');
	await expect(page.locator('body')).not.toContainText('Ad te levávi');
});

test('a malformed day value is answered and not remembered', async ({ page }) => {
	await asIfItWere(page, '2026-12-13T10:00:00');
	await page.goto('/app/pl/ordo/catechumenorum?dies=garbage-day');
	await settled(page);
	await expect(page.locator('.picker.day .day-open')).toContainText('bez formularza');
	await expect(page.locator('.picker.day .state')).toHaveCount(0);
	await page.goto('/app/pl/ordo');
	await settled(page);
	await expect(page.locator('.picker.day .day-open')).toContainText('III Niedziela Adwentu');
});

test('a choice made yesterday expires at midnight', async ({ page }) => {
	await page.goto('/app/pl/ordo');
	await page.evaluate(() =>
		localStorage.setItem(
			'scrutabor-day',
			JSON.stringify({ value: 'dominica-i-adventus', on: '2020-01-01' })
		)
	);
	await asIfItWere(page, '2026-12-13T10:00:00');
	await page.goto('/app/pl/ordo');
	await expect(page.locator('.picker.day .day-open')).toContainText('III Niedziela Adwentu');
});

test('a real formulary not yet written is distinct from a malformed value', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/en/ordo/catechumenorum?dies=dominica-resurrectionis');
	await settled(page);
	await expect(page.locator('.picker.day .state')).toHaveText('not yet in this edition');
});
