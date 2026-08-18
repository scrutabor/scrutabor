// The day fills the Ordo's own slots.
//
// This spec is UNTAGGED on purpose, which is what makes it run twice: once
// against the site and once against the downloaded copy over file://, where
// there is no origin and no server. (`@online` would exclude it from the
// second run — the very run that matters here.)
// That second run is the point. The day is FETCHED rather than built into the
// page (decisions #27, revised 2026-08-18), and a fetch of an absolute path is
// exactly the kind of thing that works on the site and silently fails in the
// zip — which is where offline was supposed to matter most.
import { expect, test } from './fixtures';

const DAY = 'dominica-i-adventus';

test('the Ordo shows placeholders until a day is chosen', async ({ page }) => {
	await page.goto('/app/pl/ordo/catechumenorum');
	// The slot is named and described, and carries no text of its own.
	await expect(page.getByText('z formularza dnia').first()).toBeVisible();
	await expect(page.locator('body')).not.toContainText('wzniosłem');
});

test('choosing a day fills the slots without leaving the page', async ({ page }) => {
	await page.goto('/app/pl/ordo/catechumenorum');
	const marker = await page.evaluate(() => performance.getEntriesByType('navigation')[0].startTime);

	await page.getByLabel(/dzień/i).selectOption(DAY);
	// The introit's own words, which only the day can supply.
	await expect(page.locator('body')).toContainText('wzniosłem', { timeout: 15000 });

	// Same document: no navigation, which is half the reason for fetching.
	const after = await page.evaluate(() => performance.getEntriesByType('navigation')[0].startTime);
	expect(after).toBe(marker);
});

test('the chant slot carries gradual and alleluia together', async ({ page }) => {
	await page.goto(`/app/pl/ordo/catechumenorum?dies=${DAY}`);
	// One Ordo slot, two texts: Univérsi is the gradual, Osténde the alleluia.
	await expect(page.locator('body')).toContainText('Univérsi', { timeout: 15000 });
	await expect(page.locator('body')).toContainText('Osténde');
});

test('a shared link restores the day and the word', async ({ page }) => {
	await page.goto(`/app/pl/ordo/catechumenorum?dies=${DAY}&w=${DAY}-introitus.w014`);
	// The day arrived…
	await expect(page.locator('body')).toContainText('wzniosłem', { timeout: 15000 });
	// …and the panel opened on a word the day brought with it, which also
	// proves the fetched dictionary reached the panel: without the merge the
	// parse would be missing even though the word is on the page.
	await expect(page.locator('body')).toContainText('tryb łączący', { timeout: 15000 });
});
