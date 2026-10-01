import { expect, setHelp, setTheme, test } from './fixtures';

const day = 'sanctorum-innocentium-martyrum';
const text = `${day}-evangelium`;
const id = (n: number) => `w${String(n).padStart(3, '0')}`;
const groups = [
	['pl', 135, 136, 136, 'ich nie ma', ['non', 'sunt']],
	['en', 16, 17, 16, 'His mother', ['matrem', 'eius']],
	['en', 44, 45, 44, 'His mother', ['matrem', 'eius']],
	['en', 61, 62, 61, 'was spoken', ['dictum', 'est']],
	['en', 71, 72, 71, 'My Son', ['Fílium', 'meum']],
	['en', 77, 78, 77, 'he had been tricked', ['illúsus', 'esset']],
	['en', 96, 97, 96, 'its territory', ['fínibus', 'eius']],
	['en', 125, 126, 125, 'loud lamentation', ['ululátus', 'multus']],
	['en', 129, 130, 129, 'her children', ['fílios', 'suos']],
	['en', 135, 136, 136, 'they are no more', ['non', 'sunt']]
] as const;

const punctuation: Record<number, string> = {
	17: ',',
	72: '.',
	97: ',',
	126: ':',
	130: ',',
	136: '.'
};

for (const [language, first, last, anchor, gloss, forms] of groups) {
	test(`${language} Innocents reading preserves ${id(first)}–${id(last)}`, async ({ page }) => {
		const route = `/app/${language}/formularium/${day}`;
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(route);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.${id(anchor)}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('rt')).toHaveCount(1);
		await expect(button.locator('.token')).toHaveCount(forms.length);
		await expect(button.locator('.base')).toHaveText(
			forms.map((form, index) => form + (punctuation[first + index] ?? ''))
		);
		for (let member = first; member <= last; member++) {
			if (member !== anchor)
				await expect(page.locator(`button[id="${text}.${id(member)}"]`)).toHaveCount(0);
		}
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await button.scrollIntoViewIfNeeded();
			await page.evaluate(() => document.fonts.ready);
			const before = await button.boundingBox();
			await button.hover();
			expect(await button.boundingBox()).toEqual(before);
			await button.focus();
			await button.press('Enter');
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
			await expect(dialog.locator('.construction-title')).toHaveText([...forms]);
			await expect(dialog.locator('.construction-card h3')).toHaveText([...forms]);
			await expect(dialog.locator('.construction-card .morph')).toHaveCount(forms.length);
			expect(await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
				0
			);
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
		await expect(button.locator('rt')).toHaveText(gloss);
		await page.emulateMedia({ media: 'screen' });
		for (let member = first; member <= last; member++) {
			await page.goto(`${route}?w=${text}.${id(member)}`);
			await expect(page.locator('aside .context-layer > .gloss')).toHaveText(gloss);
			await expect(page.locator('aside .construction-card h3')).toHaveText([...forms]);
			await page.keyboard.press('Escape');
			await expect(page.locator('aside')).toHaveCount(0);
		}
	});
}

for (const [language, number, form, gloss] of [
	['pl', 66, 'Prophétam', 'proroka'],
	['pl', 96, 'fínibus', 'okolicach'],
	['pl', 98, 'a', 'w wieku'],
	['pl', 104, 'quod', 'o którym'],
	['pl', 105, 'exquisíerat', 'dokładnie się dowiedział'],
	['pl', 120, 'Rama', 'Ramie'],
	['en', 85, 'mittens', 'having sent men'],
	['en', 86, 'occídit', 'killed'],
	['en', 105, 'exquisíerat', 'he had carefully ascertained'],
	['en', 128, 'plorans', 'wept for']
] as const) {
	test(`${language} Innocents reading realizes ${id(number)}`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		const word = page.locator(`button[id="${text}.${id(number)}"]`);
		await expect(word.locator('rt')).toHaveText(gloss);
		await expect(word.locator('ruby > .base')).toHaveCount(1);
		await expect(word.locator('ruby > .base')).toHaveText(form);
	});
}

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/${day}`;
	test(`${language} Innocents future keeps its verbal analysis and pending review`, async ({
		page
	}) => {
		await page.goto(`${route}?w=${text}.w029`);
		const card = page
			.locator('aside .construction-card')
			.filter({ has: page.getByRole('heading', { name: 'Futúrum', exact: true }) });
		await expect(card).toHaveCount(1);
		await expect(card.locator('.head > a')).toHaveAttribute('href', `/app/${language}/lemma?l=sum`);
		await expect(card.locator('.morph')).toHaveText(
			language === 'pl'
				? 'czasownik — imiesłów, czas przyszły, strona czynna, mianownik, l. poj., r. nijaki'
				: 'verb — participle, future, active, nominative, singular, neuter'
		);
		await expect(card.locator('.morph')).not.toContainText(
			language === 'pl' ? 'przymiotnik' : 'adjective'
		);
		await expect(card).toContainText(language === 'pl' ? 'do przeglądu' : 'awaiting review');
	});
	test(`${language} Innocents reading keeps all words, zero and localized sources`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const reading = page.locator(`#text-proprium-${text}`);
		await expect(reading.locator('.token')).toHaveCount(136);
		await expect(reading.locator('rt')).toHaveCount(language === 'pl' ? 130 : 119);
		await expect(page.locator(`button[id="${text}.w025"] rt`)).toHaveText(
			language === 'pl' ? 'aż' : 'until'
		);
		await expect(page.locator(`button[id="${text}.w026"] rt`)).toHaveCount(0);
		await reading
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toContainText(language === 'pl' ? 'Ewangelia' : 'The Gospel');
		await expect(dialog).not.toContainText(
			language === 'pl' ? 'Evangelium formularza' : 'The evangelium'
		);
		await dialog.locator('details.source-notes summary').click();
		await expect(dialog).toContainText('12-28');
		await expect(dialog).not.toContainText('inherited references');
	});
}

test('English Innocents prose preserves the four bounded clarifications', async ({ page }) => {
	await page.goto(`/app/en/formularium/${day}`);
	await setHelp(page, 2);
	const reading = page.locator(`#text-proprium-${text}`);
	for (const phrase of [
		'I have called My Son',
		'the time he had carefully ascertained from the Magi',
		'Rachel wept for her children',
		'because they are no more'
	]) {
		await expect(reading).toContainText(phrase);
	}
	for (const phrase of [
		'the time which he had carefully inquired',
		'Rachel weeping for her children',
		'because they are not'
	]) {
		await expect(reading).not.toContainText(phrase);
	}
});

test('English Innocents speech attribution remains next to spoken', async ({ page }) => {
	await page.goto(`/app/en/formularium/${day}`);
	await setHelp(page, 1);
	const providers = [58, 59, 60, 61, 63, 64, 65, 66, 67];
	const selector = providers.map((n) => `button[id="${text}.${id(n)}"]`).join(', ');
	await expect(page.locator(selector).locator('rt')).toHaveText([
		'that',
		'might be fulfilled',
		'what',
		'was spoken',
		'by',
		'the Lord',
		'through',
		'the prophet',
		'saying'
	]);
});
