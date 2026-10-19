import { beforeEach, describe, expect, test, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
	catalog: {} as Record<string, unknown>,
	index: {} as Record<string, unknown>,
	catalogReads: 0,
	indexReads: 0
}));

vi.mock('./data/bibliography/catalog.json', () => ({
	get default() {
		fixture.catalogReads++;
		return fixture.catalog;
	}
}));
vi.mock('./data/bibliography/index.json', () => ({
	get default() {
		fixture.indexReads++;
		return fixture.index;
	}
}));
vi.mock('./corpus-metadata', async (importOriginal) => ({
	...(await importOriginal<typeof import('./corpus-metadata')>()),
	bibliographyResourcePaths: () => ({
		root: { catalog: 'bibliography/catalog.json', index: 'bibliography/index.json' },
		language: { catalog: 'must-not-load/catalog.json', index: 'must-not-load/index.json' }
	}),
	bibliographyEvidencePaths: () => {
		throw new Error('Text evidence must not be loaded');
	},
	languageTextMetadataFor: () => {
		throw new Error('Text metadata must not be loaded');
	},
	textMetadataFor: () => {
		throw new Error('Text metadata must not be loaded');
	}
}));

function catalog() {
	return {
		schema_version: '1',
		works: [{ id: 'work.lexicon', title: 'Lexicon' }],
		editions: [{ id: 'edition.lexicon', work: 'work.lexicon', title: 'Lexicon' }],
		digital_items: [
			{ id: 'item.lexicon', edition: 'edition.lexicon', scan_url: 'https://example.org/book' }
		]
	};
}

function group(role = 'lexical_support', lemma = 'veneror') {
	return {
		edition: 'edition.lexicon',
		digital_item: 'item.lexicon',
		role,
		locator: {
			section: 'entry 42',
			printed: 'p. 10',
			scan: 'PDF page 12',
			page_url: 'https://example.org/book#page=12'
		},
		entries: [{ id: 'use.lemma', address: { kind: 'lemma', lemma }, claim: 'A dictionary fact.' }],
		verified_on: '2026-10-17',
		private_archive: 'must-not-project',
		decision_reason: 'must-not-project'
	};
}

function index(groups = [group()], lemma = 'veneror') {
	return {
		schema_version: '1',
		sections: [
			{
				id: 'scripture_language_and_scholarship',
				entries: [
					{
						edition: 'edition.lexicon',
						roles: [],
						texts: [],
						lemmas: [{ id: lemma, source_groups: groups }]
					}
				]
			}
		]
	};
}

beforeEach(() => {
	vi.resetModules();
	fixture.catalog = catalog();
	fixture.index = index();
	fixture.catalogReads = 0;
	fixture.indexReads = 0;
});

async function load(lang: 'pl' | 'en' = 'en', lemma = 'veneror') {
	return (await import('./bibliography')).loadLemmaSupport(lang, lemma);
}

describe('neutral dictionary support for word cards', () => {
	test.each(['pl', 'en'] as const)('loads only neutral resources in %s', async (lang) => {
		expect(await load(lang)).toEqual([
			{
				title: 'Lexicon',
				locator: 'entry 42 · p. 10 · PDF page 12',
				url: 'https://example.org/book#page=12'
			}
		]);
	});

	test('includes grammatical support', async () => {
		fixture.index = index([group('grammatical_support')]);
		expect(await load()).toHaveLength(1);
	});

	test('shares pending and completed root resources between card members', async () => {
		await Promise.all([load('pl'), load('en'), load('en', 'sum')]);
		expect(fixture.catalogReads).toBe(1);
		expect(fixture.indexReads).toBe(1);
		await load();
		expect(fixture.catalogReads).toBe(1);
		expect(fixture.indexReads).toBe(1);
	});

	test('does not treat another lemma or capitalization as this entry', async () => {
		expect(await load('en', 'Veneror')).toEqual([]);
		expect(await load('en', 'sum')).toEqual([]);
	});

	test.each([
		'official_text',
		'direct_approved_print',
		'corroborating_latin_witness',
		'derived_digital_collation_aid',
		'historical_wording_basis',
		'historical_wording_comparator',
		'official_liturgical_context',
		'rubric_control',
		'liturgical_history',
		'quotation_control',
		'scripture_text',
		'semantic_comparator',
		'search_aid'
	])('does not promote %s into dictionary support', async (role) => {
		fixture.index = index([group(role)]);
		expect(await load()).toEqual([]);
	});

	test('keeps supported and unsupported roles separate within one edition', async () => {
		const unwanted = group('historical_wording_basis');
		unwanted.locator.section = 'translation wording';
		fixture.index = index([group(), unwanted]);
		expect(await load()).toHaveLength(1);
		expect((await load())[0].locator).not.toContain('translation');
	});

	test('returns an honest empty list when no support was projected', async () => {
		fixture.index = index([]);
		expect(await load()).toEqual([]);
	});

	test('deduplicates identical display references without merging other locators', async () => {
		const other = group();
		other.locator.section = 'entry 43';
		const otherUrl = group();
		otherUrl.locator.page_url = 'https://example.org/another-scan#page=12';
		fixture.index = index([group(), group(), other, otherUrl]);
		expect(await load()).toHaveLength(3);
	});

	test('projects only title, locator and public URL', async () => {
		expect(Object.keys((await load())[0]).sort()).toEqual(['locator', 'title', 'url']);
		expect(JSON.stringify(await load())).not.toContain('must-not-project');
	});

	test.each(['word', 'segment', 'text', 'another-lemma'])(
		'rejects a mismatched %s address',
		async (kind) => {
			const wrong = group();
			wrong.entries[0].address = { kind: kind === 'another-lemma' ? 'lemma' : kind, lemma: 'sum' };
			fixture.index = index([wrong]);
			await expect(load()).rejects.toThrow('different or missing lemma address');
		}
	);

	test('rejects a source group without an actual supporting entry', async () => {
		const empty = group();
		empty.entries = [];
		fixture.index = index([empty]);
		await expect(load()).rejects.toThrow('different or missing lemma address');
	});

	test('rejects a mixed group rather than borrowing its one correct member', async () => {
		const mixed = group();
		mixed.entries.push({
			id: 'use.other',
			address: { kind: 'lemma', lemma: 'sum' },
			claim: 'Another fact.'
		});
		fixture.index = index([mixed]);
		await expect(load()).rejects.toThrow('different or missing lemma address');
	});

	test.each(['edition', 'digital_item'] as const)(
		'does not hide a missing %s catalogue record',
		async (field) => {
			const broken = group();
			broken[field] = 'unknown';
			fixture.index = index([broken]);
			await expect(load()).rejects.toThrow('no catalogue record');
		}
	);
});
