import { expect, setTheme, test } from './fixtures';

const notes = {
	pl: 'Zwykle stoi po pierwszym wyrazie lub po ściśle związanej grupie wyrazów na początku zdania.',
	en: 'Normally follows the first word or a closely connected opening word group in its clause.'
} as const;

for (const language of ['pl', 'en'] as const) {
	for (const surface of ['lemma', 'word', 'construction'] as const) {
		test(`${language} enim placement note stays qualified on ${surface}`, async ({ page }) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			const route =
				surface === 'lemma'
					? 'lemma?l=enim'
					: surface === 'word'
						? 'orationes/magnificat?w=w019'
						: 'formularium/sancti-andreae-apostoli?w=sancti-andreae-apostoli-epistola.w024';
			await page.goto(`/app/${language}/${route}`);
			const container =
				surface === 'lemma'
					? page.locator('.lexical-summary')
					: surface === 'word' && language === 'pl'
						? page.getByRole('dialog').locator('.layers')
						: page
								.getByRole('dialog')
								.locator('.construction-card')
								.filter({
									has: page.locator('h3', { hasText: /^enim$/ })
								});
			await expect(container).toHaveCount(1);
			const note = container.locator('.note');
			await expect(note).toHaveCount(1);
			await expect(note).toHaveText(notes[language]);
			await expect(container.locator('.head-senses')).toHaveText(
				language === 'pl' ? '— bowiem, albowiem' : '— for, indeed'
			);
			if (surface === 'lemma') {
				await expect(page.locator('.occ-form')).toHaveCount(171);
			} else {
				await expect(container.locator('a[href$="/lemma?l=enim"]')).toHaveCount(1);
			}
			for (const [width, height, theme] of [
				[320, 700, 'dark'],
				[1280, 900, 'light']
			] as const) {
				await page.setViewportSize({ width, height });
				await setTheme(page, theme);
				await page.evaluate(() => document.fonts.ready);
				await note.scrollIntoViewIfNeeded();
				await expect(note).toBeVisible();
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
				if (surface !== 'lemma') {
					// CSS visibility alone does not detect text behind a sticky header.
					const geometry = await note.evaluate((el) => {
						const inner = el.closest<HTMLElement>('.inner');
						const header = inner?.querySelector('header');
						if (!inner || !header) throw new Error('Missing word-panel scroll container');
						inner.scrollTop +=
							el.getBoundingClientRect().top - header.getBoundingClientRect().bottom - 12;
						return {
							note: el.getBoundingClientRect().toJSON(),
							header: header.getBoundingClientRect().toJSON(),
							inner: inner.getBoundingClientRect().toJSON(),
							overflow: inner.scrollWidth - inner.clientWidth
						};
					});
					expect(geometry.overflow).toBe(0);
					expect(geometry.note.top).toBeGreaterThanOrEqual(geometry.header.bottom + 8);
					expect(geometry.note.bottom).toBeLessThanOrEqual(
						Math.min(geometry.inner.bottom, height) - 8
					);
				}
			}
		});
	}
}
