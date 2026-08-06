// The reading size: three steps, set once, kept.
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

const trigger = (page: Page) => page.getByRole('button', { name: /text size/i });

async function choose(page: Page, name: string) {
	await trigger(page).click();
	await page.getByRole('option', { name, exact: true }).click();
}

const size = (page: Page) =>
	page.evaluate(() => ({
		reading: getComputedStyle(document.documentElement).getPropertyValue('--reading').trim(),
		latin: parseFloat(getComputedStyle(document.querySelector('.verse')!).fontSize),
		gloss: parseFloat(getComputedStyle(document.querySelector('.verse rt')!).fontSize),
		mark: parseFloat(getComputedStyle(document.querySelector('.verse .mark')!).fontSize)
	}));

test('the control says what it is on, and what else it could be', async ({ page }) => {
	// It was a button that cycled, and the owner's verdict was that it told
	// him neither — the text changed size and nothing said which of three
	// steps he had landed on or what the others were.
	await page.goto('/en/ordinarium/credo');
	await expect(trigger(page)).toHaveAccessibleName('text size: normal');

	await trigger(page).click();
	// the accessible names, not the text: each row also carries a sample
	// letter, which is aria-hidden because it says nothing a reader needs
	const options = page.getByRole('option');
	await expect(options).toHaveCount(3);
	for (const [i, name] of ['normal', 'larger', 'largest'].entries()) {
		await expect(options.nth(i)).toHaveAccessibleName(name);
	}
	await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');

	await page.getByRole('option', { name: 'largest', exact: true }).click();
	await expect(trigger(page)).toHaveAccessibleName('text size: largest');
	await trigger(page).click();
	await expect(page.getByRole('option', { name: 'largest', exact: true })).toHaveAttribute(
		'aria-selected',
		'true'
	);
});

test('it answers on the pages with no Latin on them too', async ({ page }) => {
	// The other half of the same fault: on the landing and the Ordo index
	// there is nothing to resize, so a cycling button changed the stored
	// setting and NOTHING a reader could see. It read as broken. The menu
	// shows the setting itself, so it answers wherever it is pressed.
	for (const url of ['/en', '/en/ordo']) {
		await page.goto(url);
		expect(await page.locator('.verse').count(), `${url} has no reading text`).toBe(0);
		await choose(page, 'larger');
		await expect(trigger(page), `${url}: the control did not show the change`).toHaveAccessibleName(
			'text size: larger'
		);
		await choose(page, 'normal');
		await expect(trigger(page)).toHaveAccessibleName('text size: normal');
	}
});

test('three steps, each larger than the last', async ({ page }) => {
	await page.goto('/en/ordinarium/confiteor');
	const seen: number[] = [];
	for (const step of ['normal', 'larger', 'largest']) {
		await choose(page, step);
		seen.push((await size(page)).latin);
	}
	expect(seen[1]).toBeGreaterThan(seen[0]);
	expect(seen[2]).toBeGreaterThan(seen[1]);
});

test('the apparatus grows with the face, not after it', async ({ page }) => {
	// The whole reason the size had to become one knob: five sizes and the
	// entire vertical rhythm used to be absolute, so the Latin would have
	// grown and the glosses, marks and rubrics stayed where they were.
	await page.goto('/en/ordinarium/confiteor');
	await choose(page, 'normal');
	const small = await size(page);
	await choose(page, 'largest');
	const large = await size(page);

	expect(large.latin, 'the reading face followed').toBeGreaterThan(small.latin * 1.3);
	for (const part of ['gloss', 'mark'] as const) {
		const before = small[part] / small.latin;
		const after = large[part] / large.latin;
		expect(Math.abs(after - before), `the ${part} kept its proportion`).toBeLessThan(0.02);
	}
});

test('the choice survives the page, the navigation and the reload', async ({ page }) => {
	await page.goto('/en/ordinarium/confiteor');
	await choose(page, 'larger');
	const chosen = (await size(page)).reading;
	expect(chosen).not.toBe('1.45rem');

	await page.goto('/en/ordinarium/credo');
	expect((await size(page)).reading, 'kept across a navigation').toBe(chosen);

	await page.reload();
	await page.waitForSelector('html[data-hydrated]');
	expect((await size(page)).reading, 'kept across a reload').toBe(chosen);
	await expect(trigger(page), 'and the control still says so').toHaveAccessibleName(
		'text size: larger'
	);
});

test('a reader who asked for large print never sees the page start small', async ({ page }) => {
	// app.html resolves the stored size in <head>, before anything is
	// drawn — the same treatment the theme gets. If it were left to the
	// component's onMount the page would paint at the default size first.
	await page.goto('/en/ordinarium/confiteor');
	await choose(page, 'largest');
	await page.goto('/en/ordinarium/credo');
	const set = await page.evaluate(() =>
		getComputedStyle(document.documentElement).getPropertyValue('--reading').trim()
	);
	expect(set, 'the size is on the document from the <head> script').toBe('2.05rem');
});

test('the control is wherever the reader is', async ({ page }) => {
	// It is a setting, so it lives with the theme and the language rather
	// than on the reading surfaces (decisions #20) — which means it has to
	// be on the landing too, or it could only be changed while reading.
	for (const url of ['/en', '/en/ordinarium/credo', '/en/ordo/canon', '/en/grammatica']) {
		await page.goto(url);
		await expect(trigger(page), `no way to set the size on ${url}`).toBeVisible();
	}
});

test('the mark sits in the middle of its pill', async ({ page }) => {
	// EB Garamond's ascent is taller than its em, so a line box of it
	// centres visibly high inside a round button — which is what the owner
	// saw. app.css keeps a copy of the face with normalised metrics for
	// exactly this (.trim-label); without it the mark rides about a
	// pixel and a half above centre and the button looks broken.
	await page.goto('/en/ordinarium/credo');
	const off = await page.evaluate(() => {
		const btn = [...document.querySelectorAll('button')].find((b) =>
			(b.getAttribute('aria-label') || '').startsWith('text size')
		)!;
		const mark = btn.querySelector('.aa')!;
		const b = btn.getBoundingClientRect();
		const m = mark.getBoundingClientRect();
		return Math.abs(m.top + m.height / 2 - (b.top + b.height / 2));
	});
	expect(off, 'the mark is off the pill’s centre line').toBeLessThan(0.6);
});

test('largest print on the smallest phone still holds together', async ({ page }) => {
	// The case the whole setting exists for, and the one most likely to
	// break: the biggest face in the narrowest column. A token that
	// fragments orphans its punctuation onto the next line; a gloss that
	// breaks reads as two glosses of two different words.
	await page.setViewportSize({ width: 320, height: 800 });
	for (const url of ['/pl/ordinarium/credo', '/en/ordo/canon', '/pl/orationes/pater-noster']) {
		await page.goto(url);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await page.waitForSelector('html[data-hydrated]');
		const damage = await page.evaluate(() => ({
			reading: getComputedStyle(document.documentElement).getPropertyValue('--reading').trim(),
			splitTokens: [...document.querySelectorAll('.verse .token')]
				.filter((t) => t.getClientRects().length !== 1)
				.map((t) => t.textContent?.trim()),
			brokenGlosses: [...document.querySelectorAll('.verse.glossed rt')]
				.filter((r) => r.getClientRects().length > 1)
				.map((r) => r.textContent?.trim()),
			overflowing: document.documentElement.scrollWidth > document.documentElement.clientWidth
		}));
		expect(damage.reading, `${url}: the size did not take`).toBe('2.05rem');
		expect(damage.splitTokens, `${url}: a token fragmented`).toEqual([]);
		expect(damage.brokenGlosses, `${url}: a gloss broke across lines`).toEqual([]);
		expect(damage.overflowing, `${url}: the page scrolls sideways`).toBe(false);
	}
});
