import {
	bibliographyEvidencePaths,
	bibliographyResourcePaths,
	languageTextMetadataFor,
	textMetadataFor
} from './corpus-metadata';
import type { Citation } from './corpus';
import type { Lang } from './i18n';
import { remember } from './remember';

export type BibliographySectionId =
	| 'latin_textual_sources'
	| 'wording_witnesses'
	| 'official_documents_and_liturgical_history'
	| 'scripture_language_and_scholarship';

export type BibliographyRole =
	| 'controlling_official_text'
	| 'direct_approved_print'
	| 'historical_context'
	| 'historical_wording_basis'
	| 'historical_wording_comparator'
	| 'official_liturgical_context'
	| 'scripture_control';

interface WorkRecord {
	id: string;
	title: string;
	responsible?: string;
}

interface EditionRecord {
	id: string;
	work: string;
	title: string;
	recension?: string;
	edition_statement?: string;
	place?: string;
	publisher?: string;
	year?: string;
	publication_type: string;
	authority: string;
}

interface DigitalItemRecord {
	id: string;
	edition: string;
	repository: string;
	kind: string;
	record_url?: string;
	scan_url?: string;
	access: string;
}

interface Catalog {
	schema_version: string;
	works: WorkRecord[];
	editions: EditionRecord[];
	digital_items: DigitalItemRecord[];
}

interface IndexText {
	id: string;
	roles: BibliographyRole[];
	uses: number;
}

interface IndexEntry {
	edition: string;
	roles: BibliographyRole[];
	texts: IndexText[];
}

interface BibliographyIndex {
	schema_version: string;
	sections: { id: BibliographySectionId; entries: IndexEntry[] }[];
}

interface EvidenceAddress {
	kind: 'text' | 'segment';
	segment?: string;
}

interface EvidenceSourceGroup {
	edition: string;
	digital_item: string;
	role: BibliographyRole;
	locator: {
		printed?: string;
		scan?: string;
		section?: string;
		page_url?: string;
	};
	entries: { id: string; address: EvidenceAddress; claim: string }[];
}

interface EvidenceDocument {
	id: string;
	source_groups: EvidenceSourceGroup[];
}

type JsonModule = { default: unknown };
type JsonImport = () => Promise<JsonModule>;

// Both the catalogue and each evidence slice are real lazy boundaries. The
// bibliography page opens with a few dozen compact source-to-text records;
// opening one source imports only the text evidence named by that record.
const BIBLIOGRAPHY_MODULES = {
	...import.meta.glob('./data/bibliography/**/*.json'),
	...import.meta.glob('./data/languages/*/bibliography/**/*.json')
} as Record<string, JsonImport>;
const RESOURCE_CACHE = new Map<string, Promise<unknown>>();

function loadResource<T>(path: string): Promise<T> {
	const moduleImport = BIBLIOGRAPHY_MODULES[`./data/${path}`];
	if (!moduleImport) throw new Error(`${path} was declared but not vendored`);
	return remember(RESOURCE_CACHE, path, () =>
		moduleImport().then((module) => module.default)
	) as Promise<T>;
}

export interface BibliographySource {
	id: string;
	section: BibliographySectionId;
	title: string;
	meta: string[];
	authority: string;
	roles: BibliographyRole[];
	texts: IndexText[];
	textCount: number;
	useCount: number;
}

export interface BibliographySection {
	id: BibliographySectionId;
	sources: BibliographySource[];
}

export interface BibliographyPageData extends Record<string, unknown> {
	sections: BibliographySection[];
	sourceCount: number;
}

export interface BibliographyUse {
	key: string;
	title: string;
	href: string;
	kind: 'text' | 'segment' | 'range';
	first?: number;
	last?: number;
}

export interface BibliographyDetailGroup {
	key: string;
	role: BibliographyRole;
	printed?: string;
	scan?: string;
	section?: string;
	url?: string;
	repository?: string;
	uses: BibliographyUse[];
}

export interface TextBibliographyEvidence {
	context: Citation[];
	translation: Citation[];
}

function mergeCatalog(root: Catalog, language: Catalog): Catalog {
	function mergeById<T extends { id: string }>(left: T[], right: T[]): T[] {
		const merged = new Map(left.map((record) => [record.id, record]));
		for (const record of right) {
			const current = merged.get(record.id);
			if (current && JSON.stringify(current) !== JSON.stringify(record)) {
				throw new Error(`${record.id} differs between the neutral and language catalogues`);
			}
			merged.set(record.id, record);
		}
		return [...merged.values()];
	}
	return {
		schema_version: root.schema_version,
		works: mergeById(root.works, language.works),
		editions: mergeById(root.editions, language.editions),
		digital_items: mergeById(root.digital_items, language.digital_items)
	};
}

function sourceMeta(work: WorkRecord, edition: EditionRecord): string[] {
	const publication = [edition.place, edition.publisher].filter(Boolean).join(': ');
	return [
		work.responsible,
		edition.edition_statement,
		publication || undefined,
		edition.year
	].filter((value): value is string => Boolean(value));
}

function localizedTitle(id: string, lang: Lang): string {
	const key = id.replace('.', '/');
	return languageTextMetadataFor(key, lang)?.title ?? textMetadataFor(key)?.title ?? id;
}

async function resources(lang: Lang): Promise<{ catalog: Catalog; index: BibliographyIndex }> {
	const paths = bibliographyResourcePaths(lang);
	const [rootCatalog, languageCatalog, index] = await Promise.all([
		loadResource<Catalog>(paths.root.catalog),
		loadResource<Catalog>(paths.language.catalog),
		loadResource<BibliographyIndex>(paths.language.index)
	]);
	return { catalog: mergeCatalog(rootCatalog, languageCatalog), index };
}

export async function buildBibliography(lang: Lang): Promise<BibliographyPageData> {
	const { catalog, index } = await resources(lang);
	const works = new Map(catalog.works.map((record) => [record.id, record]));
	const editions = new Map(catalog.editions.map((record) => [record.id, record]));
	const sections = index.sections.map((section) => ({
		id: section.id,
		sources: section.entries.map((entry) => {
			const edition = editions.get(entry.edition);
			if (!edition) throw new Error(`${entry.edition} has no catalogue record`);
			const work = works.get(edition.work);
			if (!work) throw new Error(`${edition.work} has no catalogue record`);
			return {
				id: edition.id,
				section: section.id,
				title: edition.title,
				meta: sourceMeta(work, edition),
				authority: edition.authority,
				roles: entry.roles,
				texts: entry.texts,
				textCount: entry.texts.length,
				useCount: entry.texts.reduce((total, text) => total + text.uses, 0)
			};
		})
	}));
	return {
		sections,
		sourceCount: new Set(sections.flatMap((section) => section.sources.map((source) => source.id)))
			.size
	};
}

function compactSegments(textId: string, segments: string[], lang: Lang): BibliographyUse[] {
	const key = textId.replace('.', '/');
	const title = localizedTitle(textId, lang);
	const numbers = [...new Set(segments)]
		.map((segment) => ({ segment, number: /^s(\d+)$/.exec(segment)?.[1] }))
		.sort((a, b) =>
			a.number && b.number
				? Number(a.number) - Number(b.number)
				: a.segment.localeCompare(b.segment)
		);
	const uses: BibliographyUse[] = [];
	let run: { segment: string; value: number }[] = [];
	const flush = () => {
		if (!run.length) return;
		const first = run[0];
		const last = run.at(-1)!;
		uses.push({
			key: `${textId}:${first.segment}:${last.segment}`,
			title,
			href: `/app/${lang}/${key}?s=${first.segment}${run.length > 1 ? `-${last.segment}` : ''}`,
			kind: run.length > 1 ? 'range' : 'segment',
			first: first.value,
			last: last.value
		});
		run = [];
	};
	for (const item of numbers) {
		if (!item.number) {
			flush();
			uses.push({
				key: `${textId}:${item.segment}`,
				title,
				href: `/app/${lang}/${key}?s=${item.segment}`,
				kind: 'segment'
			});
			continue;
		}
		const value = Number(item.number);
		if (run.length && value !== run.at(-1)!.value + 1) flush();
		run.push({ segment: item.segment, value });
	}
	flush();
	return uses;
}

function compactUses(
	entries: { textId: string; address: EvidenceAddress }[],
	lang: Lang
): BibliographyUse[] {
	const byText = new Map<string, EvidenceAddress[]>();
	for (const entry of entries) {
		const addresses = byText.get(entry.textId) ?? [];
		addresses.push(entry.address);
		byText.set(entry.textId, addresses);
	}
	return [...byText.entries()].flatMap(([textId, addresses]) => {
		const title = localizedTitle(textId, lang);
		const key = textId.replace('.', '/');
		const out: BibliographyUse[] = [];
		if (addresses.some(({ kind }) => kind === 'text')) {
			out.push({ key: `${textId}:text`, title, href: `/app/${lang}/${key}`, kind: 'text' });
		}
		out.push(
			...compactSegments(
				textId,
				addresses.flatMap(({ kind, segment }) => (kind === 'segment' && segment ? [segment] : [])),
				lang
			)
		);
		return out;
	});
}

export async function loadBibliographySource(
	lang: Lang,
	source: BibliographySource
): Promise<BibliographyDetailGroup[]> {
	const { catalog } = await resources(lang);
	const items = new Map(catalog.digital_items.map((record) => [record.id, record]));
	const loaded = await Promise.all(
		source.texts.flatMap(({ id }) => {
			const key = id.replace('.', '/');
			const paths = bibliographyEvidencePaths(key, lang);
			return [paths.root, paths.language]
				.filter((path): path is string => Boolean(path))
				.map(async (path) => ({
					textId: id,
					evidence: await loadResource<EvidenceDocument>(path)
				}));
		})
	);
	const groups = new Map<
		string,
		{ source: EvidenceSourceGroup; entries: { textId: string; address: EvidenceAddress }[] }
	>();
	for (const { textId, evidence } of loaded) {
		for (const group of evidence.source_groups.filter(({ edition }) => edition === source.id)) {
			const key = [group.digital_item, group.role, JSON.stringify(group.locator)].join('\u0000');
			const found = groups.get(key) ?? { source: group, entries: [] };
			found.entries.push(...group.entries.map(({ address }) => ({ textId, address })));
			groups.set(key, found);
		}
	}
	return [...groups.entries()].map(([key, group]) => {
		const item = items.get(group.source.digital_item);
		if (!item) throw new Error(`${group.source.digital_item} has no catalogue record`);
		return {
			key,
			role: group.source.role,
			printed: group.source.locator.printed,
			scan: group.source.locator.scan,
			section: group.source.locator.section,
			url: group.source.locator.page_url ?? item.scan_url ?? item.record_url,
			repository: item.repository,
			uses: compactUses(group.entries, lang)
		};
	});
}

function evidenceCitation(
	group: EvidenceSourceGroup,
	editions: Map<string, EditionRecord>,
	items: Map<string, DigitalItemRecord>
): Citation {
	const edition = editions.get(group.edition);
	if (!edition) throw new Error(`${group.edition} has no catalogue record`);
	const item = items.get(group.digital_item);
	if (!item) throw new Error(`${group.digital_item} has no catalogue record`);
	return {
		title: edition.title,
		locator: [group.locator.section, group.locator.printed, group.locator.scan]
			.filter(Boolean)
			.join(' · '),
		url: group.locator.page_url ?? item.scan_url ?? item.record_url
	};
}

function uniqueCitations(citations: Citation[]): Citation[] {
	const found = new Map<string, Citation>();
	for (const citation of citations) {
		found.set(`${citation.title}\u0000${citation.locator}\u0000${citation.url ?? ''}`, citation);
	}
	return [...found.values()];
}

/** Verified source disclosures for one reading page.
 *
 * Passing even an empty array is significant: it prevents the reading from
 * falling back to the legacy inline citation inventory while that inventory
 * is being migrated. An unresolved citation is absent, never made to look
 * verified by a familiar title.
 */
export async function loadTextBibliography(
	lang: Lang,
	key: string
): Promise<TextBibliographyEvidence> {
	const { catalog } = await resources(lang);
	const editions = new Map(catalog.editions.map((record) => [record.id, record]));
	const items = new Map(catalog.digital_items.map((record) => [record.id, record]));
	const paths = bibliographyEvidencePaths(key, lang);
	const [neutral, language] = await Promise.all([
		paths.root ? loadResource<EvidenceDocument>(paths.root) : undefined,
		paths.language ? loadResource<EvidenceDocument>(paths.language) : undefined
	]);
	return {
		context: uniqueCitations(
			(neutral?.source_groups ?? []).map((group) => evidenceCitation(group, editions, items))
		),
		translation: uniqueCitations(
			(language?.source_groups ?? []).map((group) => evidenceCitation(group, editions, items))
		)
	};
}
