import { atRoute, expect, noWordInTheAddress, test } from './fixtures';

test('empty and malformed folder addresses keep their recovery and word controls @folder', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(String(error)));
	await page.goto('/app/en');
	const book = page.url().split('#')[0];
	for (const hash of ['', '#', '#//', '#/%', '#unrelated', '#/pl/orationes/%']) {
		await page.goto(book + hash);
		const language = hash.startsWith('#/pl/') ? 'pl' : 'en';
		if (hash === '#/%' || hash === '#unrelated' || hash === '#/pl/orationes/%') {
			await expect(page.locator('.errorpage .status')).toHaveText('404');
			await expect(page.locator('.errorpage a')).toHaveAttribute('href', `/app/${language}`);
			await page.locator('.errorpage a').click();
		}
		await expect(page).toHaveURL(atRoute(`/app/${language}`));
		await expect(page.locator('h1')).toHaveText('Scrutabor');
		expect(errors, hash).toEqual([]);
	}
	await page.goto('/app/en/orationes/pater-noster?w=w001');
	await expect(page.locator('aside .form')).toHaveText('Pater noster');
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await noWordInTheAddress(page);
	await page.locator('#w001').click();
	await expect(page.locator('aside .form')).toHaveText('Pater noster');
	expect(errors).toEqual([]);
});
