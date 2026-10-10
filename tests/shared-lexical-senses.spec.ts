import { expect, setTheme, test } from './fixtures';

const cards = [
	['exsisto', 'to become, be, to arise, come forth, to exist', 'n17222'],
	[
		'teneo',
		'to hold, hold fast, to seize, lay hold of, to keep, retain, to occupy, possess',
		'n47770'
	],
	['transfero', 'to transfer, carry over, to remove, move, to bring over, lead', 'n48775'],
	['sors', 'lot, allotted share, portion, fate, condition', 'n44805'],
	['opus', 'work, deed, need', 'n32865'],
	['quisquam', 'anything, anyone', 'n40247']
] as const;

for (const language of ['pl', 'en']) {
	for (const width of [320, 1280]) {
		test(`${language}: shared lexical senses have exact sources at ${width}px`, async ({
			page
		}) => {
			await page.setViewportSize({ width, height: 900 });
			for (const [lemma, senses, node] of cards) {
				await page.goto(`/app/${language}/lemma?l=${lemma}`);
				await expect(page.locator('.lexical-summary')).toBeVisible();
				if (language === 'en') {
					await expect(page.locator('.head-senses')).toHaveText(`— ${senses}`);
				}
				const sources = page.locator('.lexical-summary .source-notes').last();
				await sources.locator('summary').click();
				await expect(sources).toContainText(`Perseus TEI entry ${node}`);
				await expect(sources).not.toContainText('evidence_sha256');
				await expect
					.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
					.toBe(0);
			}

			await page.goto(`/app/${language}/bibliographia`);
			const section = page.locator('.source-section').filter({
				has: page.getByRole('heading', {
					name:
						language === 'pl'
							? 'Pismo Święte, język i opracowania'
							: 'Scripture, language, and scholarship'
				})
			});
			const dictionary = section.locator('.source details', { hasText: 'A Latin Dictionary' });
			await dictionary.locator('summary').click();
			for (const [lemma] of cards) {
				await expect(dictionary.locator(`a[href$="/lemma?l=${lemma}"]`)).toHaveCount(1);
			}
		});
	}
}

const modernCards = [
	['tu', 'w010', 'you (singular), thou (traditional English)'],
	['tuus', 'w026', 'your (traditional English: thy), yours (traditional English: thine)'],
	['in', 'w037', 'in, on, into, to (traditional English: unto), at, among, for, with']
] as const;

for (const [lemma, word, senses] of modernCards) {
	test(`English ${lemma} qualifies traditional senses on both dictionary and word cards`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(`/app/en/lemma?l=${lemma}`);
			await setTheme(page, theme);
			await expect(page.locator('.lexical-summary .head-senses')).toHaveText(`— ${senses}`);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
			await page.goto(`/app/en/ordinarium/praefatio-sanctissimae-trinitatis?w=${word}`);
			const panel = page.getByRole('dialog');
			const entry = panel.locator('.head').filter({
				has: page.locator(`a[href="/app/en/lemma?l=${lemma}"]`)
			});
			await expect(entry.locator('.head-senses')).toHaveText(`— ${senses}`);
			expect(await panel.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
				0
			);
		}
	});
}
