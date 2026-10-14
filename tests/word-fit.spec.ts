import { expect, setHelp, test } from './fixtures';

function ink(element: Element) {
	const result = [];
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	while (walker.nextNode()) {
		const node = walker.currentNode;
		let offset = 0;
		for (const character of node.textContent ?? '') {
			const range = document.createRange();
			range.setStart(node, offset);
			range.setEnd(node, offset + character.length);
			const box = range.getBoundingClientRect();
			result.push({ character, x: box.x, y: box.y, right: box.right, bottom: box.bottom });
			offset += character.length;
		}
	}
	return result;
}

for (const lang of ['pl', 'en']) {
	for (const width of [320, 375, 1280]) {
		test(`@reader ${lang} long Latin word retains punctuation and a clear close control at ${width}px`, async ({
			page
		}) => {
			await page.setViewportSize({ width, height: 900 });
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`/app/${lang}/ordinarium/praefatio-apostolorum`);
			await setHelp(page, 1);
			const word = page.locator('button#w049');
			const source = word.locator('.base');
			await expect(source).toHaveText('Dominatiónibus,');
			const characters = await source.evaluate(ink);
			const ending = characters.slice(-4);
			expect(ending.map(({ character }) => character).join('')).toBe('bus,');
			for (const character of ending) {
				expect.soft(Math.abs(character.y - ending[0].y)).toBeLessThanOrEqual(1);
			}
			expect(
				await source.evaluate((element) => {
					const range = document.createRange();
					range.selectNodeContents(element);
					const selection = getSelection()!;
					selection.removeAllRanges();
					selection.addRange(range);
					const text = selection.toString();
					selection.removeAllRanges();
					return text;
				})
			).toBe('Dominatiónibus,');
			await word.click();
			const dialog = page.getByRole('dialog');
			const heading = dialog.locator('header .form');
			await expect(heading).toHaveText('Dominatiónibus');
			const close = dialog.locator('button.close');
			const box = (await close.boundingBox())!;
			expect(box).not.toBeNull();
			const title = await heading.evaluate(ink);
			expect(
				title.filter(
					(letter) =>
						letter.right > box.x &&
						letter.x < box.x + box.width &&
						letter.bottom > box.y &&
						letter.y < box.y + box.height
				)
			).toEqual([]);
			expect(
				await dialog
					.locator('.inner')
					.evaluate((element) => element.scrollWidth - element.clientWidth)
			).toBe(0);
			await close.click();
			await expect(dialog).toHaveCount(0);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		});
	}
}
