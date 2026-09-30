import { expect, setHelp, test } from './fixtures';

const text = 'dominica-ii-passionis-evangelium';
const denials = [
	{
		first: 'w598',
		verb: 'w599',
		form: 'novi',
		english: 'I do not know',
		polish: 'znam',
		enNote: 'Novi is a perfect form with present meaning here: Peter denies knowing Jesus.',
		plNote:
			'Choć „novi” ma formę czasu przeszłego (perfectum), oznacza tu „znam”. Piotr zaprzecza, że zna Jezusa.'
	},
	{
		first: 'w629',
		verb: 'w630',
		form: 'novísset',
		english: 'he did not know',
		polish: 'zna',
		enNote:
			'Novisset is a pluperfect subjunctive form. Here it reports Peter’s claim that he did not know Jesus.',
		plNote:
			'„Novisset” jest formą czasu zaprzeszłego trybu łączącego. W mowie zależnej oddaje zapewnienie Piotra, że nie zna Jezusa, a nie przypuszczenie.'
	}
] as const;

for (const denial of denials) {
	for (const language of ['pl', 'en'] as const) {
		test(`${language} Peter's denial ${denial.verb} keeps its contextual meaning and help`, async ({
			page
		}) => {
			const route = `/app/${language}/formularium/dominica-ii-passionis`;
			await page.goto(route);
			await setHelp(page, 1);
			const anchor = language === 'en' ? denial.first : denial.verb;
			const button = page.locator(`button[id="${text}.${anchor}"]`);
			await expect(button.locator('rt')).toHaveText(
				language === 'en' ? denial.english : denial.polish
			);
			if (language === 'pl') {
				await expect(page.locator(`button[id="${text}.${denial.first}"] rt`)).toHaveText('nie');
			}
			await button.click();
			await expect(page.locator('aside .explanation')).toHaveText(
				language === 'en' ? denial.enNote : denial.plNote
			);
			if (language === 'en') {
				await expect(page.locator('aside .construction-title')).toHaveText(['non', denial.form]);
				await expect(page.locator('aside .construction-card .morph')).toHaveCount(2);
			} else {
				await expect(page.locator('aside .form')).toHaveText(denial.form);
				await expect(page.locator('aside .morph')).toHaveCount(1);
			}
			await page.keyboard.press('Escape');
			await expect(page.locator('aside')).toHaveCount(0);
			await page.goto(`${route}?w=${text}.${denial.verb}`);
			await expect(page.locator('aside .explanation')).toHaveText(
				language === 'en' ? denial.enNote : denial.plNote
			);
		});
	}
}
