// Reading in a dark church is the case this app was built for, and the
// dark theme's rubric red sat at 4.09:1 against the page — under WCAG AA
// for text this size, and the small-caps section headings are set in it.
//
// The guard reads the tokens from the rendered page in both themes and
// checks every text colour against every surface it can sit on, the
// tinted wash behind a tapped word included.
import { expect, test } from '@playwright/test';

const AA = 4.5;
const INK = ['--ink', '--ink-soft', '--rubric'];
const SURFACES = ['--bg', '--surface', '--wash'];

function contrast(a: string, b: string): number {
	const luminance = (hex: string) => {
		const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
		const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
		return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b2);
	};
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

for (const theme of ['light', 'dark'] as const) {
	test(`every text colour clears AA on every surface — ${theme}`, async ({ page }) => {
		await page.goto('/pl/ordinarium/gloria');
		const tokens = await page.evaluate(
			({ t, names }) => {
				document.documentElement.dataset.theme = t;
				const style = getComputedStyle(document.documentElement);
				return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()]));
			},
			{ t: theme, names: [...INK, ...SURFACES] }
		);

		const failures: string[] = [];
		for (const ink of INK) {
			for (const surface of SURFACES) {
				expect(tokens[ink], `${ink} must be a hex token`).toMatch(/^#[0-9a-f]{6}$/i);
				const ratio = contrast(tokens[ink], tokens[surface]);
				if (ratio < AA) failures.push(`${ink} on ${surface}: ${ratio.toFixed(2)}`);
			}
		}
		expect(failures, `${theme} theme falls under WCAG AA`).toEqual([]);
	});
}
