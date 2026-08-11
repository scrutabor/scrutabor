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
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// One of each surface, not one of each page: the templates are what can
// be wrong, and the prerendered pages all come from these few — the
// landing pages included, since the pew case (dark theme, phone width,
// large print) is the first thing a visitor meets there too.
const SURFACES = [
	{ name: 'app language router', path: '/app/' },
	{ name: 'landing @online', path: '/pl' },
	{ name: 'privacy page @online', path: '/en/privacy' },
	{ name: 'support page @online', path: '/pl/support' },
	{ name: 'catalog', path: '/app/pl' },
	{ name: 'ordo index', path: '/app/pl/ordo' },
	{ name: 'ordo movement', path: '/app/pl/ordo/communio' },
	{ name: 'reading page', path: '/app/pl/ordinarium/gloria' },
	{ name: 'lemma page', path: '/app/pl/lemma/deus' },
	// a concept that EXISTS: /app/pl/grammatica/casus never did, and the
	// hosted server's 404 fallback let this surface pass for months while
	// scanning the not-found page under a grammar page's name
	{ name: 'grammar concept', path: '/app/pl/grammatica/nominativus' },
	{ name: 'edition page', path: '/app/en/editio' },
	{ name: 'bibliography page', path: '/app/pl/bibliographia' },
	// the server's own 404: there is no such page in a downloaded copy,
	// where a link that misses is the browser's error, not ours
	{ name: 'not found @online', path: '/pl/404' }
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

// The pew case is a phone held at arm's length, and a narrow viewport
// reflows everything: what fits at 1280px may overlap or clip at 375.
test.describe('on a phone', () => {
	test.use({ viewport: { width: 375, height: 812 } });

	for (const { name, path } of SURFACES.filter((s) => s.path !== '/app/')) {
		test(`${name} meets WCAG 2.1 AA`, async ({ page }) => {
			await page.goto(path);
			expect(await violations(page), `${path} at 375px`).toEqual([]);
		});
	}

	test('the word panel meets WCAG 2.1 AA where it covers most of the screen', async ({ page }) => {
		await page.goto('/app/pl/ordinarium/gloria');
		await page.locator('.word').first().click();
		await expect(page.locator('aside')).toBeVisible();
		expect(await violations(page), 'panel on a phone').toEqual([]);
	});
});

test('the word panel meets WCAG 2.1 AA, open and interactive', async ({ page }) => {
	await page.goto('/app/pl/ordinarium/gloria');
	await page.locator('.word').first().click();
	await expect(page.locator('aside')).toBeVisible();
	expect(await violations(page), 'reading page with the word panel open').toEqual([]);
});

// The reading size is a knob a reader turns precisely because the print is
// too small for them, so the sizes that matter most for accessibility are
// the ones the checks above never saw. Largest print on the narrowest phone
// is where text overlaps, where a control's touch target is squeezed, and
// where a wrapped label can end up over a background it was never measured
// against.
test.describe('at the largest reading size', () => {
	for (const width of [375, 834, 1280]) {
		for (const { name, path } of SURFACES.filter((s) => s.path !== '/app/')) {
			test(`${name} meets WCAG 2.1 AA at ${width}px`, async ({ page }) => {
				await page.addInitScript(() => {
					localStorage.setItem('scrutabor-reading', 'largest');
				});
				await page.setViewportSize({ width, height: 812 });
				await page.goto(path);
				await expect(page.locator('html')).toHaveCSS('font-size', '22.4px');
				expect(await violations(page), `${path} at ${width}px, largest`).toEqual([]);
			});
		}
	}
});

test('the help slider at its fullest meets WCAG 2.1 AA', async ({ page }) => {
	// The top step puts every layer on screen at once — translations,
	// narrative, interlinear gloss — which is the densest the app ever gets.
	await page.goto('/app/pl/ordinarium/credo');
	await page.locator('input[type="range"]').fill('2');
	expect(await violations(page), 'reading page at full help').toEqual([]);
});

test('everything the keyboard reaches wears the house focus ring', async ({ page }) => {
	// Every component declared its own ring, which holds until one does
	// not: fifteen focusable things on a single Ordo movement had no rule
	// at all — the nine part titles among them — and Chrome drew its blue
	// double ring on a page with no blue anywhere in it. The owner found it
	// by pressing Tab (2026-08-09). There is one ring now, declared once in
	// app.css at zero specificity, and this is what says so.
	await page.goto('/app/pl/ordo/praeparatio');

	const findings = await page.evaluate(() => {
		// every selector in the app that styles a focus ring
		const rules: string[] = [];
		for (const sheet of document.styleSheets) {
			let list: CSSRuleList;
			try {
				list = sheet.cssRules;
			} catch {
				continue; // cross-origin, not ours
			}
			for (const r of list) {
				const sel = (r as CSSStyleRule).selectorText;
				// `matches` cannot take a pseudo-ELEMENT, and a rule that ends
				// in one is styling the ring of a rule that does not
				if (sel && sel.includes(':focus-visible') && !sel.includes('::')) rules.push(sel);
			}
		}

		const focusable = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
		const bare = new Set<string>();
		let counted = 0;
		for (const el of document.querySelectorAll(focusable)) {
			counted++;
			// the whole selector list at once — splitting on commas would cut
			// `:where(a, button)` in half
			const covered = rules.some((sel) => {
				try {
					return el.matches(sel.replace(/:focus-visible/g, ''));
				} catch {
					return false;
				}
			});
			if (!covered) {
				const cls = (el.getAttribute('class') ?? '').split(' ')[0];
				bare.add(el.tagName.toLowerCase() + (cls ? `.${cls}` : ''));
			}
		}
		return { bare: [...bare], counted, rules: rules.length };
	});

	expect(findings.counted, 'the movement has things to focus').toBeGreaterThan(20);
	expect(findings.bare, 'these would fall back to the browser default ring').toEqual([]);
});

test('a focus ring is drawn round the ink, not round the box it aligns in', async ({ page }) => {
	// Two boxes on a reading surface are deliberately bigger than what they
	// print. A speaker mark is a fixed 1.379 of the reading size, the width
	// the Latin column is indented by; a role option in the compact picker
	// carries the separator that precedes it. Ringing either box drew a
	// rectangle around a lot of nothing, and the mark's reached over the
	// first word of its line (owner, 2026-08-09).
	await page.goto('/app/pl/ordo/praeparatio');

	const m = await page.evaluate(() => {
		const box = (el: Element | null | undefined) => {
			const r = el?.getBoundingClientRect();
			return r ? { w: r.width, left: r.left } : null;
		};
		const mark = document.querySelector('button.mark');
		const option = [...document.querySelectorAll('.picker.compact .option')].find(
			(o) => o.previousElementSibling // one that carries the separator
		);
		return {
			mark: { button: box(mark), ring: box(mark?.querySelector('.ink')) },
			option: { button: box(option), ring: box(option?.querySelector('.slot')) }
		};
	});

	expect(m.mark.ring, 'the mark rings an inner span').not.toBeNull();
	// the letter is well under half the gutter it is aligned in
	expect(m.mark.ring!.w).toBeLessThan(m.mark.button!.w * 0.6);
	expect(m.option.ring, 'the option rings its word').not.toBeNull();
	// and the ring starts clear of the separator the button also holds
	expect(m.option.ring!.left).toBeGreaterThan(m.option.button!.left + 5);
});
