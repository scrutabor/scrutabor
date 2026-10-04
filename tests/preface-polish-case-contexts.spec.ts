import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';

const subjects = {
	apostolorum: {
		segment: 's03',
		words: { w014: 'trzody', w015: 'Twej', w022: 'błogosławionych', w024: 'Twych' },
		prose:
			'Ciebie, Panie, pokornie błagać, abyś, Pasterzu wieczny, nie opuszczał swojej trzody, lecz przez swoich błogosławionych Apostołów strzegł jej nieustanną osłoną:'
	},
	defunctorum: {
		segment: 's05',
		words: { w044: 'Twoim', w046: 'wiernym', w048: 'życie' },
		prose:
			'Twoim wiernym bowiem, Panie, życie zostaje zmienione, a nie odebrane, i gdy rozpadnie się dom tego ziemskiego pobytu, zostaje im przygotowane wieczne mieszkanie w niebiosach.'
	}
};

for (const [subject, { segment, words, prose }] of Object.entries(subjects)) {
	test(`Polish ${subject} keeps contextual readings and their complete word help`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/pl/ordinarium/praefatio-${subject}`);
		await setHelp(page, 1);
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			for (const [id, gloss] of Object.entries(words)) {
				const word = page.locator(`#${id}`);
				await expect(word.locator('rt')).toHaveText(gloss);
				await word.scrollIntoViewIfNeeded();
				await word.click();
				await expect(page.locator('aside .context-layer > .gloss')).toHaveText(gloss);
				await expect(page.locator('aside .head a')).toBeVisible();
				await expect(page.locator('aside .morph')).not.toHaveText('');
				await page.keyboard.press('Escape');
				await expect(page.locator('aside')).toHaveCount(0);
			}
			if (subject === 'apostolorum') {
				const group = page.locator('.token-group').filter({ has: page.locator('button#w027') });
				await expectSharedGloss(page, group, 3, 'otaczał ją nieustanną opieką');
			}
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		await setHelp(page, 2);
		await expect(page.locator(`#${segment} + .seg-extra > .translation`)).toHaveText(prose);
	});
}
