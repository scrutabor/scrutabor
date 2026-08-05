// WCAG 2.1 AA over every kind of surface this edition has, in both
// languages and both themes.
//
// The app is text, read by people who may be praying in a dark church at
// arm's length, some of them with the print already too small for them —
// so accessibility here is not compliance paperwork, it is whether the
// book can be read at all. This runs the axe rule set; tests/contrast.spec
// checks the colour tokens directly, because axe only sees the colours a
// page happens to put on screen and the tokens must hold everywhere.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// One of each surface, not one of each page: the templates are what can
// be wrong, and 1100 prerendered pages come from these seven.
const SURFACES = [
	{ name: 'language router', path: '/' },
	{ name: 'catalog', path: '/pl' },
	{ name: 'ordo index', path: '/pl/ordo' },
	{ name: 'ordo movement', path: '/pl/ordo/communio' },
	{ name: 'reading page', path: '/pl/ordinarium/gloria' },
	{ name: 'lemma page', path: '/pl/lemma/deus' },
	{ name: 'grammar concept', path: '/pl/grammatica/casus' },
	{ name: 'edition page', path: '/en/editio' },
	{ name: 'not found', path: '/pl/404' }
];

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function violations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
	return violations.map(
		(v) =>
			`${v.id} (${v.impact}) — ${v.help}\n     ${v.nodes
				.slice(0, 3)
				.map((n) => n.html.slice(0, 100))
				.join('\n     ')}`
	);
}

for (const theme of ['light', 'dark'] as const) {
	for (const { name, path } of SURFACES) {
		test(`${name} meets WCAG 2.1 AA — ${theme}`, async ({ page }) => {
			// Choose the theme the way a reader has it — stored, and applied
			// by the page's own pre-paint script. Switching it after load
			// instead makes axe sample colours mid-transition, and a blend of
			// the two themes fails every check while nothing is wrong.
			await page.addInitScript((t) => {
				localStorage.setItem('scrutabor-theme', t);
			}, theme);
			await page.goto(path);
			await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
			expect(await violations(page), `${path} in ${theme}`).toEqual([]);
		});
	}
}

test('the word panel meets WCAG 2.1 AA, open and interactive', async ({ page }) => {
	await page.goto('/pl/ordinarium/gloria');
	await page.locator('.word').first().click();
	await expect(page.locator('aside')).toBeVisible();
	expect(await violations(page), 'reading page with the word panel open').toEqual([]);
});

test('the help slider at its fullest meets WCAG 2.1 AA', async ({ page }) => {
	// The top step puts every layer on screen at once — translations,
	// narrative, interlinear gloss — which is the densest the app ever gets.
	await page.goto('/pl/ordinarium/credo');
	await page.locator('input[type="range"]').fill('2');
	expect(await violations(page), 'reading page at full help').toEqual([]);
});
