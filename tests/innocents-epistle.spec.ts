import { expect, setHelp, setTheme, test } from './fixtures';

const day = 'sanctorum-innocentium-martyrum';
const text = `${day}-epistola`;
const wordId = (n: number) => `w${String(n).padStart(3, '0')}`;
const readings = {
	pl: `W | dniach | owych | ujrzałem | na | górze | Syjon | Baranka | stojącego | i | z | Nim | sto | czterdzieści | cztery | tysiące | mających | imię | Jego | i | imię | Ojca | Jego | napisane | na | czołach | swoich | I | usłyszałem | głos | z | nieba | niby | głos | wód | wielu | i | niby | głos | gromu | wielkiego | i | głos | który | usłyszałem | jak | cytrzystów | grających | na | cytrach | swoich | A | śpiewali | jakby | pieśń | nową | przed | tronem | i | przed | czterema | zwierzętami | i | starszymi | i | nikt | nie mógł | śpiewać | pieśni | tylko | owe | sto | czterdzieści | cztery | tysiące | którzy | wykupieni | zostali | z | ziemi | Ci | są | którzy | z | kobietami | nie | zostali | splamieni | dziewicami | bowiem | są | Ci | podążają | za Barankiem | dokądkolwiek | pójdzie | Ci | wykupieni | zostali | spośród | ludzi | jako pierwociny | Bogu | i | Barankowi | i | w | ustach | ich | nie | zostało | znalezione | kłamstwo | bez | skazy | bowiem | są | przed | tronem | Boga`,
	en: `In | those days | I saw | upon | Mount | Sion | the Lamb | standing | and | with | Him | one hundred | forty | four | thousand | having | His name | and | the name | of His Father | written | on | their foreheads | And | I heard | a voice | from | heaven | like | the voice | of many waters | and | like | the voice | of loud thunder | and | the voice | which | I heard | was like that | of harpers | playing | on | their harps | And | they were singing | as it were | a new song | before | the throne | and | before | four | living creatures | and | the elders | and | no one | could | sing | the song | except | those | one hundred | forty | four | thousand | who | have been purchased | from | the earth | These | are | those who | with | women | have not been defiled | for they are virgins | These | follow | the Lamb | wherever | He goes | These | were purchased | from among | men | firstfruits | to God | and | to the Lamb | and | in | their mouth | was not found | a lie | for they are without blemish | before | the throne | of God`
};

const constructions = [
	[18, 19, 18, 'His name', ['nomen', 'eius'], ['nomen', 'is']],
	[22, 23, 22, 'of His Father', ['Patris', 'eius'], ['pater', 'is']],
	[26, 27, 26, 'their foreheads', ['fróntibus', 'suis'], ['frons', 'suus']],
	[35, 36, 35, 'of many waters', ['aquárum', 'multárum'], ['aqua', 'multus']],
	[40, 41, 40, 'of loud thunder', ['tonítrui', 'magni'], ['tonitruum', 'magnus']],
	[50, 51, 50, 'their harps', ['cítharis', 'suis'], ['cithara', 'suus']],
	[55, 56, 55, 'a new song', ['cánticum', 'novum'], ['canticum', 'novus']],
	[77, 78, 77, 'have been purchased', ['empti', 'sunt'], ['emo', 'sum']],
	[98, 99, 98, 'were purchased', ['empti', 'sunt'], ['emo', 'sum']],
	[108, 109, 108, 'their mouth', ['ore', 'eórum'], ['os', 'is']],
	[110, 112, 112, 'was not found', ['non', 'est', 'invéntum'], ['non', 'sum', 'invenio']]
] as const;

for (const language of ['pl', 'en'] as const) {
	test(`${language} Innocents Epistle keeps the complete interlinear sequence`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		const expected = readings[language].split(' | ');
		expect(expected).toHaveLength(language === 'pl' ? 120 : 100);
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await expect(section.locator('.token')).toHaveCount(120);
			await expect(section.locator('rt')).toHaveText(expected);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		await section
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.about-text')).toContainText(
			language === 'pl' ? 'Czytanie' : 'Epistle'
		);
		await dialog.locator('details.source-notes summary').click();
		await expect(dialog).toContainText('12-28');
		await expect(dialog).not.toContainText('inherited references');
		await page.keyboard.press('Escape');
		await page.emulateMedia({ media: 'print' });
		await expect(section.locator('rt')).toHaveText(expected);
	});

	test(`${language} Innocents male virgins keep the contextual analysis and explanation`, async ({
		page
	}) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto(`/app/${language}/formularium/${day}?w=${text}.w089`);
		await setTheme(page, 'dark');
		const dialog = page.getByRole('dialog');
		const card =
			language === 'pl'
				? dialog
				: dialog
						.locator('.construction-card')
						.filter({ has: page.getByRole('heading', { name: 'vírgines', exact: true }) });
		await expect(card.locator('.head > a')).toHaveAttribute(
			'href',
			`/app/${language}/lemma?l=virgo`
		);
		await expect(card.locator('.morph')).toHaveText(
			language === 'pl'
				? 'rzeczownik — mianownik, l. mn., r. męski, deklinacja III'
				: 'noun — nominative, plural, masculine, 3rd declension'
		);
		await expect(card).toContainText(
			language === 'pl'
				? 'Tutaj vírgines odnosi się do mężczyzn zachowujących dziewictwo.'
				: 'Here virgines refers to men who remain virgins.'
		);
		await expect(card).toContainText(language === 'pl' ? 'zwykle żeński' : 'usually feminine');
		expect(await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
			0
		);
	});
}

test('English Innocents Epistle constructions keep every member and deep link', async ({
	page
}) => {
	await page.goto(`/app/en/formularium/${day}`);
	await setHelp(page, 1);
	for (const [first, last, anchor, gloss, forms, lemmata] of constructions) {
		const button = page.locator(`button[id="${text}.${wordId(anchor)}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('.token')).toHaveCount(forms.length);
		await button.scrollIntoViewIfNeeded();
		const before = await button.boundingBox();
		await button.hover();
		expect(await button.boundingBox()).toEqual(before);
		await button.focus();
		await button.press('Enter');
		await expect(page.getByRole('dialog').locator('.construction-title')).toHaveText([...forms]);
		await page.keyboard.press('Escape');
		for (let member = first; member <= last; member++) {
			await page.goto(`/app/en/formularium/${day}?w=${text}.${wordId(member)}`);
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
			await expect(dialog.locator('.construction-card h3')).toHaveText([...forms]);
			const cards = dialog.locator('.construction-card');
			for (let index = 0; index < lemmata.length; index++) {
				await expect(cards.nth(index).locator('.head > a')).toHaveAttribute(
					'href',
					`/app/en/lemma?l=${lemmata[index]}`
				);
			}
			await page.keyboard.press('Escape');
		}
	}
});
