import { expect, settled, test } from './fixtures';

const surfaces = [
	{ name: 'prayer', base: '/app', path: '/orationes/pater-noster?w=w008' },
	{
		name: 'formulary',
		base: '/app',
		path: '/formularium/dominica-xxii-post-pentecosten?w=dominica-xxii-post-pentecosten-postcommunio.w018'
	},
	{ name: 'Ordo', base: '/app', path: '/ordo?dies=2026-12-25&missa=nativitas-domini-in-nocte' },
	{ name: 'landing', base: '', path: '' }
];

for (const surface of surfaces) {
	for (const keyboard of [false, true]) {
		test(`${surface.name} language round trip uses static documents, keyboard=${keyboard} @static-host`, async ({
			page
		}) => {
			const sidecars: string[] = [];
			page.on('request', (request) => {
				if (new URL(request.url()).pathname.endsWith('/__data.json')) sidecars.push(request.url());
			});
			await page.goto(`${surface.base}/pl${surface.path}`);
			for (const [menu, language, label] of [
				['wybór języka', 'en', 'English'],
				['language selection', 'pl', 'Polski']
			]) {
				await page.getByRole('button', { name: menu, exact: true }).click();
				const link = page.getByRole('link', { name: label, exact: true });
				const documentResponse = page.waitForResponse(
					(response) =>
						response.request().isNavigationRequest() &&
						response.request().resourceType() === 'document'
				);
				if (keyboard) await link.press('Enter');
				else await link.click();
				expect((await documentResponse).status()).toBe(200);
				await settled(page);
				await expect(page).toHaveURL(
					`http://localhost:4174${surface.base}/${language}${surface.path}`
				);
				await expect(page.locator('h1').first()).toBeVisible();
				await expect(page.locator('.errorpage')).toHaveCount(0);
				if (surface.path.includes('?w=')) await expect(page.locator('aside')).toBeVisible();
			}
			expect(sidecars).toEqual([]);
		});
	}
}
