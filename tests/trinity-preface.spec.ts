import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

// Expected identities and dictionary targets are independent of the rendered page.
const groups: Record<'pl' | 'en', [string, number, string[], string][]> = {
	pl: [
		['w039', 38, ['unus', 'singularitas', 'persona'], 'pojedynczości jednej osoby'],
		['w044', 43, ['unus', 'trinitas', 'substantia'], 'Trójcy jednej istoty']
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
		['w071', 69, ['verus', 'sempiternus', 'deitas'], 'of the true and eternal Godhead'],
		['w083', 83, ['adoro', 'aequalitas'], 'equality may be adored'],
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

for (const language of ['pl', 'en'] as const) {
	for (const [anchor, first, lemmata, gloss] of groups[language]) {
		const members = lemmata.map((lemma, offset) => ({
			id: `w${String(first + offset).padStart(3, '0')}`,
			href: `/app/${language}/lemma?l=${lemma}`
		}));
		test(`Trinity ${language} ${anchor} keeps its complete caption and every word card`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`/app/${language}/ordinarium/praefatio-sanctissimae-trinitatis`);
			await setHelp(page, 1);
			await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await setTheme(page, theme);
				const group = page
					.locator('.token-group')
					.filter({ has: page.locator(`button#${anchor}`) });
				await expectSharedGloss(page, group, members.length, gloss, members);
				const [geometry] = await group.evaluate(interlinearGeometry);
				expect(geometry.clearance).toBeGreaterThanOrEqual(0);
				const caption = geometry.captionBounds;
				// Match the existing physical-ink guard's subpixel rounding allowance.
				for (const ink of [geometry.sourceInk, geometry.captionInk]) {
					expect(ink.left).toBeGreaterThanOrEqual(-0.5);
					expect(ink.right).toBeLessThanOrEqual(width + 0.5);
				}
				expect(geometry.captionInk.left).toBeGreaterThanOrEqual(caption.left - 0.5);
				expect(geometry.captionInk.right).toBeLessThanOrEqual(caption.right + 0.5);
				expect(geometry.captionInk.top).toBeGreaterThanOrEqual(caption.top - 0.5);
				expect(geometry.captionInk.bottom).toBeLessThanOrEqual(caption.bottom + 0.5);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		});
	}
}

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
	await expect(page.locator('aside .form')).toHaveText('et');
	await expect(page.locator('aside .alignment')).toHaveText(
		'This word is expressed by the phrase as a whole and has no separate English counterpart here.'
	);
	await expect(page.locator('aside .head a')).toHaveAttribute('href', '/app/en/lemma?l=et');
	await expect(page.locator('aside .morph')).not.toHaveText('');
	await page.keyboard.press('Escape');
	await expect(page.locator('aside')).toHaveCount(0);
});
