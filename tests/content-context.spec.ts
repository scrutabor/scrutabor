import { expect, setHelp, test } from './fixtures';

for (const language of ['pl', 'en']) {
	test(`${language}: the King epistle explains its understood participial subject`, async ({
		page
	}) => {
		await page.goto(
			`/app/${language}/formularium/d-n-iesu-christi-regis?w=d-n-iesu-christi-regis-epistola.w119`
		);
		await expect(page.locator('aside .form')).toHaveText('pacíficans');
		await expect(page.locator('aside')).toContainText(
			language === 'pl' ? 'mianownik' : 'nominative'
		);
		await expect(page.locator('aside')).toContainText(
			language === 'pl'
				? 'jego podmiot nie został tu wyrażony osobnym słowem'
				: 'Its subject is understood, not expressed by a separate noun here'
		);
	});
}

for (const [language, formulary, part, latin, gloss, cards] of [
	[
		'pl',
		'sancti-thomae-apostoli',
		'epistola',
		'ipso summo angulári lápide Christo Iesu',
		'a głównym kamieniem węgielnym jest sam Chrystus Jezus',
		6
	],
	[
		'en',
		'sancti-thomae-apostoli',
		'epistola',
		'ipso summo angulári lápide Christo Iesu',
		'with Christ Jesus Himself as the chief cornerstone',
		6
	],
	['en', 'dominica-iv-post-epiphaniam', 'evangelium', 'Ascendénte Iesu', 'when Jesus entered', 2],
	[
		'en',
		'dominica-xxiii-post-pentecosten',
		'evangelium',
		'Loquénte Iesu',
		'while Jesus was speaking',
		2
	],
	['en', 'sancti-ioachim-confessoris', 'postcommunio', 'dilécti Fílii tui', 'of Thy beloved Son', 3]
] as const) {
	test(`${language}: ${formulary} keeps its complete phrase together`, async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 844 });
		await page.goto(`/app/${language}/formularium/${formulary}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const partElement = page.locator(`#text-proprium-${formulary}-${part}`);
		const group = partElement.locator('.token-group', { hasText: latin });
		await expect(group.locator('rt')).toHaveText(gloss);
		await expect(group.locator('button')).toHaveCount(1);
		await group.scrollIntoViewIfNeeded();
		const box = await group.boundingBox();
		await group.locator('button').hover();
		expect(await group.boundingBox()).toEqual(box);
		await group.locator('button').click();
		await expect(page.locator('aside .construction-card')).toHaveCount(cards);
		if (formulary === 'sancti-thomae-apostoli') {
			await expect(page.locator('aside')).toContainText(
				language === 'pl'
					? 'W łacinie nie ma tu czasownika „być”'
					: 'Latin leaves the verb ‘to be’ unexpressed'
			);
		}
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
			.toBe(0);
	});
}

for (const language of ['pl', 'en']) {
	for (const [formulary, word, grammar] of [
		['cathedra-sancti-petri', 'epistola.w003', language === 'pl' ? 'dopełniacz' : 'genitive'],
		[
			'sancti-ioannis-apostoli-et-evangelistae',
			'evangelium.w040',
			language === 'pl' ? 'celownik' : 'dative'
		],
		['sancta-familia', 'collecta.w002', language === 'pl' ? 'wołacz' : 'vocative']
	]) {
		test(`${language}: ${formulary} explains the contextual case of Iesu`, async ({ page }) => {
			await page.goto(`/app/${language}/formularium/${formulary}?w=${formulary}-${word}`);
			await expect(page.locator('aside .form')).toHaveText('Iesu');
			await expect(page.locator('aside')).toContainText(grammar);
			await expect(page.locator('aside')).not.toContainText(
				language === 'pl' ? 'deklinacja II' : 'declension II'
			);
		});
	}
}

for (const language of ['pl', 'en']) {
	for (const [formulary, part, word, latin, grammar, sense] of [
		[
			'dominica-ii-passionis',
			'graduale',
			'w003',
			'déxteram',
			language === 'pl' ? 'przymiotnik' : 'adjective',
			language === 'pl' ? 'prawy' : 'right-hand'
		],
		[
			'dominica-iv-post-pascha',
			'alleluia',
			'w007',
			'déxtera',
			language === 'pl' ? 'mianownik' : 'nominative',
			language === 'pl' ? 'prawica' : 'right hand'
		],
		[
			'dominica-iv-post-pascha',
			'alleluia',
			'w023',
			'dominábitur',
			language === 'pl' ? 'czas przyszły' : 'future',
			'dóminor'
		]
	]) {
		test(`${language}: ${formulary} distinguishes ${latin} in its clause`, async ({ page }) => {
			await page.setViewportSize({ width: 320, height: 844 });
			await page.goto(`/app/${language}/formularium/${formulary}?w=${formulary}-${part}.${word}`);
			await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.reload();
			const card = page.locator('aside');
			await expect(card.locator('.form')).toHaveText(latin);
			await expect(card).toContainText(grammar);
			await expect(card).toContainText(sense);
			if (word === 'w023') {
				await expect(card).toContainText(language === 'pl' ? 'deponens' : 'deponent');
			}
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
		});
	}

	test(`${language}: the Easter Alleluia retains its printed pause and future dominion`, async ({
		page
	}) => {
		const slug = 'dominica-iv-post-pascha-alleluia';
		await page.goto(`/app/${language}/formularium/dominica-iv-post-pascha`);
		await setHelp(page, 2);
		const part = page.locator(`#text-proprium-${slug}`);
		await expect(part.locator(`button[id="${slug}.w015"]`)).toContainText('mórtuis,');
		await expect(part.locator('.translation')).toContainText(
			language === 'pl'
				? 'śmierć nie będzie już nad Nim panować'
				: 'death shall no more have dominion over Him'
		);
	});
}

for (const language of ['pl', 'en']) {
	test(`${language}: the Seven Sorrows secret keeps Mary's companions and intercession together`, async ({
		page
	}) => {
		const slug = 'septem-dolorum-beatae-mariae-virginis-secreta';
		await page.setViewportSize({ width: 320, height: 844 });
		await page.goto(`/app/${language}/formularium/septem-dolorum-beatae-mariae-virginis`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const part = page.locator(`#text-proprium-${slug}`);
		const group = part.locator('.token-group', { hasText: 'consórtium' });
		await expect(group.locator('rt')).toHaveText(
			language === 'pl'
				? 'dzięki wzmożonemu, najłaskawszemu wstawiennictwu jej i jej świętych towarzyszy pod Krzyżem'
				: 'through the abundant, most loving intercession of Mary and her holy companions beneath the Cross'
		);
		await expect(group.locator('button')).toHaveCount(1);
		await group.scrollIntoViewIfNeeded();
		const box = await group.boundingBox();
		await group.locator('button').hover();
		expect(await group.boundingBox()).toEqual(box);
		await group.locator('button').click();
		await expect(page.locator('aside .construction-card')).toHaveCount(9);
		const companion = page.locator('aside .construction-card', { hasText: 'consórtium' });
		await expect(companion).toContainText('consors');
		await expect(companion).toContainText(language === 'pl' ? 'dopełniacz' : 'genitive');
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
			.toBe(0);
		await page
			.getByRole('button', { name: language === 'pl' ? 'zamknij' : 'close', exact: true })
			.click();
		await setHelp(page, 2);
		const translation = part.locator(`[id="${slug}-s01"] + .seg-extra .translation`);
		await expect(translation).toContainText(
			language === 'pl' ? 'jej świętych towarzyszy' : 'her holy companions'
		);
		await expect(translation).toContainText(language === 'pl' ? 'nagrody' : 'reward');
	});
}

for (const language of ['pl', 'en']) {
	test(`${language}: the eighth Sunday secret preserves grace, conduct and eternal joys`, async ({
		page
	}) => {
		const slug = 'dominica-viii-post-pentecosten-secreta';
		const route = `/app/${language}/formularium/dominica-viii-post-pentecosten`;
		await page.setViewportSize({ width: 320, height: 844 });
		await page.goto(route);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const part = page.locator(`#text-proprium-${slug}`);
		for (const [latin, gloss] of [
			[
				'grátiæ tuæ operánte virtúte',
				language === 'pl'
					? 'dzięki działaniu mocy Twojej łaski'
					: 'with the power of Your grace at work'
			],
			[
				'præséntis vitæ nos conversatióne',
				language === 'pl'
					? 'nas w postępowaniu w obecnym życiu'
					: 'us in the conduct of this present life'
			]
		]) {
			const group = part.locator('.token-group', { hasText: latin });
			await expect(group.locator('rt')).toHaveText(gloss);
			await expect(group.locator('button')).toHaveCount(1);
			await group.scrollIntoViewIfNeeded();
			const box = await group.boundingBox();
			await group.locator('button').hover();
			expect(await group.boundingBox()).toEqual(box);
			await group.locator('button').click();
			await expect(page.locator('aside .construction-card')).toHaveCount(4);
			await page
				.getByRole('button', { name: language === 'pl' ? 'zamknij' : 'close', exact: true })
				.click();
		}
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
			.toBe(0);
		await setHelp(page, 2);
		const translation = part.locator(`[id="${slug}-s01"] + .seg-extra .translation`);
		await expect(translation).toContainText(language === 'pl' ? 'Twojej łaski' : 'Your grace');
		await expect(translation).toContainText(
			language === 'pl' ? 'w obecnym życiu' : 'this present life'
		);
		await expect(translation).toContainText(
			language === 'pl' ? 'wiecznych radości' : 'everlasting joys'
		);
		await expect(translation).not.toContainText(/Abel|Abla/);
		await page.goto(`${route}?w=${slug}.w014`);
		await expect(page.locator('aside .form')).toHaveText('mystéria');
		await expect(page.locator('aside')).toContainText(
			language === 'pl' ? 'mianownik' : 'nominative'
		);
	});
}

test('the English offering verb has its ordinary dictionary senses', async ({ page }) => {
	await page.goto(
		'/app/en/formularium/dominica-viii-post-pentecosten?w=dominica-viii-post-pentecosten-secreta.w010'
	);
	await expect(page.locator('aside .form')).toHaveText('deférimus');
	await expect(page.locator('aside')).toContainText('to bring');
	await expect(page.locator('aside')).toContainText('to offer');
});

for (const [language, distinction, peace] of [
	['pl', 'między Żydem a Grekiem', 'którzy zwiastują pokój'],
	['en', 'between Jew and Greek', 'who bring good news of peace']
] as const) {
	test(`${language}: Andrew's epistle keeps the distinction and both Gospel objects`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/sancti-andreae-apostoli`);
		await setHelp(page, 1);
		const epistle = page.locator('#text-proprium-sancti-andreae-apostoli-epistola');
		const group = epistle.locator('.token-group', { hasText: 'Iudǽi et Græci' });
		await expect(group.locator('rt')).toHaveText(distinction);
		await group.locator('button.word-construction').click();
		await expect(page.locator('aside .construction-card')).toHaveCount(3);
		await page
			.getByRole('button', { name: language === 'pl' ? 'zamknij' : 'close', exact: true })
			.click();
		await setHelp(page, 2);
		await expect(epistle.locator('.translation')).toContainText(peace);
		await expect(epistle.locator('.translation')).toContainText(
			language === 'pl' ? 'którzy zwiastują dobro' : 'who bring good news of good things'
		);
	});
}

for (const [language, negative, purified] of [
	['pl', 'nieobłudnej', 'oczyszczonym rozumieniem umysłu'],
	['en', 'unfeigned', 'with purified understanding of the mind']
] as const) {
	test(`${language}: non ficta has one negative gloss`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/dominica-i-in-quadragesima`);
		await setHelp(page, 1);
		const group = page.locator('.token-group', { hasText: 'non ficta' });
		await expect(group.locator('rt')).toHaveText(negative);
		await group.locator('button.word-construction').click();
		await expect(page.locator('aside .construction-card')).toHaveCount(2);
	});

	test(`${language}: a three-word construction preserves its shared meaning`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/transfiguratio-domini`);
		await setHelp(page, 1);
		const group = page.locator('.token-group', { hasText: 'purificáta mentis intellegéntia' });
		await expect(group.locator('rt')).toHaveText(purified);
		await group.locator('button.word-construction').click();
		await expect(page.locator('aside .construction-card')).toHaveCount(3);
	});
}

test('the sequence translations stay attached to the correct Latin stanza', async ({ page }) => {
	const slug = 'commemoratio-omnium-fidelium-defunctorum-missa-i-sequentia';
	await page.goto('/app/en/formularium/commemoratio-omnium-fidelium-defunctorum');
	await setHelp(page, 2);
	const translation = (id: string) =>
		page.locator(`#${slug}-${id}`).locator('xpath=following-sibling::div[1]/p');
	await expect(translation('s15')).toContainText('Your sheep');
	await expect(translation('s15')).toContainText('Your right');
	await expect(translation('s16')).toContainText('the cursed');
	await expect(translation('s16')).toContainText('the blessed');
});

test('the Preface has no duplicated demonstrative in its shared gloss', async ({ page }) => {
	await page.goto('/app/en/ordinarium/praefatio-defunctorum');
	await setHelp(page, 1);
	const group = page.locator('.token-group', { hasText: 'terréstris huius incolátus' });
	await expect(group.locator('rt')).toHaveText('of this earthly sojourn');
});

test('the genealogy opens a book definition and a genitive name', async ({ page }) => {
	const route = '/app/pl/formularium/sancti-ioachim-confessoris';
	const slug = 'sancti-ioachim-confessoris-evangelium';
	await page.goto(`${route}?w=${slug}.w001`);
	await expect(page.locator('aside')).toContainText('księga');
	await expect(page.locator('aside')).toContainText('rzeczownik');
	await page.goto(`${route}?w=${slug}.w003`);
	await expect(page.locator('aside')).toContainText('dopełniacz');
});

test('a repeated Proper keeps distinct word and verse selections after reload', async ({
	page
}) => {
	const route = '/app/pl/formularium/dominica-i-in-quadragesima';
	const slug = 'dominica-i-in-quadragesima-offertorium';
	await page.goto(route);
	const sections = page
		.locator('.proper-part')
		.filter({ has: page.locator(`button[id="${slug}~communio.w001"]`) });
	await expect(sections).toHaveCount(1);
	const duplicateIds = await page.locator('[id]').evaluateAll((elements) => {
		const ids = elements.map((el) => el.id);
		return ids.filter((id, i) => ids.indexOf(id) !== i);
	});
	expect(duplicateIds).toEqual([]);
	await page.locator(`button[id="${slug}~communio.w001"]`).click();
	await expect(page.locator('button.word.selected')).toHaveCount(1);
	await page.reload();
	await expect(page.locator(`button[id="${slug}~communio.w001"]`)).toHaveClass(/selected/);
	await expect(page.locator('button.word.selected')).toHaveCount(1);
	await page.goto(`${route}?s=${slug}~communio.s01`);
	await expect(page.locator(`[id="${slug}~communio-s01"]`)).toHaveClass(/segment-selected/);
	await expect(page.locator('.segment-selected')).toHaveCount(1);
});

for (const suffix of [
	'',
	'-in-annuntiatione',
	'-in-assumptione',
	'-in-conceptione-immaculata',
	'-in-nativitate',
	'-in-transfixione',
	'-in-visitatione'
]) {
	test(`the Marian preface retains the subject of permanente (${suffix || 'ordinary'})`, async ({
		page
	}) => {
		await page.setViewportSize({ width: 320, height: 844 });
		await page.goto(`/app/pl/ordinarium/praefatio-beatae-mariae-virginis${suffix}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await setHelp(page, 1);
		const group = page.locator('.token-group', { hasText: 'virginitátis glória permanénte' });
		await expect(group.locator('rt')).toHaveText('gdy trwała chwała dziewictwa');
		await expect(group.locator('button')).toHaveCount(1);
		await expect(group.locator('.token')).toHaveCount(3);
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
			.toBe(0);
		await group.scrollIntoViewIfNeeded();
		const box = await group.boundingBox();
		await group.locator('button').hover();
		expect(await group.boundingBox(), 'hover preserves the attached unit').toEqual(box);
		await group.locator('button').click();
		await expect(page.locator('aside .construction-card')).toHaveCount(3);
		await expect(page.locator('aside .construction-title')).toHaveText([
			'virginitátis',
			'glória',
			'permanénte'
		]);
	});
}

for (const language of ['pl', 'en']) {
	test(`${language}: Ascension retains the printed proofs and the reflexive appearance`, async ({
		page
	}) => {
		const route = `/app/${language}/formularium/ascensio-domini`;
		await page.goto(`${route}?w=ascensio-domini-epistola.w037`);
		await expect(page.locator('aside .form')).toHaveText('multis');
		await expect(page.locator('aside')).toContainText(language === 'pl' ? 'ablativus' : 'ablative');
		await page.goto(`${route}?w=ascensio-domini-epistola.w042`);
		await expect(page.locator('aside .form')).toHaveText('appárens');
		await expect(page.locator('aside')).toContainText(
			language === 'pl' ? 'mianownik' : 'nominative'
		);
		if (language === 'pl') {
			await expect(page.locator('aside')).toContainText('ukazywać się');
			await page.getByRole('button', { name: 'zamknij', exact: true }).click();
			await setHelp(page, 2);
			await expect(
				page.locator('#text-proprium-ascensio-domini-epistola .translation')
			).toContainText('dał wiele dowodów, że żyje');
		}
	});
}

for (const language of ['pl', 'en']) {
	test(`${language}: the third All Souls Mass retains its own beneficiaries`, async ({ page }) => {
		const slug = 'commemoratio-omnium-fidelium-defunctorum-missa-iii';
		await page.goto(`/app/${language}/formularium/${slug}`);
		await setHelp(page, 1);
		for (const kind of ['collecta', 'postcommunio']) {
			const part = page.locator(`#text-proprium-${slug}-${kind}`);
			await expect(part).toContainText('famulórum');
			await expect(part).toContainText('famularúmque');
			await expect(part).not.toContainText('benefactór');
		}
		const secret = page.locator(`#text-proprium-${slug}-secreta`);
		await expect(secret).toContainText('fidélium');
		await expect(secret).toContainText('defunctórum');
		await expect(secret).not.toContainText('propinquórum');
		await setHelp(page, 2);
		await expect(
			secret.locator(`[id="${slug}-secreta-s01"] + .seg-extra .translation`)
		).toContainText(
			language === 'pl' ? 'te sakramenty naszego zbawienia' : 'these sacraments of our salvation'
		);
	});

	test(`${language}: a retired beneficiary address resolves to the corrected prayer`, async ({
		page
	}) => {
		const slug = 'commemoratio-omnium-fidelium-defunctorum-missa-iii';
		await page.goto(`/app/${language}/formularium/${slug}?w=${slug}-collecta.w014`);
		await expect(page).toHaveURL(new RegExp(`s=${slug}-collecta.s01`));
		await expect(page.locator(`[id="${slug}-collecta-s01"]`)).toHaveClass(/segment-selected/);
		await expect(page.locator('aside')).toHaveCount(0);
	});
}

test('the Marian intercession in the third All Souls collect stays one readable unit', async ({
	page
}) => {
	await page.setViewportSize({ width: 320, height: 844 });
	await page.goto('/app/pl/formularium/commemoratio-omnium-fidelium-defunctorum-missa-iii');
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.reload();
	await setHelp(page, 1);
	const group = page.locator('.token-group', {
		hasText: 'beáta María semper Vírgine intercedénte'
	});
	await expect(group.locator('rt')).toHaveText(
		'za wstawiennictwem błogosławionej Maryi zawsze Dziewicy'
	);
	await group.scrollIntoViewIfNeeded();
	const box = await group.boundingBox();
	await group.locator('button').hover();
	expect(await group.boundingBox()).toEqual(box);
	await group.locator('button').click();
	await expect(page.locator('aside .construction-card')).toHaveCount(5);
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
		.toBe(0);
});

for (const language of ['pl', 'en']) {
	test(`${language}: the Corpus Christi sequence distinguishes hic the adverb`, async ({
		page
	}) => {
		await page.goto(
			`/app/${language}/formularium/corporis-christi?w=corporis-christi-sequentia.w276`
		);
		await expect(page.locator('aside .form')).toHaveText('hic');
		await expect(page.locator('aside')).toContainText(language === 'pl' ? 'przysłówek' : 'adverb');
		await expect(page.locator('aside')).toContainText(language === 'pl' ? 'tutaj' : 'here');
		await expect(page.locator('aside')).toContainText(
			language === 'pl' ? 'Przysłówek miejsca' : 'The adverb of place'
		);
	});
}
