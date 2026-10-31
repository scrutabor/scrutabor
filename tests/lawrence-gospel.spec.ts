import { expect, setHelp, setTheme, test } from './fixtures';
import type { Locator } from '@playwright/test';

const formulary = 'sancti-laurentii-martyris';
const text = `${formulary}-evangelium`;

// The history pop can restore a different scroll offset. Measure the text's
// document geometry independently of that viewport movement.
async function documentBox(button: Locator) {
	return button.evaluate((element) => {
		const box = element.getBoundingClientRect();
		return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height };
	});
}

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/${formulary}`;
	for (const anchor of ['w018', 'w025']) {
		test(`${language} Lawrence Gospel ${anchor} keeps one complete death predicate`, async ({
			page
		}) => {
			await page.goto(route);
			await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.reload();
			await setHelp(page, 1);
			const button = page.locator(`button[id="${text}.${anchor}"]`);
			const gloss = language === 'pl' ? 'obumrze' : 'dies';
			for (const width of [320, 1280]) {
				await page.setViewportSize({ width, height: 900 });
				for (const theme of ['light', 'dark'] as const) {
					await setTheme(page, theme);
					await expect(button.locator('rt')).toHaveText(gloss);
					await expect(button.locator('.token')).toHaveCount(2);
					await button.scrollIntoViewIfNeeded();
					await page.evaluate(() => document.fonts.ready);
					const before = await button.boundingBox();
					const beforeDocument = await documentBox(button);
					await button.hover();
					expect(await button.boundingBox()).toEqual(before);
					await button.focus();
					await button.press('Enter');
					await expect(page.locator('aside .construction-title')).toHaveText(['mórtuum', 'fúerit']);
					await expect(page.locator('aside .construction-card .morph')).toHaveCount(2);
					await page.keyboard.press('Escape');
					await expect(page.locator('aside')).toHaveCount(0);
					await expect.poll(() => documentBox(button)).toEqual(beforeDocument);
					expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
						0
					);
				}
			}
			await page.emulateMedia({ media: 'print' });
			await expect(button.locator('rt')).toBeVisible();
			await expect(button.locator('rt')).toHaveText(gloss);
		});
	}

	test(`${language} Lawrence Gospel retains the whole reading and life referents`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		await expect(section.locator('.token')).toHaveCount(71);
		// 71 words. Polish shares the two death predicates (69 captions). English also shares
		// the five noun and possessive pairs, each one caption on its noun (64 captions).
		await expect(section.locator('rt')).toHaveCount(language === 'pl' ? 69 : 64);
		const shared: [string, string, string, string][] =
			language === 'pl'
				? [
						['w018', 'w019', 'mórtuum fúerit,', 'obumrze'],
						['w025', 'w026', 'mórtuum fúerit,', 'obumrze']
					]
				: [
						['w006', 'w007', 'discípulis suis:', 'to His disciples'],
						['w018', 'w019', 'mórtuum fúerit,', 'dies'],
						['w025', 'w026', 'mórtuum fúerit,', 'dies'],
						['w032', 'w033', 'ánimam suam,', 'his life'],
						['w039', 'w040', 'ánimam suam', 'his life'],
						['w061', 'w062', 'miníster meus', 'My servant'],
						['w070', 'w071', 'Pater meus.', 'My Father']
					];
		const groups = section.locator('.token-group');
		await expect(groups).toHaveCount(shared.length);
		for (const [index, [anchor, member, forms, caption]] of shared.entries()) {
			const group = groups.nth(index);
			await expect(group.locator(':scope > button.word-construction')).toHaveId(
				`${text}.${anchor}`
			);
			await expect(group.locator('rt')).toHaveText(caption);
			await expect(group.locator('.token')).toHaveText(forms.split(' '));
			await expect(group.locator(`.token[id="${text}.${member}"]`)).toHaveCount(1);
		}
		const glosses =
			language === 'pl'
				? [
						['w015', 'padając'],
						['w020', 'ono'],
						['w021', 'samo'],
						['w032', 'życie'],
						['w033', 'swoje'],
						['w035', 'je'],
						['w039', 'życie'],
						['w040', 'swoje'],
						['w047', 'zachowuje'],
						['w048', 'je']
					]
				: [
						['w044', 'for'],
						['w047', 'keeps'],
						['w057', 'am'],
						['w058', 'I'],
						['w063', 'will be']
					];
		for (const [word, gloss] of glosses) {
			await expect(section.locator(`button[id="${text}.${word}"] rt`)).toHaveText(gloss);
		}
		await setHelp(page, 2);
		await expect(section.locator('.translation')).toHaveCount(1);
		await expect(section.locator('.translation')).toContainText(
			language === 'pl'
				? 'Kto kocha swoje życie, straci je; a kto nienawidzi swojego życia'
				: 'Whoever loves his life will lose it, and whoever hates his life'
		);
	});

	test(`${language} Lawrence Gospel separates inherited and printed sources`, async ({ page }) => {
		await page.goto(route);
		await page
			.locator(`#text-proprium-${text}`)
			.getByRole('button', {
				name: language === 'pl' ? 'o modlitwie' : 'about this prayer'
			})
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toContainText(language === 'pl' ? 'Ewangelia formularza' : 'The Gospel');
		const sources = dialog.locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText('reference37 to Sancti/02-01');
		await expect(sources).toContainText('heading57, announcement58, reference59, body60');
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n716/mode/1up"]'
			)
		).toHaveCount(1);
		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
	});
}
