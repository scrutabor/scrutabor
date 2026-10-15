import { expect, test, bare as staticTest, setHelp } from './fixtures';
import type { Page } from '@playwright/test';
import { M, type Lang } from '../src/lib/i18n';
import { execFileSync } from 'node:child_process';
import { assertPrintTools, printLeadPages } from '../scripts/print-leads';
import { printShortVoicePages } from '../scripts/print-voices';

// Hydration alone does not mean that the selected day's payload has arrived.
// Require its positive completion notice as well as the cleared loading state.
async function dayReady(page: Page, lang: Lang): Promise<void> {
	await expect(page.locator('.picker.day .states')).toContainText(M[lang].dayInPlace);
	await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
	await expect(page.locator('.part-loading')).toHaveCount(0);
	await page.evaluate(() => document.fonts.ready);
}

test.beforeAll(({ browserName }) => {
	if (browserName !== 'chromium') return;
	assertPrintTools();
});

test('internal voice stays with its complete short utterance on paper @reader', async ({
	page,
	browserName
}, testInfo) => {
	await page.addInitScript(() => {
		localStorage.setItem('scrutabor-help', '2');
		localStorage.setItem('scrutabor-reading', 'normal');
		localStorage.setItem('scrutabor-role', 'sacerdos');
		localStorage.setItem('scrutabor-mass-form', 'cantu');
	});
	await page.goto('/app/en/ordo/offertorium?dies=2026-04-12');
	await dayReady(page, 'en');
	await expect(page.locator('#orate-fratres-s07')).toBeVisible();
	await setHelp(page, 2);
	await page.evaluate(() => document.fonts.ready);
	await page.emulateMedia({ media: 'print' });
	const row = page.locator('.flow-row').filter({ has: page.locator('#orate-fratres-s07') });
	await expect(row).toHaveCount(1);
	const voice = await row.evaluate((node) => ({
		label: node.querySelector(':scope > .who')?.textContent?.trim() ?? '',
		words: [...node.querySelectorAll(':scope > .verse .base')].map(
			(word) => word.textContent ?? ''
		),
		initial: node.querySelector('.initial')?.textContent ?? null
	}));
	expect(voice.label).toBe('silently');
	expect(voice.words).toHaveLength(11);
	expect(voice.words[0]).toBe('ut');
	// Its long neighbor must not inherit the bounded short-row policy.
	const long = page.locator('.flow-row').filter({ has: page.locator('#orate-fratres-s04') });
	expect(await long.locator('.base').count()).toBeGreaterThan(12);
	await expect(long.locator('xpath=..')).toHaveCSS('break-inside', 'auto');
	if (browserName !== 'chromium') {
		// The label's own break-after is insufficient inside the bilingual grid.
		await expect(row.locator('xpath=..')).toHaveCSS('break-inside', 'avoid');
		return; // PDF generation is Chromium-only.
	}
	const pdf = testInfo.outputPath('complete-internal-voice.pdf');
	await page.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true });
	const bbox = execFileSync('pdftotext', ['-bbox-layout', pdf, '-'], { encoding: 'utf8' });
	// All eleven source words, including the entire first line and its
	// continuation, must accompany the complete label on one actual PDF page.
	expect(printShortVoicePages(bbox, voice)).toHaveLength(1);
});

for (const lang of ['pl', 'en'] as const) {
	for (const movement of ['catechumenorum', 'offertorium', 'conclusio']) {
		for (const help of [0, 1, 2] as const) {
			for (const size of ['normal', 'largest']) {
				test(`${lang} ${movement} help ${help} ${size} retains bounded print rows @reader`, async ({
					page,
					browserName
				}, testInfo) => {
					await page.addInitScript(
						({ help, size }) => {
							localStorage.setItem('scrutabor-help', String(help));
							localStorage.setItem('scrutabor-reading', size);
							localStorage.setItem('scrutabor-role', 'sacerdos');
							localStorage.setItem('scrutabor-mass-form', 'cantu');
						},
						{ help, size }
					);
					await page.goto(`/app/${lang}/ordo/${movement}?dies=2026-04-12`);
					await dayReady(page, lang);
					await expect(page.locator('.part-text .verse').first()).toBeVisible();
					while (await page.locator('button.unfold').count())
						await page.locator('button.unfold').first().click();
					while (await page.locator('button.repeated-toggle[aria-expanded="false"]').count())
						await page.locator('button.repeated-toggle[aria-expanded="false"]').first().click();
					await page.evaluate(() => document.fonts.ready);
					const identity = () =>
						page.locator('main').evaluate((main) => ({
							ids: [...main.querySelectorAll('[id]')].map((node) => node.id),
							latin: [...main.querySelectorAll('.verse')].map((verse) =>
								[...verse.querySelectorAll('.base')].map((word) => word.textContent).join(' ')
							),
							translations: [...main.querySelectorAll('.translation')].map(
								(node) => node.textContent
							),
							speakers: [...main.querySelectorAll('.who')].map((node) => node.textContent)
						}));
					const before = await identity();
					for (const unit of await page.locator('.flow-unit, .print-opening').all()) {
						await expect(unit).toHaveCSS('display', 'contents');
					}
					await page.emulateMedia({ media: 'print' });
					const after = await identity();
					const repeatedIds = after.ids.filter((id, index) => after.ids.indexOf(id) !== index);
					expect(after).toEqual(before);
					expect(repeatedIds).toEqual([]);
					const openings = page.locator('.print-opening');
					expect(await openings.count()).toBeGreaterThan(0);
					for (const opening of await openings.all()) {
						const compact = await opening.evaluate((node) => node.classList.contains('compact'));
						const grid = await opening
							.locator('.columns')
							.evaluateAll((nodes) =>
								nodes.some((node) => getComputedStyle(node).display === 'grid')
							);
						await expect(opening).toHaveCSS('break-inside', compact || grid ? 'avoid' : 'auto');
						await expect(opening.locator('.part-head')).toHaveCount(1);
						await expect(opening.locator('.verse').first()).toBeVisible();
					}
					for (const verse of await page.locator('.verse:has(.initial)').all()) {
						const reservation = await verse.evaluate((node) => {
							const style = getComputedStyle(node);
							return { padding: parseFloat(style.paddingTop), margin: parseFloat(style.marginTop) };
						});
						expect(reservation.padding).toBeGreaterThan(0);
						expect(reservation.margin).toBe(0);
					}
					for (const note of await page.locator('.part-note').all()) {
						await expect(note).toHaveCSS('break-inside', 'avoid');
					}
					for (const note of await page.locator('.flow-unit[data-kind="terminal"]').all()) {
						await expect(note).toHaveCSS('break-before', 'avoid');
						await expect(note).toHaveCSS('break-after', 'auto');
					}
					if (browserName === 'chromium') {
						const leads = await page.locator('.part').evaluateAll((parts) =>
							parts.flatMap((part) => {
								const verse = part.querySelector('.verse');
								const title = part.querySelector('.part-title');
								const guidance = part.querySelector('.part-note');
								return verse && title && guidance
									? [
											{
												title: title.textContent ?? '',
												guidance: guidance.textContent ?? '',
												words: [...verse.querySelectorAll('.base')].map(
													(word) => word.textContent ?? ''
												),
												initial: verse.querySelector('.initial')?.textContent ?? null
											}
										]
									: [];
							})
						);
						expect(leads.length).toBeGreaterThan(0);
						const pdf = testInfo.outputPath('complete-part-leads.pdf');
						await page.pdf({
							path: pdf,
							format: 'A4',
							printBackground: true,
							preferCSSPageSize: true
						});
						const bbox = execFileSync('pdftotext', ['-bbox-layout', pdf, '-'], {
							encoding: 'utf8'
						});
						for (const lead of leads)
							expect(
								printLeadPages(bbox, lead),
								`Detached actual sacred opening: ${lead.title}`
							).not.toEqual([]);
					}
					await page.emulateMedia({ media: 'screen' });
					expect(await identity()).toEqual(before);
				});
			}
		}
	}
}

test('the standalone hidden anchor, repeated folds and litany rows keep their controls @reader', async ({
	page
}) => {
	await page.goto('/app/pl/ordinarium/kyrie');
	await expect(page.locator('.rubric-anchor')).toHaveCount(1);
	await page.goto('/app/pl/orationes/angelus-domini');
	const first = page.locator('.verse.repeated').first();
	await first.locator('.repeated-toggle').click();
	await expect(first.locator('.token')).toHaveCount(31);
	await page.emulateMedia({ media: 'print' });
	await expect(first.locator('.token')).toHaveCount(31);
	await page.emulateMedia({ media: 'screen' });
	await first.locator('.repeated-toggle').focus();
	await page.keyboard.press('Enter');
	await expect(first.locator('.token')).toHaveCount(4);
	await page.goto('/app/pl/litaniae/lauretanae');
	await expect(
		page.locator('.litany-pair').first().locator('.litany-invocation .verse')
	).toHaveCount(1);
	await expect(page.locator('.litany-pair').first().locator('.litany-response .verse')).toHaveCount(
		1
	);
	await setHelp(page, 2);
	await expect(
		page.locator('.litany-pair').first().locator('.litany-response .translation')
	).toHaveCount(1);
});

staticTest.describe('static HTML @online', () => {
	staticTest.use({ javaScriptEnabled: false });
	staticTest('static print retains the same renderer-owned units @reader', async ({ page }) => {
		await page.goto('/app/en/ordinarium/credo');
		expect(await page.locator('.flow-unit').count()).toBeGreaterThan(0);
		const hic = page.locator('.flow-row > .rubric').filter({ hasText: 'Hic genuflectitur' });
		await expect(hic).toHaveCount(1);
		await page.emulateMedia({ media: 'print' });
		await expect(hic).toHaveCSS('break-after', 'avoid');
		await expect(hic.locator('xpath=../..')).toHaveCSS('break-after', 'avoid');
		const following = hic.locator('xpath=../following::div[contains(@class,"flow-row")][1]');
		expect(await following.locator('.base').count()).toBeGreaterThan(12);
		await expect(following.locator('xpath=..')).toHaveCSS('break-inside', 'auto');
		await expect(page.locator('.verse').last()).toBeVisible();
	});
});

test('nearby dates keep a single Paschal chant and multiple Easter bodies distinct @reader', async ({
	page
}) => {
	await page.goto('/app/en/ordo/catechumenorum?dies=2026-04-19');
	await dayReady(page, 'en');
	const nearby = page
		.locator('.part')
		.filter({ has: page.locator('.part-title', { hasText: 'Graduále, Allelúia, Tractus' }) });
	await expect(nearby).toHaveCount(1);
	const nearbyNamespaces = await nearby
		.locator('.part-text button.word[id]')
		.evaluateAll((words) => [...new Set(words.map((word) => word.id.split('.')[0]))]);
	expect(nearbyNamespaces).toHaveLength(1);
	await page.goto('/app/en/ordo/catechumenorum?dies=2026-04-05');
	await dayReady(page, 'en');
	const part = page
		.locator('.part')
		.filter({ has: page.locator('.part-title', { hasText: 'Graduále, Allelúia, Tractus' }) });
	await expect(part).toHaveCount(1);
	const openings = part.locator('.print-opening');
	await expect(openings).toHaveCount(1);
	expect(await part.locator('.part-continuation .verse').count()).toBeGreaterThan(0);
	const namespaces = await part
		.locator('.part-text button.word[id]')
		.evaluateAll((words) => [...new Set(words.map((word) => word.id.split('.')[0]))]);
	expect(namespaces.length).toBeGreaterThan(1);
	const leadNamespaces = await openings
		.locator('button.word[id]')
		.evaluateAll((words) => [...new Set(words.map((word) => word.id.split('.')[0]))]);
	expect(leadNamespaces).toHaveLength(1);
	const bounded = await openings.locator('.flow-unit[data-kind="opening"]').count();
	expect(await openings.evaluate((nodes) => nodes.classList.contains('compact'))).toBe(bounded > 0);
	expect(leadNamespaces.every((namespace) => namespace === namespaces[0])).toBe(true);
});

test('long print openings follow their actual bilingual measure @reader', async ({ page }) => {
	await page.goto('/app/en/ordo/catechumenorum?dies=2026-01-06');
	await dayReady(page, 'en');
	await setHelp(page, 2);
	await expect(page.locator('.part-loading')).toHaveCount(0);
	const opening = page
		.locator('.print-opening:not(.compact)')
		.filter({ has: page.locator('.columns') })
		.first();
	await expect(opening).toBeVisible();
	const part = opening.locator('xpath=..');
	await page.emulateMedia({ media: 'print' });
	// Exercise the exact transition and revealed-aside print styling on one
	// real long opening. Do not infer grid mode merely from viewport width.
	for (const revealed of [false, true]) {
		for (const delta of [-1, 0, 1]) {
			await part.evaluate(
				(node, state) => {
					node.classList.toggle('revealed', state.revealed);
					(node as HTMLElement).style.width = state.width;
				},
				{ revealed, width: `calc(44rem + ${delta}px)` }
			);
			await expect(opening.locator('.part-text')).toHaveCSS('padding-inline-start', '0px');
			await expect(opening.locator('.part-text')).toHaveCSS('border-inline-start-width', '0px');
			const columns = opening.locator('.columns').first();
			if (delta !== 0) {
				await expect(columns).toHaveCSS('display', delta < 0 ? 'block' : 'grid');
			}
			// Exact fractional edges may round differently by engine. The outer
			// keep must still follow the real column mode, including at the edge.
			const display = await columns.evaluate((node) => getComputedStyle(node).display);
			expect(['block', 'grid']).toContain(display);
			await expect(opening).toHaveCSS('break-inside', display === 'grid' ? 'avoid' : 'auto');
		}
	}
});
