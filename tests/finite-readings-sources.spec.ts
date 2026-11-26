import { expect, test } from './fixtures';
import { expectSourcePassage } from './source-passage';

const blood = 'pretiosissimi-sanguinis-domini-nostri-iesu-christi';
const sources = [
	{
		day: 'nativitas-domini-in-die',
		part: 'introitus',
		leaf: 99,
		passages: [
			['Introitus', 'Missa/Sancti/12-25m3.txt', 11, 12],
			['Introitus', 'Missa/Tempora/Nat30.txt', 16, 22],
			['Gloria', 'Missa/Ordo/Prayers.txt', 12, 14]
		],
		printedNotes: ['Ordo Missae: Gloria Patri', 'Rubricae generales 427']
	},
	{
		day: 'nativitas-sancti-ioannis-baptistae',
		part: 'evangelium',
		leaf: 653,
		passages: [['Evangelium', 'Missa/Sancti/06-24.txt', 51, 51]],
		printedNotes: []
	},
	{
		day: blood,
		part: 'communio',
		leaf: 664,
		passages: [['Communio', 'Missa/Sancti/07-01.txt', 59, 61]],
		printedNotes: []
	},
	{
		day: blood,
		part: 'evangelium',
		leaf: 664,
		passages: [['Evangelium', 'Missa/Sancti/07-01.txt', 49, 49]],
		printedNotes: []
	},
	{
		day: 'purificatio-beatae-mariae-virginis',
		part: 'collecta',
		leaf: 547,
		passages: [
			['Oratio', 'Missa/Sancti/02-02.txt', 164, 166],
			['Per eundem', 'Missa/Ordo/Prayers.txt', 111, 113]
		],
		printedNotes: ['Rubricae generales 115 a', 'Rubricae generales 115 b']
	},
	{
		day: 'sacratissimi-cordis-iesu',
		part: 'evangelium',
		leaf: 455,
		passages: [['Evangelium', 'Missa/Tempora/Pent02-5.txt', 54, 54]],
		printedNotes: []
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
			for (const [heading, file, first, last] of source.passages) {
				await expectSourcePassage(notes, language, heading, file, first, last);
			}
			for (const dependency of source.printedNotes) {
				await expect(notes).toContainText(dependency);
			}
			await expect(
				notes.locator(
					`a[href="https://archive.org/details/missale-romanum-1962/page/n${source.leaf}/mode/1up"]`
				)
			).toHaveCount(1);
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
		});
	}
}
