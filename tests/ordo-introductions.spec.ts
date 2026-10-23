import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

// The greeting, its answer and Orémus before the Collect, the Offertory and the Postcommunion
// (Ritus servandus V, 1; VII, 1; XI, 1) are the corpus resource's own units: the words of the
// Preface dialogue's first exchange and of the Orémus before Aufer a nobis, each occurrence
// delivered as the resource says in both forms of Mass. None precedes the Secret (VII, 7).
const PARTS = [
	['catechumenorum', 'collecta'],
	['offertorium', 'offertorium'],
	['conclusio', 'postcommunio']
] as const;
const SUNDAY = { query: 'dies=2026-04-26', mass: 'dominica-iii-post-pascha' };

const run = (part: string) => ({
	dialogue: `praefatio-dialogus~${part}-introductio`,
	invitation: `aufer-a-nobis~${part}-introductio`
});

async function as(page: Page, form: 'lecta' | 'cantu') {
	await page.addInitScript((form) => {
		localStorage.setItem('scrutabor-role', 'sacerdos');
		localStorage.setItem('scrutabor-mass-form', form);
	}, form);
}

const label = (page: Page, verse: string, name: string) =>
	page.locator(`.who:has(+ [id="${verse}"]) .${name}`);

for (const language of ['pl', 'en'] as const) {
	const names =
		language === 'pl'
			? {
					priest: 'kapłan',
					low: 'usługujący i wierni',
					sung: 'schola i wierni',
					voice: 'śpiew',
					everyone: 'odpowiadają wszyscy'
				}
			: {
					priest: 'priest',
					low: 'server and faithful',
					sung: 'choir and faithful',
					voice: 'sung',
					everyone: 'everyone answers'
				};

	for (const form of ['lecta', 'cantu'] as const) {
		test(`${language} ${form}: each opening part is introduced before the day's text`, async ({
			page
		}) => {
			await as(page, form);
			for (const [movement, part] of PARTS) {
				await page.goto(`/app/${language}/ordo/${movement}?${SUNDAY.query}`);
				const proper = `${SUNDAY.mass}-${part}.w001`;
				await expect(page.locator(`[id="${proper}"]`)).toBeVisible();
				const section = page
					.locator('section.part')
					.filter({ has: page.locator(`[id="${proper}"]`) });
				const { dialogue, invitation } = run(part);
				const order = await section
					.locator(
						[`${dialogue}.w001`, `${dialogue}.w003`, `${invitation}.w001`, proper]
							.map((id) => `[id="${id}"]`)
							.join(', ')
					)
					.evaluateAll((nodes) => nodes.map((node) => node.id));
				expect(order).toEqual([
					`${dialogue}.w001`,
					`${dialogue}.w003`,
					`${invitation}.w001`,
					proper
				]);
				await expect(section.locator(`[id="${dialogue}-s02"] .mark`)).toHaveText('V.');
				await expect(section.locator(`[id="${dialogue}-s03"] .mark`)).toHaveText('R.');
				await expect(section.locator(`[id="${invitation}-s02"] .mark`)).toHaveText('V.');
				await expect(label(page, `${dialogue}-s02`, 'who-name')).toHaveText(names.priest);
				await expect(label(page, `${dialogue}-s03`, 'who-name')).toHaveText(
					form === 'cantu' ? names.sung : names.low
				);
				if (form === 'cantu')
					await expect(label(page, `${dialogue}-s02`, 'who-voice')).toHaveText(names.voice);
				else await expect(label(page, `${dialogue}-s02`, 'who-voice')).toHaveCount(0);
				// The response is everyone's first-degree answer, as the owner's participation says.
				await expect(label(page, `${dialogue}-s03`, 'who-all')).toHaveText(names.everyone);
				// The introduction is said once before the group, not repeated in the slot.
				await expect(section.locator(`[id^="${dialogue}"][id$=".w001"]`)).toHaveCount(1);
				const ids = await page.locator('main [id]').evaluateAll((nodes) => nodes.map((n) => n.id));
				expect(new Set(ids).size, movement).toBe(ids.length);
			}
		});
	}

	test(`${language} no introduction precedes the Secret or the Gospel in this edition`, async ({
		page
	}) => {
		await as(page, 'cantu');
		await page.goto(`/app/${language}/ordo/offertorium?${SUNDAY.query}`);
		const secret = page
			.locator('section.part')
			.filter({ has: page.locator(`[id="${SUNDAY.mass}-secreta.w001"]`) });
		await expect(secret).toHaveCount(1);
		await expect(secret.locator('[id*="introductio"]')).toHaveCount(0);
		await expect(
			page.locator('[id^="praefatio-dialogus~offertorium-introductio"]')
		).not.toHaveCount(0);
		await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-03-29`);
		// The Passion's first rendered word is not w001; its first segment is.
		await expect(page.locator('[id="dominica-ii-passionis-evangelium-s01"]')).toBeVisible();
		await expect(page.locator('[id*="evangelium-salutatio"]')).toHaveCount(0);
	});

	test(`${language} the Easter Vigil's Offertory keeps its greeting and Orémus without an antiphon`, async ({
		page
	}) => {
		await as(page, 'cantu');
		await page.goto(`/app/${language}/ordo/offertorium?dies=2026-04-04`);
		await expect(page.locator('[id="vigilia-paschalis-secreta.w001"]')).toBeVisible();
		const offertory = page.locator('section.part').filter({
			has: page.locator('.part-title', { hasText: /^Offertórium$/ })
		});
		await expect(offertory).toHaveCount(1);
		await expect(offertory.locator('[id^="vigilia-paschalis-offertorium"]')).toHaveCount(0);
		const { dialogue, invitation } = run('offertorium');
		await expect(offertory.locator(`[id="${dialogue}.w001"]`)).toBeVisible();
		await expect(offertory.locator(`[id="${invitation}.w001"]`)).toBeVisible();
	});

	test(`${language} the introductions stand in the Ordinary alone and open their words`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/ordo/catechumenorum?missa=none`);
		const { invitation } = run('collecta');
		const word = page.locator(`[id="${invitation}.w001"]`);
		await expect(word).toBeVisible();
		await word.click();
		await expect(page.locator('aside .form').first()).toContainText('Orémus');
		await page.goto(`/app/${language}/ordo/catechumenorum?missa=none&w=${invitation}.w001`);
		await expect(page.locator('aside .form').first()).toContainText('Orémus');
	});
}
