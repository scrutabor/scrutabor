import type { GlossDocument, TextDocument } from '../src/lib/corpus';
import type { ProperPayload } from '../src/lib/proper.svelte';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };
import { expect, setHelp, test } from './fixtures';

test.use({ serviceWorkers: 'block' });

// Until a paired passage is in the reader edition, the transport fixture owns
// its punctuation. No source file, rendered DOM or cached corpus is patched.
// The actual 177-word epistle is placed in an available day's reading slot.
async function pairedReading(
	page: import('@playwright/test').Page,
	grouped: boolean,
	opening = false
) {
	const days = [...formularies.formularies].sort((a, b) => a.order - b.order);
	const day = 'dominica-vi-post-epiphaniam';
	const pack = String(Math.floor(days.findIndex((item) => item.id === day) / 5) + 1).padStart(
		2,
		'0'
	);
	const sourceResponse = await page.request.get(`/artifacts/proprium/en/pack-${pack}.json`);
	expect(sourceResponse.ok()).toBe(true);
	const sourcePack = (await sourceResponse.json()) as { days: Record<string, ProperPayload> };
	const source = structuredClone(
		sourcePack.days[day].parts.find((part) => part.part === 'epistola')!
	);
	const doc = source.doc as TextDocument;
	const gloss = source.gloss as GlossDocument;
	const segment = doc.segments[0];
	expect(segment.words).toHaveLength(177);
	expect(segment.words!.slice(166, 170).map((word) => word.form)).toEqual([
		'quem',
		'suscitávit',
		'ex',
		'mórtuis'
	]);
	segment.parentheses = [{ from: 'w167', through: 'w170' }];
	if (opening)
		segment.parentheses.unshift({ from: 'w001', through: 'w001', closing: 'after-post' });
	if (grouped) {
		const words = segment.words!.slice(166, 170);
		const alignment = {
			words: words.map((word) => word.id),
			forms: words.map((word) => word.form),
			gloss: 'whom He raised from the dead'
		};
		gloss.segments.s01.alignments = [
			...(gloss.segments.s01.alignments ?? []).filter(
				(item) => !item.words.some((id) => alignment.words.includes(id))
			),
			alignment
		];
		for (const word of words) gloss.words[word.id] = { alignment };
	}
	const destination = await page.request.get('/artifacts/proprium/en/pack-01.json');
	expect(destination.ok()).toBe(true);
	const payload = (await destination.json()) as { days: Record<string, ProperPayload> };
	const advent = payload.days['dominica-i-adventus'];
	advent.parts = advent.parts.map((part) => (part.part === 'epistola' ? source : part));
	advent.lex = { ...advent.lex, ...sourcePack.days[day].lex };
	await page.route('**/artifacts/proprium/en/pack-01.json*', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
	);
	await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.goto('/app/en/ordo/catechumenorum?dies=2026-11-29');
	const verse = page.locator('.verse').filter({ has: page.locator('[id$=".w167"]') });
	await expect(verse).toHaveCount(1);
	return verse;
}

test('source parentheses survive ordinary modes, narrow screens and print @online', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const verse = await pairedReading(page, false);
	for (const mode of [0, 1, 2] as const) {
		await setHelp(page, mode);
		const words = await verse.locator('.base').allTextContents();
		expect(words).toHaveLength(177);
		expect(words.slice(166, 170)).toEqual(['(quem', 'suscitávit', 'ex', 'mórtuis)']);
		await page.emulateMedia({ media: 'print' });
		expect(await verse.locator('.base').allTextContents()).toEqual(words);
		await page.emulateMedia({ media: 'screen' });
	}
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
		.toBe(0);
});

test('paired grouped source retains one stable accessible control @online', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const verse = await pairedReading(page, true);
	await setHelp(page, 1);
	const group = verse.locator('.token-group').filter({ hasText: '(quem' });
	const button = group.locator('button');
	await expect(button).toHaveCount(1);
	await expect(button).toHaveAccessibleName(
		'(quem suscitávit ex mórtuis) — whom He raised from the dead'
	);
	await expect(group.locator('.base')).toHaveText(['(quem', 'suscitávit', 'ex', 'mórtuis)']);
	const geometry = () =>
		group.evaluate((element) => {
			const box = element.getBoundingClientRect();
			const annotation = element.querySelector('rt')!.getBoundingClientRect();
			return { width: box.width, height: box.height, glossTop: annotation.top - box.top };
		});
	await button.scrollIntoViewIfNeeded();
	await page.mouse.move(0, 0);
	const before = await geometry();
	await page.screenshot({ path: testInfo.outputPath('parentheses-normal.png') });
	await button.hover();
	expect(await geometry()).toEqual(before);
	await button.focus();
	await expect(button).toBeFocused();
	expect(await geometry()).toEqual(before);
	await button.press('Enter');
	await expect(button).toHaveClass(/selected/);
	expect(await geometry()).toEqual(before);
	await expect(page.locator('.panel .form')).not.toContainText('(');
	// A reader can scroll the selected passage clear of the bottom sheet.
	// This capture is not a claim that opening the sheet auto-scrolls it.
	await page.mouse.move(30, 250);
	await page.mouse.wheel(0, 160);
	await expect
		.poll(async () => {
			const source = await group.boundingBox();
			const panel = await page.locator('.panel').boundingBox();
			return !!source && !!panel && source.y + source.height <= panel.y;
		})
		.toBe(true);
	await page.screenshot({ path: testInfo.outputPath('parentheses-selected.png') });
	await page.keyboard.press('Escape');
	await page.emulateMedia({ media: 'print' });
	await expect(group.locator('.base')).toHaveText(['(quem', 'suscitávit', 'ex', 'mórtuis)']);
	await page.emulateMedia({ media: 'screen' });
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
		.toBe(0);
});

test('an opening parenthesis is normal text before the raised letter @online', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const verse = await pairedReading(page, false, true);
	const base = verse.locator('.base').first();
	await expect(base).toHaveText('(Fratres:)');
	await expect(base.locator('.initial')).toHaveText('F');
	const opening = await base.evaluate((element) => {
		const first = element.firstChild!;
		const initial = element.querySelector('.initial')!;
		const range = document.createRange();
		range.selectNode(first);
		return {
			text: first.textContent,
			right: range.getBoundingClientRect().right,
			letterLeft: initial.getBoundingClientRect().left,
			baseSize: parseFloat(getComputedStyle(element).fontSize),
			letterSize: parseFloat(getComputedStyle(initial).fontSize)
		};
	});
	expect(opening.text).toBe('(');
	expect(opening.right).toBeLessThanOrEqual(opening.letterLeft + 1);
	expect(opening.baseSize).toBeCloseTo(32.48, 2);
	expect(opening.letterSize).toBeGreaterThan(opening.baseSize);
	await page.emulateMedia({ media: 'print' });
	await expect(base).toHaveText('(Fratres:)');
	await expect(base.locator('.initial')).toHaveText('F');
});
