// The day picker fills the Ordo's own slots. Untagged tests also run against
// the downloaded copy, where there is no server and the route lives in a hash.
import { expect, settled, test } from './fixtures';

// These two scenarios deliberately hold network responses. The production
// worker would correctly satisfy them from its own cache before Playwright's
// route can see them, which tests the worker rather than the request race.
test.use({ serviceWorkers: 'block' });

const DAY = 'dominica-i-adventus';
const DAY_DATE = '2026-11-29';
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
	const dates: Record<string, string> = {
		'dominica-i-adventus': DAY_DATE,
		'nativitas-domini-in-nocte': '2026-12-25'
	};
	const date = dates[id];
	if (!date) throw new Error('no occurrence declared for ' + id);
	const dialog = await openPicker(page);
	await selectCalendarDate(dialog, date);
	const variant = dialog.locator('input[name="day-variant"][value="' + id + '"]');
	if (await variant.count()) await variant.check();
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
	await expect(page.locator('body')).not.toContainText('wznoszę');
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
	await expect(page).toHaveURL(/\?dies=2026-08-19&missa=none$/);
});

test('a newly completed fixed feast opens directly from its date', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo');
	const dialog = await openPicker(page);
	await selectCalendarDate(dialog, '2030-12-08');
	await expect(dialog).toContainText('Niepokalane Poczęcie Najświętszej Maryi Panny');
	await expect(dialog.locator('[data-date="2030-12-08"]')).toHaveClass(/has-formulary/);
	await expect(dialog.getByRole('button', { name: 'Otwórz formularz' })).toBeEnabled();
	await dialog.getByRole('button', { name: 'Otwórz formularz' }).click();
	await expect(page).toHaveURL(/\?dies=2030-12-08$/);
	await expect(page.locator('.picker.day .day-open')).toContainText(
		'Niepokalane Poczęcie Najświętszej Maryi Panny'
	);
	await expect(page.locator('.picker.day .state')).toHaveCount(0);
});

test('the corrected Saint Matthew introit is what the Ordo artifact renders', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto(
		'/app/pl/ordo/catechumenorum?dies=2026-09-21&w=sancti-matthaei-apostoli-et-evangelistae-introitus.w062'
	);
	const introit = page.locator('#sancti-matthaei-apostoli-et-evangelistae-introitus-s01');
	await expect(introit).toContainText('Noli');
	await expect(introit).not.toContainText('Allelúia');
	await expect(
		page.locator('[id="sancti-matthaei-apostoli-et-evangelistae-introitus.w062"]')
	).toHaveCount(0);
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

test('the Triduum and Easter Masses open from dates without requiring their names', async ({
	page
}) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	for (const [date, title] of [
		['2027-03-25', 'Wielki Czwartek — Msza Wieczerzy Pańskiej'],
		['2027-03-27', 'Msza Wigilii Paschalnej'],
		['2027-03-28', 'Niedziela Zmartwychwstania Pańskiego']
	]) {
		await page.goto(`/app/pl/ordo/catechumenorum?dies=${date}`);
		await expect(page.locator('.picker.day .day-open')).toContainText(title);
		await expect(page.locator('.picker.day .state')).toHaveCount(0);
	}
});

test('the Sundays after Easter open from dates without requiring their names', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	for (const [date, title] of [
		['2027-04-04', 'Niedziela Biała'],
		['2027-04-11', '2. Niedziela po Wielkanocy'],
		['2027-04-18', '3. Niedziela po Wielkanocy'],
		['2027-04-25', '4. Niedziela po Wielkanocy'],
		['2027-05-02', '5. Niedziela po Wielkanocy']
	]) {
		await page.goto(`/app/pl/ordo/catechumenorum?dies=${date}`);
		await expect(page.locator('.picker.day .day-open')).toContainText(title);
		await expect(page.locator('.picker.day .state')).toHaveCount(0);
	}
});

test('Ascension through Pentecost opens from dates without requiring feast names', async ({
	page
}) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	for (const [date, title] of [
		['2027-05-06', 'Wniebowstąpienie Pańskie'],
		['2027-05-09', 'Niedziela po Wniebowstąpieniu'],
		['2027-05-15', 'Wigilia Zesłania Ducha Świętego'],
		['2027-05-16', 'Niedziela Zesłania Ducha Świętego']
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

test('Christmas Vigil selects only the preface appropriate to its weekday', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	for (const [date, expected, absent] of [
		['2026-12-24', 'praefatio-communis', 'praefatio-sanctissimae-trinitatis'],
		['2028-12-24', 'praefatio-sanctissimae-trinitatis', 'praefatio-communis']
	]) {
		await page.goto(`/app/pl/ordo/canon?dies=${date}`);
		await expect(page.locator(`[id="${expected}.w001"]`)).toBeVisible();
		await expect(page.locator(`[id="${absent}.w001"]`)).toHaveCount(0);
		await expect(page.locator('.component-condition')).toHaveCount(0);
	}
});

test('undated study still explains conditional components outside the Ordo', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/en/formularium/vigilia-nativitatis');
	await expect(page.locator('.component-condition')).toHaveText([
		'When this day falls on a Sunday.',
		'When this day falls on a weekday.',
		'When this day falls on a Sunday.'
	]);
	await expect(page.locator('.picker.day')).toHaveCount(0);
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
	await expect(page).toHaveURL(/dies=2026-12-25&missa=nativitas-domini-in-nocte/);
});

test('the separate catalogue offers undated study without changing the Ordo choice', async ({
	page
}) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo?dies=2026-12-25&missa=nativitas-domini-in-nocte');
	await expect(page.locator('.picker.day .day-open')).toContainText('Msza w nocy');
	await page.getByRole('link', { name: 'Formularze Mszy' }).click();
	await page.getByPlaceholder('Wpisz nazwę święta lub niedzieli').fill('Wiernych Zmarłych');
	await expect(page.locator('[data-formulary*="commemoratio-omnium"]')).toHaveCount(3);
	await page
		.locator('[data-formulary="commemoratio-omnium-fidelium-defunctorum-missa-ii"]')
		.click();
	await expect(page).toHaveURL(/formularium\/commemoratio-omnium-fidelium-defunctorum-missa-ii/);
	await expect(page.locator('.picker.day')).toHaveCount(0);
	await page.goto('/app/pl/ordo');
	await expect(page.locator('.picker.day .day-open')).toContainText('Msza w nocy');
	await expect(page.locator('.choice-date')).toHaveText('25 grudnia 2026');
});

test('a multi-Mass date offers each Mass without complicating the date URL', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo');
	const dialog = await openPicker(page);
	await selectCalendarDate(dialog, '2026-11-02');
	await expect(dialog.locator('input[name="day-variant"]')).toHaveCount(3);
	await dialog.locator('input[value="commemoratio-omnium-fidelium-defunctorum-missa-iii"]').check();
	await dialog.getByRole('button', { name: 'Otwórz formularz' }).click();
	await expect(page).toHaveURL(
		/dies=2026-11-02&missa=commemoratio-omnium-fidelium-defunctorum-missa-iii/
	);
});

test('a non-default Mass keeps its date through reload, movements, language, and memory', async ({
	page
}) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo?dies=2026-12-25&missa=nativitas-domini-in-nocte');
	await page.reload();
	await expect(page.locator('.choice-date')).toHaveText('25 grudnia 2026');
	await expect(page.locator('.choice-title')).toContainText('Msza w nocy');
	const dialog = await openPicker(page);
	await expect(dialog.locator('input[value="nativitas-domini-in-nocte"]')).toBeChecked();
	await expect(dialog.locator('.day-detail h3')).toContainText('Msza w nocy');
	await dialog.getByRole('button', { name: 'zamknij' }).click();
	await page.locator('a.movement[href*="praeparatio"]').click();
	await expect(page.locator('.choice-date')).toHaveText('25 grudnia 2026');
	await expect(page).toHaveURL(/missa=nativitas-domini-in-nocte/);
	await page.getByRole('button', { name: 'wybór języka', exact: true }).click();
	await page.getByRole('link', { name: 'English', exact: true }).click();
	await expect(page).toHaveURL(
		/\/en\/ordo\/praeparatio\?dies=2026-12-25&missa=nativitas-domini-in-nocte/
	);
	await expect(page.locator('.choice-title')).toContainText('Mass during the Night');
	await page.goto('/app/en/ordo/catechumenorum');
	await expect(page.locator('.choice-date')).toHaveText('25 December 2026');
	await expect(page.locator('[id="nativitas-domini-in-nocte-introitus.w001"]')).toBeVisible();
});

test('changing the date resets a Mass variant to that date’s own formulary', async ({ page }) => {
	await asIfItWere(page, '2026-09-18T10:00:00');
	await page.goto('/app/pl/ordo?dies=2026-12-25&missa=nativitas-domini-in-nocte');
	const dialog = await openPicker(page);
	await dialog.locator('[data-date="2026-12-24"]').click();
	await expect(dialog.locator('.variants')).toHaveCount(0);
	await dialog.getByRole('button', { name: 'Otwórz formularz', exact: true }).click();
	await expect(page).toHaveURL(/dies=2026-12-24$/);
	await expect(page.locator('.choice-title')).toContainText('Wigilia Narodzenia Pańskiego');
});

test('a Mass from a different observance cannot override a valid date', async ({ page }) => {
	await asIfItWere(page, '2026-09-18T10:00:00');
	await page.goto('/app/pl/ordo/catechumenorum?dies=2026-12-13&missa=nativitas-domini-in-nocte');
	await expect(page.locator('.choice-date')).toHaveText('13 grudnia 2026');
	await expect(page.locator('.picker.day .state')).toContainText('Nieprawidłowy wybór');
	await expect(page.locator('[id="nativitas-domini-in-nocte-introitus.w001"]')).toHaveCount(0);
	const dialog = await openPicker(page);
	await expect(dialog.locator('.day-detail')).toContainText('III Niedziela Adwentu');
	await dialog.getByRole('button', { name: 'Otwórz formularz', exact: true }).click();
	await expect(page).toHaveURL(/dies=2026-12-13$/);
	await expect(page.locator('.choice-title')).toHaveText('III Niedziela Adwentu');
});

test('dates outside calendar coverage remain visible and never become an edge occurrence', async ({
	page
}) => {
	await asIfItWere(page, '2026-09-18T10:00:00');
	await page.goto('/app/pl/ordo?dies=2200-01-01');
	await expect(page.locator('.choice-date')).toHaveText('1 stycznia 2200');
	const dialog = await openPicker(page);
	await expect(dialog.locator('.detail-date')).toContainText('2200');
	await expect(
		dialog.getByRole('button', { name: 'Otwórz formularz', exact: true })
	).toBeDisabled();
	await dialog.getByRole('button', { name: 'Otwórz bez formularza' }).click();
	await expect(page).toHaveURL(/dies=2200-01-01&missa=none/);
});

test('browsing months leaves a keyboard entry point and opening without a formulary can be undone', async ({
	page
}) => {
	await asIfItWere(page, '2026-09-18T10:00:00');
	await page.goto('/app/pl/ordo?dies=2026-12-25&missa=none');
	const dialog = await openPicker(page);
	await dialog.getByRole('button', { name: 'następny miesiąc' }).click();
	await expect(dialog.locator('.date-cell[tabindex="0"]')).toHaveCount(1);
	await dialog.getByRole('button', { name: 'poprzedni miesiąc' }).click();
	await expect(dialog.locator('input[value="nativitas-domini-in-die"]')).toBeChecked();
	await dialog.getByRole('button', { name: 'Otwórz formularz', exact: true }).click();
	await expect(page).toHaveURL(/dies=2026-12-25$/);
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
		'2026-09-01'
	);
	await expect(
		dialog.locator('.modal-actions').getByRole('button', { name: 'Dzisiaj' })
	).toBeVisible();
});

test('only the viewed month has dates, with empty slots before its first weekday', async ({
	page
}) => {
	await asIfItWere(page, '2026-09-18T10:00:00');
	for (const [date, count, column] of [
		['2026-02-01', 28, '1'],
		['2028-02-01', 29, '3'],
		['2026-08-01', 31, '7'],
		['2026-09-01', 30, '3']
	] as const) {
		await page.goto(`/app/pl/ordo?dies=${date}`);
		const dialog = await openPicker(page);
		const dates = dialog.locator('.date-cell');
		await expect(dates).toHaveCount(count);
		await expect(dates.first()).toHaveCSS('grid-column-start', column);
		const rendered = await dates.evaluateAll((cells) =>
			cells.map((cell) => cell.getAttribute('data-date'))
		);
		expect(rendered).toEqual(
			Array.from(
				{ length: count },
				(_, index) => `${date.slice(0, 8)}${String(index + 1).padStart(2, '0')}`
			)
		);
		await expect(dialog.locator('.date-cell i, .legend')).toHaveCount(0);
	}
});

test('dates without a formulary are quieter but remain selectable', async ({ page }) => {
	await asIfItWere(page, '2026-09-18T10:00:00');
	await page.goto('/app/pl/ordo?dies=2026-09-21');
	const dialog = await openPicker(page);
	await expect(dialog).not.toContainText('formularz dostępny w tym wydaniu');
	const available = dialog.locator('[data-date="2026-09-20"]');
	const unavailable = dialog.locator('[data-date="2026-09-22"]');
	await expect(available).toHaveClass(/has-formulary/);
	await expect(unavailable).not.toHaveClass(/has-formulary/);
	const colors = await dialog.evaluate((element) => {
		const color = (selector: string) => getComputedStyle(element.querySelector(selector)!).color;
		return {
			available: color('[data-date="2026-09-20"]'),
			unavailable: color('[data-date="2026-09-22"]')
		};
	});
	expect(colors.available).not.toBe(colors.unavailable);
	await unavailable.click();
	await expect(unavailable).toHaveAttribute('aria-pressed', 'true');
	await expect(dialog.locator('.detail-date')).toContainText('22 września 2026');
	await expect(dialog.locator('.primary')).toBeDisabled();
	await expect(dialog.locator('.confirm-actions .secondary')).toBeEnabled();
});

test('Today is disabled at today and returns from another month or selected date', async ({
	page
}) => {
	await asIfItWere(page, '2026-09-18T10:00:00');
	await page.goto('/app/pl/ordo');
	const dialog = await openPicker(page);
	const today = dialog.locator('.modal-actions').getByRole('button', { name: 'Dzisiaj' });
	await expect(dialog.locator('.dialog-header .today')).toHaveCount(0);
	await expect(today).toHaveClass(/secondary/);
	await expect(today).toBeDisabled();
	await expect(today).toHaveCSS('border-top-style', 'solid');
	await expect(today).toHaveCSS('border-top-width', '1px');
	await dialog.getByRole('button', { name: 'następny miesiąc' }).click();
	await expect(dialog.locator('[data-date="2026-09-18"]')).toHaveCount(0);
	await expect(today).toBeEnabled();
	await today.click();
	await expect(dialog.locator('#month-label')).toHaveText('wrzesień 2026');
	await expect(dialog.locator('[data-date="2026-09-18"]')).toHaveAttribute('aria-current', 'date');
	await expect(dialog.locator('[data-date="2026-09-18"]')).toHaveAttribute('aria-pressed', 'true');
	await expect(dialog.locator('[data-date="2026-09-18"]')).toBeFocused();
	await expect(today).toBeDisabled();
	await dialog.locator('[data-date="2026-09-21"]').click();
	await expect(today).toBeEnabled();
	await today.click();
	await expect(today).toBeDisabled();
	await expect(dialog.locator('[data-date="2026-09-18"]')).toBeFocused();
	await expect(dialog.locator('.detail-date')).toContainText('18 września 2026');
});

test('keyboard date navigation crosses month boundaries without adjacent-month buttons', async ({
	page
}) => {
	await asIfItWere(page, '2026-09-18T10:00:00');
	await page.goto('/app/pl/ordo?dies=2026-09-01');
	const dialog = await openPicker(page);
	await dialog.locator('[data-date="2026-09-01"]').press('ArrowLeft');
	await expect(dialog.locator('[data-date="2026-08-31"]')).toBeFocused();
	await expect(dialog.locator('[data-date="2026-09-01"]')).toHaveCount(0);
	await dialog.locator('[data-date="2026-08-31"]').press('ArrowRight');
	await expect(dialog.locator('[data-date="2026-09-01"]')).toBeFocused();
	await expect(dialog.locator('.date-cell[tabindex="0"]')).toHaveCount(1);
});

test('all seven calendar columns fit a phone at the largest reading size', async ({ page }) => {
	await asIfItWere(page, '2026-09-18T10:00:00');
	await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('/app/pl/ordo?dies=2026-12-25');
	const dialog = await openPicker(page);
	const fit = await dialog.evaluate((element) => {
		const panel = element.querySelector('.calendar-panel')!;
		const grid = element.querySelector('.calendar-grid')!.getBoundingClientRect();
		const days = [...element.querySelectorAll('.date-cell')].map((day) =>
			day.getBoundingClientRect()
		);
		const headingsFit = [...element.querySelectorAll('.weekday')].every((heading) => {
			const range = document.createRange();
			range.selectNodeContents(heading);
			return range.getBoundingClientRect().width <= heading.getBoundingClientRect().width;
		});
		return {
			overflow: panel.scrollWidth - panel.clientWidth,
			columnsFit: days.every((day) => day.left >= grid.left - 1 && day.right <= grid.right + 1),
			headingsFit
		};
	});
	expect(fit).toEqual({ overflow: 0, columnsFit: true, headingsFit: true });
	await dialog.locator('input[value="nativitas-domini-in-aurora"]').check();
	await dialog.getByRole('button', { name: 'Otwórz formularz', exact: true }).click();
	await expect(page).toHaveURL(/dies=2026-12-25&missa=nativitas-domini-in-aurora/);
});

for (const lang of ['pl', 'en']) {
	test(`the calendar header fits a narrow phone with largest type in ${lang}`, async ({ page }) => {
		await asIfItWere(page, '2026-09-18T10:00:00');
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.setViewportSize({ width: 320, height: 812 });
		await page.goto(`/app/${lang}/ordo?dies=2026-09-21`);
		const dialog = await openPicker(page);
		await expect(dialog.locator('h2')).toHaveCSS('text-align', 'start');
		const fit = await dialog.locator('.dialog-header').evaluate((header) => {
			const title = header.querySelector('h2')!.getBoundingClientRect();
			const actions = header.querySelector('.close')!.getBoundingClientRect();
			return title.right <= actions.left && actions.right <= header.getBoundingClientRect().right;
		});
		expect(fit).toBe(true);
		const footer = await dialog.locator('.modal-actions').evaluate((element) => {
			const bounds = element.getBoundingClientRect();
			const today = element.querySelector('.today')!.getBoundingClientRect();
			return {
				todayAtLeft: Math.abs(today.left - bounds.left) < 1,
				buttonsFit: [...element.querySelectorAll('button')].every((button) => {
					const box = button.getBoundingClientRect();
					return box.left >= bounds.left - 1 && box.right <= bounds.right + 1;
				})
			};
		});
		expect(footer).toEqual({ todayAtLeft: true, buttonsFit: true });
	});
}

test('the calendar fills a compact desktop modal without moving month navigation', async ({
	page
}) => {
	await asIfItWere(page, '2026-09-18T10:00:00');
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/app/pl/ordo?dies=2026-02-01');
	const dialog = await openPicker(page);
	const layout = await dialog.evaluate((element) => {
		const box = (selector: string) => element.querySelector(selector)!.getBoundingClientRect();
		const modal = element.getBoundingClientRect();
		const panel = box('.calendar-panel');
		const grid = box('.calendar-grid');
		const side = box('.calendar-side');
		return {
			widthInRem: modal.width / parseFloat(getComputedStyle(document.documentElement).fontSize),
			leftGap: side.left - panel.left,
			fill: grid.width / side.width,
			bodyBottomGap: panel.bottom - grid.bottom
		};
	});
	expect(layout.widthInRem).toBeLessThanOrEqual(42.1);
	expect(layout.leftGap).toBeLessThan(1);
	expect(layout.fill).toBeGreaterThan(0.99);
	expect(layout.bodyBottomGap).toBeLessThan(1);
	const next = dialog.getByRole('button', { name: 'następny miesiąc' });
	const before = await next.boundingBox();
	for (let month = 0; month < 6; month += 1) {
		await next.click();
		const after = await next.boundingBox();
		expect(after!.x).toBeCloseTo(before!.x, 0);
		expect(after!.y).toBeCloseTo(before!.y, 0);
	}
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

test('an undated formulary identifier cannot select a Mass in the Ordo', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo?dies=dominica-iii-adventus');
	await expect(page.locator('.picker.day .state')).toContainText('Nieprawidłowy wybór');
	await expect(page.locator('.choice-date')).toHaveText('19 sierpnia 2026');
	await expect(page.locator('.choice-title')).not.toContainText('III Niedziela Adwentu');
});

test('opening without a formulary preserves the date, including after a reload', async ({
	page
}) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo?dies=' + DAY_DATE);
	const dialog = await openPicker(page);
	await expect(dialog.getByRole('tab')).toHaveCount(0);
	const without = dialog.getByRole('button', { name: 'Otwórz bez formularza' });
	await expect(without).toHaveClass(/secondary/);
	await without.click();
	await expect(page).toHaveURL(/dies=2026-11-29&missa=none/);
	await expect(page.locator('.choice-title')).toHaveText('bez formularza');
	await page.reload();
	await expect(page.locator('.choice-title')).toHaveText('bez formularza');
	await expect(page.locator('.choice-date')).toHaveText('29 listopada 2026');
	await page.locator('a.movement[href*="catechumenorum"]').click();
	await expect(page).toHaveURL(/dies=2026-11-29&missa=none/);
	await expect(page.locator('body')).not.toContainText('wznoszę');
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
		const secondary = box('.confirm-actions .secondary');
		const primary = box('.modal-actions .primary');
		const today = box('.modal-actions .today');
		const month = box('.month-nav h3');
		const arrows = [...element.querySelectorAll('.month-nav button')].map((button) =>
			button.getBoundingClientRect()
		);
		return {
			actionsAtRight: Math.abs(actionBar.right - primary.right),
			actionsAtBottom: modal.bottom - actionBar.bottom,
			secondaryBeforePrimary: secondary.right < primary.left,
			todayAtLeft: Math.abs(actionBar.left - today.left),
			sameRow: Math.abs(today.top - secondary.top),
			arrowOffsets: arrows.map((arrow) =>
				Math.abs(arrow.top + arrow.height / 2 - (month.top + month.height / 2))
			),
			title: element.querySelector('#day-dialog-title')!.textContent
		};
	});
	expect(layout.actionsAtRight).toBeLessThan(1);
	expect(layout.actionsAtBottom).toBeLessThan(40);
	expect(layout.secondaryBeforePrimary).toBe(true);
	expect(layout.todayAtLeft).toBeLessThan(1);
	expect(layout.sameRow).toBeLessThan(1);
	expect(Math.max(...layout.arrowOffsets)).toBeLessThan(1);
	expect(layout.title).toBe('Wybór dnia');
});

test('changing between a single and multiple Masses keeps the modal in place', async ({ page }) => {
	await asIfItWere(page, '2026-12-24T10:00:00');
	await page.goto('/app/pl/ordo');
	const dialog = await openPicker(page);
	await expect(dialog.locator('.variants')).toHaveCount(0);
	const before = await dialog.boundingBox();
	await dialog.locator('[data-date="2026-12-25"]').click();
	await expect(dialog.locator('.variants input')).toHaveCount(3);
	const after = await dialog.boundingBox();
	expect(after!.y).toBeCloseTo(before!.y, 0);
	expect(after!.height).toBeCloseTo(before!.height, 0);
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
	await expect(dialog.locator('.confirm-actions .secondary')).toBeFocused();
	await dialog.press('Escape');
	await expect(dialog).toHaveCount(0);
	await expect(opener).toBeFocused();
});

test('choosing a day fills the slots without leaving the page', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo/catechumenorum');
	const marker = await page.evaluate(() => performance.getEntriesByType('navigation')[0].startTime);
	await pickFormulary(page, DAY);
	await expect(page.locator('body')).toContainText('wznoszę', { timeout: 15_000 });
	const after = await page.evaluate(() => performance.getEntriesByType('navigation')[0].startTime);
	expect(after).toBe(marker);
});

test('a date link restores the calendar answer and proper', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/pl/ordo/catechumenorum?dies=2025-11-30');
	await expect(page.locator('body')).toContainText('wznoszę', { timeout: 15_000 });
	await expect(page.locator('.picker.day .day-open')).toContainText('I Niedziela Adwentu');
});

test('the chant slot carries gradual and alleluia together', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto(`/app/pl/ordo/catechumenorum?dies=${DAY_DATE}`);
	await expect(page.locator('body')).toContainText('Univérsi', { timeout: 15_000 });
	await expect(page.locator('body')).toContainText('Osténde');
});

test('a shared link restores the day and the word', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto(`/app/pl/ordo/catechumenorum?dies=${DAY_DATE}&w=${DAY}-introitus.w014`);
	await expect(page.locator('body')).toContainText('wznoszę', { timeout: 15_000 });
	await expect(page.locator('body')).toContainText('tryb łączący', { timeout: 15_000 });
	await expect(page.locator(`[id="${DAY}-introitus.w014"]`)).toBeInViewport();
});

test('a gesture before the proper arrives ends deep-link settling @online', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.route('**/artifacts/proprium/pl/pack-01.json', async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 2500));
		await route.continue();
	});
	await page.goto(`/app/pl/ordo/catechumenorum?dies=${DAY_DATE}&w=${DAY}-introitus.w014`);
	await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
	await page.mouse.wheel(0, 200);
	const word = page.locator(`[id="${DAY}-introitus.w014"]`);
	await expect(word).toBeVisible({ timeout: 10_000 });
	await expect(word).not.toBeInViewport();
});

test('a quick proper load does not announce a transient state @online', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	const artifactPath = '/artifacts/proprium/en/pack-01.json';
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
	const main = page.locator('main');
	await expect(main).toHaveAttribute('aria-busy', 'true');
	await expect(main.locator('[data-content-loader="text"]')).toHaveCount(5);
	await expect(page.locator('.picker.day .state')).toBeVisible();
	await expect(page.locator('.picker.day .state')).toBeHidden({ timeout: 10_000 });
	await expect(main).toHaveAttribute('aria-busy', 'false');
	await expect(main.locator('[data-content-loader="text"]')).toHaveCount(0);
});

test('a corrected pick is not overtaken by the first one @online', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	let sawFirstRequest!: () => void;
	let releaseFirstRequest!: () => void;
	const firstRequested = new Promise<void>((resolve) => (sawFirstRequest = resolve));
	const firstReleased = new Promise<void>((resolve) => (releaseFirstRequest = resolve));
	await page.route('**/artifacts/proprium/en/pack-01.json', async (route) => {
		sawFirstRequest();
		await firstReleased;
		await route.continue();
	});
	await page.goto('/app/en/ordo/catechumenorum');
	await settled(page);
	await pickFormulary(page, 'dominica-i-adventus');
	await firstRequested;
	await pickFormulary(page, 'nativitas-domini-in-nocte');
	await expect(
		page.locator('[id^="nativitas-domini-in-nocte-introitus.w"] .base').first()
	).toHaveText('Dóminus', { timeout: 10_000 });
	const firstResponse = page.waitForResponse((response) =>
		response.url().endsWith('/proprium/en/pack-01.json')
	);
	releaseFirstRequest();
	await (await firstResponse).finished();
	await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
	await expect(page.locator('.picker.day .day-open')).toContainText(
		'Nativity of the Lord — Mass during the Night'
	);
	await expect(page.locator('body')).not.toContainText('Ad te levávi');
});

test('a malformed day value is answered and not remembered', async ({ page }) => {
	await asIfItWere(page, '2026-12-13T10:00:00');
	await page.goto('/app/pl/ordo/catechumenorum?dies=garbage-day');
	await settled(page);
	await expect(page.locator('.picker.day .day-open')).toContainText('bez formularza');
	await expect(page.locator('.picker.day .state')).toContainText('Nieprawidłowy wybór');
	await page.goto('/app/pl/ordo');
	await settled(page);
	await expect(page.locator('.picker.day .day-open')).toContainText('III Niedziela Adwentu');
});

test('a choice made yesterday expires at midnight', async ({ page }) => {
	await page.goto('/app/pl/ordo');
	await page.evaluate(() =>
		localStorage.setItem(
			'scrutabor-day',
			JSON.stringify({ date: '2026-11-29', mass: 'dominica-i-adventus', on: '2020-01-01' })
		)
	);
	await asIfItWere(page, '2026-12-13T10:00:00');
	await page.goto('/app/pl/ordo');
	await expect(page.locator('.picker.day .day-open')).toContainText('III Niedziela Adwentu');
});

test('a completed feast date opens its texts', async ({ page }) => {
	await asIfItWere(page, OUTSIDE_ADVENT);
	await page.goto('/app/en/ordo/catechumenorum?dies=2030-12-08');
	await settled(page);
	await expect(page.locator('.picker.day .day-open')).toContainText(
		'Immaculate Conception of the Blessed Virgin Mary'
	);
	await expect(page.locator('.picker.day .state')).toHaveCount(0);
	await expect(page.locator('body')).toContainText('Gaudens');
	await expect(page.locator('body')).toContainText('gaudébo');
});
