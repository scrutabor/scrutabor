import { expect, setHelp, setTheme, test } from './fixtures';
import { expectSharedGloss } from './shared-gloss';
import { interlinearGeometry } from './interlinear-geometry';

const day = 'dominica-in-quinquagesima';
// Literal contextual expectations, independent of the vendored data at runtime.
const cases = [
	['pl', 'introitus', 26, 'dux ego sum', 'będziesz mi przewodnikiem'],
	[
		'en',
		'introitus',
		15,
		'firmamentum meus et refugium meus sum tu',
		'You are my support and my refuge'
	],
	['en', 'introitus', 63, 'et in saeculum saeculum', 'and forever and ever'],
	[
		'pl',
		'collecta',
		12,
		'ab omnis nos adversitas custodio',
		'strzeż nas od wszelkiej przeciwności'
	],
	[
		'en',
		'collecta',
		1,
		'prex noster quaeso dominus clementer exaudio',
		'Mercifully hear our prayers, we beseech You, Lord'
	],
	[
		'en',
		'collecta',
		8,
		'ab peccatum vinculum absolvo ab omnis nos adversitas custodio',
		'guard us, released from the bonds of sins, from all adversity'
	],
	['pl', 'epistola', 8, 'caritas autem non habeo', 'a nie miał miłości'],
	['pl', 'epistola', 183, 'cognosco sum', 'zostałem poznany'],
	['en', 'epistola', 8, 'caritas autem non habeo', 'but have no love'],
	['en', 'epistola', 131, 'cum autem venio qui perfectus sum', 'But when what is perfect comes'],
	['en', 'epistola', 137, 'evacuo qui ex pars sum', 'what is partial will be done away'],
	['en', 'epistola', 181, 'sicut et cognosco sum', 'even as I have been known'],
	['pl', 'graduale', 8, 'nosco facio', 'uczyniłeś znaną'],
	[
		'en',
		'graduale',
		8,
		'nosco facio in gens virtus tuus',
		'You have made Your power known among the nations'
	],
	['pl', 'tractus', 28, 'nos autem populus is', 'my zaś jesteśmy Jego ludem'],
	['en', 'tractus', 24, 'et non ipse nos', 'and we did not make ourselves'],
	['en', 'tractus', 28, 'nos autem populus is', 'but we are His people'],
	['pl', 'evangelium', 15, 'omnis qui scribo sum', 'wszystko, co zostało napisane'],
	['pl', 'evangelium', 126, 'tu volo facio', 'chcesz, abym ci uczynił'],
	['en', 'evangelium', 14, 'consummo omnis', 'all things will be fulfilled'],
	['en', 'evangelium', 48, 'sum verbum iste abscondo', 'this word was hidden'],
	['en', 'evangelium', 126, 'tu volo facio', 'do you want Me to do for you'],
	['en', 'evangelium', 142, 'tu salvus facio', 'has made you well'],
	['pl', 'offertorium', 8, 'in labium meus', 'moimi wargami'],
	['en', 'offertorium', 1, 'benedictus sum', 'Blessed are You'],
	['pl', 'communio', 7, 'desiderium is affero is dominus', 'Pan spełnił im ich pragnienie'],
	['en', 'communio', 7, 'desiderium is affero is dominus', 'the Lord granted them their desire'],
	[
		'pl',
		'postcommunio',
		4,
		'ut qui caelestis alimentum percipio',
		'abyśmy, przyjąwszy niebieskie pokarmy,'
	],
	[
		'en',
		'postcommunio',
		5,
		'qui caelestis alimentum percipio',
		'we who have received heavenly food'
	],
	['en', 'postcommunio', 9, 'per hic', 'through it'],
	[
		'en',
		'postcommunio',
		11,
		'contra omnis adversus munio',
		'may be protected against all adversity'
	]
] as const;

for (const [language, part, first, lemmata, gloss] of cases) {
	test(`${language} Quinquagesima ${part} ${first} retains its construction @reader`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-reading', 'largest'));
		const members = lemmata.split(' ').map((lemma, offset) => {
			const cardId = `w${String(first + offset).padStart(3, '0')}`;
			return { id: `${day}-${part}.${cardId}`, cardId, href: `/app/${language}/lemma?l=${lemma}` };
		});
		for (const width of [320, 1280]) {
			for (const theme of ['light', 'dark'] as const) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(`/app/${language}/formularium/${day}`);
				await setHelp(page, 1);
				await setTheme(page, theme);
				if (language === 'en' && part === 'introitus' && first === 63) {
					await expect(page.locator(`[id="${day}-introitus.w060"] rt`)).toHaveText('is now');
				}
				await expect(page.locator('html')).toHaveAttribute('data-reading', 'largest');
				expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('140%');
				const group = page
					.locator('.token-group')
					.filter({ has: page.locator(`[id="${members[0].id}"]`) });
				await expectSharedGloss(page, group, members.length, gloss, members, { neighborInk: true });
				const [geometry] = await group.evaluate(interlinearGeometry);
				expect(geometry.sourceClipping).toEqual([]);
				expect(geometry.captionClipping).toEqual([]);
				expect(geometry.clearance).toBeGreaterThanOrEqual(0);
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
					0
				);
			}
		}
		await page.setViewportSize({ width: 794, height: 1123 });
		await page.emulateMedia({ media: 'print' });
		const group = page
			.locator('.token-group')
			.filter({ has: page.locator(`[id="${members[0].id}"]`) });
		await expect(group.locator('rt')).toBeVisible();
		await expect(group.locator('rt')).toHaveText(gloss);
		await expect(group.locator('.token')).toHaveCount(members.length);
		const [geometry] = await group.evaluate(interlinearGeometry);
		expect(geometry.sourceClipping).toEqual([]);
		expect(geometry.captionClipping).toEqual([]);
		expect(geometry.clearance).toBeGreaterThanOrEqual(0);
		expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
		await page.emulateMedia({ media: 'screen' });
	});
}
