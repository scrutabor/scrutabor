import { expect, test } from './fixtures';

const blood = 'pretiosissimi-sanguinis-domini-nostri-iesu-christi';
const sources = [
	{
		day: 'nativitas-domini-in-die',
		part: 'introitus',
		leaf: 99,
		locator: {
			pl: 'nagłówek Narodzenia Pańskiego w w. 11 i odsyłacz w w. 12',
			en: 'Christmas heading 11/reference 12'
		},
		dependencies: [
			'Latin/Tempora/Nat30.txt [Introitus]',
			'Latin/Ordo/Prayers.txt [Gloria]',
			'Ordo Missae: Gloria Patri',
			'Rubricae generales 427'
		]
	},
	{
		day: 'nativitas-sancti-ioannis-baptistae',
		part: 'evangelium',
		leaf: 653,
		locator: {
			pl: 'nagłówek Evangelium w w. 48, zapowiedź w w. 49 i odsyłacz biblijny w w. 50; tekst bezpośrednio w w. 51',
			en: 'Evangelium heading 48, announcement 49, scripture reference 50; direct body 51'
		},
		dependencies: []
	},
	{
		day: blood,
		part: 'communio',
		leaf: 664,
		locator: {
			pl: 'nagłówek Communio w w. 59 i odsyłacz biblijny w w. 60; tekst bezpośrednio w w. 61',
			en: 'Communio heading 59, scripture reference 60; direct body 61'
		},
		dependencies: []
	},
	{
		day: blood,
		part: 'evangelium',
		leaf: 664,
		locator: {
			pl: 'nagłówek Evangelium w w. 46, zapowiedź w w. 47 i odsyłacz biblijny w w. 48; tekst bezpośrednio w w. 49',
			en: 'Evangelium heading 46, announcement 47, scripture reference 48; text in line 49'
		},
		dependencies: []
	},
	{
		day: 'purificatio-beatae-mariae-virginis',
		part: 'collecta',
		leaf: 547,
		locator: {
			pl: 'nagłówek Oratio w w. 164, tekst w w. 165, $Per eundem w w. 166',
			en: 'Oratio heading 164/body 165/$Per eundem on line 166'
		},
		dependencies: [
			'Latin/Ordo/Prayers.txt [Per eundem]',
			'Rubricae generales 115 a',
			'Rubricae generales 115 b'
		]
	},
	{
		day: 'sacratissimi-cordis-iesu',
		part: 'evangelium',
		leaf: 455,
		locator: {
			pl: 'nagłówek Evangelium w w. 51, zapowiedź w w. 52 i odsyłacz biblijny w w. 53; tekst bezpośrednio w w. 54',
			en: 'Evangelium heading 51, announcement 52, scripture reference 53; text in line 54'
		},
		dependencies: []
	}
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const source of sources) {
		test(`${language} ${source.day} ${source.part} identifies direct and expanded sources`, async ({
			page
		}) => {
			await page.goto(`/app/${language}/formularium/${source.day}`);
			const section = page.locator(`#text-proprium-${source.day}-${source.part}`);
			await section
				.getByRole('button', {
					name: language === 'pl' ? 'o modlitwie' : 'about this prayer'
				})
				.click();
			const dialog = page.getByRole('dialog');
			const notes = dialog.locator('details.source-notes');
			await notes.locator('summary').click();
			await expect(notes).toContainText(source.locator[language]);
			for (const dependency of source.dependencies) {
				await expect(notes).toContainText(dependency);
			}
			await expect(
				notes.locator(
					`a[href="https://archive.org/details/missale-romanum-1962/page/n${source.leaf}/mode/1up"]`
				)
			).toHaveCount(1);
			await expect(
				notes
					.locator('li')
					.filter({ hasText: source.locator[language] })
					.locator(
						'a[href="https://github.com/DivinumOfficium/divinum-officium/commit/44667ff518b8ff1439780470828b39714f5306a2"]'
					)
			).toHaveCount(1);
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
		});
	}
}
