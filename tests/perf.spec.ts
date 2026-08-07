// Cold-load rendering stability: with cache disabled and a throttled
// network the fallback font paints first, so any metric mismatch with
// the webfont shows up as layout-shift entries. The metric-matched
// fallback in app.css must keep the swap invisible.
import { bare as test, expect } from './fixtures';

test('cold load swaps fonts without layout shift', async ({ page }) => {
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
	await cdp.send('Network.emulateNetworkConditions', {
		offline: false,
		latency: 150,
		downloadThroughput: 1_500_000,
		uploadThroughput: 750_000
	});
	await page.goto('/pl/ordinarium/gloria');
	const cls = await page.evaluate(async () => {
		await document.fonts.ready;
		return new Promise((resolve) => {
			let total = 0;
			new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					const shift = entry as unknown as { value: number; hadRecentInput: boolean };
					if (!shift.hadRecentInput) total += shift.value;
				}
			}).observe({ type: 'layout-shift', buffered: true });
			setTimeout(() => resolve(total), 200);
		});
	});
	expect(cls as number).toBeLessThan(0.05);
});
