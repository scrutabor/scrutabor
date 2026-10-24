import { expect, setHelp, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };

test.use({ serviceWorkers: 'block' });
type Lang = 'pl' | 'en';
const responses = [
	{
		id: 'deo-gratias-epistolae',
		words: ['Deo', 'grátias.'],
		lemma: 'deus',
		form: 'Deo',
		gloss: { pl: 'Bogu', en: 'to God' }
	},
	{
		id: 'laus-tibi-christe',
		words: ['Laus', 'tibi,', 'Christe.'],
		lemma: 'laus',
		form: 'Laus',
		gloss: { pl: 'Chwała', en: 'Praise' }
	}
];
const choices = [
	{ date: '2026-04-26', mass: 'dominica-iii-post-pascha', passion: false },
	{ date: '2026-04-04', mass: 'vigilia-paschalis', passion: false },
	{ date: '2026-03-29', mass: 'dominica-ii-passionis', passion: true }
];
function section(page: Page, id: string) {
	return page
		.locator('section.part')
		.filter({ has: page.locator(`a.part-title[href$="/ordinarium/${id}"]`) });
}
async function reference(part: Locator, expected: boolean, lang: Lang, passion = false) {
	await expect(part).toHaveCount(1);
	await expect(part).not.toHaveClass(/folded|revealed/);
	await expect(part.locator('button.unfold,button.refold,.aside-mark,.silent-run')).toHaveCount(0);
	if (expected) {
		await expect(part.locator('.who,.mark,.verse.answer,.verse.quiet')).toHaveCount(0);
		await expect(part.locator('.part-note').first()).toContainText(
			passion
				? lang === 'pl'
					? 'Po Pasji nie odpowiada się'
					: 'After the Passion'
				: lang === 'pl'
					? 'tylko do wglądu'
					: 'reference only'
		);
	} else {
		await expect(part.locator('.who').first()).toBeVisible();
		await expect(part.locator('.part-note').first()).not.toContainText(
			lang === 'pl' ? 'tylko do wglądu' : 'reference only'
		);
		await expect(part.locator('.part-note').first()).not.toContainText(
			lang === 'pl' ? 'Po Pasji' : 'After the Passion'
		);
	}
}
async function wordsAndCard(
	page: Page,
	lang: Lang,
	response: (typeof responses)[number],
	inspectCard = false
) {
	const part = section(page, response.id);
	const tokens = part.locator(`button.word[id^="${response.id}.w"]`);
	await expect(tokens).toHaveCount(response.words.length);
	expect(
		await tokens.evaluateAll((nodes) =>
			nodes.map((node) => {
				const copy = node.cloneNode(true) as HTMLElement;
				copy.querySelectorAll('rt').forEach((caption) => caption.remove());
				return copy.textContent?.trim();
			})
		)
	).toEqual(response.words);
	await expect(part.locator('a.part-title')).toHaveAttribute(
		'href',
		`/app/${lang}/ordinarium/${response.id}`
	);
	if (inspectCard) {
		const word = part.locator(`[id="${response.id}.w001"]`);
		await word.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('h2.form')).toHaveText(response.form);
		await expect(dialog.locator('.context-layer .gloss')).toHaveText(response.gloss[lang]);
		await expect(dialog.locator(`a[href="/app/${lang}/lemma?l=${response.lemma}"]`)).toHaveCount(1);
		await expect(dialog.locator('.word-analysis')).toContainText(
			response.form === 'Deo' ? /Deus|deus/ : /laus/
		);
		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
		await expect(word).toBeFocused();
	}
}
// Stable first-word addresses, independently pinned for the four tested formularies.
const firstReadingWords: Record<
	string,
	Record<'epistola' | 'evangelium', readonly [string, string]>
> = {
	'dominica-iii-post-pascha': {
		epistola: ['proprium/dominica-iii-post-pascha-epistola', 'w001'],
		evangelium: ['proprium/dominica-iii-post-pascha-evangelium', 'w001']
	},
	'vigilia-paschalis': {
		epistola: ['proprium/vigilia-paschalis-epistola', 'w001'],
		evangelium: ['proprium/vigilia-paschalis-evangelium', 'w001']
	},
	'dominica-ii-passionis': {
		epistola: ['proprium/exaltatio-sanctae-crucis-epistola', 'w001'],
		evangelium: ['proprium/dominica-ii-passionis-evangelium', 'w1510']
	},
	'dominica-i-adventus': {
		epistola: ['proprium/dominica-i-adventus-epistola', 'w001'],
		evangelium: ['proprium/dominica-i-adventus-evangelium', 'w001']
	}
};
async function selectedReading(page: Page, mass: string) {
	const form = formularies.formularies.find((f) => f.id === mass)!;
	expect(form).toBeDefined();
	const expected = firstReadingWords[mass];
	expect(expected).toBeDefined();
	for (const role of ['epistola', 'evangelium'] as const) {
		const component = form.components.filter((c) => c.role === role);
		expect(component).toHaveLength(1);
		const [reading, firstWord] = expected[role];
		expect(component[0].text).toBe(reading);
		const slug = reading.split('/')[1];
		await expect(page.locator(`[id="${slug}.${firstWord}"]`)).toHaveCount(1);
	}
}
async function pickDate(page: Page, date: string, ordinaryOnly = false) {
	await page.locator('.picker.day .day-open').first().click();
	const dialog = page.getByRole('dialog', { name: /Wybór dnia|Choose a day/ });
	const selected = await dialog
		.locator('.date-cell[aria-pressed="true"]')
		.getAttribute('data-date');
	expect(selected).not.toBeNull();
	const [fy, fm] = selected!.split('-').map(Number),
		[ty, tm] = date.split('-').map(Number);
	const distance = (ty - fy) * 12 + tm - fm;
	const direction = dialog.getByRole('button', {
		name: distance < 0 ? /poprzedni miesiąc|previous month/ : /następny miesiąc|next month/
	});
	for (let i = 0; i < Math.abs(distance); i++) await direction.click();
	await dialog.locator(`[data-date="${date}"]`).click();
	if (ordinaryOnly)
		await dialog
			.getByRole('button', { name: /Otwórz bez formularza|Open without a formulary/ })
			.click();
	else await dialog.locator('.modal-actions .primary').click();
	await expect(dialog).toHaveCount(0);
}

for (const lang of ['pl', 'en'] as const)
	for (const form of ['lecta', 'cantu'] as const)
		for (const who of ['populus', 'minister', 'sacerdos'] as const)
			for (const choice of choices)
				test(`${lang} ${form} ${who} ${choice.mass}: exact after-response assembly @reader`, async ({
					page
				}) => {
					await page.addInitScript(
						({ form, who }) => {
							localStorage.setItem('scrutabor-role', who);
							localStorage.setItem('scrutabor-mass-form', form);
						},
						{ form, who }
					);
					await page.goto(`/app/${lang}/ordo/catechumenorum?dies=${choice.date}`);
					await selectedReading(page, choice.mass);
					for (const help of [0, 1, 2] as const) {
						await setHelp(page, help);
						for (const response of responses) {
							await wordsAndCard(page, lang, response, help === 2);
							const omitted = choice.passion && response.id === 'laus-tibi-christe';
							await reference(section(page, response.id), omitted, lang, omitted);
						}
					}
				});

for (const lang of ['pl', 'en'] as const) {
	test(`${lang}: explicit Ordinary-only keeps complete fixed responses and study links @reader`, async ({
		page
	}) => {
		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-04-26&missa=none`);
		for (const response of responses) {
			await reference(section(page, response.id), true, lang);
			await expect(section(page, response.id).locator('.part-note').first()).toContainText(
				lang === 'pl' ? 'Nie wybrano czytania' : 'No reading has been selected'
			);
			await wordsAndCard(page, lang, response, true);
		}
	});

	test(`${lang}: pending Palm becomes the actual Passion and returns to ordinary responses @online`, async ({
		page
	}) => {
		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-04-26`);
		await selectedReading(page, choices[0].mass);
		for (const response of responses) await reference(section(page, response.id), false, lang);
		let release!: () => void,
			requests = 0;
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route('**/artifacts/proprium/**', async (route) => {
			requests++;
			await held;
			await route.continue();
		});
		await pickDate(page, '2026-03-29');
		await expect.poll(() => requests).toBeGreaterThan(0);
		for (const response of responses) {
			await reference(section(page, response.id), true, lang);
			await wordsAndCard(page, lang, response);
			await expect(section(page, response.id).locator('.part-note').first()).not.toContainText(
				lang === 'pl' ? 'Po Pasji' : 'After the Passion'
			);
		}
		release();
		await selectedReading(page, choices[2].mass);
		await reference(section(page, responses[0].id), false, lang);
		await reference(section(page, responses[1].id), true, lang, true);
		await pickDate(page, '2026-04-26');
		await selectedReading(page, choices[0].mass);
		for (const response of responses) await reference(section(page, response.id), false, lang);
	});

	test(`${lang}: failed Vigil does not reuse an active old reading and genuine retry restores both responses @online`, async ({
		page
	}) => {
		// Advent and Vigil use different real transport packs; a cached neighbour is not a failed request.
		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-11-29`);
		await selectedReading(page, 'dominica-i-adventus');
		for (const response of responses) await reference(section(page, response.id), false, lang);
		let broken = true,
			requests = 0;
		await page.route('**/artifacts/proprium/**', async (route) => {
			requests++;
			if (broken) await route.fulfill({ status: 503, body: 'unavailable' });
			else await route.continue();
		});
		await pickDate(page, choices[1].date);
		await expect.poll(() => requests).toBeGreaterThan(0);
		await expect(page.locator('.part-note[role="status"]').first()).toBeVisible();
		for (const response of responses) {
			await reference(section(page, response.id), true, lang);
			await wordsAndCard(page, lang, response);
		}
		const attempts = requests;
		broken = false;
		await pickDate(page, choices[1].date);
		await expect.poll(() => requests).toBeGreaterThan(attempts);
		await selectedReading(page, choices[1].mass);
		for (const response of responses) await reference(section(page, response.id), false, lang);
	});

	test(`${lang}: a language-menu reload holds fixed responses until matching reading data arrives @online`, async ({
		page
	}) => {
		const other: Lang = lang === 'pl' ? 'en' : 'pl';
		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-04-26`);
		await selectedReading(page, choices[0].mass);
		let release!: () => void,
			requests = 0;
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route(`**/artifacts/proprium/${other}/**`, async (route) => {
			requests++;
			await held;
			await route.continue();
		});
		await page
			.getByRole('button', { name: lang === 'pl' ? 'wybór języka' : 'language selection' })
			.click();
		await page.locator(`a.menu-row[lang="${other}"]`).click();
		await expect.poll(() => requests).toBeGreaterThan(0);
		for (const response of responses) {
			await reference(section(page, response.id), true, other);
			await wordsAndCard(page, other, response);
		}
		release();
		await selectedReading(page, choices[0].mass);
		for (const response of responses) {
			await reference(section(page, response.id), false, other);
			await wordsAndCard(page, other, response, true);
		}
	});

	test(`${lang}: returning through explicit Ordinary-only does not retain active instructions @reader`, async ({
		page
	}) => {
		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-04-26`);
		await selectedReading(page, choices[0].mass);
		await pickDate(page, choices[0].date, true);
		for (const response of responses) await reference(section(page, response.id), true, lang);
		await pickDate(page, choices[0].date);
		await selectedReading(page, choices[0].mass);
		for (const response of responses) await reference(section(page, response.id), false, lang);
	});
}
