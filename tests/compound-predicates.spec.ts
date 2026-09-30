import { expect, setHelp, test } from './fixtures';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };

const readings = [
	['ordinarium/evangelium-ultimum', 'w164', 'were born'],
	['ordinarium/lavabo', 'w050', 'is filled'],
	['proprium/assumptio-beatae-mariae-virginis-evangelium', 'w004', 'was filled'],
	['proprium/dominica-i-post-epiphaniam-epistola', 'w046', 'is given'],
	['proprium/dominica-ii-passionis-evangelium', 'w1173', 'were crucified'],
	['proprium/dominica-ii-passionis-evangelium', 'w1262', 'had been crucified'],
	['proprium/dominica-ii-post-epiphaniam-epistola', 'w007', 'is given'],
	['proprium/dominica-in-albis-epistola', 'w004', 'is born'],
	['proprium/dominica-xi-post-pentecosten-evangelium', 'w063', 'were opened'],
	['proprium/dominica-xiii-post-pentecosten-epistola', 'w098', 'had been given'],
	['proprium/dominica-xix-post-pentecosten-evangelium', 'w139', 'was filled'],
	['proprium/dominica-xviii-post-pentecosten-epistola', 'w013', 'was given'],
	['proprium/dominica-xxi-post-pentecosten-evangelium', 'w028', 'was brought'],
	['proprium/dominica-xxi-post-pentecosten-offertorium', 'w020', 'was given'],
	['proprium/epiphania-domini-evangelium', 'w022', 'has been born'],
	['proprium/immaculata-conceptio-tractus', 'w022', 'is born'],
	['proprium/nativitas-domini-in-aurora-introitus', 'w007', 'is born'],
	['proprium/nativitas-domini-in-aurora-introitus', 'w063', 'is born'],
	['proprium/nativitas-domini-in-die-evangelium', 'w150', 'were born'],
	['proprium/nativitas-domini-in-nocte-evangelium', 'w070', 'were fulfilled'],
	['proprium/nativitas-domini-in-nocte-evangelium', 'w143', 'is born'],
	['proprium/purificatio-beatae-mariae-virginis-evangelium', 'w005', 'were fulfilled'],
	['proprium/sacratissimi-cordis-iesu-epistola', 'w006', 'is given'],
	['proprium/sancti-ioseph-sponsi-beatae-mariae-virginis-communio', 'w014', 'has been begotten'],
	[
		'proprium/sancti-ioseph-sponsi-beatae-mariae-virginis-extra-tempus-paschale-communio',
		'w014',
		'has been begotten'
	],
	['proprium/sanctissimae-trinitatis-evangelium', 'w008', 'Is given'],
	['proprium/vigilia-nativitatis-evangelium', 'w058', 'has been begotten'],
	['proprium/visitatio-beatae-mariae-virginis-evangelium', 'w036', 'was filled']
] as const;

for (const [text, anchor, gloss] of readings) {
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
		await expect(button.locator('.token')).toHaveCount(2);
		const forms = (await button.locator('.base').allTextContents()).map((form) =>
			form.replace(/^[\s(]+|[\s,.;:!?)]+$/g, '')
		);
		await button.focus();
		await button.press('Enter');
		await expect(page.locator('aside .construction-title')).toHaveText(forms);
		await expect(page.locator('aside .construction-card .morph')).toHaveCount(2);
		await expect(page.locator('aside')).toContainText(gloss);
		await page.keyboard.press('Escape');
		await expect(button.locator('rt')).toHaveText(gloss);
	});
}
