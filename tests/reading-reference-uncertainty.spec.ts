// Distinguish literal scan readings, uncertainty and normalized passage locators.
import { expect, test } from './fixtures';

const cases = [
	{
		date: '2026-03-08',
		mass: 'dominica-iii-in-quadragesima',
		printed: 'Luc. 11, 4-28',
		passage: 'Luc 11, 14–28',
		uncertain: false
	},
	{
		date: '2026-04-12',
		mass: 'dominica-in-albis',
		printed: 'Ioann. 80, 19-31',
		passage: 'Ioann 20, 19–31',
		uncertain: true
	}
] as const;

for (const lang of ['pl', 'en'] as const)
	for (const c of cases)
		test(`${lang} ${c.mass}: reference certainty survives screen and print @reader`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
			await page.goto(`/app/${lang}/ordo/catechumenorum?dies=${c.date}`);
			const section = page.locator('section.part').filter({
				has: page.locator(`[id="${c.mass}-evangelium.w001"]`)
			});
			await expect(section).toHaveCount(1);
			const label = c.uncertain
				? lang === 'pl'
					? 'na skanie prawdopodobnie „'
					: 'the scan appears to read “'
				: lang === 'pl'
					? 'w mszale wydrukowano „'
					: 'printed in the missal as “';
			const reference = section.locator('.reading-reference');
			await expect(reference).toHaveText(`${c.passage} (${label}${c.printed}”)`);
			await expect(reference.locator('> span')).toHaveAttribute('lang', lang);
			if (c.uncertain)
				await expect(reference).not.toContainText(
					/printed in the missal|w mszale wydrukowano|misprint|błąd druku/i
				);
			await page.emulateMedia({ media: 'print' });
			await expect(reference).toBeVisible();
			await expect(reference).toHaveText(`${c.passage} (${label}${c.printed}”)`);
		});
