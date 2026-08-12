// The reading size: three steps, set once, kept.
import { expect, settled, test } from './fixtures';
import type { Page } from '@playwright/test';

const trigger = (page: Page) => page.getByRole('button', { name: /text size/i });

async function choose(page: Page, name: string) {
	await trigger(page).click();
	await page.getByRole('option', { name, exact: true }).click();
}

const size = (page: Page) =>
	page.evaluate(() => ({
		// the knob is the ROOT size — every size in the app is a multiple of
		// it, which is the point: a reader who needs large print needs it on
		// the catalogue and the word panel too, not only on the Latin
		root: getComputedStyle(document.documentElement).fontSize,
		latin: parseFloat(getComputedStyle(document.querySelector('.verse')!).fontSize),
		gloss: parseFloat(getComputedStyle(document.querySelector('.verse rt')!).fontSize),
		// A shared Ordinary prayer deliberately has no V./R. mark: the whole
		// text is the faithful's part, so there is no dialogue to distinguish.
		// Tests which need the mark use a marked text; persistence checks need
		// only the root and must not assume every reading surface has one.
		mark: document.querySelector('.verse .mark')
			? parseFloat(getComputedStyle(document.querySelector('.verse .mark')!).fontSize)
			: Number.NaN
	}));

test('the control says what it is on, and what else it could be', async ({ page }) => {
	// It was a button that cycled, and the owner's verdict was that it told
	// him neither — the text changed size and nothing said which of three
	// steps he had landed on or what the others were.
	await page.goto('/app/en/ordinarium/credo');
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
	for (const url of ['/app/en', '/app/en/ordo']) {
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
	await page.goto('/app/en/ordinarium/confiteor');
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
	await page.goto('/app/en/ordinarium/confiteor');
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
	await page.goto('/app/en/ordinarium/confiteor');
	await choose(page, 'larger');
	const chosen = (await size(page)).root;
	expect(chosen).not.toBe('16px');

	await page.goto('/app/en/ordinarium/credo');
	expect((await size(page)).root, 'kept across a navigation').toBe(chosen);

	await page.reload();
	await settled(page);
	expect((await size(page)).root, 'kept across a reload').toBe(chosen);
	await expect(trigger(page), 'and the control still says so').toHaveAccessibleName(
		'text size: larger'
	);
});

test('a reader who asked for large print never sees the page start small', async ({ page }) => {
	// app.html resolves the stored size in <head>, before anything is
	// drawn — the same treatment the theme gets. If it were left to the
	// component's onMount the page would paint at the default size first.
	await page.goto('/app/en/ordinarium/confiteor');
	await choose(page, 'largest');
	await page.goto('/app/en/ordinarium/credo');
	const set = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
	expect(set, 'the size is on the document from the <head> script').toBe('22.4px');
});

test('the control is wherever the reader is', async ({ page }) => {
	// It is a setting, so it lives with the theme and the language rather
	// than on the reading surfaces (decisions #20) — which means it has to
	// be on the landing too, or it could only be changed while reading.
	for (const url of [
		'/app/en',
		'/app/en/ordinarium/credo',
		'/app/en/ordo/canon',
		'/app/en/grammatica'
	]) {
		await page.goto(url);
		await expect(trigger(page), `no way to set the size on ${url}`).toBeVisible();
	}
});

test('the mark is optically centred in its pill', async ({ page }) => {
	// EB Garamond's ascent is taller than its em, so a line box of it
	// centres visibly high inside a round button. app.css first normalises
	// those metrics; the capitals' ink still carries slightly more weight
	// above the middle, so the mark receives one small downward optical
	// correction. Keep that correction proportional as reading size grows.
	await page.goto('/app/en/ordinarium/credo');
	const alignment = await page.evaluate(() => {
		const btn = [...document.querySelectorAll('button')].find((b) =>
			(b.getAttribute('aria-label') || '').startsWith('text size')
		)!;
		const mark = btn.querySelector<HTMLElement>('.aa')!;
		const b = btn.getBoundingClientRect();
		const m = mark.getBoundingClientRect();
		return {
			displacement: m.top + m.height / 2 - (b.top + b.height / 2),
			expected: parseFloat(getComputedStyle(mark).fontSize) * 0.03
		};
	});
	expect(alignment.displacement, 'the mark lost its optical correction').toBeCloseTo(
		alignment.expected,
		1
	);
});

test('largest print on the smallest phone still holds together', async ({ page }) => {
	// The case the whole setting exists for, and the one most likely to
	// break: the biggest face in the narrowest column. A token that
	// fragments orphans its punctuation onto the next line; a gloss that
	// breaks reads as two glosses of two different words.
	await page.setViewportSize({ width: 320, height: 800 });
	for (const url of [
		'/app/pl/ordinarium/credo',
		'/app/en/ordo/canon',
		'/app/pl/orationes/pater-noster'
	]) {
		await page.goto(url);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		await settled(page);
		const damage = await page.evaluate(() => ({
			root: getComputedStyle(document.documentElement).fontSize,
			splitTokens: [...document.querySelectorAll('.verse .token')]
				.filter((t) => t.getClientRects().length !== 1)
				.map((t) => t.textContent?.trim()),
			brokenGlosses: [...document.querySelectorAll('.verse.glossed rt')]
				.filter((r) => r.getClientRects().length > 1)
				.map((r) => r.textContent?.trim()),
			overflowing: document.documentElement.scrollWidth > document.documentElement.clientWidth,
			trackSpans: (() => {
				const help = document.querySelector('.help');
				const track = document.querySelector('input[type="range"]');
				if (!help || !track) return true;
				return track.getBoundingClientRect().width > help.getBoundingClientRect().width * 0.9;
			})()
		}));
		expect(damage.root, `${url}: the size did not take`).toBe('22.4px');
		expect(damage.splitTokens, `${url}: a token fragmented`).toEqual([]);
		expect(damage.brokenGlosses, `${url}: a gloss broke across lines`).toEqual([]);
		expect(damage.overflowing, `${url}: the page scrolls sideways`).toBe(false);
		// and it fits by STACKING the slider, not by breaking words inside
		// its labels — the first attempt did the latter and read as broken
		expect(damage.trackSpans, `${url}: the help slider did not stack`).toBe(true);
	}
});

test('the slider’s thumb clears the labels above it', async ({ page }) => {
	// When the control stacks, the row gap has to clear the THUMB and not
	// the track: the track is 2px tall and the thumb 0.95rem, so it
	// overhangs by about half of that either side. At 0.3rem of gap it sat
	// on top of the label above it.
	await page.setViewportSize({ width: 320, height: 800 });
	await page.goto('/app/pl/ordo/praeparatio');
	await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
	await page.reload();
	await settled(page);
	const clearance = await page.evaluate(() => {
		const input = document.querySelector('input[type="range"]')!;
		const track = input.getBoundingClientRect();
		const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
		const thumbTop = track.top + track.height / 2 - (root * 0.95) / 2;
		const lowestLabel = Math.max(
			...[...document.querySelectorAll('.help .end')].map((e) => e.getBoundingClientRect().bottom)
		);
		return thumbTop - lowestLabel;
	});
	expect(clearance, 'the thumb overlaps the label above it').toBeGreaterThan(2);
});
