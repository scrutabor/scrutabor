import { bare, expect } from './fixtures';

const cases = [
	{ path: '/404', status: 200, errorPage: true },
	{ path: '/not-found', status: 404, errorPage: true },
	{ path: '/pl/404', status: 404, errorPage: true },
	{ path: '/en/404', status: 404, errorPage: true },
	{ path: '/app/en/missing-prayer/deep', status: 404, errorPage: true },
	{ path: '/app/pl/missing-prayer/deep/', status: 404, errorPage: true },
	{ path: '/app/pl/orationes/pater-noster', status: 200, errorPage: false }
];

for (const javaScriptEnabled of [true, false]) {
	bare.describe(
		`static errors with JavaScript ${javaScriptEnabled ? 'enabled' : 'disabled'}`,
		() => {
			bare.use({ javaScriptEnabled, serviceWorkers: 'block' });
			for (const subject of cases) {
				bare(
					`${subject.path} keeps its typography and correct status @online @static-host`,
					async ({ page }) => {
						// Disabled scripting blocks module preloads by browser policy.
						// The request-only inventory still validates their bytes/MIME;
						// this no-script rendering check requires CSS and fonts only.
						const resourceKinds = javaScriptEnabled
							? ['script', 'stylesheet', 'font']
							: ['stylesheet', 'font'];
						const badAssets: string[] = [],
							scriptErrors: string[] = [];
						page.on('pageerror', (error) => scriptErrors.push(error.message));
						page.on('requestfailed', (request) => {
							if (resourceKinds.includes(request.resourceType())) {
								badAssets.push(`${request.url()}: ${request.failure()?.errorText}`);
							}
						});
						page.on('response', (response) => {
							const kind = response.request().resourceType();
							if (!resourceKinds.includes(kind)) return;
							const type = response.headers()['content-type']?.split(';')[0].trim() ?? '';
							const allowed =
								kind === 'stylesheet'
									? ['text/css']
									: kind === 'font'
										? ['font/woff2']
										: ['text/javascript', 'application/javascript'];
							if (response.status() !== 200 || !allowed.includes(type)) {
								badAssets.push(`${response.url()}: HTTP ${response.status()}, ${type}`);
							}
						});
						const response = await page.goto(subject.path);
						expect(response?.status()).toBe(subject.status);
						expect(response?.headers()['content-type']).toContain('text/html');
						await expect(page.locator('main')).toBeVisible();
						await page.evaluate(() => document.fonts.ready);
						// A failed stylesheet can still have a CSSStyleSheet object. Its
						// computed house typography is what the reader actually receives.
						await expect(page.locator('body')).toHaveCSS('font-family', /EB Garamond/);
						if (subject.errorPage) {
							await expect(page.locator('.status')).toHaveText('404');
							await expect(page.locator('.line')).toHaveCount(2);
							await expect(page.locator('.line').first()).toContainText(
								'This page does not exist.'
							);
							await expect(page.locator('.line').last()).toContainText('Ta strona nie istnieje.');
							for (const language of ['en', 'pl']) {
								const home = page.locator(`.line a[href="/${language}"]`);
								await expect(home).toBeVisible();
								expect(
									await home.evaluate((a) => new URL((a as HTMLAnchorElement).href).pathname)
								).toBe(`/${language}`);
							}
						} else {
							await expect(page.locator('.status')).toHaveCount(0);
							await expect(page.locator('.verse').first()).toContainText('Pater');
						}
						if (javaScriptEnabled)
							await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true');
						else await expect(page.locator('html')).not.toHaveAttribute('data-hydrated', 'true');
						expect(badAssets).toEqual([]);
						expect(scriptErrors).toEqual([]);
					}
				);
			}
		}
	);
}
