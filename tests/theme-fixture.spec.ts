import { expect, setHelp, setTheme, test } from './fixtures';

for (const language of ['pl', 'en'] as const) {
	test(`${language} theme helper changes the loaded reader without losing its state`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-theme', 'light'));
		await page.goto(`/app/${language}/orationes/pater-noster`);
		await setHelp(page, 1);
		const root = page.locator('html');
		const initialDocument = await root.elementHandle();
		const paintedBackground = () =>
			page.locator('body').evaluate((e) => getComputedStyle(e).backgroundColor);
		const light = await paintedBackground();
		// Negative control: media changes alone cannot override the loaded theme.
		await page.emulateMedia({ colorScheme: 'dark' });
		await expect(root).toHaveAttribute('data-theme', 'light');
		expect(await paintedBackground()).toBe(light);
		await setTheme(page, 'dark');
		const dark = await paintedBackground();
		expect(dark).not.toBe(light);
		await setTheme(page, 'dark');
		expect(await paintedBackground()).toBe(dark);
		await setTheme(page, 'light');
		expect(await paintedBackground()).toBe(light);
		await setTheme(page, 'light');
		expect(await paintedBackground()).toBe(light);
		await expect(page.locator('.help [data-level="1"]')).toHaveAttribute('aria-checked', 'true');
		expect(await initialDocument!.evaluate((e) => e === document.documentElement)).toBe(true);
	});
}
