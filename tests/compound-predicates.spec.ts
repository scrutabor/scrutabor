import { expect, setHelp, test } from './fixtures';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };

const readings = [
	['ordinarium/evangelium-ultimum', 'w164', 'were born', 2],
	['ordinarium/lavabo', 'w050', 'is filled', 2],
	['proprium/assumptio-beatae-mariae-virginis-evangelium', 'w004', 'was filled', 2],
	['proprium/dominica-i-post-epiphaniam-epistola', 'w046', 'is given', 2],
	['proprium/dominica-ii-passionis-evangelium', 'w1173', 'were crucified', 2],
	['proprium/dominica-ii-passionis-evangelium', 'w1262', 'had been crucified', 2],
	[
		'proprium/dominica-ii-post-epiphaniam-epistola',
		'w003',
		'different gifts according to the grace given to us',
		8
	],
	['proprium/dominica-in-albis-epistola', 'w004', 'is born', 2],
	['proprium/dominica-xi-post-pentecosten-evangelium', 'w063', 'were opened', 2],
	['proprium/dominica-xiii-post-pentecosten-epistola', 'w098', 'had been given', 2],
	['proprium/dominica-xix-post-pentecosten-evangelium', 'w139', 'was filled', 2],
	['proprium/dominica-xviii-post-pentecosten-epistola', 'w013', 'was given', 2],
	['proprium/dominica-xxi-post-pentecosten-evangelium', 'w028', 'was brought', 2],
	['proprium/dominica-xxi-post-pentecosten-offertorium', 'w020', 'was given', 2],
	['proprium/epiphania-domini-evangelium', 'w022', 'has been born', 2],
	['proprium/immaculata-conceptio-tractus', 'w022', 'is born', 2],
	['proprium/nativitas-domini-in-aurora-introitus', 'w007', 'is born', 2],
	['proprium/nativitas-domini-in-aurora-introitus', 'w063', 'is born', 2],
	['proprium/nativitas-domini-in-die-evangelium', 'w150', 'were born', 2],
	['proprium/nativitas-domini-in-nocte-evangelium', 'w070', 'were fulfilled', 2],
	['proprium/nativitas-domini-in-nocte-evangelium', 'w143', 'is born', 2],
	[
		'proprium/purificatio-beatae-mariae-virginis-evangelium',
		'w005',
		'the days of Mary’s purification were fulfilled',
		5
	],
	['proprium/sacratissimi-cordis-iesu-epistola', 'w006', 'is given', 2],
	['proprium/sancti-ioseph-sponsi-beatae-mariae-virginis-communio', 'w014', 'has been begotten', 2],
	[
		'proprium/sancti-ioseph-sponsi-beatae-mariae-virginis-extra-tempus-paschale-communio',
		'w014',
		'has been begotten',
		2
	],
	['proprium/sanctissimae-trinitatis-evangelium', 'w008', 'Is given', 2],
	['proprium/vigilia-nativitatis-evangelium', 'w058', 'has been begotten', 2],
	['proprium/visitatio-beatae-mariae-virginis-evangelium', 'w036', 'was filled', 2]
] as const;

for (const [text, anchor, gloss, members] of readings) {
	test(`English ${text} ${anchor} keeps its compound predicate`, async ({ page }) => {
		const proper = text.startsWith('proprium/');
		const day =
			formularies.formularies.find((day) =>
				day.components.some((part) => part.text === text && part.relation === 'proper')
			) ?? formularies.formularies.find((day) => day.components.some((part) => part.text === text));
		if (proper) expect(day, `${text} has a canonical formulary`).toBeDefined();
		await page.goto(proper ? `/app/en/formularium/${day!.id}` : `/app/en/${text}`);
		await setHelp(page, 1);
		const identifier = proper ? `${text.split('/')[1]}.${anchor}` : anchor;
		const button = page.locator(`button[id="${identifier}"]`);
		await expect(button.locator('rt')).toHaveText(gloss);
		await expect(button.locator('.token')).toHaveCount(members);
		const forms = (await button.locator('.base').allTextContents()).map((form) =>
			form.replace(/^[\s(]+|[\s,.;:!?)]+$/g, '')
		);
		await button.focus();
		await button.press('Enter');
		await expect(page.locator('aside .construction-title')).toHaveText(forms);
		await expect(page.locator('aside .construction-card .morph')).toHaveCount(members);
		await expect(page.locator('aside')).toContainText(gloss);
		await page.keyboard.press('Escape');
		await expect(button.locator('rt')).toHaveText(gloss);
	});
}
