import { expect, setHelp, setTheme, test } from './fixtures';

const day = 'annuntiatio-beatae-mariae-virginis';
const text = `${day}-epistola`;
const wordId = (n: number) => `w${String(n).padStart(3, '0')}`;
const groups = [
	[2, 3, 2, 'those days', ['diébus', 'illis']],
	[4, 6, 4, 'the Lord spoke', ['Locútus', 'est', 'Dóminus']],
	[10, 12, 10, 'ask for a sign for yourself', ['Pete', 'tibi', 'signum']],
	[15, 16, 15, 'your God', ['Deo', 'tuo']],
	[25, 26, 25, 'Achaz said', ['dixit', 'Achaz']],
	[27, 28, 28, 'I will not ask', ['Non', 'petam']],
	[30, 31, 31, 'I will not test', ['non', 'tentábo']],
	[39, 42, 42, 'is it too little for you', ['Numquid', 'parum', 'vobis', 'est']],
	[43, 44, 43, 'to be troublesome', ['moléstos', 'esse']],
	[47, 48, 47, 'you are troublesome', ['molésti', 'estis']],
	[50, 51, 50, 'to my God', ['Deo', 'meo']],
	[54, 56, 54, 'the Lord Himself will give', ['dabit', 'Dóminus', 'ipse']],
	[66, 68, 66, 'His name will be called', ['vocábitur', 'nomen', 'eius']]
] as const;

for (const [first, last, anchor, gloss, forms] of groups) {
	test(`English Annunciation ${wordId(anchor)} preserves one complete construction`, async ({
		page
	}) => {
		const route = `/app/en/formularium/${day}`;
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.goto(route);
		await setHelp(page, 1);
		const button = page.locator(`button[id="${text}.${wordId(anchor)}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('.token')).toHaveCount(forms.length);
		for (let member = first; member <= last; member++) {
			if (member !== anchor)
				await expect(page.locator(`button[id="${text}.${wordId(member)}"]`)).toHaveCount(0);
		}
		for (const [width, theme] of [
			[320, 'dark'],
			[1280, 'light']
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await setTheme(page, theme);
			await button.scrollIntoViewIfNeeded();
			const before = await button.boundingBox();
			await button.hover();
			expect(await button.boundingBox()).toEqual(before);
			await button.focus();
			await button.press('Enter');
			const dialog = page.getByRole('dialog');
			await expect(dialog.locator('header .form')).toHaveText(forms.join(' '));
			await expect(dialog.locator('.construction-title')).toHaveText([...forms]);
			await expect(dialog.locator('.construction-card .morph')).toHaveCount(forms.length);
			await expect(dialog.locator('.context-layer > .gloss')).toHaveText(gloss);
			expect(await dialog.locator('.inner').evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(
				0
			);
			await page.keyboard.press('Escape');
			expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		}
		await page.emulateMedia({ media: 'print' });
		await expect(button.locator('rt')).toBeVisible();
		await page.emulateMedia({ media: 'screen' });
		for (let member = first; member <= last; member++) {
			await page.goto(`${route}?w=${text}.${wordId(member)}`);
			await expect(page.getByRole('dialog').locator('header .form')).toHaveText(forms.join(' '));
			await expect(page.locator('aside .construction-title')).toHaveText([...forms]);
		}
	});
}

for (const language of ['pl', 'en'] as const) {
	const route = `/app/${language}/formularium/${day}`;
	test(`${language} Annunciation retains all eighty Latin words and contextual glosses`, async ({
		page
	}) => {
		await page.goto(route);
		await setHelp(page, 1);
		const reading = page.locator(`#text-proprium-${text}`);
		await expect(reading.locator('.token')).toHaveCount(80);
		await expect(reading.locator('rt')).toHaveCount(language === 'pl' ? 77 : 61);
		const glosses: readonly (readonly [number, string])[] =
			language === 'pl'
				? [
						[12, 'o znak'],
						[18, 'głębi'],
						[21, 'na'],
						[22, 'wysokości'],
						[37, 'domu'],
						[46, 'że'],
						[73, 'będzie jadł'],
						[76, 'odrzucić']
					]
				: [
						[17, 'in'],
						[18, 'the depth'],
						[19, 'of hell'],
						[21, 'in'],
						[22, 'the height'],
						[34, 'he said'],
						[38, 'of David'],
						[57, 'you'],
						[58, 'a sign'],
						[60, 'a virgin'],
						[73, 'He will eat'],
						[75, 'He may know how']
					];
		for (const [number, gloss] of glosses) {
			await expect(reading.locator(`button[id="${text}.${wordId(number)}"] rt`)).toHaveText(gloss);
		}
		await expect(reading.locator('.token').last()).toContainText('bonum');
	});

	test(`${language} Annunciation explains the accusative predicate without inventing a noun`, async ({
		page
	}) => {
		await page.goto(`${route}?w=${text}.w044`);
		const dialog = page.getByRole('dialog');
		await expect(dialog.locator('header .form')).toHaveText('moléstos esse');
		const card = dialog
			.locator('.construction-card')
			.filter({ has: page.locator('h3', { hasText: /^moléstos$/ }) });
		await expect(card.locator('.morph')).toContainText(
			language === 'pl' ? 'biernik' : 'accusative'
		);
		await expect(card.locator('.explanation')).toContainText(
			language === 'pl'
				? 'Domyślnym podmiotem jest vos (wy)'
				: 'Its understood subject is vos (you)'
		);
		await expect(card.locator('.verification')).toContainText(
			language === 'pl' ? 'do przeglądu' : 'awaiting review'
		);
	});

	test(`${language} Annunciation distinguishes the printed reading from its inherited digital source`, async ({
		page
	}) => {
		await page.goto(route);
		await page
			.locator(`#text-proprium-${text}`)
			.getByRole('button', {
				name: language === 'pl' ? 'o modlitwie' : 'about this prayer'
			})
			.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toContainText(language === 'pl' ? 'Epistoła' : 'The Epistle');
		const sources = dialog.locator('details.source-notes');
		await sources.locator('summary').click();
		await expect(sources).toContainText(
			'Missale Romanum ex decreto SS. Concilii Tridentini restitutum'
		);
		await expect(sources).toContainText('p. 495');
		await expect(sources).toContainText('horas/Latin/Commune/C10a.txt');
		await expect(sources).toContainText('Tempora/Adv3-3.txt');
		await expect(
			sources.locator(
				'a[href="https://archive.org/details/missale-romanum-1962/page/n576/mode/1up"]'
			)
		).toHaveCount(1);
	});
}
