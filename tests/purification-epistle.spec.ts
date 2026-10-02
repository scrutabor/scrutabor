import { expect, setHelp, setTheme, test } from './fixtures';

const day = 'purificatio-beatae-mariae-virginis';
const text = `${day}-epistola`;
const readings = {
	pl: 'To | mówi | Pan | Bóg | Oto | ja | posyłam | Anioła | mego | i | przygotuje | drogę | przed | obliczem | moim | A | natychmiast | przyjdzie | do | świątyni | swojej | Władca | którego | wy | szukacie | i | Anioł | Przymierza | którego | wy | pragniecie | Oto | przychodzi | mówi | Pan | Zastępów | lecz | kto | zdoła | pojąć | dzień | przyjścia | Jego | i | kto | ostoi się | na | widok | Jego | On | bowiem | jak | ogień | topiący | i | jak | ziele | foluszników | i | usiądzie | topiąc | i | oczyszczając | srebro | i | oczyści | synów | Lewiego | i | przecedzi | ich | jak | złoto | i | jak | srebro | i | będą | Panu | składać | ofiary | w | sprawiedliwości | I | spodoba się | Panu | ofiara | Judy | i | Jeruzalem | jak | dni | dawnych czasów | i | jak | lata | starodawne | mówi | Pan | wszechmogący',
	en: 'Thus | says | the Lord | God | Behold | I | am sending | angel | My | and | shall prepare | the way | before | face | My | And | at once | will come | to | temple | His own | the Ruler | whom | you | seek | and | the Angel | of the Covenant | whom | you | desire | Behold | comes | says | the Lord | of hosts | and | who | will be able | to comprehend | the day | of the coming | His | and | who | will stand | to | see | Him | For He Himself is | like | fire | refining | and | like | herb | of fullers | and | will sit | refining | and | purifying | silver | and | will purify | the sons | of Levi | and | will refine | them | like | gold | and | like | silver | and | shall be | to the Lord | offering | sacrifices | in | justice | And | will please | the Lord | the sacrifice | of Judah | and | Jerusalem | as | the days | of old | and | as | years | ancient | says | the Lord | almighty'
} as const;

for (const language of ['pl', 'en'] as const) {
	test(`${language} Purification Epistle shows its reviewed interlinear reading`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		const expected = readings[language].split(' | ');
		expect(expected).toHaveLength(language === 'pl' ? 100 : 99);
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await expect(section.locator('.token')).toHaveCount(100);
			await expect(section.locator('rt')).toHaveText(expected);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(section.locator('rt')).toHaveText(expected);
	});

	test(`${language} Purification Epistle has a localized role and exact source`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		const section = page.locator(`#text-proprium-${text}`);
		await section
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.about-text')).toContainText(
			language === 'pl' ? 'Czytanie formularza' : 'The Epistle of the formulary'
		);
		await dialog.locator('details.source-notes summary').click();
		await expect(dialog).toContainText('466–467');
		await expect(dialog).toContainText('171');
		await expect(dialog).not.toContainText('inherited references');
	});
}
