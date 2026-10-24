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
		const positioned = (text: string, x: number) =>
			`<line>${text
				.split(' ')
				.map(
					(word, i) =>
						`<word xMin="${x + i * 30}" xMax="${x + i * 30 + 24}" yMin="40" yMax="55">${word}</word>`
				)
				.join('')}</line>`;
		const fragment = positioned('qui humánæ substántiæ dignitátem mirabíliter', 70);
		const split = line(32, 'D') + positioned('eus,', 40);
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
		expect(printLeadPages(page(heading, guidance, positioned('eus,', 40), fragment), lead)).toEqual(
			[]
		);
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

const measuredLead: PrintLead = {
	title: 'Epístola',
	guidance: 'At the Epistle side the priest reads the day’s Epistle.',
	words: ['Léctio', 'Epístolæ', 'beáti', 'Ioánnis', 'Apóstoli'],
	initial: 'L'
};
const measuredHeading = line(36.804748, measuredLead.title);
const measuredGuidance = line(53.624997, measuredLead.guidance);
// An interlinear baseline can span three positioned-text line records.
const measuredFirst = `<line>
<word xMin="43.066404" xMax="53.797405" yMin="65.043746" yMax="88.931247">L</word>
<word xMin="53.800779" xMax="72.498278" yMin="72.524996" yMax="86.174997">éctio</word>
<word xMin="74.800778" xMax="108.399277" yMin="72.524996" yMax="86.174997">Epístolæ</word>
</line>`;
const measuredMiddle = `<line>
<word xMin="121.687495" xMax="140.759994" yMin="72.524996" yMax="86.174997">beáti</word>
</line>`;
const measuredFinal = `<line>
<word xMin="151.652337" xMax="181.293836" yMin="72.524996" yMax="86.174997">Ioánnis</word>
<word xMin="183.902340" xMax="218.724839" yMin="72.524996" yMax="86.174997">Apóstoli</word>
</line>`;
const measuredPage = (...fragments: string[]) =>
	page(measuredHeading, measuredGuidance, ...fragments);
const measuredHealthy = () =>
	printLeadPages(measuredPage(measuredFirst, measuredMiddle, measuredFinal), measuredLead);

describe('adjacent multi-fragment sacred baseline', () => {
	it('retains the complete two-plus-one-plus-two opening in geometric order', () => {
		expect(measuredHealthy()).toEqual([1]);
		expect(
			printLeadPages(measuredPage(measuredFinal, measuredFirst, measuredMiddle), measuredLead)
		).toEqual([1]);
	});
	it('does not absorb a distant separate column after a complete source cluster', () => {
		const column = `<line><word xMin="400" xMax="430" yMin="72.524996" yMax="86.174997">Translation</word></line>`;
		expect(
			printLeadPages(
				measuredPage(measuredFirst, measuredMiddle, measuredFinal, column),
				measuredLead
			)
		).toEqual([1]);
	});
	it.each([
		[
			'intervening wrong fragment',
			measuredPage(
				measuredFirst,
				`<line><word xMin="112" xMax="118" yMin="72.524996" yMax="86.174997">Wrong</word></line>`,
				measuredMiddle,
				measuredFinal
			)
		],
		[
			'wrong trailing word',
			measuredPage(
				measuredFirst,
				measuredMiddle,
				measuredFinal,
				`<line><word xMin="222" xMax="240" yMin="72.524996" yMax="86.174997">Wrong</word></line>`
			)
		],
		[
			'reordered source words',
			measuredPage(
				measuredFirst,
				measuredMiddle.replace('beáti', 'Ioánnis'),
				measuredFinal.replace('Ioánnis', 'beáti')
			)
		],
		[
			'overlapping needed fragment',
			measuredPage(measuredFirst, measuredMiddle.replace('121.687495', '107'), measuredFinal)
		],
		[
			'large gap before needed fragments',
			measuredPage(
				measuredFirst,
				measuredMiddle.replace('121.687495', '300').replace('140.759994', '320'),
				measuredFinal
					.replace('151.652337', '330')
					.replace('181.293836', '350')
					.replace('183.902340', '354')
					.replace('218.724839', '390')
			)
		],
		[
			'wrong baseline',
			measuredPage(
				measuredFirst,
				measuredMiddle,
				measuredFinal.replaceAll('72.524996', '74.524996').replaceAll('86.174997', '88.174997')
			)
		],
		[
			'missing raised initial',
			measuredPage(measuredFirst.replace(/<word[^>]*>L<\/word>/, ''), measuredMiddle, measuredFinal)
		],
		['page boundary', measuredPage(measuredFirst) + page(measuredMiddle, measuredFinal)]
	])('rejects %s and retains the restored exact source', (_name, bbox) => {
		expect(measuredHealthy()).toEqual([1]);
		expect(printLeadPages(bbox, measuredLead)).toEqual([]);
		expect(measuredHealthy()).toEqual([1]);
	});
});
