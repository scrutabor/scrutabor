import { expect, test } from './fixtures';

const blood = 'pretiosissimi-sanguinis-domini-nostri-iesu-christi';
const sources = [
	{
		day: 'nativitas-domini-in-die',
		part: 'introitus',
		leaf: 99,
		locator: 'Christmas heading11/reference12',
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
		locator: 'Evangelium heading48, announcement49, scripture reference50; direct body51',
		dependencies: []
	},
	{
		day: blood,
		part: 'communio',
		leaf: 664,
		locator: 'Communio heading59, scripture reference60; direct body61',
		dependencies: []
	},
	{
		day: blood,
		part: 'evangelium',
		leaf: 664,
		locator: 'Evangelium heading46, announcement47, scripture reference48; direct body49',
		dependencies: []
	},
	{
		day: 'purificatio-beatae-mariae-virginis',
		part: 'collecta',
		leaf: 547,
		locator: 'Oratio heading164/body165/$Per eundem166',
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
		locator: 'Evangelium heading51, announcement52, scripture reference53; direct body54',
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
			await expect(notes).toContainText(source.locator);
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
					.filter({ hasText: source.locator })
					.locator(
						'a[href="https://github.com/DivinumOfficium/divinum-officium/commit/44667ff518b8ff1439780470828b39714f5306a2"]'
					)
			).toHaveCount(1);
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
		});
	}
}
