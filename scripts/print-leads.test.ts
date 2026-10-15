import { describe, expect, it } from 'vitest';
import { assertPrintTools, printLeadPages, type PrintLead } from './print-leads';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('actual PDF tool dependency', () => {
	it('recognizes the installed extractor', () => {
		expect(() => assertPrintTools()).not.toThrow();
	});
	it('fails clearly when the native extractor is actually unavailable', () => {
		const missingTools = mkdtempSync(join(tmpdir(), 'print-tools-'));
		expect(() => assertPrintTools({ ...process.env, PATH: missingTools })).toThrow(
			'require Poppler pdftotext'
		);
	});
});

const line = (y: number, text: string) =>
	`<line>${text
		.split(' ')
		.map((word) => `<word xMin="40" xMax="40" yMin="${y}" yMax="${y + 15}">${word}</word>`)
		.join('')}</line>`;
const page = (...lines: string[]) => `<page>${lines.join('')}</page>`;
const lead: PrintLead = {
	title: 'Deus, qui humánæ substántiæ',
	guidance: 'A drop of water goes into the wine.',
	words: ['Deus,', 'qui', 'humánæ', 'substántiæ', 'dignitátem', 'mirabíliter'],
	initial: 'D'
};
const heading = line(10, lead.title);
const guidance = line(20, lead.guidance);
const sacred = line(32, 'D') + line(40, 'eus, qui humánæ substántiæ dignitátem mirabíliter');

describe('complete actual PDF sacred opening', () => {
	it('joins an isolated initial-token fragment only to complete source on the same baseline', () => {
		const fragment = line(40, 'qui humánæ substántiæ dignitátem mirabíliter')
			.replaceAll('xMin="40"', 'xMin="80"')
			.replaceAll('xMax="40"', 'xMax="80"');
		const split = line(32, 'D') + line(40, 'eus,');
		expect(printLeadPages(page(heading, guidance, split, fragment), lead)).toEqual([1]);
		expect(
			printLeadPages(
				page(heading, guidance, split, fragment.replaceAll('mirabíliter', 'Wrong')),
				lead
			)
		).toEqual([]);
		expect(
			printLeadPages(
				page(heading, guidance, split, fragment.replaceAll('yMin="40"', 'yMin="42"')),
				lead
			)
		).toEqual([]);
		expect(printLeadPages(page(heading, guidance, line(40, 'eus,'), fragment), lead)).toEqual([]);
	});
	it('associates complete guidance and the actual first sacred line', () => {
		expect(printLeadPages(page(heading, guidance, sacred), lead)).toEqual([1]);
	});
	it('rejects a title that repeats the first source words above guidance', () => {
		expect(printLeadPages(page(heading, guidance) + page(sacred), lead)).toEqual([]);
		expect(
			printLeadPages(
				page(guidance, line(40, 'Deus, qui humánæ substántiæ dignitátem mirabíliter')),
				lead
			)
		).toEqual([]);
	});
	it('rejects incomplete guidance, missing initial ink and a noncontiguous source line', () => {
		expect(
			printLeadPages(
				page(heading, guidance, line(40, 'eus, qui humánæ substántiæ dignitátem mirabíliter')),
				lead
			)
		).toEqual([]);
		expect(printLeadPages(page(heading, line(20, 'A drop of water'), sacred), lead)).toEqual([]);
		const noTitleWord = { ...lead, title: 'Prayer' };
		expect(
			printLeadPages(
				page(
					line(10, 'Prayer'),
					guidance,
					line(40, 'eus, qui humánæ substántiæ dignitátem mirabíliter')
				),
				noTitleWord
			)
		).toEqual([]);
		expect(
			printLeadPages(
				page(heading, guidance, line(40, 'eus, humánæ qui substántiæ dignitátem mirabíliter')),
				lead
			)
		).toEqual([]);
	});
	it('requires the complete actual line rather than accepting its first four words', () => {
		expect(
			printLeadPages(
				page(heading, guidance, sacred + line(50, 'eus, qui humánæ substántiæ Wrong ending')),
				lead
			)
		).toEqual([1]);
		expect(
			printLeadPages(
				page(heading, guidance, line(40, 'Deus, qui humánæ substántiæ Wrong ending')),
				lead
			)
		).toEqual([]);
	});
	it('fails for zero source words or empty guidance', () => {
		expect(printLeadPages(page(heading, guidance, sacred), { ...lead, words: [] })).toEqual([]);
		expect(printLeadPages(page(heading, guidance, sacred), { ...lead, guidance: '' })).toEqual([]);
	});
});
