import { expect, noWordInTheAddress, test } from './fixtures';
import table from '../src/lib/data/introductiones.json' with { type: 'json' };
import passion from '../src/lib/data/texts/proprium/dominica-ii-passionis-evangelium.json' with { type: 'json' };
import { inMassForm } from '../src/lib/speaker-marks';
import type { Segment } from '../src/lib/corpus';

for (const language of ['pl', 'en'] as const) {
	for (const form of ['lecta', 'cantu'] as const) {
		test(`${language} ${form}: both announcements precede their selected readings`, async ({
			page
		}) => {
			await page.addInitScript((form) => {
				localStorage.setItem('scrutabor-role', 'sacerdos');
				localStorage.setItem('scrutabor-mass-form', form);
			}, form);
			await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-04-26`);
			for (const role of ['epistola', 'evangelium'] as const) {
				const reading = `dominica-iii-post-pascha-${role}`;
				const bodyWord = `${reading}.w001`;
				await expect(page.locator(`[id="${bodyWord}"]`)).toBeVisible();
				const binding = table.announcements.find((row) => row.reading === `proprium/${reading}`)!;
				const unit = table.units.find((unit) => unit.id === binding.unit)!;
				const formulaWord = `${unit.text.split('/')[1]}~${role}-annuntiatio~${reading}.${unit.words[0]}`;
				const section = page
					.locator('section.part')
					.filter({ has: page.locator(`[id="${bodyWord}"]`) });
				await expect(section.locator(`[id="${formulaWord}"]`)).toBeVisible();
				await expect(section.locator('.reading-reference')).toHaveText(binding.reference);
				const ids =
					role === 'epistola'
						? [formulaWord, bodyWord]
						: [
								`praefatio-dialogus~evangelium-salutatio~${reading}.w001`,
								`praefatio-dialogus~evangelium-salutatio~${reading}.w003`,
								formulaWord,
								`evangelium-ultimum~evangelium-annuntiatio~${reading}.w012`,
								bodyWord
							];
				const ordered = await section
					.locator(ids.map((id) => `[id="${id}"]`).join(', '))
					.evaluateAll((nodes) => nodes.map((n) => n.id));
				expect(ordered).toEqual(ids);
				const formula = section.locator(`[id="${formulaWord}"]`);
				const visibleForm = await formula.locator('.base').innerText();
				const opener = await formula.elementHandle();
				if (!opener) throw new Error('The exact announcement opener is required');
				try {
					await formula.click();
					const dialog = page.getByRole('dialog');
					await expect(dialog).toBeVisible();
					await expect(dialog.locator('header h2.form')).toHaveText(visibleForm);
					const physical = new URL(page.url());
					const logical =
						physical.protocol === 'file:'
							? new URL(physical.hash.slice(1), 'https://scrutabor.invalid')
							: physical;
					expect(logical.searchParams.get('w')).toBe(formulaWord);
					await expect(dialog.locator('.head > a')).toHaveAttribute(
						'href',
						`/app/${language}/lemma?l=${role === 'epistola' ? 'lectio' : 'sequentia'}`
					);
					await expect(dialog.locator('.lemma-sources')).toHaveAttribute(
						'data-lemma',
						role === 'epistola' ? 'lectio' : 'sequentia'
					);
					await expect(dialog.locator('.lemma-sources [data-source-state="loaded"]')).toHaveCount(
						1
					);
					await expect(section.locator('a.part-title').first()).toHaveAttribute(
						'href',
						`/app/${language}/formularium/dominica-iii-post-pascha#text-proprium-${reading}`
					);
					await page.keyboard.press('Escape');
					await expect(dialog).toHaveCount(0);
					await expect(formula).toBeFocused();
					await noWordInTheAddress(page);
					await page.evaluate(
						() =>
							new Promise<void>((resolve) =>
								requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
							)
					);
					expect(await opener.evaluate((element) => element.isConnected)).toBe(true);
					expect(await formula.evaluate((element, original) => element === original, opener)).toBe(
						true
					);
					await expect(formula).toBeFocused();
				} finally {
					await opener.dispose();
				}
			}
			const ids = await page.locator('main [id]').evaluateAll((nodes) => nodes.map((n) => n.id));
			expect(new Set(ids).size).toBe(ids.length);
		});

		test(`${language} ${form}: the Passion has its announcement alone`, async ({ page }) => {
			await page.addInitScript((form) => {
				localStorage.setItem('scrutabor-role', 'sacerdos');
				localStorage.setItem('scrutabor-mass-form', form);
			}, form);
			await page.goto(`/app/${language}/ordo/catechumenorum?dies=2026-03-29`);
			const reading = 'dominica-ii-passionis-evangelium';
			await expect(page.locator(`[id="${reading}-s01"]`)).toBeVisible();
			const section = page
				.locator('section.part')
				.filter({ has: page.locator(`[id="${reading}-s01"]`) });
			await expect(
				section.locator(
					'[id*="passio-domini-nostri-iesu-christi-secundum-matthaeum~evangelium-annuntiatio"]'
				)
			).not.toHaveCount(0);
			await expect(section.locator('[id*="evangelium-salutatio"]')).toHaveCount(0);
			await expect(
				section.locator('[id*="evangelium-ultimum~evangelium-annuntiatio"]')
			).toHaveCount(0);
			await expect(section.locator('.reading-reference')).toHaveText(
				table.announcements.find((row) => row.reading === `proprium/${reading}`)!.reference
			);
			// Fixed source-bound producer sequence; this verifies consumption, not new source approval.
			const roles =
				'CXCXCXCXCXCXCSCSCXCXCXCSCSCSCXCSCSCSCSCSCSCSCSCSCSCSCXCSCSCSCSCSCSCSCSCSCSCSCSCSCSCXCXCSCSCCSC';
			const roleNames = { C: 'chronista', X: 'christus', S: 'synagoga' } as const;
			const verseIds = Array.from(
				{ length: 95 },
				(_, i) => `s${String(i + 1).padStart(2, '0')}`
			).filter((id) => id !== 's92');
			const sourceVerses = passion.seg.filter((segment) => segment.type === 'verse');
			expect(sourceVerses).toHaveLength(94);
			expect(sourceVerses.map((segment) => segment.id)).toEqual(verseIds);
			// Delivery belongs to every verse, even when the next same-speaker mark is omitted.
			const delivered = sourceVerses.map((segment) => inMassForm(segment as Segment, form));
			expect(delivered.map(({ speaker, voice }) => [speaker, voice])).toEqual(
				form === 'lecta'
					? Array.from({ length: 94 }, () => ['sacerdos', 'clara'])
					: [...roles].map((role) => [roleNames[role as keyof typeof roleNames], 'cantus'])
			);
			const verses = section.locator(`.verse[id^="${reading}-s"]`);
			await expect(verses).toHaveCount(94);
			expect(await verses.evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(
				verseIds.map((id) => `${reading}-${id}`)
			);
			const expected =
				form === 'lecta'
					? [
							[`${reading}-s01`, 'V.'],
							[`${reading}-s93`, 'V.']
						]
					: [...roles].map((role, i) => [
							`${reading}-${verseIds[i]}`,
							{ C: 'C.', X: '†.', S: 'S.' }[role as 'C' | 'X' | 'S']
						]);
			expect(
				await verses.evaluateAll((nodes) =>
					nodes.flatMap((node) =>
						[...node.querySelectorAll('.mark .ink')].map((mark) => [node.id, mark.textContent])
					)
				)
			).toEqual(expected);
		});
	}
}
