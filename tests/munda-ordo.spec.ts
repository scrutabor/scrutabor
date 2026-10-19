import { expect, setHelp, test } from './fixtures';
import formularies from '../src/lib/data/formularies.json' with { type: 'json' };
import plFormularies from '../src/lib/data/languages/pl/formularies.json' with { type: 'json' };
import enFormularies from '../src/lib/data/languages/en/formularies.json' with { type: 'json' };

const choices = [
	{ name: 'Ordinary alone', query: '?missa=none', mass: null },
	{ name: 'Gradual and Tract', query: '?dies=2026-02-01', mass: 'dominica-in-septuagesima' },
	{ name: 'Palm Passion', query: '?dies=2026-03-29', mass: 'dominica-ii-passionis' },
	{ name: 'Holy Thursday', query: '?dies=2026-04-02', mass: 'feria-v-in-cena-domini' },
	{ name: 'Easter Vigil', query: '?dies=2026-04-04', mass: 'vigilia-paschalis' },
	{ name: 'Pentecost Sequence', query: '?dies=2026-05-24', mass: 'dominica-pentecostes' },
	{
		name: 'Requiem I',
		query: '?dies=2026-11-02&missa=commemoratio-omnium-fidelium-defunctorum',
		mass: 'commemoratio-omnium-fidelium-defunctorum'
	},
	{
		name: 'Requiem II',
		query: '?dies=2026-11-02&missa=commemoratio-omnium-fidelium-defunctorum-missa-ii',
		mass: 'commemoratio-omnium-fidelium-defunctorum-missa-ii'
	},
	{
		name: 'Requiem III',
		query: '?dies=2026-11-02&missa=commemoratio-omnium-fidelium-defunctorum-missa-iii',
		mass: 'commemoratio-omnium-fidelium-defunctorum-missa-iii'
	}
] as const;

for (const lang of ['pl', 'en'] as const) {
	for (const form of ['lecta', 'cantu'] as const) {
		for (const choice of choices) {
			test(`${lang} ${form} ${choice.name}: one complete Munda after all chants @reader`, async ({
				page
			}) => {
				await page.addInitScript((selected) => {
					localStorage.setItem('scrutabor-role', 'sacerdos');
					localStorage.setItem('scrutabor-mass-form', selected);
				}, form);
				await page.goto(`/app/${lang}/ordo/catechumenorum${choice.query}`);
				await setHelp(page, 0);
				const section = page.locator('section.part').filter({
					has: page.locator(`a.part-title[href$="/ordinarium/munda-cor-meum"]`)
				});
				await expect(section).toHaveCount(1);
				await expect(section.locator('.word[id^="munda-cor-meum.w"]')).toHaveCount(34);
				await expect(section.locator('[id="munda-cor-meum.w034"]')).toHaveText('Amen.');
				await expect(section.locator('.verse')).toHaveCount(2);
				await expect(
					section.locator('xpath=preceding-sibling::section[1]').locator('.part-title')
				).toHaveText('Graduále, Allelúia, Tractus');
				// The delivered Ordinary sets its three Gospel-blessing forms between Munda cor meum
				// and the Gospel in every choice, each with its own applicability note.
				const blessings = [
					'Iube, Dómine, benedícere',
					'Iube, domne, benedícere (Diáconi)',
					'Iube, domne, benedícere (in Passióne)'
				];
				await expect(
					section
						.locator('xpath=following-sibling::section[1]')
						.locator('a.part-title[href$="/ordinarium/iube-domine-benedicere"]')
				).toHaveCount(1);
				for (const [index, blessing] of blessings.entries())
					await expect(
						section.locator(`xpath=following-sibling::section[${index + 1}]`).locator('.part-title')
					).toHaveText(blessing);
				const gospel = section.locator(`xpath=following-sibling::section[${blessings.length + 1}]`);
				await expect(gospel.locator('.part-title')).toHaveText('Evangélium');
				if (choice.mass) {
					const day = formularies.formularies.find((entry) => entry.id === choice.mass)!;
					const title = (lang === 'pl' ? plFormularies : enFormularies).titles.find(
						(entry) => entry.id === choice.mass
					)!.title;
					const collect = day.components.find((component) => component.role === 'collecta')!;
					await expect(page.locator('#day-value')).toContainText(title);
					await expect(page.locator(`[id="${collect.text.split('/')[1]}.w001"]`)).toHaveCount(1);
				}
				if (choice.name === 'Pentecost Sequence')
					await expect(
						section
							.locator('xpath=preceding-sibling::section[1]')
							.locator('[id="dominica-pentecostes-sequentia.w001"]')
					).toHaveCount(1);
				if (choice.name === 'Gradual and Tract')
					await expect(
						section
							.locator('xpath=preceding-sibling::section[1]')
							.locator('[id="dominica-in-septuagesima-tractus.w001"]')
					).toHaveCount(1);
				if (choice.name.startsWith('Requiem'))
					await expect(section.locator('.part-note')).toContainText(
						lang === 'pl'
							? 'Munda cor meum wraz ze swoim zakończeniem pozostaje'
							: 'Munda cor meum and its own conclusion remain'
					);
				if (choice.name === 'Palm Passion') {
					await expect(section.locator('.part-note')).toContainText(
						lang === 'pl' ? 'co najmniej święcenia diakonatu' : 'at least deacons'
					);
					await expect(gospel.locator('.part-note')).toContainText(
						lang === 'pl' ? 'Nie odmawia się Dominus vobiscum' : 'Dominus vobiscum is not said'
					);
					await expect(gospel.locator('.part-note')).not.toContainText(
						lang === 'pl' ? 'znaczy krzyżem księgę' : 'the priest signs the book'
					);
				}
			});
		}
	}

	test(`${lang} neutral folded and revealed preparation retains every construction member @reader`, async ({
		page
	}) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'populus'));
		await page.goto(`/app/${lang}/ordo/catechumenorum?missa=none`);
		const section = page.locator('section.part').filter({
			has: page.locator('.part-title, .unfold-title').filter({ hasText: /^Munda cor meum$/ })
		});
		const label = lang === 'pl' ? 'przygotowanie do Ewangelii' : 'preparation for the Gospel';
		await expect(section).toHaveClass(/folded/);
		await expect(section.locator('xpath=preceding-sibling::p[1]')).toHaveText(label);
		await section.locator('button.unfold').click();
		await expect(section.locator('.aside-mark')).toHaveText(label);
		await section.locator('button.refold').click();
		await expect(section.locator('button.unfold')).toBeVisible();
		await page.goto(`/app/${lang}/ordo/catechumenorum?missa=none&w=munda-cor-meum.w015`);
		await expect(page.locator('aside .construction-title')).toHaveText(
			lang === 'pl'
				? ['cálculo', 'mundásti', 'igníto']
				: ['lábia', 'Isaíæ', 'prophétæ', 'cálculo', 'mundásti', 'igníto']
		);
		const disputed = page.locator('aside [aria-labelledby="construction-w015-title"]');
		await expect(disputed.locator('.note')).toHaveCount(1);
		await expect(disputed.locator('.verification')).toContainText('Collatinus');
		await expect(disputed.locator('.verification')).not.toContainText('Whitaker');
	});

	test(`${lang} Last Gospel has no Munda body or second preparation @reader`, async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
		await page.goto(`/app/${lang}/ordo/conclusio?missa=none`);
		await expect(page.locator('[id="evangelium-ultimum.w001"]')).toHaveCount(1);
		await expect(page.locator('[id^="munda-cor-meum."]')).toHaveCount(0);
		await expect(page.locator('a.part-title[href$="/ordinarium/munda-cor-meum"]')).toHaveCount(0);
	});

	test(`${lang} slow and failed proper never gates fixed Munda @online`, async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('scrutabor-role', 'sacerdos'));
		let fail!: () => void;
		const pending = new Promise<void>((resolve) => {
			fail = resolve;
		});
		let requests = 0;
		await page.route('**/artifacts/proprium/**', async (route) => {
			requests++;
			await pending;
			await route.fulfill({ status: 503, body: 'unavailable' });
		});
		await page.goto(`/app/${lang}/ordo/catechumenorum?dies=2026-05-24`);
		await expect.poll(() => requests).toBeGreaterThan(0);
		await setHelp(page, 0);
		await expect(page.locator('.word[id^="munda-cor-meum.w"]')).toHaveCount(34);
		fail();
		await expect(page.locator('.part-note[role="status"]').first()).toBeVisible();
		await expect(page.locator('.word[id^="munda-cor-meum.w"]')).toHaveCount(34);
	});
}
