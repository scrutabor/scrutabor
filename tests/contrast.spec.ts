// Reading in a dark church is the case this app was built for, and the
// dark theme's rubric red sat at 4.09:1 against the page — under WCAG AA
// for text this size, and the small-caps section headings are set in it.
//
// The guard reads the tokens from the rendered page in both themes and
// checks every text colour against every surface it can sit on, the
// tinted wash behind a tapped word included.
import { APCAcontrast, sRGBtoY } from 'apca-w3';
import { expect, test } from './fixtures';

const AA = 4.5;
const INK = ['--ink', '--ink-soft', '--rubric'];
// --wash-strong is the tapped word's highlight, and the only text that
// ever sits on it is the word itself and its gloss — both primary ink,
// which is why TextBody overrides the gloss there. Checking --rubric
// against it too would fail on a pair the design never puts together, and
// a guard that demands impossible pairs drives real colours somewhere
// worse. What is actually painted is covered by the axe sweep.
const SURFACES = ['--bg', '--surface', '--wash'];
const STRONG_WASH_INK = ['--ink'];

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
		await page.goto('/app/pl/ordinarium/gloria');
		const tokens = await page.evaluate(
			({ t, names }) => {
				document.documentElement.dataset.theme = t;
				const style = getComputedStyle(document.documentElement);
				return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()]));
			},
			{ t: theme, names: [...INK, ...SURFACES, '--wash-strong'] }
		);

		// EVERY token proves its shape before any ratio is computed — the
		// surfaces too, not only the inks. contrast() of a missing or
		// non-hex value is NaN, and NaN < AA is false: a renamed --surface
		// or a wash rewritten as color-mix() left this gate green while it
		// compared nothing.
		for (const name of [...INK, ...SURFACES, '--wash-strong']) {
			expect(tokens[name], `${name} must be a hex token`).toMatch(/^#[0-9a-f]{6}$/i);
		}

		const failures: string[] = [];
		for (const ink of INK) {
			for (const surface of SURFACES) {
				const ratio = contrast(tokens[ink], tokens[surface]);
				if (ratio < AA) failures.push(`${ink} on ${surface}: ${ratio.toFixed(2)}`);
			}
		}
		for (const ink of STRONG_WASH_INK) {
			const ratio = contrast(tokens[ink], tokens['--wash-strong']);
			if (ratio < AA) failures.push(`${ink} on --wash-strong: ${ratio.toFixed(2)}`);
		}
		expect(failures, `${theme} theme falls under WCAG AA`).toEqual([]);
	});
}

// APCA floors beside the WCAG ones, because WCAG 2 is polarity-blind: it
// rated the pre-retune dark soft ink (5.34:1) a shade BETTER than light's
// (5.28:1) while APCA — the size-and-weight-aware WCAG 3 draft metric —
// scored it at Lc 39.5 against light's 71.7, half the perceptual contrast,
// on the very theme built for praying in the dark. The readability audit
// of 2026-08-20 found it; this keeps it found.
//
// The floors are the audit's ruled tiers, each at or under what the
// retuned palette measures, never above what the design paints: light
// primary ink is body-grade with margin (Lc 90+), the light quiet layer
// sits at the 18px-body tier (75+) — the retune that retired the
// solarized comparison — and the dark theme accepts a declared dim-nave
// trade: quieter floors (60+) than light's, because the in-pew mode is
// deliberately low-brightness and a body-grade quiet ink there would
// merge with the primary. A future token change that dips under a floor
// is a ruling to re-make, not a rounding to shrug at.
const APCA_FLOOR: Record<string, Record<string, Record<string, number>>> = {
	light: {
		'--ink': { '--bg': 90, '--surface': 90, '--wash': 80 },
		'--ink-soft': { '--bg': 75, '--surface': 75, '--wash': 65 },
		'--rubric': { '--bg': 70, '--surface': 70, '--wash': 65 }
	},
	dark: {
		'--ink': { '--bg': 75, '--surface': 75, '--wash': 75 },
		'--ink-soft': { '--bg': 60, '--surface': 60, '--wash': 60 },
		'--rubric': { '--bg': 60, '--surface': 60, '--wash': 60 }
	}
};

function apcaLc(text: string, background: string): number {
	const rgb = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
	return Math.abs(Number(APCAcontrast(sRGBtoY(rgb(text)), sRGBtoY(rgb(background)))));
}

for (const theme of ['light', 'dark'] as const) {
	test(`every text colour clears its APCA floor — ${theme}`, async ({ page }) => {
		await page.goto('/app/pl/ordinarium/gloria');
		const tokens = await page.evaluate(
			({ t, names }) => {
				document.documentElement.dataset.theme = t;
				const style = getComputedStyle(document.documentElement);
				return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()]));
			},
			{ t: theme, names: [...INK, ...SURFACES] }
		);
		for (const name of [...INK, ...SURFACES]) {
			expect(tokens[name], `${name} must be a hex token`).toMatch(/^#[0-9a-f]{6}$/i);
		}
		const failures: string[] = [];
		for (const ink of INK) {
			for (const surface of SURFACES) {
				const lc = apcaLc(tokens[ink], tokens[surface]);
				const floor = APCA_FLOOR[theme][ink][surface];
				if (lc < floor) failures.push(`${ink} on ${surface}: Lc ${lc.toFixed(1)} < ${floor}`);
			}
		}
		expect(failures, `${theme} theme falls under its APCA floors`).toEqual([]);
	});
}
