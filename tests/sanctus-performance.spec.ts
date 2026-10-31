import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// The five verses hold 25 Latin words. Polish captions each word, so each is its own button.
// English captions glória tua (s03, w012–w013) as one shared “of Your glory” anchored on w012,
// so 25 words make 24 word buttons.
const words = {
	pl: {
		performance: 'Schola śpiewa, a wierni mogą dołączyć. Kapłan odmawia ten sam tekst po cichu.',
		shared: 'kapłan i wierni',
		cantu: 'śpiewana',
		lecta: 'cicha',
		transition: 'Po zakończeniu własnej recytacji rozpoczyna Kanon',
		buttons: 25,
		captions: [] as { anchor: string; members: string[]; forms: string[]; gloss: string }[]
	},
	en: {
		performance:
			'The choir sings, and the faithful may join. The priest recites the same text quietly.',
		shared: 'priest and faithful',
		cantu: 'sung',
		lecta: 'low',
		transition: 'After completing his own recitation he begins the Canon',
		buttons: 24,
		captions: [
			{
				anchor: 'w012',
				members: ['w012', 'w013'],
				forms: ['glória', 'tua.'],
				gloss: 'of Your glory'
			}
		]
	}
};

// One body: every Latin word, the language's word buttons and its shared captions exactly.
async function expectBody(page: Page, lang: 'pl' | 'en') {
	await expect(page.locator('.verse .token')).toHaveCount(25);
	await expect(page.locator('.verse .word')).toHaveCount(words[lang].buttons);
	const groups = page.locator('.verse .token-group');
	await expect(groups).toHaveCount(words[lang].captions.length);
	for (const [index, caption] of words[lang].captions.entries()) {
		const group = groups.nth(index);
		await expect(group.locator(':scope > button.word-construction')).toHaveId(caption.anchor);
		await expect(group.locator('rt')).toHaveText(caption.gloss);
		await expect(group.locator('.token')).toHaveText(caption.forms);
		expect(
			await group
				.locator('.token')
				.evaluateAll((tokens) => tokens.map((token) => token.id || token.closest('button')?.id))
		).toEqual(caption.members);
	}
}

for (const lang of ['pl', 'en'] as const)
	for (const who of ['populus', 'minister', 'sacerdos'] as const)
		for (const width of [320, 1280]) {
			test(`${lang}/${who}/${width} Sanctus keeps both actions and one body across forms`, async ({
				page
			}) => {
				await page.setViewportSize({ width, height: 900 });
				await page.addInitScript((selected) => {
					localStorage.setItem('scrutabor-role', selected);
					localStorage.setItem('scrutabor-mass-form', 'cantu');
				}, who);
				await page.goto(`/app/${lang}/ordinarium/sanctus`);
				const note = page.locator('.who-performance');
				await expect(note).toHaveText(words[lang].performance);
				await expect(note).toBeVisible();
				await expect(page.locator('.verse.answer')).toHaveCount(5);
				await expect(page.locator('.verse.quiet')).toHaveCount(0);
				await expectBody(page, lang);
				await expect(page.locator('.verse .mark')).toHaveCount(0);
				await expect(page.locator('.who-name')).toHaveCount(0);
				await expect(page.locator('.picker[data-kind="role"]')).toHaveCount(0);
				const picker = page.locator('.picker[data-kind="mass"]');
				await expect(picker).toHaveCount(1);
				await picker.getByRole('radio', { name: words[lang].lecta, exact: true }).click();
				await expect(note).toHaveCount(0);
				await expect(page.locator('.who-name')).toHaveText(words[lang].shared);
				await expect(page.locator('.verse.answer')).toHaveCount(5);
				await expect(page.locator('.verse.quiet')).toHaveCount(0);
				await expectBody(page, lang);
				await picker.getByRole('radio', { name: words[lang].cantu, exact: true }).click();
				await expect(note).toHaveText(words[lang].performance);
				await page.emulateMedia({ media: 'print' });
				await expect(note).toBeVisible();
				const ids = await page.locator('[id]').evaluateAll((nodes) => nodes.map((n) => n.id));
				expect(ids.length).toBe(new Set(ids).size);
			});
		}

for (const lang of ['pl', 'en'] as const)
	for (const who of ['populus', 'minister', 'sacerdos'] as const)
		test(`${lang}/${who} Ordo describes the priest's Canon transition independently of singing`, async ({
			page
		}) => {
			await page.addInitScript((selected) => {
				localStorage.setItem('scrutabor-role', selected);
				localStorage.setItem('scrutabor-mass-form', 'cantu');
			}, who);
			await page.goto(`/app/${lang}/ordo/canon`);
			await expect(page.locator('.who-performance')).toHaveText(words[lang].performance);
			await expect(page.locator('.who-performance')).toBeVisible();
			await expect(page.getByText(words[lang].transition, { exact: false })).toBeVisible();
			if (who !== 'populus') await expect(page.locator('.unfold')).toHaveCount(0);
			else expect(await page.locator('.unfold').count()).toBeGreaterThan(8);
			const canon = page.locator('[id="te-igitur.w001"]');
			if (who === 'populus') {
				const reveal = page.locator('button.unfold').filter({
					has: page.locator('.unfold-title', { hasText: /^Te ígitur$/ })
				});
				await expect(reveal).toHaveCount(1);
				await expect(reveal).toBeVisible();
				await expect(reveal.locator('.unfold-title')).toHaveText('Te ígitur');
				await expect(canon).not.toBeVisible();
			} else await expect(canon).toBeVisible();
		});
