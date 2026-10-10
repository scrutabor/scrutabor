import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures';
import { documentBoxDelta, type DocumentBox } from './document-box';
import {
	interlinearGeometry,
	neighborInkCollisions,
	precedingNeighborInk
} from './interlinear-geometry';

export const sharedGlossDocumentBox = (group: Locator) =>
	group.evaluate((element) => {
		const box = element.getBoundingClientRect();
		return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height };
	});

export function expectDocumentBoxUnchanged(
	actual: DocumentBox,
	expected: DocumentBox,
	message = 'interaction must not move or resize the document box'
) {
	expect(documentBoxDelta(actual, expected), message).toEqual({ x: 0, y: 0, width: 0, height: 0 });
}

export async function expectNeighborInkClear(group: Locator, requirePrecedingRow = false) {
	const [geometry] = await group.evaluate(interlinearGeometry, { neighbors: true });
	expect(neighborInkCollisions(geometry), 'selection paint overlaps neighboring ink').toEqual([]);
	if (requirePrecedingRow)
		expect(
			precedingNeighborInk(geometry).length,
			'measured preceding-row coverage'
		).toBeGreaterThan(0);
	return geometry;
}

/** A shared caption is one interaction, with help for every retained Latin word. */
export async function expectSharedGloss(
	page: Page,
	group: Locator,
	count: number,
	gloss: string,
	expectedWords?: readonly { id: string; href: string; cardId?: string }[],
	options: { neighborInk?: boolean; requirePrecedingRow?: boolean } = {}
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
	const documentBox = () => sharedGlossDocumentBox(group);
	const before = await documentBox();
	await button.hover();
	expectDocumentBoxUnchanged(await documentBox(), before, 'hover must only change paint');
	if (options.neighborInk) await expectNeighborInkClear(group, options.requirePrecedingRow);
	await button.click();
	const panel = page.locator('aside.panel[role="dialog"]');
	await expect(panel).toHaveCount(1);
	if (options.neighborInk) {
		await expect(button).toHaveClass(/(?:^|\s)selected(?:\s|$)/);
		expectDocumentBoxUnchanged(await documentBox(), before, 'selection must only change paint');
		await expectNeighborInkClear(group, options.requirePrecedingRow);
	}
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
				`construction-${expectedWords[member].cardId ?? expectedWords[member].id}-title`
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
