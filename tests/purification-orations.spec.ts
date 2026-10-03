import { expect, setHelp, test } from './fixtures';

const day = 'purificatio-beatae-mariae-virginis';
const split = (text: string) => text.split(' | ');

const orations = {
	collecta:
		'Almighty | eternal | God | majesty | Your | as suppliants | we beseech | that | as | only-begotten | Son | Your | this | day | with | of our | flesh | the substance | in | the temple | was | presented | so | us | may You cause | to be presented to You with purified minds | Through | the same | Lord | our | Jesus | Christ | Son | Your | Who | with You | lives | and | reigns | in | the unity | of the Spirit | Holy | God | for | all | ages | of ages | Amen',
	secreta:
		'Graciously hear | Lord | prayers | our | and | that | worthy | may be | the gifts | which | before the eyes | of Your | majesty | we offer | the help | to us | of Your | loving-kindness | bestow | Through | Lord | our | Jesus | Christ | Son | Your | Who | with You | lives | and | reigns | in | the unity | of the Spirit | Holy | God | for | all | ages | of ages | Amen'
} as const;

for (const part of ['collecta', 'secreta'] as const) {
	test(`English Purification ${part} keeps one register in its reviewed line`, async ({ page }) => {
		await page.goto(`/app/en/formularium/${day}`);
		await setHelp(page, 1);
		const section = page.locator(`#text-proprium-${day}-${part}`);
		await expect(section.locator('rt')).toHaveText(split(orations[part]));
		for (const archaic of [
			'Thy',
			'Thee',
			'liveth',
			'reigneth',
			'Holy Ghost',
			'world without end'
		]) {
			await expect(section).not.toContainText(archaic);
		}
	});
}

test('English Purification Collect presents us to God with purified minds', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 568 });
	await page.goto(`/app/en/formularium/${day}`);
	await setHelp(page, 1);
	const button = page.locator(`button[id="${day}-collecta.w029"]`);
	await expect(button.locator('rt')).toHaveText('to be presented to You with purified minds');
	await expect(button.locator('.token')).toHaveCount(4);
});

test('English Purification Secret ends with the conclusion of this Mass', async ({ page }) => {
	await page.goto(`/app/en/formularium/${day}`);
	await setHelp(page, 2);
	const translation = page.locator(`#text-proprium-${day}-secreta .translation`);
	await expect(translation.first()).toContainText(
		'Through our Lord Jesus Christ, Your Son, who lives and reigns with You in the unity of the Holy Spirit, God,'
	);
	await expect(translation.nth(1)).toHaveText('forever and ever.');
});

for (const [language, label] of [
	['pl', 'Sekreta formularza'],
	['en', 'The Secret of']
] as const) {
	test(`${language} Purification Secret has a localized role`, async ({ page }) => {
		await page.goto(`/app/${language}/formularium/${day}`);
		await page
			.locator(`#text-proprium-${day}-secreta`)
			.getByRole('button', { name: language === 'pl' ? 'o modlitwie' : 'about this prayer' })
			.click();
		await expect(page.getByRole('dialog').locator('.about-text')).toContainText(label);
	});
}
