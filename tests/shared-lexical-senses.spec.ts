import { expect, test } from './fixtures';

const cards = [
	['exsisto', 'come forth, appear, arise, become, exist, be', 'n17222'],
	['teneo', 'hold, keep, possess, maintain, support, restrain', 'n47770'],
	['transfero', 'carry over, transfer, copy, transcribe, translate, transform', 'n48775'],
	['sors', 'lot, allotted share, portion, fate, condition', 'n44805'],
	['opus', 'work, deed, need', 'n32865'],
	['quisquam', 'anyone, any person, anything', 'n40247']
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
