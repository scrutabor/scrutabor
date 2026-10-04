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
	const before = await group.boundingBox();
	await button.hover();
	expect(await group.boundingBox(), 'hover must only change paint').toEqual(before);
	await button.click();
	const cards = page.locator('aside .construction-card');
	await expect(cards).toHaveCount(count);
	await expect(page.locator('aside .context-layer > .gloss')).toHaveText(gloss);
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
	await expect(page.locator('aside')).toHaveCount(0);
}
