import type { Locator, Page } from '@playwright/test';
import { expect, noWordInTheAddress, setHelp, test } from './fixtures';

const errors = new WeakMap<Page, string[]>();
const word = (page: Page, id: string) => page.locator(`[id="${id}"].word`);
const sheet = (page: Page) => page.locator('aside.panel[role="dialog"]');

test.beforeEach(async ({ page }) => {
	const seen: string[] = [];
	errors.set(page, seen);
	page.on('pageerror', (error) => seen.push(String(error)));
	page.on('console', (message) => {
		if (message.type() === 'error') seen.push(message.text());
	});
	await page.setViewportSize({ width: 1512, height: 1000 });
	await page.addInitScript(() => {
		if (location.href === 'about:blank') return;
		localStorage.setItem('scrutabor-role', 'sacerdos');
		localStorage.setItem('scrutabor-mass-form', 'lecta');
		localStorage.setItem('scrutabor-help', '0');
	});
});

test.afterEach(async ({ page }) => {
	expect(errors.get(page)).toEqual([]);
});

async function closeFromInside(page: Page, target: Locator) {
	await sheet(page).locator('button.close').focus();
	await expect(sheet(page).locator('button.close')).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(sheet(page)).toHaveCount(0);
	await noWordInTheAddress(page);
	await expect(target).toBeFocused();
	await page.evaluate(
		() =>
			new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
			)
	);
	await expect(target).toBeFocused();
}

async function openLatest(page: Page, lang: string, prefixed = false) {
	const prefix = prefixed ? 'iube-domine-benedicere.' : '';
	await page.goto(
		prefixed
			? `/app/${lang}/ordo/catechumenorum?missa=none`
			: `/app/${lang}/ordinarium/iube-domine-benedicere`
	);
	await setHelp(page, 0);
	await expect(page.locator(`[id^="${prefix}w"].word`)).toHaveCount(20);
	const initial = word(page, `${prefix}w020`);
	const latest = word(page, `${prefix}w005`);
	await expect(initial).toHaveText('Amen.');
	await initial.click();
	await expect(sheet(page)).toBeFocused();
	const frame = await sheet(page).elementHandle();
	if (!frame) throw new Error('The initial word sheet is required');
	try {
		await latest.click();
		await expect(sheet(page).locator('.form')).toHaveText('Dóminus sit');
		await expect(latest).toBeFocused();
		await expect(latest).toHaveClass(/selected/);
		await expect(initial).not.toHaveClass(/selected/);
		expect(await sheet(page).evaluate((current, original) => current === original, frame)).toBe(
			true
		);
	} finally {
		await frame.dispose();
	}
	return { initial, latest };
}

for (const lang of ['pl', 'en'] as const) {
	test(`${lang} latest word remains the return target without a sheet remount`, async ({
		page
	}) => {
		const { initial, latest } = await openLatest(page, lang);
		await closeFromInside(page, latest);
		await expect(initial).not.toBeFocused();
	});

	test(`${lang} member deep link returns to the actual construction button`, async ({ page }) => {
		await page.goto(`/app/${lang}/ordinarium/iube-domine-benedicere?w=w002`);
		await expect(sheet(page)).toHaveCount(1);
		await setHelp(page, 1);
		const group = word(page, 'w001');
		await expect(group).toHaveClass(/word-construction/);
		const member = page.locator('[id="w002"]');
		await expect(member).toHaveCount(1);
		expect(await member.evaluate((element) => element.closest('button')?.id)).toBe('w001');
		await closeFromInside(page, group);
	});

	test(`${lang} latest prefixed Ordo target is the exact occurrence`, async ({ page }) => {
		const { initial, latest } = await openLatest(page, lang, true);
		await closeFromInside(page, latest);
		await expect(initial).not.toBeFocused();
	});

	test(`${lang} detached latest target does not restore the stale initial word`, async ({
		page
	}) => {
		const { initial, latest } = await openLatest(page, lang);
		await sheet(page).locator('button.close').focus();
		await expect(sheet(page).locator('button.close')).toBeFocused();
		// A deliberate DOM lifecycle fault tests the missing-target guard.
		// This is not presented as an ordinary reader navigation.
		await latest.evaluate((element) => element.remove());
		await expect(latest).toHaveCount(0);
		await page.keyboard.press('Escape');
		await expect(sheet(page)).toHaveCount(0);
		await noWordInTheAddress(page);
		await expect(initial).not.toBeFocused();
	});

	test(`${lang} inline analysis does not take dialog focus @online`, async ({ page }) => {
		await page.goto(`/${lang}`);
		await page.locator('.specimen .help [data-level="0"]').click();
		const inline = page.locator('aside.word-panel-inline');
		const target = word(page, 'w017');
		await expect(inline).toHaveCount(1);
		await expect(inline).not.toBeFocused();
		await target.click();
		await expect(inline.locator('.form')).toHaveText('legem');
		await expect(inline).not.toHaveAttribute('role', 'dialog');
		await expect(inline).not.toHaveAttribute('tabindex', '-1');
		await expect(inline.locator('button.close')).toHaveCount(0);
		await expect(target).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(inline).toHaveCount(1);
		await expect(target).toBeFocused();
	});
}
