import { expect, setHelp, setTheme, test } from './fixtures';

const subjects = [
	'communis',
	'quadragesimae',
	'sanctae-crucis',
	'beatae-mariae-virginis',
	'beatae-mariae-virginis-in-annuntiatione',
	'beatae-mariae-virginis-in-assumptione',
	'beatae-mariae-virginis-in-conceptione-immaculata',
	'beatae-mariae-virginis-in-nativitate',
	'beatae-mariae-virginis-in-transfixione',
	'beatae-mariae-virginis-in-visitatione',
	'sancti-ioseph-in-festivitate',
	'sancti-ioseph-in-solemnitate'
];

const realizations = {
	pl: [
		'Prosimy, abyś nakazał dopuścić także nasze głosy wraz z nimi',
		'mówiąc w pokornym wyznaniu'
	],
	en: [
		'We pray that You command our voices also to be admitted with them',
		'saying in humble confession'
	]
};

for (const language of ['pl', 'en'] as const) {
	for (const subject of subjects) {
		test(`${language} ${subject} preserves the complete admission petition and member help`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`/app/${language}/ordinarium/praefatio-${subject}`);
			await setHelp(page, 1);
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await setTheme(page, theme);
				for (const [index, gloss] of realizations[language].entries()) {
					const group = page.locator('.token-group').filter({ hasText: gloss });
					await expect(group).toHaveCount(1);
					await expect(group.locator('rt')).toHaveText(gloss);
					const count = index === 0 ? 9 : 3;
					await expect(group.locator('.token')).toHaveCount(count);
					const forms = await group.locator('.token').allTextContents();
					const button = group.locator(':scope > button');
					await expect(button).toHaveCount(1);
					await group.scrollIntoViewIfNeeded();
					await page.evaluate(() => document.fonts.ready);
					await expect(group.locator('rt')).toBeInViewport();
					const before = await group.boundingBox();
					await button.hover();
					expect(await group.boundingBox(), 'hover must only change paint').toEqual(before);
					await button.click();
					const cards = page.locator('aside .construction-card');
					await expect(cards).toHaveCount(count);
					await expect(page.locator('aside .context-layer > .gloss')).toHaveText(gloss);
					for (let member = 0; member < count; member++) {
						const card = cards.nth(member);
						// Reading punctuation is outside the form shown by the word card.
						await expect(card.locator('.construction-title')).toHaveText(
							forms[member].trim().replace(/[,:]$/, '')
						);
						await card.scrollIntoViewIfNeeded();
						await expect(card.locator('.head a')).toBeInViewport();
						await expect(card.locator('.morph')).not.toHaveText('');
					}
					await page.keyboard.press('Escape');
					await expect(page.locator('aside')).toHaveCount(0);
				}
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		});
	}
}
