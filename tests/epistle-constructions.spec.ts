import { expect, setHelp, test } from './fixtures';

const formulary = 'dominica-vi-post-pentecosten';
const text = `${formulary}-epistola`;
const readings = [
	{
		language: 'pl',
		future: 'będziemy wszczepieni w podobieństwo zmartwychwstania',
		futureWords: ['resurrectiónis', 'érimus'],
		purpose: 'i abyśmy już nie służyli',
		purposeWords: ['et', 'ultra', 'non', 'serviámus'],
		prose: 'abyśmy – jak Chrystus powstał z martwych',
		notes: [
			['w040', 'Obraz wspólnego zasadzenia mówi tu o zjednoczeniu z Chrystusem'],
			['w072', 'uwolnienie spod jego władzy'],
			['w092', 'Choć łaciński imiesłów ma formę teraźniejszą']
		]
	},
	{
		language: 'en',
		future: 'we will also be united in the likeness of His resurrection',
		futureWords: ['simul', 'et', 'resurrectiónis', 'érimus'],
		purpose: 'we might no longer serve',
		purposeWords: ['ultra', 'non', 'serviámus'],
		prose: 'we will also be united with Him in the likeness of His resurrection',
		notes: [
			['w040', 'The image of planting together expresses union with Christ in His death.'],
			['w072', 'release from sin’s claim'],
			['w092', 'Christ’s rising here is the resurrection already accomplished.']
		]
	}
] as const;

for (const reading of readings) {
	const route = `/app/${reading.language}/formularium/${formulary}`;
	for (const construction of ['future', 'purpose'] as const) {
		test(`${reading.language} Romans 6 ${construction} remains readable and opens every word`, async ({
			page
		}) => {
			await page.goto(route);
			await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.reload();
			await setHelp(page, 1);
			const group = page.locator('.token-group').filter({ hasText: reading[construction] });
			await expect(group.locator('rt')).toHaveText(reading[construction]);
			for (const width of [320, 1280]) {
				await page.setViewportSize({ width, height: 900 });
				await group.scrollIntoViewIfNeeded();
				const button = group.locator(':scope > button');
				const before = await group.boundingBox();
				await button.hover();
				expect(await group.boundingBox()).toEqual(before);
				await button.click();
				await expect(page.locator('aside .construction-card .construction-title')).toHaveText([
					...reading[`${construction}Words`]
				]);
				await page.keyboard.press('Escape');
				await expect
					.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
					.toBe(0);
			}
			await page.emulateMedia({ media: 'print' });
			await page.setViewportSize({ width: 375, height: 900 });
			await expect(group.locator('rt')).toBeVisible();
			await expect(group.locator('rt')).toHaveText(reading[construction]);
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBe(0);
		});
	}

	test(`${reading.language} Romans 6 preserves contextual notes, prose and the complete source`, async ({
		page
	}) => {
		for (const [word, note] of reading.notes) {
			await page.goto(`${route}?w=${text}.${word}`);
			await expect(page.locator('aside')).toContainText(note);
			await page.keyboard.press('Escape');
		}
		await setHelp(page, 1);
		const part = page.locator('.proper-part', { has: page.locator(`[id="${text}.w001"]`) });
		await expect(part.locator('.token')).toHaveCount(132);
		await setHelp(page, 2);
		await expect(part).toContainText(reading.prose);
		await part
			.getByRole('button', {
				name: reading.language === 'pl' ? 'o modlitwie' : 'about this prayer'
			})
			.click();
		const sources = page.getByRole('dialog').locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText('complete reading at line 28');
		await expect(sources).toContainText('announcement at line 26 excluded');
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n460/mode/1up"]'
			)
		).toHaveCount(1);
	});
}
