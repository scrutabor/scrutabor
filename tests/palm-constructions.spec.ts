import { expect, setHelp, setTheme, test } from './fixtures';
import type { Locator } from '@playwright/test';
import { interlinearGeometry } from './interlinear-geometry';
import { expectDocumentBoxUnchanged, sharedGlossDocumentBox } from './shared-gloss';

const collectForms = [
	'et',
	'patiéntiæ',
	'ipsíus',
	'habére',
	'documénta',
	'et',
	'resurrectiónis',
	'consórtia',
	'mereámur'
] as const;
const questionForms = ['Quem', 'vultis', 'vobis', 'de', 'duóbus', 'dimítti'] as const;
const epistleForms = [
	'non',
	'rapínam',
	'arbitrátus',
	'est',
	'esse',
	'se',
	'æquálem',
	'Deo'
] as const;

async function expectReadable(group: Locator) {
	const measurements = await group.evaluate(interlinearGeometry);
	expect(measurements).toHaveLength(1);
	const [geometry] = measurements;
	expect(geometry.sourceClipping).toEqual([]);
	expect(geometry.captionClipping).toEqual([]);
	expect(geometry.clearance).toBeGreaterThanOrEqual(0);
}

async function expectCards(panel: Locator, forms: readonly string[], caption: string) {
	await expect(panel.locator('.construction-card')).toHaveCount(forms.length);
	await expect(panel.locator('.construction-title')).toHaveText([...forms]);
	await expect(panel.locator('.context-layer > .gloss')).toHaveText(caption);
	const morphology = panel.locator('.construction-card .morph');
	await expect(morphology).toHaveCount(forms.length);
	for (const item of await morphology.all()) await expect(item).not.toHaveText('');
}

const readings = [
	[
		'pl',
		'dominica-ii-passionis',
		'collecta',
		'w030',
		'w022',
		'byli godni zarówno czerpać naukę z Jego cierpliwości, jak i uczestniczyć w Jego zmartwychwstaniu',
		collectForms
	],
	[
		'en',
		'dominica-ii-passionis',
		'collecta',
		'w030',
		'w022',
		'we may be worthy both to learn from His patience and to share in His resurrection',
		collectForms
	],
	[
		'pl',
		'dominica-ii-passionis',
		'evangelium',
		'w934',
		'w938',
		'Którego z dwóch chcecie, aby wam wypuszczono',
		questionForms
	],
	[
		'en',
		'dominica-ii-passionis',
		'evangelium',
		'w934',
		'w938',
		'Which of the two do you want to be released to you',
		questionForms
	],
	[
		'pl',
		'exaltatio-sanctae-crucis',
		'epistola',
		'w020',
		'w025',
		'nie uznał za przywłaszczenie tego, że jest równy Bogu',
		epistleForms
	],
	[
		'en',
		'exaltatio-sanctae-crucis',
		'epistola',
		'w020',
		'w018',
		'did not regard it as robbery',
		epistleForms.slice(0, 4)
	]
] as const;

for (const [language, formulary, part, anchor, member, caption, forms] of readings) {
	test(`${language}: ${formulary} ${anchor} retains the whole construction and its word cards @reader`, async ({
		page
	}) => {
		const route = `/app/${language}/formularium/${formulary}`;
		const prefix = `${formulary}-${part}`;
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(route);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${prefix}.${anchor}"]`);
		const group = page.locator('.token-group').filter({ has: button });
		const panel = page.locator('aside.panel[role="dialog"]');
		await expect(button.locator('rt')).toHaveText(caption);
		await expect(button.locator('.token')).toHaveCount(forms.length);
		await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ['light', 'dark'] as const) {
				await setTheme(page, theme);
				await button.scrollIntoViewIfNeeded();
				await page.evaluate(() => document.fonts.ready);
				await expectReadable(group);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
				const before = await sharedGlossDocumentBox(group);
				await button.hover();
				expectDocumentBoxUnchanged(await sharedGlossDocumentBox(group), before);
				await button.click();
				await expectCards(panel, forms, caption);
				expect(
					await panel.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
				await page.keyboard.press('Escape');
				await expect(panel).toHaveCount(0);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		}
		await page.setViewportSize({ width: 794, height: 1123 });
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
		await expect(button.locator('rt')).toHaveText(caption);
		await expectReadable(group);
		expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		await page.emulateMedia({ media: 'screen' });
		await page.goto(`${route}?w=${prefix}.${member}`);
		await expectCards(panel, forms, caption);
		await page.keyboard.press('Escape');
		await expect(panel).toHaveCount(0);
	});
}
