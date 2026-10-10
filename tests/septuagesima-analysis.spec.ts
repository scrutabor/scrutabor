import { expect, setTheme, test } from './fixtures';

const day = 'dominica-in-septuagesima';
const observations = [
	{
		part: 'evangelium',
		word: 'w061',
		form: 'fúerit',
		pl: ['futurum exactum', 'tryb oznajmujący'],
		en: ['future perfect', 'indicative'],
		explanation: {
			pl: 'Przyszłe dabo sprzyja odczytaniu fúerit jako futurum exactum. Ta sama forma jest też perfectum trybu łączącego, dlatego wybór trybu pozostaje niepewny.',
			en: 'The future dabo supports a future-perfect reading of fúerit. The same form can also be perfect subjunctive, so the mood remains uncertain here.'
		}
	},
	{
		part: 'tractus',
		word: 'w021',
		form: 'observáveris',
		pl: ['futurum exactum', 'tryb oznajmujący'],
		en: ['future perfect', 'indicative'],
		explanation: {
			pl: 'Przyszłe sustinébit sprzyja odczytaniu observáveris jako futurum exactum. Ta sama forma jest też perfectum trybu łączącego, dlatego wybór trybu pozostaje niepewny.',
			en: 'The future sustinébit supports a future-perfect reading of observáveris. The same form can also be perfect subjunctive, so the mood remains uncertain here.'
		}
	},
	{
		part: 'evangelium',
		word: 'w179',
		form: 'æstus',
		pl: ['dopełniacz', 'l.\u00a0poj.'],
		en: ['genitive', 'singular'],
		explanation: {
			pl: 'Przyjęty genetivus liczby pojedynczej ujmuje æstus wraz z diei jako określenie pondus: ciężar dnia i upału. Ta sama postać może też być accusativus liczby mnogiej, skoordynowany z pondus jako drugi przedmiot portavimus. Wybór pozostaje niepewny.',
			en: 'The selected genitive singular takes æstus with diei as dependents of pondus: the burden of the day and of heat. The same form can also be accusative plural, coordinated with pondus as another object of portavimus. The choice remains uncertain.'
		}
	},
	{
		part: 'evangelium',
		word: 'w205',
		form: 'huic',
		pl: ['celownik', 'r.\u00a0męski'],
		en: ['dative', 'masculine'],
		explanation: {
			pl: 'Huic wskazuje na ostatniego robotnika, któremu gospodarz chce dać tyle samo co rozmówcy. Stąd rodzaj męski. Sama forma dopuszcza wszystkie trzy rodzaje i nie ustala tej relacji bez kontekstu.',
			en: 'Huic refers to the last worker whom the householder wants to pay the same as the person addressed. Hence masculine. The form itself permits all three genders and does not establish this reference without context.'
		}
	}
] as const;

for (const language of ['pl', 'en'] as const) {
	for (const item of observations) {
		test(`${language} Septuagesima ${item.part} ${item.word} preserves contextual uncertainty @reader`, async ({
			page
		}) => {
			await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
			for (const [width, theme] of [
				[320, 'dark'],
				[1280, 'light']
			] as const) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/formularium/${day}?w=${day}-${item.part}.${item.word}`);
				await setTheme(page, theme);
				const dialog = page.getByRole('dialog');
				const member = dialog.locator(`[aria-labelledby="construction-${item.word}-title"]`);
				const grouped = (await member.count()) !== 0;
				const card = grouped ? member : dialog;
				await expect(card.locator(grouped ? '.construction-title' : '.form')).toHaveText(item.form);
				for (const feature of item[language]) {
					await expect(card.locator('.morph')).toContainText(feature);
				}
				await expect(card.locator('.verification')).toContainText(
					language === 'pl' ? 'średnia' : 'medium'
				);
				await expect(card.locator('.verification')).toContainText(
					language === 'pl' ? 'do przeglądu' : 'awaiting review'
				);
				await expect(card.locator('.explanation')).toHaveText(item.explanation[language]);
				expect(
					await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
			}
		});
	}
}
