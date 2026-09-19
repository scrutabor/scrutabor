import { expect, test } from './fixtures';

for (const [formulary, part, word, latin, sense] of [
	['dominica-i-post-epiphaniam', 'epistola', 'w084', 'actum', 'act, deed, activity'],
	['sancti-thomae-apostoli', 'epistola', 'w030', 'ædificátio', 'building, construction'],
	['cathedra-sancti-petri', 'graduale', 'w008', 'cáthedra', 'chair, seat'],
	[
		'dominica-viii-post-pentecosten',
		'evangelium',
		'w101',
		'cautiónem',
		'bond, written undertaking'
	],
	['beata-maria-virgo-regina', 'epistola', 'w018', 'colúmna', 'column, pillar'],
	['beatae-mariae-virginis-a-rosario', 'collecta', 'w014', 'comparávit', 'compare, liken'],
	['dominica-i-passionis', 'secreta', 'w015', 'concílient', 'win favor for, commend'],
	['dominica-ii-passionis', 'evangelium', 'w397', 'concílium', 'assembly, council'],
	['dominica-iv-post-pentecosten', 'evangelium', 'w090', 'conclusérunt', 'enclose, confine'],
	['dominica-iii-post-epiphaniam', 'epistola', 'w069', 'cóngeres', 'gather, collect'],
	['dominica-iv-post-pentecosten', 'introitus', 'w027', 'consístant', 'stand, take a position'],
	['sancti-bartholomaei-apostoli', 'graduale', 'w001', 'Constítues', 'place, set in position'],
	[
		'dominica-vi-post-epiphaniam',
		'evangelium',
		'w101',
		'constitutióne',
		'establishment, arrangement'
	],
	['purificatio-beatae-mariae-virginis', 'evangelium', 'w107', 'consuetúdinem', 'custom, habit'],
	['dominica-xiv-post-pentecosten', 'epistola', 'w092', 'continéntia', 'self-control, restraint'],
	['beatae-mariae-virginis-a-rosario', 'collecta', 'w029', 'cóntinent', 'contain, comprise'],
	['dominica-xxiii-post-pentecosten', 'collecta', 'w015', 'contráximus', 'draw together, collect'],
	['dominica-v-post-pentecosten', 'epistola', 'w024', 'contrário', 'opposite, contrary'],
	['d-n-iesu-christi-regis', 'alleluia', 'w015', 'corrumpétur', 'destroy, ruin'],
	['dominica-viii-post-pentecosten', 'postcommunio', 'w013', 'cultum', 'worship, veneration'],
	[
		'commemoratio-omnium-fidelium-defunctorum',
		'missa-i-sequentia',
		'w187',
		'curam',
		'care, attention'
	],
	['sancti-bartholomaei-apostoli', 'epistola', 'w027', 'curatíonum', 'healing, medical treatment'],
	['dominica-ii-passionis', 'introitus', 'w010', 'defensiónem', 'defense, protection'],
	[
		'dominica-iv-post-epiphaniam',
		'postcommunio',
		'w006',
		'delectatiónibus',
		'delight, pleasure, enjoyment'
	],
	['dominica-iii-post-pentecosten', 'epistola', 'w039', 'dévoret', 'devour, swallow'],
	['dominica-iv-post-pascha', 'postcommunio', 'w010', 'fidéliter', 'faithfully, loyally'],
	['assumptio-beatae-mariae-virginis', 'epistola', 'w075', 'géneris', 'race, people, stock'],
	['dominica-xii-post-pentecosten', 'epistola', 'w028', 'idóneos', 'suitable, fitting'],
	[
		'dedicatio-archibasilicae-sanctissimi-salvatoris',
		'graduale',
		'w007',
		'inæstimábile',
		'inestimable, beyond measure'
	]
] as const) {
	test(`English dictionary keeps the ordinary sense of ${latin}`, async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 844 });
		await page.goto(`/app/en/formularium/${formulary}?w=${formulary}-${part}.${word}`);
		await page.evaluate(() => localStorage.setItem('scrutabor-reading', 'largest'));
		await page.reload();
		const card = page.locator('aside');
		await expect(card).toBeVisible();
		await expect(card.locator('.form')).toContainText(latin);
		await expect(card.locator('.head-senses')).toContainText(sense);
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
			.toBe(0);
	});
}
