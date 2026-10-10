import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss, expectNeighborInkClear, sharedGlossDocumentBox } from './shared-gloss';
import { interlinearGeometry, precedingNeighborInk } from './interlinear-geometry';

// Expected identities and dictionary targets are independent of the rendered page.
const groups: Record<'pl' | 'en', [string, number, string[], string][]> = {
	pl: [
		['w039', 38, ['unus', 'singularitas', 'persona'], 'pojedynczości jednej osoby'],
		['w044', 43, ['unus', 'trinitas', 'substantia'], 'Trójcy jednej istoty'],
		['w063', 62, ['sine', 'differentia', 'discretio'], 'bez czynienia różnicy']
	],
	en: [
		['w005', 2, ['dignus', 'et', 'iustus', 'sum'], 'it is right and just'],
		[
			'w015',
			10,
			['tu', 'semper', 'et', 'ubique', 'gratia', 'ago'],
			'always and everywhere give thanks to You'
		],
		['w028', 28, ['spiritus', 'sanctus'], 'the Holy Spirit'],
		['w031', 30, ['unus', 'sum', 'deus'], 'are one God'],
		['w034', 33, ['unus', 'sum', 'dominus'], 'are one Lord'],
		['w039', 38, ['unus', 'singularitas', 'persona'], 'the singleness of one Person'],
		['w044', 43, ['unus', 'trinitas', 'substantia'], 'the Trinity of one substance'],
		['w060', 60, ['spiritus', 'sanctus'], 'the Holy Spirit'],
		['w063', 62, ['sine', 'differentia', 'discretio'], 'without making any distinction'],
		['w071', 69, ['verus', 'sempiternus', 'deitas'], 'of the true and eternal Godhead'],
		['w075', 73, ['in', 'persona', 'proprietas'], 'distinction in Persons'],
		['w079', 77, ['in', 'essentia', 'unitas'], 'unity in essence'],
		['w083', 81, ['in', 'maiestas', 'adoro', 'aequalitas'], 'equality in majesty may be adored'],
		[
			'w086',
			86,
			['laudo', 'angelus', 'atque', 'archangelus', 'cherubim', 'quoque', 'ac', 'seraphim'],
			'the Angels and Archangels, and also the Cherubim and Seraphim, praise'
		],
		['w096', 95, ['non', 'cesso'], 'do not cease'],
		['w100', 99, ['unus', 'vox'], 'with one voice']
	]
};

const quamExplanations = {
	pl: 'Quam nawiązuje do poprzednich słów: może odnosić się do wspomnianej równości majestatu albo do Bóstwa. Oba łacińskie rzeczowniki — aequalitas i Deitas — są rodzaju żeńskiego.',
	en: 'Quam links this praise to what precedes. It may refer to the equality in majesty just mentioned or to the earlier Godhead: both aequalitas and Deitas are feminine nouns.'
};

for (const language of ['pl', 'en'] as const) {
	test(`Trinity ${language} Quam distinguishes its secure parse from its possible antecedents @reader`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/ordinarium/praefatio-sanctissimae-trinitatis?w=w085`);
		const panel = page.getByRole('dialog');
		for (const [width, theme] of [
			[320, 'dark'],
			[320, 'light'],
			[1280, 'light'],
			[1280, 'dark']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await expect(panel.locator('.form')).toHaveText('Quam');
			await expect(panel.locator('.head > a')).toHaveAttribute(
				'href',
				`/app/${language}/lemma?l=qui`
			);
			await expect(panel.locator('.explanation')).toHaveText(quamExplanations[language]);
			await expect(panel.locator('.morph')).toHaveText(
				language === 'pl'
					? 'zaimek — biernik, l. poj., r. żeński'
					: 'pronoun — accusative, singular, feminine'
			);
			expect(await panel.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
				0
			);
		}
	});
}

test('Trinity eternal adjective retains qualified nominal and adverbial dictionary senses @reader', async ({
	page
}) => {
	await page.goto('/app/en/ordinarium/praefatio-sanctissimae-trinitatis?w=w020');
	const panel = page.getByRole('dialog');
	await expect(panel.locator('.head > a')).toHaveAttribute('href', '/app/en/lemma?l=aeternus');
	await expect(panel.locator('.head-senses')).toHaveText(
		'— eternal, everlasting, eternity (used as a noun), forever (adverbial uses, including in aeternum)'
	);
	await expect(panel.locator('.morph')).toHaveText('adjective — vocative, singular, masculine');
});

for (const language of ['pl', 'en'] as const) {
	for (const [anchor, first, lemmata, gloss] of groups[language]) {
		const members = lemmata.map((lemma, offset) => ({
			id: `w${String(first + offset).padStart(3, '0')}`,
			href: `/app/${language}/lemma?l=${lemma}`
		}));
		test(`Trinity ${language} ${anchor} keeps its complete caption and every word card @reader`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`/app/${language}/ordinarium/praefatio-sanctissimae-trinitatis`);
			await setHelp(page, 1);
			await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
			for (const [width, theme] of [
				[320, 'dark'],
				[320, 'light'],
				[1280, 'light'],
				[1280, 'dark']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await setTheme(page, theme);
				const group = page
					.locator('.token-group')
					.filter({ has: page.locator(`button#${anchor}`) });
				await expectSharedGloss(page, group, members.length, gloss, members, {
					neighborInk: true,
					requirePrecedingRow: anchor === 'w086'
				});
				const [geometry] = await group.evaluate(interlinearGeometry);
				expect(geometry.clearance).toBeGreaterThanOrEqual(0);
				// Match the existing physical-ink guard's subpixel rounding allowance.
				for (const ink of [geometry.sourceInk, geometry.captionInk]) {
					expect(ink.left).toBeGreaterThanOrEqual(-0.5);
					expect(ink.right).toBeLessThanOrEqual(width + 0.5);
				}
				expect(geometry.sourceClipping).toEqual([]);
				expect(geometry.captionClipping).toEqual([]);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		});
	}
}

test('shared word help closes while a status aside remains @reader', async ({ page }) => {
	await page.goto('/app/en/ordinarium/praefatio-sanctissimae-trinitatis');
	await setHelp(page, 1);
	// The update notification is also an aside, but is not the word dialog.
	await page.evaluate(() => {
		const notice = document.createElement('aside');
		notice.id = 'status-control';
		notice.setAttribute('role', 'status');
		notice.textContent = 'Independent status notification';
		document.body.append(notice);
	});
	const group = page.locator('.token-group').filter({ has: page.locator('button#w039') });
	await expectSharedGloss(page, group, 3, 'the singleness of one Person');
	await expect(page.locator('#status-control')).toHaveCount(1);
});

test('shared word hover distinguishes document layout from scrolling @reader', async ({ page }) => {
	await page.goto('/app/en/ordinarium/praefatio-sanctissimae-trinitatis');
	await setHelp(page, 1);
	const group = page.locator('.token-group').filter({ has: page.locator('button#w039') });
	await group.locator(':scope > button').evaluate((button) => {
		button.addEventListener(
			'mouseover',
			() => {
				const before = scrollY;
				scrollBy(0, 8);
				button.setAttribute('data-scroll-control', String(scrollY - before));
			},
			{ once: true }
		);
	});
	await expectSharedGloss(page, group, 3, 'the singleness of one Person');
	await expect(group.locator(':scope > button')).toHaveAttribute('data-scroll-control', '8');
});

test('Trinity Polish keeps revelation and repeated assent in the complete prose', async ({
	page
}) => {
	await page.goto('/app/pl/ordinarium/praefatio-sanctissimae-trinitatis');
	await setHelp(page, 1);
	for (const [word, gloss] of [
		['w046', 'co'],
		['w053', 'przyjmujemy za prawdę'],
		['w065', 'uznajemy za prawdę']
	]) {
		const token = page.locator('.verse > .token').filter({ has: page.locator(`button#${word}`) });
		await expect(token.locator('rt')).toHaveText(gloss);
	}
	await setHelp(page, 2);
	await expect(page.locator('#s05 + .seg-extra .translation')).toHaveText(
		'Co bowiem dzięki Twemu objawieniu przyjmujemy za prawdę o Twojej chwale, to samo uznajemy za prawdę o Twoim Synu i to samo o Duchu Świętym, nie czyniąc przy tym żadnej różnicy.'
	);
});

test('Trinity English retains help for the list-introducing Latin conjunction', async ({
	page
}) => {
	await page.goto('/app/en/ordinarium/praefatio-sanctissimae-trinitatis');
	await setHelp(page, 1);
	const word = page.locator('button#w072');
	await expect(word).toHaveText('et');
	const token = page.locator('.verse > .token').filter({ has: word });
	await expect(token).toHaveCount(1);
	await expect(token.locator('rt')).toHaveCount(0);
	await word.click();
	const panel = page.locator('aside.panel[role="dialog"]');
	await expect(panel).toHaveCount(1);
	await expect(panel.locator('.form')).toHaveText('et');
	await expect(panel.locator('.alignment')).toHaveText(
		'This word is expressed by the phrase as a whole and has no separate English counterpart here.'
	);
	await expect(panel.locator('.head a')).toHaveAttribute('href', '/app/en/lemma?l=et');
	await expect(panel.locator('.morph')).not.toHaveText('');
	await page.keyboard.press('Escape');
	await expect(panel).toHaveCount(0);
});

test('shared selection wash rejects measured prior-row overlap without moving layout @reader', async ({
	page
}) => {
	await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.setViewportSize({ width: 320, height: 900 });
	await page.goto('/app/en/ordinarium/praefatio-sanctissimae-trinitatis');
	await setHelp(page, 1);
	await setTheme(page, 'dark');
	const group = page.locator('.token-group').filter({ has: page.locator('button#w086') });
	await expect(group).toHaveCount(1);
	await group.scrollIntoViewIfNeeded();
	await page.evaluate(() => document.fonts.ready);
	const button = group.locator(':scope > button');
	await button.hover();
	const clean = await expectNeighborInkClear(group, true);
	const previous = precedingNeighborInk(clean)[0];
	const before = await sharedGlossDocumentBox(group);
	const originalStyle = await group.getAttribute('style');
	try {
		// Extend into actual earlier glyph ink; 1px exceeds the 0.5px rounding allowance.
		await group.evaluate(
			(element, top) =>
				(element as HTMLElement).style.setProperty('--word-selection-block-start', `${top}px`),
			previous.glyph.top - clean.bounds.top - 1
		);
		expect(await sharedGlossDocumentBox(group)).toEqual(before);
		const [damaged] = await group.evaluate(interlinearGeometry, { neighbors: true });
		// These existing geometry checks still pass: the sabotage changes paint only.
		expect(damaged.clearance).toBeGreaterThanOrEqual(0);
		expect(damaged.sourceClipping).toEqual([]);
		expect(damaged.captionClipping).toEqual([]);
		for (const ink of [damaged.sourceInk, damaged.captionInk]) {
			expect(ink.left).toBeGreaterThanOrEqual(-0.5);
			expect(ink.right).toBeLessThanOrEqual(320.5);
		}
		expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		await expect(expectNeighborInkClear(group, true)).rejects.toThrow(
			'selection paint overlaps neighboring ink'
		);
	} finally {
		await group.evaluate((element, style) => {
			if (style === null) element.removeAttribute('style');
			else element.setAttribute('style', style);
		}, originalStyle);
	}
	expect(await sharedGlossDocumentBox(group)).toEqual(before);
	await expectNeighborInkClear(group, true);
	await button.click();
	await expect(button).toHaveClass(/(?:^|\s)selected(?:\s|$)/);
	await expect(page.locator('aside.panel[role="dialog"]')).toHaveCount(1);
	expect(await sharedGlossDocumentBox(group)).toEqual(before);
	await expectNeighborInkClear(group, true);
	await page.keyboard.press('Escape');
	await expect(page.locator('aside.panel[role="dialog"]')).toHaveCount(0);
});
