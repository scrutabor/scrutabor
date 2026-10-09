import { expect, setHelp, setTheme, test } from './fixtures';

const day = 'sanctorum-innocentium-martyrum';
const id = (n: number) => `w${String(n).padStart(3, '0')}`;
const sharedLatin = ['Ánima', 'nostra,', 'sicut', 'passer,', 'erépta', 'est', 'de', 'láqueo'];
const endingLatin = ['láqueus', 'contrítus', 'est,', 'et', 'nos', 'liberáti', 'sumus.'];
const extraLatin = [
	'Adiutórium',
	'nostrum',
	'in',
	'nómine',
	'Dómini,',
	'qui',
	'fecit',
	'cælum',
	'et',
	'terram.'
];
const commonPolish = [
	'Dusza',
	'nasza',
	'jak',
	'wróbel',
	'wyrwana',
	'została',
	'z',
	'sidła',
	'łowców',
	'sidło',
	'zerwane',
	'zostało',
	'i',
	'my',
	'uwolnieni',
	'zostaliśmy'
];
const extraPolish = [
	'Pomoc',
	'nasza',
	'w',
	'imieniu',
	'Pana',
	'który',
	'stworzył',
	'niebo',
	'i',
	'ziemię'
];
const commonEnglish = [
	'Our soul',
	'like',
	'a sparrow',
	'has been snatched',
	'from',
	'the snare',
	'of the fowlers',
	'the snare',
	'has been broken',
	'and',
	'we',
	'have been freed'
];
const extraEnglish = [
	'Our help is',
	'in',
	'the name',
	'of the Lord',
	'who',
	'made',
	'heaven',
	'and',
	'earth'
];

for (const language of ['pl', 'en'] as const) {
	for (const kind of ['graduale', 'offertorium'] as const) {
		const text = `${day}-${kind}`,
			isGradual = kind === 'graduale';
		const route = `/app/${language}/formularium/${day}`;
		test(`${language} ${kind} retains the complete ordered reading and localized description`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(route);
			await setHelp(page, 1);
			const section = page.locator(`#text-proprium-${text}`);
			const latin = [...sharedLatin, isGradual ? 'venántium.' : 'venántium:', ...endingLatin];
			if (isGradual) {
				latin[9] = 'Láqueus';
				latin.push(...extraLatin);
			}
			const glosses =
				language === 'pl'
					? [...commonPolish, ...(isGradual ? extraPolish : [])]
					: [...commonEnglish, ...(isGradual ? extraEnglish : [])];
			// The Gradual's verse opens with Láqueus; the Offertory reads on after a colon.
			if (isGradual) glosses[language === 'pl' ? 9 : 7] = language === 'pl' ? 'Sidło' : 'The snare';
			for (const [width, height, theme] of [
				[320, 568, 'dark'],
				[1280, 900, 'light']
			] as const) {
				await page.setViewportSize({ width, height });
				await setTheme(page, theme);
				await expect(section.locator('.base')).toHaveText(latin);
				await expect(section.locator('rt')).toHaveText(glosses);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
			await section
				.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
				.click();
			const dialog = page.getByRole('dialog');
			const role =
				language === 'pl'
					? isGradual
						? 'Graduał'
						: 'Antyfona na ofiarowanie'
					: isGradual
						? 'The Gradual'
						: 'The Offertory antiphon';
			await expect(dialog.locator('.about-text')).toHaveText(
				language === 'pl'
					? `${role} formularza „Świętych Młodzianków Męczenników” w Mszale Rzymskim z 1962 roku.`
					: `${role} of the formulary “The Holy Innocents, Martyrs” in the 1962 Roman Missal.`
			);
			await page.keyboard.press('Escape');
			await page.emulateMedia({ media: 'print' });
			await expect(section.locator('rt')).toHaveText(glosses);
		});
	}
}

const constructions = [
	['graduale', [1, 2], 'Our soul', ['Ánima', 'nostra,'], ['Ánima', 'nostra']],
	['offertorium', [1, 2], 'Our soul', ['Ánima', 'nostra,'], ['Ánima', 'nostra']],
	['graduale', [15, 16], 'have been freed', ['liberáti', 'sumus.'], ['liberáti', 'sumus']],
	['offertorium', [15, 16], 'have been freed', ['liberáti', 'sumus.'], ['liberáti', 'sumus']],
	['graduale', [17, 18], 'Our help is', ['Adiutórium', 'nostrum'], ['Adiutórium', 'nostrum']]
] as const;
const analyses: Record<string, readonly [string, string]> = {
	Ánima: ['anima', 'noun — nominative, singular, feminine, 1st declension'],
	nostra: ['noster', 'adjective — nominative, singular, feminine'],
	liberáti: [
		'libero',
		'verb — participle, perfect, passive, nominative, plural, masculine, 1st conjugation'
	],
	sumus: ['sum', 'verb — 1st person, plural, present, indicative, active'],
	Adiutórium: ['adiutorium', 'noun — nominative, singular, neuter, 2nd declension'],
	nostrum: ['noster', 'adjective — nominative, singular, neuter']
};
for (const [kind, members, gloss, bases, titles] of constructions) {
	test(`English ${kind} ${id(members[0])} opens one construction with both complete analyses`, async ({
		page
	}) => {
		const text = `${day}-${kind}`,
			route = `/app/en/formularium/${day}`;
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(route);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.${id(members[0])}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('.base')).toHaveText([...bases]);
		await expect(page.locator(`button[id="${text}.${id(members[1])}"]`)).toHaveCount(0);
		for (const [width, height, theme] of [
			[320, 568, 'dark'],
			[1280, 900, 'light']
		] as const) {
			await page.setViewportSize({ width, height });
			await setTheme(page, theme);
			await button.scrollIntoViewIfNeeded();
			await page.evaluate(() => document.fonts.ready);
			const before = await button.boundingBox();
			await button.hover();
			expect(await button.boundingBox()).toEqual(before);
			await button.focus();
			await button.press('Enter');
			const dialog = page.getByRole('dialog');
			await expect(dialog).toHaveAccessibleName('construction analysis');
			await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
			await expect(dialog.locator('.construction-title')).toHaveText([...titles]);
			const cards = dialog.locator('.construction-card');
			await expect(cards).toHaveCount(2);
			for (let i = 0; i < titles.length; i++) {
				const [lemma, morphology] = analyses[titles[i]],
					card = cards.nth(i);
				await expect(card.locator('.head > a')).toHaveAttribute('href', `/app/en/lemma?l=${lemma}`);
				await expect(card.locator('.morph')).toHaveText(morphology);
				await card.locator('.morph').scrollIntoViewIfNeeded();
				await expect(card.locator('.morph')).toBeInViewport();
			}
			expect(await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
				0
			);
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
		}
		for (const member of members) {
			await page.goto(`${route}?w=${text}.${id(member)}`);
			await expect(page.getByRole('dialog').locator('.context-layer > .gloss')).toHaveText(gloss);
			await expect(page.getByRole('dialog').locator('.construction-title')).toHaveText([...titles]);
			await page.keyboard.press('Escape');
		}
	});
}
