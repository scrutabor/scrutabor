import { bare as test, expect } from './fixtures';

const PAGES = [
	'/app/pl/ordo/catechumenorum',
	'/app/pl/ordo/praeparatio',
	'/app/pl/ordinarium/credo',
	'/app/pl/ordinarium/confiteor',
	'/app/pl/orationes/pater-noster',
	'/app/pl/orationes/angelus-domini',
	'/app/pl/litaniae/lauretanae',
	'/app/pl/psalmi/118-he',
	'/app/en/ordo/canon',
	'/app/en/ordinarium/gloria',
	'/pl'
];
const WIDTHS = [1512, 900, 390];
const MODES = [0, 2, 1];
const TOLERANCE = 2.5;

// These pairs deliberately change their adjacent geometry between reading
// modes: glosses, folded attachments, litany rows and the specimen panel
// have their spacing priced where those components are defined. Every other
// pair must keep the same visible gap.
const LEGITIMATE_DIFFERENCES = new Set([
	'verse|verse',
	'verse|seg-extra',
	'seg-extra|verse',
	'seg-extra|rubric',
	'rubric|verse',
	'verse|rubric',
	'seg-extra|seg-extra',
	'verse|translation-sources',
	'seg-extra|translation-sources',
	'litany-pair|litany-pair',
	'verse|litany-pair',
	'litany-pair|rubric',
	'rubric|litany-pair',
	'litany-pair|translation-sources',
	'rubric|translation-sources',
	'who|verse',
	'details|verse',
	'verse|details',
	'span|span',
	'verse|aside',
	'seg-extra|aside',
	'div|aside'
]);

interface Gap {
	id: string;
	key: string;
	gap: number;
}

interface GeometryProbe {
	gaps: Gap[];
	overflow: string[];
	targets: string[];
	overlaps: string[];
	controls: number;
}

test('reading modes preserve the book geometry @online @sweep', async ({ page }) => {
	test.setTimeout(240_000);
	expect(PAGES.length).toBeGreaterThan(0);
	expect(WIDTHS.length).toBeGreaterThan(0);
	expect(MODES.length).toBeGreaterThan(0);

	const expectedRuns = PAGES.length * WIDTHS.length * MODES.length;
	const findings: string[] = [];
	const emptyRuns: string[] = [];
	let runs = 0;
	let gapProbes = 0;
	let controlProbes = 0;

	// Establish the origin once so the mode can be selected in localStorage
	// before each measured navigation.
	await page.goto('/app/pl');
	await page.evaluate(() => localStorage.setItem('scrutabor-theme', 'light'));

	for (const url of PAGES) {
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 1000 });
			const perMode: Record<number, GeometryProbe> = {};

			for (const mode of MODES) {
				await page.evaluate((value) => localStorage.setItem('scrutabor-help', String(value)), mode);
				await page.goto(url);
				await expect(page.locator('html')).toHaveAttribute('data-help', String(mode));
				await expect(page.locator('main')).toBeVisible();
				await page.evaluate(() => document.fonts.ready);

				const data = await page.evaluate<GeometryProbe>(() => {
					const classify = (element: Element) => {
						const known = [
							'rubric-narrative',
							'rubric-la',
							'rubric',
							'seg-extra',
							'verse',
							'part-note',
							'part-head',
							'part-text',
							'litany-pair',
							'who',
							'unfold',
							'tabella',
							'help-row',
							'about-pill',
							'translation-sources',
							'pager',
							'subtitle',
							'movement-nav',
							'specimen'
						];
						return (
							known.find((name) => element.classList.contains(name)) ??
							element.tagName.toLowerCase()
						);
					};
					const anchorId = (element: Element) => {
						let current: Element | null = element;
						while (current && current !== document.body) {
							if (current.id) return current.id;
							current = current.parentElement;
						}
						return '';
					};
					const out: GeometryProbe = {
						gaps: [],
						overflow: [],
						targets: [],
						overlaps: [],
						controls: 0
					};
					const documentBox = document.documentElement;
					if (documentBox.scrollWidth > documentBox.clientWidth + 1) {
						out.overflow.push(
							`page scrolls sideways by ${documentBox.scrollWidth - documentBox.clientWidth}px`
						);
					}

					const scope = document.querySelector('main') ?? document.body;
					const parents = [scope, ...scope.querySelectorAll('*')];
					for (const parent of parents) {
						const children = [...parent.children].filter((element) => {
							const box = element.getBoundingClientRect();
							return (
								box.height > 0 && box.width > 0 && getComputedStyle(element).position !== 'fixed'
							);
						});
						for (let index = 0; index < children.length - 1; index++) {
							const first = children[index];
							const second = children[index + 1];
							const firstBox = first.getBoundingClientRect();
							const secondBox = second.getBoundingClientRect();
							if (secondBox.top < firstBox.bottom - 1) continue;
							const key = `${classify(first)}|${classify(second)}`;
							out.gaps.push({
								id: `${key}:${second.id || anchorId(second) || classify(parent)}`,
								key,
								gap: Number((secondBox.top - firstBox.bottom).toFixed(1))
							});
						}
					}

					const controls = document.querySelectorAll(
						'.tabella button, .tabella select, .about-pill, .pager a, .unfold, .refold'
					);
					out.controls = controls.length;
					for (const control of controls) {
						const box = control.getBoundingClientRect();
						if (box.height > 0 && box.height < 23) {
							out.targets.push(`${classify(control)} h=${box.height.toFixed(0)}`);
						}
					}

					const icon = document.querySelector('.status-why');
					if (icon) {
						const iconBox = icon.getBoundingClientRect();
						for (const field of document.querySelectorAll(
							'.picker.day .field, .picker.day .label'
						)) {
							const fieldBox = field.getBoundingClientRect();
							const separate =
								iconBox.right < fieldBox.left + 1 ||
								iconBox.left > fieldBox.right - 1 ||
								iconBox.bottom < fieldBox.top + 1 ||
								iconBox.top > fieldBox.bottom - 1;
							if (!separate) out.overlaps.push(`status icon overlaps ${classify(field)}`);
						}
					}
					return out;
				});

				runs += 1;
				gapProbes += data.gaps.length;
				controlProbes += data.controls;
				if (!data.gaps.length) emptyRuns.push(`${url} @${width} m${mode}`);
				perMode[mode] = data;
				for (const issue of [...data.overflow, ...data.targets, ...data.overlaps]) {
					findings.push(`${url} @${width} m${mode}: ${issue}`);
				}
			}

			const byId: Record<string, Record<number, Gap>> = {};
			for (const mode of MODES) {
				for (const gap of perMode[mode].gaps) {
					(byId[gap.id] ??= {})[mode] ??= gap;
				}
			}
			for (const [id, modes] of Object.entries(byId)) {
				const entries = Object.entries(modes).map(([mode, gap]) => [Number(mode), gap] as const);
				if (entries.length < 2 || LEGITIMATE_DIFFERENCES.has(entries[0][1].key)) continue;
				const values = entries.map(([, gap]) => gap.gap);
				if (Math.max(...values) - Math.min(...values) > TOLERANCE) {
					findings.push(
						`${url} @${width}: gap ${id} differs: ${entries
							.map(([mode, gap]) => `m${mode}=${gap.gap}`)
							.join(' ')}`
					);
				}
			}
		}
	}

	expect(runs, 'page-width-mode coverage').toBe(expectedRuns);
	expect(gapProbes, 'adjacent-block probes must not be vacuous').toBeGreaterThan(0);
	expect(controlProbes, 'control probes must not be vacuous').toBeGreaterThan(0);
	expect(emptyRuns, 'every matrix cell must measure adjacent blocks').toEqual([]);
	expect(findings, findings.join('\n')).toEqual([]);
});
