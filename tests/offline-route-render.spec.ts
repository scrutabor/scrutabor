// Every route CLASS of the downloaded folder, rendered — not merely listed.
// The routes table test proves a key exists for each; a class whose loader
// fell through to null would still pass it and render an empty page. Here
// each class draws real content on the folder edition, and the last case
// proves the gate can tell a rendered page from the not-found frame.
import { expect, test } from './fixtures';

const CLASSES: { name: string; path: string; proof: RegExp }[] = [
	{ name: 'home', path: '/app/pl', proof: /Ordo Missæ|Modlitwy/ },
	{ name: 'search', path: '/app/pl/search', proof: /Wyszukiwanie/ },
	{ name: 'ordo', path: '/app/pl/ordo', proof: /Præparátio/ },
	{ name: 'movement', path: '/app/pl/ordo/praeparatio', proof: /Introíbo ad altáre Dei/ },
	{ name: 'grammatica', path: '/app/pl/grammatica', proof: /gramaty/i },
	{ name: 'pronuntiatio', path: '/app/pl/grammatica/pronuntiatio', proof: /wymow|pronuntiati/i },
	{ name: 'concept', path: '', proof: /./ }, // reached by link below
	{ name: 'lemma', path: '/app/pl/lemma/misereor', proof: /miséreor/ },
	{ name: 'bibliographia', path: '/app/pl/bibliographia', proof: /Missale Romanum/ },
	{ name: 'editio', path: '/app/pl/editio', proof: /wydani/i },
	{ name: 'reading', path: '/app/pl/orationes/pater-noster', proof: /Pater noster/ }
];

test.describe('the folder renders every route class @folder', () => {
	for (const { name, path, proof } of CLASSES.filter((entry) => entry.path)) {
		test(`${name} draws its content`, async ({ page }) => {
			await page.goto(path);
			await expect(page.locator('main, .page').first()).toContainText(proof);
			const text = await page.locator('body').innerText();
			expect(text.length, `${name} rendered almost nothing`).toBeGreaterThan(80);
		});
	}

	test('concept draws its content, reached as a reader reaches it', async ({ page }) => {
		await page.goto('/app/pl/grammatica');
		const first = page.locator('main a[href*="/grammatica/"]').first();
		const title = (await first.textContent())?.trim();
		await first.click();
		await expect(page.locator('h1')).toBeVisible();
		if (title) await expect(page.locator('h1')).toContainText(new RegExp(title.slice(0, 8), 'i'));
	});

	test('the gate can tell a page from the not-found frame', async ({ page }) => {
		await page.goto('/app/pl/orationes/no-such-prayer');
		await expect(page.locator('main, .page').first()).not.toContainText(/Pater noster/);
	});
});
