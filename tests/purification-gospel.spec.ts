import { expect, setHelp, setTheme, test } from './fixtures';

const day = 'purificatio-beatae-mariae-virginis';
const text = `${day}-evangelium`;
const wordId = (n: number) => `w${String(n).padStart(3, '0')}`;
const latin =
	'In illo témpore: Postquam impléti sunt dies purgatiónis Maríæ, secúndum legem Móysi, tulérunt Iesum in Ierúsalem, ut sísterent eum Dómino, sicut scriptum est in lege Dómini: Quia omne masculínum adapériens vulvam sanctum Dómino vocábitur. Et ut darent hóstiam secúndum quod dictum est in lege Dómini, par túrturum, aut duos pullos columbárum. Et ecce homo erat in Ierúsalem, cui nomen Símeon, et homo iste iustus et timorátus, exspéctans consolatiónem Israël, et Spíritus Sanctus erat in eo. Et respónsum accéperat a Spíritu Sancto, non visúrum se mortem, nisi prius vidéret Christum Dómini. Et venit in spíritu in templum. Et cum indúcerent púerum Iesum paréntes eius, ut fácerent secúndum consuetúdinem legis pro eo: et ipse accépit eum in ulnas suas, et benedíxit Deum, et dixit: Nunc dimíttis servum tuum, Dómine, secúndum verbum tuum in pace: Quia vidérunt óculi mei salutáre tuum: Quod parásti ante fáciem ómnium populórum: Lumen ad revelatiónem géntium, et glóriam plebis tuæ Israël.'.split(
		' '
	);
const readings = {
	pl: 'W | owym | czasie | gdy | wypełniły się | dni | oczyszczenia | Maryi | według | Prawa | Mojżeszowego | przynieśli | Jezusa | do | Jerozolimy | aby | przedstawić | Go | Panu | jak | napisano | w | Prawie | Pana | że | każde | dziecko płci męskiej | otwierające | łono | świętym | Panu | będzie nazwane | I | aby | złożyli | ofiarę | według | tego, co | powiedziano | w | Prawie | Pana | parę | synogarlic | albo | dwoje | piskląt | gołębi | A | oto | człowiek | był | w | Jerozolimie | któremu | imię | Symeon | i | człowiek | ten | sprawiedliwy | i | bogobojny | wyczekujący | pociechy | Izraela | i | Duch | Święty | był | w | nim | I | zapowiedź | otrzymał | od | Ducha | Świętego | że nie ujrzy | on | śmierci | jeśli nie | wcześniej | ujrzy | Chrystusa | Pańskiego | A | przybył | w | Duchu | do | świątyni | I | gdy | wnosili | Dzieciątko | Jezusa | rodzice | Jego | aby | postąpić | według | zwyczaju | Prawa | dla | Niego | także | on | wziął | Go | na | ramiona | swoje | i | błogosławił | Boga | i | rzekł | Teraz | uwalniasz | sługę | Twego | Panie | według | słowa | Twego | w | pokoju | Albowiem | ujrzały | oczy | moje | zbawienie | Twoje | Które | przygotowałeś | przed | obliczem | wszystkich | ludów | Światłość | ku | objawieniu | poganom | i | chwałę | ludu | Twego | Izraela',
	en: 'At | that | time | when | the days of Mary’s purification were fulfilled | according to | the Law | of Moses | they brought | Jesus | to | Jerusalem | to | present | Him | to the Lord | as | it is written | in | the Law | of the Lord | that | every | male | opening | the womb | shall be called holy to the Lord | And | to | offer | a sacrifice | according to | what | is said | in | the Law | of the Lord | a pair | of turtledoves | or | two | young | pigeons | And | behold | there was a man | in | Jerusalem | whose | name was | Simeon | and | this man | was just | and | devout | looking for | the consolation | of Israel | and | the Holy Spirit | was | in | him | And | he had received an answer | from | the Holy Spirit | that he would not see | death | unless | first | he saw | the Christ | of the Lord | And | he came | in | the Spirit | into | the temple | And | when | His parents were bringing in the Child Jesus | to | do | according to | the custom | of the Law | for | Him | also | he | received | Him | into | his arms | and | blessed | God | and | said | Now | You release | Your servant | Lord | according to | Your word | in | peace | For | my eyes have seen | Your salvation | which | You have prepared | before | the face | of all | peoples | a light | for | revelation | to the Gentiles | and | glory | of Your people | Israel'
};
type Construction = {
	first: number;
	anchor: number;
	gloss: string;
	forms: string[];
	lemmata: string[];
};
const constructions: Record<'pl' | 'en', Construction[]> = {
	pl: [
		{
			first: 5,
			anchor: 5,
			gloss: 'wypełniły się',
			forms: ['impléti', 'sunt'],
			lemmata: ['impleo', 'sum']
		},
		{
			first: 22,
			anchor: 22,
			gloss: 'napisano',
			forms: ['scriptum', 'est'],
			lemmata: ['scribo', 'sum']
		},
		{
			first: 41,
			anchor: 41,
			gloss: 'powiedziano',
			forms: ['dictum', 'est'],
			lemmata: ['dico', 'sum']
		},
		{
			first: 82,
			anchor: 83,
			gloss: 'że nie ujrzy',
			forms: ['non', 'visúrum'],
			lemmata: ['non', 'video']
		}
	],
	en: [
		{
			first: 5,
			anchor: 5,
			gloss: 'the days of Mary’s purification were fulfilled',
			forms: ['impléti', 'sunt', 'dies', 'purgatiónis', 'Maríæ'],
			lemmata: ['impleo', 'sum', 'dies', 'purgatio', 'Maria']
		},
		{
			first: 22,
			anchor: 22,
			gloss: 'it is written',
			forms: ['scriptum', 'est'],
			lemmata: ['scribo', 'sum']
		},
		{
			first: 32,
			anchor: 34,
			gloss: 'shall be called holy to the Lord',
			forms: ['sanctum', 'Dómino', 'vocábitur'],
			lemmata: ['sanctus', 'dominus', 'voco']
		},
		{ first: 41, anchor: 41, gloss: 'is said', forms: ['dictum', 'est'], lemmata: ['dico', 'sum'] },
		{
			first: 54,
			anchor: 55,
			gloss: 'there was a man',
			forms: ['homo', 'erat'],
			lemmata: ['homo', 'sum']
		},
		{
			first: 62,
			anchor: 62,
			gloss: 'this man',
			forms: ['homo', 'iste'],
			lemmata: ['homo', 'iste']
		},
		{
			first: 71,
			anchor: 71,
			gloss: 'the Holy Spirit',
			forms: ['Spíritus', 'Sanctus'],
			lemmata: ['spiritus', 'sanctus']
		},
		{
			first: 77,
			anchor: 78,
			gloss: 'he had received an answer',
			forms: ['respónsum', 'accéperat'],
			lemmata: ['responsum', 'accipio']
		},
		{
			first: 80,
			anchor: 80,
			gloss: 'the Holy Spirit',
			forms: ['Spíritu', 'Sancto'],
			lemmata: ['spiritus', 'sanctus']
		},
		{
			first: 82,
			anchor: 83,
			gloss: 'that he would not see',
			forms: ['non', 'visúrum', 'se'],
			lemmata: ['non', 'video', 'sui']
		},
		{
			first: 99,
			anchor: 99,
			gloss: 'His parents were bringing in the Child Jesus',
			forms: ['indúcerent', 'púerum', 'Iesum', 'paréntes', 'eius'],
			lemmata: ['induco', 'puer', 'Iesus', 'parens', 'is']
		},
		{
			first: 116,
			anchor: 116,
			gloss: 'his arms',
			forms: ['ulnas', 'suas'],
			lemmata: ['ulna', 'suus']
		},
		{
			first: 125,
			anchor: 125,
			gloss: 'Your servant',
			forms: ['servum', 'tuum'],
			lemmata: ['servus', 'tuus']
		},
		{
			first: 129,
			anchor: 129,
			gloss: 'Your word',
			forms: ['verbum', 'tuum'],
			lemmata: ['verbum', 'tuus']
		},
		{
			first: 134,
			anchor: 134,
			gloss: 'my eyes have seen',
			forms: ['vidérunt', 'óculi', 'mei'],
			lemmata: ['video', 'oculus', 'meus']
		},
		{
			first: 137,
			anchor: 137,
			gloss: 'Your salvation',
			forms: ['salutáre', 'tuum'],
			lemmata: ['salutare', 'tuus']
		},
		{
			first: 151,
			anchor: 151,
			gloss: 'of Your people',
			forms: ['plebis', 'tuæ'],
			lemmata: ['plebs', 'tuus']
		}
	]
};

for (const language of ['pl', 'en'] as const) {
	test(`${language} Purification Gospel retains the complete Latin and interlinear reading`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		const expected = readings[language].split(' | ');
		expect(latin).toHaveLength(153);
		expect(expected).toHaveLength(language === 'pl' ? 149 : 127);
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await expect(section.locator('.token .base')).toHaveText(latin);
			await expect(section.locator('rt')).toHaveText(expected);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(section.locator('.token .base')).toHaveText(latin);
		await expect(section.locator('rt')).toHaveText(expected);
	});

	test(`${language} Purification Gospel names its direct source and printed page`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		const section = page.locator(`#text-proprium-${text}`);
		await section
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.about-text')).toContainText(
			language === 'pl' ? 'Ewangelia formularza' : 'The Gospel of the formulary'
		);
		await dialog.locator('details.source-notes summary').click();
		await expect(dialog).toContainText('02-02');
		await expect(dialog).toContainText('193');
		await expect(dialog).toContainText('467');
		await expect(dialog.locator('a[href*="archive.org"]')).toHaveAttribute(
			'href',
			/\/page\/n548\//
		);
		await expect(dialog).not.toContainText('inherited references');
	});

	test(`${language} Purification Gospel prose makes its referents clear`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 2);
		const translation = page.locator(`#text-proprium-${text} .translation`);
		await expect(translation).toContainText(
			language === 'pl'
				? 'I przyszedł w Duchu do świątyni.'
				: 'a light for revelation to the Gentiles'
		);
		await expect(translation).not.toContainText(
			language === 'pl'
				? 'I przyszedł w duchu do świątyni.'
				: 'a light for the revelation of the Gentiles'
		);
	});

	test(`${language} Purification Gospel preserves the subordinate imperfect`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/${day}?w=${text}.w088`);
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.context-layer > .gloss')).toHaveText(
			language === 'pl' ? 'ujrzy' : 'he saw'
		);
		await expect(dialog.locator('.morph')).toContainText(
			language === 'pl' ? 'imperfectum' : 'imperfect'
		);
		await expect(dialog.locator('.morph')).toContainText(
			language === 'pl' ? 'tryb łączący' : 'subjunctive'
		);
		await expect(dialog.locator('.head > a')).toHaveAttribute(
			'href',
			`/app/${language}/lemma?l=video`
		);
	});

	test(`${language} Purification Gospel distinguishes the relative subject from preposition government`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${day}?w=${text}.w040`);
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.context-layer > .gloss')).toHaveText(
			language === 'pl' ? 'tego, co' : 'what'
		);
		await expect(dialog.locator('.morph')).toContainText(
			language === 'pl' ? 'mianownik' : 'nominative'
		);
		await expect(dialog.locator('.morph')).not.toContainText(
			language === 'pl' ? 'biernik' : 'accusative'
		);
		await expect(dialog.locator('.head > a')).toHaveAttribute(
			'href',
			`/app/${language}/lemma?l=qui`
		);
	});

	for (const { first, anchor, gloss, forms, lemmata } of constructions[language]) {
		test(`${language} Purification Gospel construction ${wordId(first)} preserves every word and link`, async ({
			page
		}) => {
			await page.setViewportSize({ width: 320, height: 568 });
			await page.goto(`/app/${language}/formularium/${day}`);
			await setHelp(page, 1);
			await setTheme(page, 'dark');
			const button = page.locator(`button[id="${text}.${wordId(anchor)}"]`);
			await expect(button.locator('rt')).toHaveText(gloss);
			await expect(button.locator('.token')).toHaveCount(forms.length);
			await button.scrollIntoViewIfNeeded();
			const before = await button.boundingBox();
			await button.hover();
			expect(await button.boundingBox()).toEqual(before);
			await button.focus();
			await button.press('Enter');
			await expect(page.getByRole('dialog').locator('.construction-title')).toHaveText(forms);
			await page.keyboard.press('Escape');
			for (let offset = 0; offset < forms.length; offset++) {
				await page.goto(`/app/${language}/formularium/${day}?w=${text}.${wordId(first + offset)}`);
				const dialog = page.getByRole('dialog');
				await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
				await expect(dialog.locator('.construction-card h3')).toHaveText(forms);
				for (let i = 0; i < lemmata.length; i++) {
					await expect(
						dialog.locator('.construction-card').nth(i).locator('.head > a')
					).toHaveAttribute('href', `/app/${language}/lemma?l=${lemmata[i]}`);
				}
				if (anchor === 83) {
					const participle = dialog
						.locator('.construction-card')
						.filter({ has: page.getByRole('heading', { name: 'visúrum', exact: true }) });
					await expect(participle.locator('.morph')).toContainText(
						language === 'pl' ? 'czas przyszły' : 'future'
					);
					await expect(participle.locator('.morph')).toContainText(
						language === 'pl' ? 'biernik' : 'accusative'
					);
				}
				expect(
					await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)
				).toBe(0);
				await page.keyboard.press('Escape');
			}
		});
	}
}
