import { expect, setHelp, setTheme, test } from './fixtures';

const id = (n: number) => `w${String(n).padStart(3, '0')}`;
const cases = [
	[
		'pl',
		'epiphania-domini-evangelium',
		[2, 3],
		2,
		'narodził się',
		['natus', 'esset'],
		['natus', 'esset']
	],
	[
		'en',
		'ascensio-domini-evangelium',
		[85, 86],
		85,
		'He had spoken',
		['locútus', 'est'],
		['locútus', 'est']
	],
	[
		'en',
		'dominica-ii-post-pentecosten-evangelium',
		[29, 30, 31],
		29,
		'everything is ready',
		['paráta', 'sunt', 'ómnia.'],
		['paráta', 'sunt', 'ómnia']
	],
	[
		'en',
		'epiphania-domini-evangelium',
		[2, 3, 4],
		2,
		'Jesus had been born',
		['natus', 'esset', 'Iesus'],
		['natus', 'esset', 'Iesus']
	],
	[
		'en',
		'sanctissimi-nominis-iesu-epistola',
		[63, 64],
		63,
		'was rejected',
		['reprobátus', 'est'],
		['reprobátus', 'est']
	],
	[
		'en',
		'sanctorum-innocentium-martyrum-epistola',
		[86, 87, 88],
		88,
		'have not been defiled',
		['non', 'sunt', 'coinquináti:'],
		['non', 'sunt', 'coinquináti']
	],
	[
		'en',
		'sanctorum-innocentium-martyrum-graduale',
		[11, 12],
		11,
		'has been broken',
		['contrítus', 'est,'],
		['contrítus', 'est']
	],
	[
		'en',
		'sanctorum-innocentium-martyrum-offertorium',
		[11, 12],
		11,
		'has been broken',
		['contrítus', 'est,'],
		['contrítus', 'est']
	],
	[
		'en',
		'vigilia-paschalis-evangelium',
		[73, 74],
		73,
		'was crucified',
		['crucifíxus', 'est,'],
		['crucifíxus', 'est']
	],
	[
		'en',
		'vigilia-paschalis-evangelium',
		[88, 89, 90],
		88,
		'the Lord had been laid',
		['pósitus', 'erat', 'Dóminus.'],
		['pósitus', 'erat', 'Dóminus']
	]
] as const;

const englishCards: Record<string, readonly [string, string]> = {
	natus: [
		'nascor',
		'verb — participle, perfect, deponent (passive form, active meaning), nominative, singular, masculine, 3rd conjugation'
	],
	esset: ['sum', 'verb — 3rd person, singular, imperfect, subjunctive, active'],
	Iesus: ['Iesus', 'noun — nominative, singular, masculine'],
	locútus: [
		'loquor',
		'verb — participle, perfect, deponent (passive form, active meaning), nominative, singular, masculine, 3rd conjugation'
	],
	est: ['sum', 'verb — 3rd person, singular, present, indicative, active'],
	paráta: [
		'paro',
		'verb — participle, perfect, passive, nominative, plural, neuter, 1st conjugation'
	],
	sunt: ['sum', 'verb — 3rd person, plural, present, indicative, active'],
	ómnia: ['omnis', 'adjective — nominative, plural, neuter'],
	reprobátus: [
		'reprobo',
		'verb — participle, perfect, passive, nominative, singular, masculine, 1st conjugation'
	],
	non: ['non', 'adverb'],
	coinquináti: [
		'coinquino',
		'verb — participle, perfect, passive, nominative, plural, masculine, 1st conjugation'
	],
	contrítus: [
		'contero',
		'verb — participle, perfect, passive, nominative, singular, masculine, 3rd conjugation'
	],
	crucifíxus: [
		'crucifigo',
		'verb — participle, perfect, passive, nominative, singular, masculine, 3rd conjugation'
	],
	pósitus: [
		'pono',
		'verb — participle, perfect, passive, nominative, singular, masculine, 3rd conjugation'
	],
	erat: ['sum', 'verb — 3rd person, singular, imperfect, indicative, active'],
	Dóminus: ['dominus', 'noun — nominative, singular, masculine, 2nd declension']
};
const polishCards: Record<string, readonly [string, string]> = {
	natus: [
		'nascor',
		'czasownik — imiesłów, perfectum, deponens (forma bierna, znaczenie czynne), mianownik, l. poj., r. męski, koniugacja III'
	],
	esset: ['sum', 'czasownik — 3. os., l. poj., imperfectum, tryb łączący, strona czynna']
};

for (const [language, text, members, anchor, gloss, bases, titles] of cases) {
	test(`${language} finite predicate ${text} ${id(anchor)}`, async ({ page }) => {
		const day = text.replace(/-(evangelium|epistola|graduale|offertorium)$/, '');
		const route = `/app/${language}/formularium/${day}`;
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(route);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.${id(anchor)}"]`);
		await expect(button.locator('rt')).toHaveCount(1);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('.base')).toHaveText([...bases]);
		for (const member of members)
			if (member !== anchor) {
				await expect(page.locator(`button[id="${text}.${id(member)}"]`)).toHaveCount(0);
			}
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
			await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
			await expect(dialog.locator('.construction-title')).toHaveText([...titles]);
			await expect(dialog).toHaveAccessibleName(
				language === 'pl' ? 'analiza konstrukcji' : 'construction analysis'
			);
			const cards = dialog.locator('.construction-card');
			await expect(cards).toHaveCount(members.length);
			for (let index = 0; index < titles.length; index++) {
				const card = cards.nth(index);
				const expected = (language === 'pl' ? polishCards : englishCards)[titles[index]];
				expect(expected).toBeDefined();
				const [lemma, morphology] = expected;
				await expect(card.locator('.head > a')).toHaveAttribute(
					'href',
					`/app/${language}/lemma?l=${encodeURIComponent(lemma)}`
				);
				await expect(card.locator('.morph')).toHaveText(morphology);
				await card.locator('.morph').scrollIntoViewIfNeeded();
				await expect(card.locator('.morph')).toBeInViewport();
			}
			expect(await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
				0
			);
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		for (const member of members) {
			await page.goto(`${route}?w=${text}.${id(member)}`);
			await expect(page.locator('aside .context-layer > .gloss')).toHaveText(gloss);
			await expect(page.locator('aside .construction-card h3')).toHaveText([...titles]);
			await page.keyboard.press('Escape');
			await expect(page.locator('aside')).toHaveCount(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
		await expect(button.locator('rt')).toHaveText(gloss);
	});
}

const contexts = [
	[
		'en',
		'ascensio-domini-evangelium',
		[83, 84, 85, 87, 88, 90],
		['Jesus', 'when', 'He had spoken', 'to them', 'was taken up', 'into']
	],
	[
		'en',
		'dominica-ii-post-pentecosten-evangelium',
		[27, 28, 29],
		['for', 'now', 'everything is ready']
	],
	[
		'en',
		'epiphania-domini-evangelium',
		[1, 2, 5, 6, 7],
		['When', 'Jesus had been born', 'in', 'Bethlehem', 'of Juda']
	],
	[
		'en',
		'sanctissimi-nominis-iesu-epistola',
		[62, 63, 65, 66, 67, 68],
		['which', 'was rejected', 'by', 'you', 'the builders', 'which']
	],
	[
		'en',
		'sanctorum-innocentium-martyrum-epistola',
		[83, 84, 85, 88, 89],
		['who', 'with', 'women', 'have not been defiled', 'for they are virgins']
	],
	[
		'en',
		'vigilia-paschalis-evangelium',
		[71, 72, 73, 75],
		['Jesus', 'who', 'was crucified', 'you seek']
	],
	[
		'en',
		'vigilia-paschalis-evangelium',
		[85, 86, 87, 88],
		['see', 'the place', 'where', 'the Lord had been laid']
	],
	[
		'en',
		'dominica-xiii-post-pentecosten-evangelium',
		[85, 86, 87],
		['Were not', 'ten', 'cleansed']
	],
	// Only the shared auxiliary is covered here; the earlier negative order is a separate issue.
	[
		'en',
		'sanctorum-simonis-et-iudae-apostolorum-evangelium',
		[93, 94, 95],
		['had come', 'and', 'spoken']
	],
	[
		'pl',
		'dominica-ii-post-pentecosten-evangelium',
		[27, 28, 29, 31],
		['bo', 'już', 'gotowe', 'wszystko']
	]
] as const;

for (const [language, text, providers, glosses] of contexts) {
	test(`${language} finite context ${text} ${id(providers[0])}`, async ({ page }) => {
		const day = text.replace(/-(evangelium|epistola)$/, '');
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		const selector = providers.map((n) => `button[id="${text}.${id(n)}"]`).join(', ');
		await expect(page.locator(selector).locator('rt')).toHaveText([...glosses]);
	});
}
