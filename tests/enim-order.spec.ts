import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, setHelp, setTheme, test } from './fixtures';
import type { Morph } from '../src/lib/corpus';
import { describeMorph } from '../src/lib/morph';
import { lemmaHref } from '../src/lib/lemma-url';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };
import cases from './enim-order-cases.json' with { type: 'json' };

function data<T>(path: string): T {
	return JSON.parse(readFileSync(new URL(`../src/lib/data/${path}`, import.meta.url), 'utf8'));
}

const parses = data<Morph[]>('tables/morphology.json');
const heads = data<{ entries: Record<string, { head: string }> }>('lexicon/heads.json').entries;
const senses = data<{ entries: Record<string, { senses: string[] }> }>(
	'languages/en/lexicon.json'
).entries;

function constituents(text: string, members: string[]) {
	type Cell = { i: string; f: string; l: string; m: number };
	const core = data<{ seg: { w?: Cell[] }[] }>(`texts/${text}.json`);
	const words = core.seg.flatMap((segment) => segment.w ?? []);
	return members.map((id) => {
		const word = words.find((word) => word.i === id);
		if (!word || !parses[word.m] || !heads[word.l] || !senses[word.l]) {
			throw new Error(`Missing constituent data: ${text}:${id}`);
		}
		return {
			form: word.f,
			href: lemmaHref('en', word.l),
			head: heads[word.l].head,
			senses: `— ${senses[word.l].senses.join(', ')}`,
			morph: describeMorph(parses[word.m], 'en')
		};
	});
}

// This checks each card's binding to the existing reader data, not an
// independent linguistic approval of every retained lemma or analysis.
async function expectPanel(
	page: Page,
	gloss: string,
	forms: string[],
	parts: ReturnType<typeof constituents>
) {
	await expect(page.locator('aside .context-layer > .gloss')).toHaveText(gloss);
	await expect(page.locator('aside .construction-title')).toHaveText(forms);
	const cards = page.locator('aside .construction-card');
	await expect(cards).toHaveCount(parts.length);
	for (const [i, part] of parts.entries()) {
		const card = cards.nth(i);
		await expect(card.locator('h3')).toHaveText(part.form);
		await expect(card.locator('.head > a')).toHaveAttribute('href', part.href);
		await expect(card.locator('.head > a i')).toHaveText(part.head);
		await expect(card.locator('.head-senses')).toHaveText(part.senses);
		await expect(card.locator('.morph')).toHaveText(part.morph);
	}
}

function destination(text: string) {
	if (!text.startsWith('proprium/')) return { route: `/app/en/${text}`, prefix: '' };
	const day = formularies.formularies.find((formulary) =>
		formulary.components.some((part) => part.text === text && part.relation === 'proper')
	);
	expect(day, `${text} has its own formulary`).toBeDefined();
	return { route: `/app/en/formularium/${day!.id}`, prefix: `${text.split('/')[1]}.` };
}

for (const { text, members, anchor, forms, gloss } of cases) {
	const parts = constituents(text, members);
	expect(parts.map((part) => part.form)).toEqual(forms);
	test(`English ${text} ${anchor} preserves the causal construction`, async ({ page }) => {
		const { route, prefix } = destination(text);
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(route);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${prefix}${anchor}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('rt')).toHaveCount(1);
		await expect(button.locator('.token')).toHaveCount(members.length);
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ['light', 'dark'] as const) {
				await setTheme(page, theme);
				await button.scrollIntoViewIfNeeded();
				await page.evaluate(() => document.fonts.ready);
				const before = await button.boundingBox();
				await button.hover();
				expect(await button.boundingBox()).toEqual(before);
				await button.focus();
				await button.press('Enter');
				await expectPanel(page, gloss, forms, parts);
				expect(
					await page.locator('aside .inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
				await page.keyboard.press('Escape');
				await expect(page.locator('aside')).toHaveCount(0);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
		await expect(button.locator('rt')).toHaveText(gloss);
		await page.emulateMedia({ media: 'screen' });
		for (const member of members) {
			await page.goto(`${route}?w=${prefix}${member}`);
			await expectPanel(page, gloss, forms, parts);
			await page.keyboard.press('Escape');
			await expect(page.locator('aside')).toHaveCount(0);
		}
	});
}
