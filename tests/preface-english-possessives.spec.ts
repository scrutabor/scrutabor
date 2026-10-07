import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';

// Anchor, complete Latin member count, and context-specific shared realization.
const subjects: Record<string, [string, number, string][]> = {
	apostolorum: [
		['w014', 2, 'Your flock'],
		['w023', 3, 'Your blessed Apostles'],
		['w056', 2, 'of Your glory']
	],
	ascensionis: [
		['w024', 2, 'our Lord'],
		['w028', 2, 'His resurrection'],
		['w031', 3, 'to all His disciples'],
		['w065', 2, 'of Your glory']
	],
	'beatae-mariae-virginis-in-annuntiatione': [
		['w036', 2, 'Your only-begotten Son'],
		['w052', 2, 'our Lord'],
		['w056', 2, 'Your majesty']
	],
	'beatae-mariae-virginis-in-assumptione': [
		['w036', 2, 'Your only-begotten Son'],
		['w052', 2, 'our Lord'],
		['w056', 2, 'Your majesty']
	],
	'beatae-mariae-virginis-in-conceptione-immaculata': [
		['w037', 2, 'Your only-begotten Son'],
		['w053', 2, 'our Lord'],
		['w057', 2, 'Your majesty']
	],
	'beatae-mariae-virginis-in-nativitate': [
		['w036', 2, 'Your only-begotten Son'],
		['w052', 2, 'our Lord'],
		['w056', 2, 'Your majesty']
	],
	'beatae-mariae-virginis-in-transfixione': [
		['w036', 2, 'Your only-begotten Son'],
		['w052', 2, 'our Lord'],
		['w056', 2, 'Your majesty']
	],
	'beatae-mariae-virginis-in-visitatione': [
		['w036', 2, 'Your only-begotten Son'],
		['w052', 2, 'our Lord'],
		['w056', 2, 'Your majesty']
	],
	'beatae-mariae-virginis': [
		['w036', 2, 'Your only-begotten Son'],
		['w052', 2, 'our Lord'],
		['w056', 2, 'Your majesty']
	],
	communis: [
		['w024', 2, 'our Lord'],
		['w028', 2, 'Your majesty']
	],
	'd-n-iesu-christi-regis': [
		['w024', 3, 'Your only-begotten Son'],
		['w026', 2, 'our Lord'],
		['w095', 2, 'of Your glory']
	],
	defunctorum: [
		['w024', 2, 'our Lord'],
		['w079', 2, 'of Your glory']
	],
	epiphaniae: [
		['w024', 2, 'Your only-begotten Son'],
		['w053', 2, 'of Your glory']
	],
	nativitatis: [['w062', 2, 'of Your glory']],
	'paschalis-in-die': [
		['w037', 2, 'our death'],
		['w061', 2, 'of Your glory']
	],
	'paschalis-in-nocte': [
		['w037', 2, 'our death'],
		['w061', 2, 'of Your glory']
	],
	quadragesimae: [
		['w035', 2, 'our Lord'],
		['w039', 2, 'Your majesty']
	],
	'sacratissimi-cordis-iesu': [
		['w023', 2, 'Your only-begotten Son'],
		['w075', 2, 'of Your glory']
	],
	'sanctae-crucis': [
		['w048', 2, 'our Lord'],
		['w052', 2, 'Your majesty']
	],
	'sancti-ioseph-in-festivitate': [
		['w051', 2, 'Your household'],
		['w056', 2, 'Your only-begotten Son'],
		['w067', 2, 'our Lord'],
		['w071', 2, 'Your majesty']
	],
	'sancti-ioseph-in-solemnitate': [
		['w051', 2, 'Your household'],
		['w056', 2, 'Your only-begotten Son'],
		['w067', 2, 'our Lord'],
		['w071', 2, 'Your majesty']
	],
	'sanctissimae-trinitatis': [
		['w025', 3, 'Your only-begotten Son'],
		['w056', 3, 'of Your Son']
	],
	'spiritus-sancti': [
		['w024', 2, 'our Lord'],
		['w033', 2, 'Your right hand'],
		['w061', 2, 'of Your glory']
	]
};

for (const [subject, groups] of Object.entries(subjects)) {
	test(`English ${subject} keeps possessives with their full constituents`, async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/en/ordinarium/praefatio-${subject}`);
		await setHelp(page, 1);
		for (const [width, theme] of [
			[390, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			for (const [anchor, count, gloss] of groups) {
				const group = page
					.locator('.token-group')
					.filter({ has: page.locator(`button#${anchor}`) });
				await expectSharedGloss(page, group, count, gloss);
			}
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
	});
}
