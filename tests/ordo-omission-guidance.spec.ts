import { expect, setHelp, test } from './fixtures';

const when = {
	pl: {
		iudica:
			'opuszcza się we Mszach za zmarłych oraz we Mszach okresowych (de Tempore) od I Niedzieli Męki Pańskiej do Wielkiego Czwartku włącznie — wraz z doksologią i powtórzoną antyfoną',
		introit:
			'Glória Patri opuszcza się we Mszach za zmarłych oraz we Mszach okresowych (de Tempore) od I Niedzieli Męki Pańskiej do Wielkiego Czwartku włącznie. W Wigilię Paschalną nie ma Introitu.',
		lavabo:
			'Chwały Ojcu nie odmawia się we Mszach za zmarłych ani we Mszach okresowych (de Tempore) od I Niedzieli Męki Pańskiej do Wielkiego Czwartku włącznie. W Wigilię Paschalną odmawia się Chwała Ojcu.'
	},
	en: {
		iudica:
			'omitted at Masses for the Dead and at Masses of the season (de Tempore) from the First Sunday of the Passion through Holy Thursday inclusive — with its doxology and the repeated antiphon',
		introit:
			'the Glória Patri is omitted at Masses for the Dead and at Masses of the season (de Tempore) from the First Sunday of the Passion through Holy Thursday inclusive. There is no Introit at the Easter Vigil',
		lavabo:
			'the Glória Patri is omitted at Masses for the Dead and at Masses of the season (de Tempore) from the First Sunday of the Passion through Holy Thursday inclusive. It is said at the Easter Vigil'
	}
} as const;

for (const language of ['pl', 'en'] as const) {
	test(`@reader ${language} the dated Mass for the Dead has no unrestricted self-crossing instruction`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-11-02`);
		const proper = page.locator(
			'[id="commemoratio-omnium-fidelium-defunctorum-missa-i-introitus.w001"]'
		);
		await expect(proper).toBeVisible();
		await setHelp(page, 0);
		const section = page.locator('section.part').filter({ has: proper });
		const note = section.locator('.part-note');
		await expect(note).toContainText(
			language === 'pl'
				? 'Kapłan po stronie lekcji czyta Introit — antyfonę na wejście z wersetem psalmu, zwykle także z Glória Patri, po czym powtarza antyfonę.'
				: 'At the Epistle side, the priest reads the Introit antiphon with its psalm verse, usually also the Glória Patri, then repeats the antiphon.'
		);
		await expect(note).not.toContainText(language === 'pl' ? 'żegna się' : 'signs himself');
		await expect(section.locator('.when')).toHaveText(when[language].introit);
	});

	test(`@reader ${language} Iudica condition appears on the dated preparation page`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/praeparatio?dies=2026-03-22`);
		const section = page
			.locator('section.part')
			.filter({ has: page.locator('a.part-title[href$="/ordinarium/iudica-me"]') });
		await expect(section.locator('.when')).toHaveText(when[language].iudica);
		// This tests guidance, not a claim that the date already removes the psalm.
	});

	test(`@reader ${language} Palm note is qualified while the actual proper stays without Gloria Patri`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-03-29`);
		const proper = page.locator('[id="dominica-ii-passionis-introitus.w001"]');
		await expect(proper).toBeVisible();
		await setHelp(page, 0);
		const section = page.locator('section.part').filter({ has: proper });
		await expect(section.locator('.when')).toHaveText(when[language].introit);
		await expect(section.locator('.part-note')).toContainText(
			language === 'pl' ? 'zwykle także z Glória Patri' : 'usually also the Glória Patri'
		);
		await expect(section.locator('.word').filter({ hasText: /^Glória$/ })).toHaveCount(0);
		await expect(section.locator('[id="dominica-ii-passionis-introitus.w024"]')).toHaveText(
			'Deus,'
		);
		await expect(section.locator('[id="dominica-ii-passionis-introitus.w040"]')).toHaveText(
			'Dómine,'
		);
	});

	test(`@reader ${language} the Annunciation within Passiontide retains its Introit doxology`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-03-25`);
		const prefix = 'annuntiatio-beatae-mariae-virginis-extra-tempus-paschale-introitus';
		const proper = page.locator(`[id="${prefix}.w001"]`);
		await expect(proper).toBeVisible();
		await setHelp(page, 0);
		const section = page.locator('section.part').filter({ has: proper });
		await expect(section.locator('.when')).toHaveText(when[language].introit);
		await expect(section.locator(`[id="${prefix}.w030"]`)).toHaveText('Glória');
		await expect(section.locator(`[id="${prefix}.w031"]`)).toHaveText('Patri,');
		await expect(section.locator(`[id="${prefix}.w050"]`)).toHaveText('Vultum');
	});

	test(`@reader ${language} Vigil Lavabo doxology and exception note remain readable after unfolding`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/offertorium?dies=2026-04-04`);
		const folded = page
			.locator('section.part')
			.filter({ has: page.locator('.unfold-title', { hasText: 'Lavábo' }) });
		await expect(folded).toHaveCount(1);
		await folded.locator('button.unfold').click();
		const section = page.locator('section.part').filter({
			has: page.locator('a.part-title[href$="/ordinarium/lavabo"]')
		});
		await setHelp(page, 0);
		await expect(section.locator('.when')).toHaveText(when[language].lavabo);
		await expect(
			section.locator('.verse').filter({ has: page.locator('.word', { hasText: /^Glória$/ }) })
		).toBeVisible();
		await expect(
			section.locator('.verse').filter({ has: page.locator('.word', { hasText: /^Sicut$/ }) })
		).toBeVisible();
	});

	test(`@reader ${language} Vigil has no actual Introit body, and the generic note states its absence`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-04-04`);
		await expect(page.locator('[id="vigilia-paschalis-collecta.w001"]')).toBeVisible();
		const section = page
			.locator('section.part')
			.filter({ has: page.locator('.part-title', { hasText: /^Intróitus$/ }) });
		await expect(section.locator('.when')).toHaveText(when[language].introit);
		await expect(section.locator('.part-text')).toHaveCount(0);
	});
}
