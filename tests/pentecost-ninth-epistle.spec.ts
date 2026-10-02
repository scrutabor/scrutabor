import { expect, setHelp, setTheme, test } from './fixtures';

const day = 'dominica-ix-post-pentecosten';
const text = `${day}-epistola`;
const wordId = (n: number) => `w${String(n).padStart(3, '0')}`;
const readings = {
	pl: 'Bracia | Nie | pożądajmy | złych rzeczy | jak | także | oni | pożądali | Ani | bałwochwalcami | nie stawajcie się | jak | niektórzy | z | nich | jak | napisane | jest | Usiadł | lud | aby jeść | i | pić | i | powstali | aby się bawić | Ani | nie dopuszczajmy się rozpusty | jak | niektórzy | z | nich | dopuścili się rozpusty | i | padło | jednego | dnia | dwadzieścia | trzy | tysiące | Ani | nie kuśmy | Chrystusa | jak | niektórzy | z nich | kusili | i | od | węży | poginęli | Ani | nie szemrajcie | jak | niektórzy | z nich | szemrali | i | poginęli | od | niszczyciela | To | zaś | wszystko | jako | figura | przydarzało się | im | napisane | zostało | zaś | ku | przestrodze | naszej | na | których | kresy | wieków | nadeszły | Przeto | kto | o sobie | mniema | że stoi | niech baczy | aby nie | upadł | Pokusa | was | niech nie ogarnie | inna niż | ludzka | Wierny | zaś | Bóg | jest | który | nie | dopuści | abyście byli kuszeni | ponad | to | co | możecie znieść | lecz | sprawi | także | z | pokusą | wyjście | abyście | mogli | wytrzymać',
	en: 'Brethren | Let us not lust after | evils | as | also | they | lusted | Nor | become idolaters | as | some | of | them | as | it is written | The people sat down | to eat | and | to drink | and | rose up | to play | Nor | let us commit fornication | as | some | of | them | committed fornication | and | there fell | in one | day | twenty | three | thousand | Nor | let us tempt | Christ | as | some | of them | tempted | and | by | the serpents | perished | Nor | murmur | as | some | of them | murmured | and | perished | by | the destroyer | These things | however | all | as | a type | happened | to them | they were written | however | for | our correction | upon | whom | the ends | of ages | have come | Therefore | he who | thinks he stands | let him take heed | lest | he fall | Let no temptation take hold of you | except | a human one | but God is faithful | who | will not permit | you | to be tempted | beyond | that | which | you can bear | but | will also bring about | with | the temptation | a favorable outcome | that | you may be able | to bear'
};

const constructions = {
	pl: [[103, 104, 104, 'abyście byli kuszeni', ['vos', 'tentári'], ['vos', 'tento']]],
	en: [
		[11, 12, 12, 'become idolaters', ['idolólatræ', 'efficiámini'], ['idololatres', 'efficio']],
		[18, 19, 19, 'it is written', ['scriptum', 'est'], ['scribo', 'sum']],
		[20, 21, 20, 'The people sat down', ['Sedit', 'pópulus'], ['sedeo', 'populus']],
		[71, 72, 71, 'they were written', ['scripta', 'sunt'], ['scribo', 'sum']],
		[75, 76, 75, 'our correction', ['correptiónem', 'nostram'], ['correptio', 'noster']],
		[84, 86, 85, 'thinks he stands', ['se', 'exístimat', 'stare'], ['sui', 'existimo', 'sto']],
		[
			90,
			93,
			93,
			'Let no temptation take hold of you',
			['Tentátio', 'vos', 'non', 'apprehéndat'],
			['tentatio', 'vos', 'non', 'apprehendo']
		],
		[
			96,
			99,
			99,
			'but God is faithful',
			['fidélis', 'autem', 'Deus', 'est'],
			['fidelis', 'autem', 'deus', 'sum']
		],
		[101, 102, 102, 'will not permit', ['non', 'patiétur'], ['non', 'patior']],
		[110, 111, 110, 'will also bring about', ['fáciet', 'étiam'], ['facio', 'etiam']]
	]
} as const;

for (const language of ['pl', 'en'] as const) {
	test(`${language} Pentecost IX Epistle keeps the complete reading and its dependencies`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${text}`);
		const expected = readings[language].split(' | ');
		expect(expected).toHaveLength(language === 'pl' ? 113 : 99);
		if (language === 'pl') {
			for (const [index, plain, displayed] of [
				[45, 'z nich', 'z\u00a0nich'],
				[55, 'z nich', 'z\u00a0nich'],
				[81, 'o sobie', 'o\u00a0sobie']
			] as const) {
				expect(expected[index]).toBe(plain);
				expected[index] = displayed;
			}
		}
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await expect(section.locator('.token')).toHaveCount(117);
			await expect(section.locator('rt')).toHaveText(expected);
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(section.locator('rt')).toHaveText(expected);
	});

	test(`${language} Pentecost IX Epistle identifies its direct source and localized role`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		const section = page.locator(`#text-proprium-${text}`);
		await expect(section.locator('.token').nth(81).locator('.base')).toHaveText('Ítaque');
		await section
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('.about-text')).toContainText(
			language === 'pl' ? 'Czytanie' : 'The Epistle'
		);
		await dialog.locator('details.source-notes summary').click();
		await expect(dialog).toContainText('Pent09-0');
		await expect(dialog).toContainText('complete direct body 28');
	});

	for (const [number, lemma, polish, english] of [
		[14, 'quidam', 'r. męski', 'masculine'],
		[31, 'quidam', 'r. męski', 'masculine'],
		[47, 'quidam', 'r. męski', 'masculine'],
		[57, 'quidam', 'r. męski', 'masculine'],
		[64, 'hic', 'r. nijaki', 'neuter'],
		[106, 'is', 'r. nijaki', 'neuter']
	] as const) {
		test(`${language} Pentecost IX ${wordId(number)} retains its contextual gender without approval`, async ({
			page
		}) => {
			await page.setViewportSize({ width: 320, height: 568 });
			await page.goto(`/app/${language}/formularium/${day}?w=${text}.${wordId(number)}`);
			await setTheme(page, 'dark');
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('.head > a')).toHaveAttribute(
				'href',
				`/app/${language}/lemma?l=${lemma}`
			);
			await expect(dialog.locator('.morph')).toContainText(language === 'pl' ? polish : english);
			await expect(dialog).toContainText(language === 'pl' ? 'do przeglądu' : 'awaiting review');
			expect(await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
				0
			);
		});
	}

	test(`${language} Pentecost IX constructions preserve all member cards and links`, async ({
		page
	}) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		await setHelp(page, 1);
		for (const [first, last, anchor, gloss, forms, lemmata] of constructions[language]) {
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
				await page.goto(`/app/${language}/formularium/${day}?w=${text}.${wordId(member)}`);
				const dialog = page.getByRole('dialog');
				await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
				await expect(dialog.locator('.construction-card h3')).toHaveText([...forms]);
				for (let index = 0; index < lemmata.length; index++) {
					await expect(
						dialog.locator('.construction-card').nth(index).locator('.head > a')
					).toHaveAttribute('href', `/app/${language}/lemma?l=${lemmata[index]}`);
				}
				await page.keyboard.press('Escape');
			}
		}
	});
}
