import { expect, test } from './fixtures';

const secrets = [
	{
		formulary: 'dominica-i-adventus',
		choice: 'dies=2026-11-29',
		body: 's01',
		tail: 's02',
		response: 's03',
		tailWords: ['w031', 'w032', 'w033', 'w034'],
		amenWord: 'w035',
		verseIds: ['s01', 's02', 's03']
	},
	{
		formulary: 'corporis-christi',
		choice: 'dies=2026-06-04',
		body: 's01',
		tail: 's02',
		response: 's03',
		tailWords: ['w034', 'w035', 'w036', 'w037'],
		amenWord: 'w038',
		verseIds: ['s01', 's02', 's03']
	},
	{
		formulary: 'annuntiatio-beatae-mariae-virginis',
		choice: 'dies=2026-03-25',
		body: 's01',
		tail: 's02',
		response: 's03',
		tailWords: ['w048', 'w049', 'w050', 'w051'],
		amenWord: 'w052',
		verseIds: ['s01', 's02', 's03']
	},
	{
		formulary: 'nativitas-domini-in-aurora',
		// Christmas has several Masses: a date alone selects the Night Mass.
		choice: 'dies=2026-12-25&missa=nativitas-domini-in-aurora',
		body: 's03',
		tail: 's04',
		response: 's05',
		tailWords: ['w091', 'w092', 'w093', 'w094'],
		amenWord: 'w095',
		verseIds: ['s01', 's03', 's04', 's05'],
		nonfinalAmen: 'w054'
	}
] as const;

for (const secret of secrets) {
	for (const surface of ['ordo', 'formulary'] as const) {
		test(`${secret.formulary}: the final secret and public Amen remain visible in the ${surface}`, async ({
			page
		}) => {
			const slug = `${secret.formulary}-secreta`;
			await page.setViewportSize({ width: 390, height: 844 });
			await page.goto(
				surface === 'ordo'
					? `/app/en/ordo/offertorium?${secret.choice}`
					: `/app/en/formularium/${secret.formulary}`
			);
			await page.getByRole('radio', { name: 'faithful', exact: true }).click();
			const tail = page.locator(`[id="${slug}-${secret.tail}"]`);
			const response = page.locator(`[id="${slug}-${secret.response}"]`);
			const part = page
				.locator(surface === 'ordo' ? '.part' : '.proper-part')
				.filter({ has: tail });
			await expect(part).toHaveCount(1);
			await expect(part).not.toHaveClass(/folded/);
			await expect(part.locator('.unfold')).toHaveCount(0);

			for (const form of ['low', 'sung'] as const) {
				await page
					.getByRole('radiogroup', { name: 'Mass', exact: true })
					.getByRole('radio', { name: new RegExp(`${form}$`) })
					.click();
				await expect(part.locator('.verse')).toHaveCount(secret.verseIds.length);
				for (const id of secret.verseIds) {
					await expect(page.locator(`[id="${slug}-${id}"]`)).toBeVisible();
				}
				await expect(page.locator(`[id="${slug}-${secret.body}"]`)).toHaveClass(/quiet/);
				await expect(tail).not.toHaveClass(/quiet|answer/);
				await expect(tail.locator('.base')).toHaveText(['per', 'ómnia', 'sǽcula', 'sæculórum.']);
				const tailVoice = part.locator(`.who:has(+ [id="${slug}-${secret.tail}"]) .who-voice`);
				if (form === 'sung') await expect(tailVoice).toHaveText('sung');
				else await expect(tailVoice).toHaveCount(0);
				for (const id of secret.tailWords) {
					await expect(tail.locator(`[id="${slug}.${id}"]`)).toHaveCount(1);
				}
				await expect(response).toHaveClass(/answer/);
				await expect(response).not.toHaveClass(/quiet/);
				await expect(response.locator('.base')).toHaveText(['Amen.']);
				await expect(response.locator(`[id="${slug}.${secret.amenWord}"]`)).toHaveCount(1);
				await expect(response.locator('.mark')).toHaveText('R.');
				await expect(part.locator('.verse.answer')).toHaveCount(1);
				const attribution = part.locator(`.who:has(+ [id="${slug}-${secret.response}"])`);
				await expect(attribution.locator('.who-name')).toHaveText(
					form === 'sung' ? 'choir and faithful' : 'server and faithful'
				);
				await expect(attribution.locator('.who-all')).toHaveText('everyone answers');
				if ('nonfinalAmen' in secret) {
					const nonfinal = page.locator(`[id="${slug}-s01"]`);
					await expect(nonfinal).toHaveClass(/quiet/);
					await expect(nonfinal).not.toHaveClass(/answer/);
					await expect(nonfinal.locator(`[id="${slug}.${secret.nonfinalAmen}"]`)).toBeVisible();
				}
			}
		});
	}
}
