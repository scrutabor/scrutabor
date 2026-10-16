import { expect, test } from './fixtures';
import { execFileSync } from 'node:child_process';
import { printLeadPages, normalizePrintText, positionedPrintWords } from '../scripts/print-leads';

/** Check actual page coordinates; an unpaginated DOM rect cannot see a
 * continued grid item collide with the next row on another sheet. */
function finalResponseGap(bbox: string, label: string): number {
	const pages = [...bbox.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/g)].map((m) =>
		positionedPrintWords(m[1])
	);
	const ending = ['ómnia', 'sǽcula', 'sæculórum.'].map(normalizePrintText);
	const candidates = pages.flatMap((words, page) =>
		words.flatMap((word, index) =>
			ending.every((text, i) => words[index + i]?.text === text)
				? [{ page, words: words.slice(index, index + ending.length) }]
				: []
		)
	);
	expect(candidates.length, 'complete printed Latin conclusion').toBeGreaterThan(0);
	const last = candidates.at(-1)!;
	const bottom = Math.max(...last.words.map((word) => word.yEnd));
	const labels = pages[last.page].filter((word) => word.yEnd - word.y < 7);
	const lines = [...new Set(labels.map((word) => word.y))].map((y) => ({
		y,
		text: labels
			.filter((word) => Math.abs(word.y - y) < 0.1)
			.sort((a, b) => a.x - b.x)
			.map((word) => word.text)
			.join('')
	}));
	const matched = lines.filter((line) => line.text === normalizePrintText(label));
	expect(matched, 'complete response label on the conclusion page').toHaveLength(1);
	return matched[0].y - bottom;
}

test('actual bilingual A4 pages keep the Secret opening and separate the final response', async ({
	page,
	browserName
}, testInfo) => {
	test.skip(browserName !== 'chromium', 'Native PDF generation is Chromium-only.');
	await page.addInitScript(() => {
		localStorage.setItem('scrutabor-help', '2');
		localStorage.setItem('scrutabor-reading', 'normal');
		localStorage.setItem('scrutabor-theme', 'light');
	});
	await page.setViewportSize({ width: 1512, height: 1000 });
	await page.goto('/app/en/formularium/sanctissimae-trinitatis');
	await page.evaluate(() => document.fonts.ready);
	const secret = page.locator('#text-proprium-sanctissimae-trinitatis-secreta');
	const lead = await secret.evaluate((section) => ({
		title: section.querySelector('h2')!.textContent!,
		guidance: section.querySelector('.who')!.textContent!,
		words: [...section.querySelector('.verse')!.querySelectorAll('.base')].map(
			(word) => word.textContent!
		),
		initial: section.querySelector('.initial')!.textContent!
	}));
	const responseLabel = await page
		.locator('#text-proprium-sanctissimae-trinitatis-postcommunio .who')
		.last()
		.textContent();
	const pdf = testInfo.outputPath('trinity-bilingual.pdf');
	await page.pdf({ path: pdf, format: 'A4', printBackground: true });
	const bbox = execFileSync('pdftotext', ['-bbox-layout', pdf, '-'], { encoding: 'utf8' });
	expect
		.soft(printLeadPages(bbox, lead), 'Secret title, voice and actual source opening share paper')
		.toHaveLength(1);
	expect(
		finalResponseGap(bbox, responseLabel!),
		'response label clears the complete Latin ending'
	).toBeGreaterThan(2);
});

test('a continued bilingual source row clears its response on the next actual sheet', async ({
	page,
	browserName
}, testInfo) => {
	test.skip(browserName !== 'chromium', 'Native PDF generation is Chromium-only.');
	await page.addInitScript(() => {
		localStorage.setItem('scrutabor-help', '2');
		localStorage.setItem('scrutabor-reading', 'normal');
	});
	await page.setViewportSize({ width: 1512, height: 1000 });
	await page.goto('/app/en/formularium/sanctissimae-trinitatis');
	await page.evaluate(() => document.fonts.ready);
	const label = await page
		.locator('#text-proprium-sanctissimae-trinitatis-postcommunio .who')
		.last()
		.textContent();
	const identity = await page.evaluate(() => {
		const part = document.querySelector('#text-proprium-sanctissimae-trinitatis-postcommunio')!;
		const before = [...part.querySelectorAll('.base, .translation, .who')].map(
			(e) => e.textContent
		);
		const first = part.querySelector('.bilingual')!;
		const flow = first.cloneNode(false);
		const columns = first.querySelector('.columns')!.cloneNode(false);
		// Exercise the renderer's loose long row independently of the page's
		// heading association. Retain every real row and its complete words.
		for (const unit of part.querySelectorAll('.flow-unit')) columns.appendChild(unit);
		flow.appendChild(columns);
		document.querySelector('.page > header')!.remove();
		const spacer = document.createElement('div');
		spacer.style.height = '680pt';
		document.querySelector('main')!.replaceChildren(spacer, flow);
		return {
			before,
			after: [...document.querySelectorAll('main .base, main .translation, main .who')].map(
				(e) => e.textContent
			)
		};
	});
	expect(identity.after).toEqual(identity.before);
	await page.emulateMedia({ media: 'print' });
	await expect(page.locator('.flow-unit').first()).toHaveCSS('break-inside', 'auto');
	const pdf = testInfo.outputPath('continued-source-row.pdf');
	await page.pdf({ path: pdf, format: 'A4', printBackground: true });
	const bbox = execFileSync('pdftotext', ['-bbox-layout', pdf, '-'], { encoding: 'utf8' });
	const pages = [...bbox.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/g)];
	expect(pages, 'the loose source row really continues').toHaveLength(2);
	expect(
		positionedPrintWords(pages[0][1])
			.map((w) => w.text)
			.join('')
	).toContain('nobisadsalutem');
	expect(
		finalResponseGap(bbox, label!),
		'continued Latin clears its complete response label'
	).toBeGreaterThan(2);
});
