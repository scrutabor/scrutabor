import { expect, setHelp, setTheme, test } from './fixtures';

const day = 'purificatio-beatae-mariae-virginis';
const introit = 'dominica-viii-post-pentecosten-introitus';
const wordId = (n: number) => `w${String(n).padStart(3, '0')}`;
const split = (text: string) => text.split(' | ');

const shared = {
	pl: 'Przyjęliśmy | Boże | miłosierdzie | Twoje | w | środku | świątyni | Twojej | według | imienia | Twego | Boże | tak | i | chwała | Twoja | aż po | krańce | ziemi',
	en: 'We have received | God | Your mercy | in | the midst | of Your temple | according to | Your name | God | so | also | Your praise | to | the ends | of the earth'
};
const readings = {
	graduale: {
		pl: `${shared.pl} | Jak | słyszeliśmy | tak | i | ujrzeliśmy | w | mieście | Boga | naszego | na | górze | świętej | Jego`,
		en: `${shared.en} | As | we have heard | so | also | we have seen | in | the city | of our God | on | His holy mountain`
	},
	alleluia: {
		pl: 'Alleluja | alleluja | Starzec | Dziecię | niósł | Dziecię | zaś | starcem | rządziło | Alleluja',
		en: 'Alleluia | alleluia | The old man | was carrying the Child | the Child | however | was ruling the old man | Alleluia'
	},
	offertorium: {
		pl: 'Rozlana | została | łaska | na | wargach | twoich | dlatego | pobłogosławił | ciebie | Bóg | na | wieki | i | na | wieki | wieków',
		en: 'Grace has been poured out | upon | your lips | therefore | God has blessed you | for | ever | and | for | ever | and ever'
	}
} as const;
const introitAntiphon = {
	pl: `${shared.pl} | sprawiedliwości | pełna | jest | prawica | Twoja`,
	en: `${shared.en} | full of justice | is | Your right hand`
};
const labels = {
	pl: {
		graduale: 'Graduał formularza',
		alleluia: 'Alleluja formularza',
		offertorium: 'Offertorium formularza'
	},
	en: { graduale: 'The Gradual of', alleluia: 'The Alleluia of', offertorium: 'The Offertory of' }
} as const;

for (const language of ['pl', 'en'] as const) {
	for (const part of ['graduale', 'alleluia', 'offertorium'] as const) {
		test(`${language} Purification ${part} shows its reviewed interlinear reading`, async ({
			page
		}) => {
			// The Alleluia is replaced by the Tract after Septuagesima; the
			// undated formulary page shows every component.
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			await page.goto(`/app/${language}/formularium/${day}`);
			await setHelp(page, 1);
			const section = page.locator(`#text-proprium-${day}-${part}`);
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await setTheme(page, theme);
				await expect(section.locator('rt')).toHaveText(split(readings[part][language]));
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
			await page.emulateMedia({ media: 'print' });
			await expect(section.locator('rt')).toHaveText(split(readings[part][language]));
		});

		test(`${language} Purification ${part} has a localized role and exact source`, async ({
			page
		}) => {
			await page.goto(`/app/${language}/formularium/${day}`);
			const section = page.locator(`#text-proprium-${day}-${part}`);
			await section
				.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
				.click();
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('.about-text')).toContainText(labels[language][part]);
			await dialog.locator('details.source-notes summary').click();
			await expect(dialog).toContainText('467');
			await expect(dialog).not.toContainText('inherited references');
			await expect(dialog).not.toContainText('[Allelúia]');
			if (part !== 'offertorium') {
				await expect(dialog).toContainText(part === 'graduale' ? '175–176' : '177–178');
			}
		});
	}

	test(`${language} Introit repeats the Gradual sentence with the same reading`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/dominica-viii-post-pentecosten`);
		await setHelp(page, 1);
		const glosses = page.locator(`#text-proprium-${introit} rt`);
		const all = await glosses.allTextContents();
		const antiphon = split(introitAntiphon[language]);
		expect(all.slice(0, antiphon.length)).toEqual(antiphon);
		expect(all.slice(-antiphon.length)).toEqual(antiphon);
	});

	test(`${language} Offertory explains its addressee`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/${day}?w=${day}-offertorium.w009`);
		const dialog = page.getByRole('dialog');
		await expect(dialog).toContainText(language === 'pl' ? 'o Maryi' : 'of Mary');
		await expect(dialog).toContainText('Elégit eam');
	});
}

// A construction button carries its anchor's id: the verb of each agency group.
for (const [anchor, count, gloss] of [
	[5, 2, 'was carrying the Child'],
	[9, 2, 'was ruling the old man']
] as const) {
	test(`English Purification Alleluia keeps the agency of ${wordId(anchor)}`, async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto(`/app/en/formularium/${day}`);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${day}-alleluia.${wordId(anchor)}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('.token')).toHaveCount(count);
	});
}

test('English Purification Offertory keeps God as the one who blesses', async ({ page }) => {
	await page.goto(`/app/en/formularium/${day}`);
	await setHelp(page, 1);
	const button = page.locator(`button[id="${day}-offertorium.w008"]`);
	await expect(button.locator('rt')).toHaveText('God has blessed you');
	await expect(button.locator('.token')).toHaveCount(3);
});
