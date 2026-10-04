import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures';

/** A shared caption is one interaction, with help for every retained Latin word. */
export async function expectSharedGloss(
	page: Page,
	group: Locator,
	count: number,
	gloss: string,
	expectedWords?: readonly { id: string; href: string }[]
) {
	await expect(group).toHaveCount(1);
	await expect(group.locator('rt')).toHaveText(gloss);
	await expect(group.locator('.token')).toHaveCount(count);
	if (expectedWords) {
		expect(expectedWords).toHaveLength(count);
		expect(
			await group
				.locator('.token')
				.evaluateAll((tokens) => tokens.map((token) => token.id || token.closest('button')?.id))
		).toEqual(expectedWords.map(({ id }) => id));
	}
	const forms = await group.locator('.token').allTextContents();
	const button = group.locator(':scope > button');
	await expect(button).toHaveCount(1);
	await group.scrollIntoViewIfNeeded();
	await page.evaluate(() => document.fonts.ready);
	await expect(group.locator('rt')).toBeInViewport();
	// Hover may scroll the target into view. Compare document coordinates,
	// captured atomically with the scroll offset, to measure layout alone.
	const documentBox = () =>
		group.evaluate((element) => {
			const box = element.getBoundingClientRect();
			return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height };
		});
	const before = await documentBox();
	await button.hover();
	expect(await documentBox(), 'hover must only change paint').toEqual(before);
	await button.click();
	const panel = page.locator('aside.panel[role="dialog"]');
	await expect(panel).toHaveCount(1);
	const cards = panel.locator('.construction-card');
	await expect(cards).toHaveCount(count);
	await expect(panel.locator('.context-layer > .gloss')).toHaveText(gloss);
	for (let member = 0; member < count; member++) {
		const card = cards.nth(member);
		await expect(card.locator('.construction-title')).toHaveText(
			forms[member].trim().replace(/[,:.;!?]$/, '')
		);
		if (expectedWords) {
			await expect(card.locator('.construction-title')).toHaveAttribute(
				'id',
				`construction-${expectedWords[member].id}-title`
			);
			await expect(card.locator('.head a')).toHaveAttribute('href', expectedWords[member].href);
		}
		await card.scrollIntoViewIfNeeded();
		await expect(card.locator('.head a')).toBeInViewport();
		await expect(card.locator('.morph')).not.toHaveText('');
	}
	await page.keyboard.press('Escape');
	await expect(panel).toHaveCount(0);
}
