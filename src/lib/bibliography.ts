import {
	bibliographyEvidencePaths,
	bibliographyResourcePaths,
	languageTextMetadataFor,
	textMetadataFor
} from './corpus-metadata';
import type { Citation, CitationLink } from './corpus';
import type { Lang } from './i18n';
import { remember } from './remember';
import { formatSourceLocator, sourcePassageLink, sourcePassageNote } from './source-locator';
import { lemmaHref } from './lemma-url';
import { textHref } from './content-url';

export type BibliographySectionId =
	| 'latin_textual_sources'
	| 'wording_witnesses'
	| 'official_documents_and_liturgical_history'
	| 'scripture_language_and_scholarship';

export type BibliographyRole =
	| 'official_text'
	| 'direct_approved_print'
	| 'corroborating_latin_witness'
	| 'derived_digital_collation_aid'
	| 'historical_wording_basis'
	| 'historical_wording_comparator'
	| 'official_liturgical_context'
	| 'rubric_control'
	| 'liturgical_history'
	| 'quotation_control'
	| 'scripture_text'
	| 'lexical_support'
	| 'grammatical_support'
	| 'semantic_comparator'
	| 'search_aid';

interface WorkRecord {
	id: string;
	title: string;
	responsible?: string;
}

interface PublicationEvent {
	kind:
		| 'copyright'
		| 'imprimatur'
		| 'typical_edition'
		| 'title_page'
		| 'ecclesiastical_approval'
		| 'digital_publication'
		| 'digital_reproduction'
		| 'revision'
		| 'reprint_of';
	date: string;
}

interface EditionRecord {
	id: string;
	work: string;
	title: string;
	recension?: string;
	edition_statement?: string;
	contributors?: string[];
	additional_imprints?: { place: string; publisher: string }[];
	publication_events?: PublicationEvent[];
	volume?: string;
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
	accessed_on?: string;
	publication_events?: PublicationEvent[];
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
	lemmas: IndexLemma[];
}

interface IndexLemma extends IndexText {
	source_groups: EvidenceSourceGroup[];
}

interface BibliographyIndex {
	schema_version: string;
	sections: { id: BibliographySectionId; entries: IndexEntry[] }[];
}

interface EvidenceAddress {
	kind: 'text' | 'segment' | 'word' | 'lemma';
	segment?: string;
	word?: string;
	lemma?: string;
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
		passages?: { heading: string; url: string }[];
	};
	entries: { id: string; address: EvidenceAddress; claim: string; reader_note?: string }[];
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
	lemmas: IndexLemma[];
	textCount: number;
	lemmaCount: number;
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
	kind: 'text' | 'segment' | 'range' | 'word' | 'lemma';
	first?: number;
	last?: number;
}

export interface BibliographyDetailGroup {
	displayLocator?: string;
	passages?: CitationLink[];
	key: string;
	role: BibliographyRole;
	printed?: string;
	scan?: string;
	section?: string;
	url?: string;
	repository?: string;
	uses: BibliographyUse[];
	notes?: string[];
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

const contributorRoles: Record<Lang, Record<string, string>> = {
	pl: {
		editor: 'red.',
		editors: 'red.',
		translator: 'tłum.',
		reviser: 'oprac.',
		collaborator: 'współpr.',
		compiler: 'zebr.',
		preface: 'przedm.',
		'commissioning body': 'na polecenie',
		'arranger and translator': 'układ i przekład',
		'arranger and principal translator': 'układ i przekład większości tekstów'
	},
	en: {
		editor: 'ed.',
		editors: 'eds.',
		translator: 'trans.',
		reviser: 'rev.',
		collaborator: 'with',
		compiler: 'comp.',
		preface: 'preface by',
		'commissioning body': 'by order of the',
		'arranger and translator': 'arranged and translated by',
		'arranger and principal translator': 'arranged and largely translated by'
	}
};

const publicationEventLabels: Record<Lang, Record<PublicationEvent['kind'], string>> = {
	pl: {
		copyright: '©',
		imprimatur: 'imprimatur',
		typical_edition: 'dekret o wydaniu typicznym',
		title_page: 'na karcie tytułowej',
		ecclesiastical_approval: 'aprobata kościelna',
		digital_publication: 'wydanie elektroniczne',
		digital_reproduction: 'reprodukcja cyfrowa',
		revision: 'wersja z',
		reprint_of: 'przedruk wydania z'
	},
	en: {
		copyright: '©',
		imprimatur: 'imprimatur',
		typical_edition: 'decree on the typical edition',
		title_page: 'title-page date',
		ecclesiastical_approval: 'ecclesiastical approval',
		digital_publication: 'electronic publication',
		digital_reproduction: 'digital reproduction',
		revision: 'revised',
		reprint_of: 'reprint of the edition of'
	}
};

function publicationDate(value: string, lang: Lang): string {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
	return new Intl.DateTimeFormat(lang === 'pl' ? 'pl-PL' : 'en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(value + 'T12:00:00Z'));
}

function publicationYear(year: string | undefined, events: PublicationEvent[], lang: Lang) {
	if (year === 's.a.') {
		if (events.some((event) => event.kind === 'title_page')) return undefined;
		return lang === 'pl' ? 'b.r.' : 'n.d.';
	}
	const lowerBound = year && /^([0-9]{4})\/\.\.$/.exec(year);
	if (lowerBound) {
		return lang === 'pl'
			? '[nie wcześniej niż ' + lowerBound[1] + ']'
			: '[not before ' + lowerBound[1] + ']';
	}
	return year;
}

function credit(value: string, lang: Lang): string {
	const parts = /^(.+) \(([^()]+)\)$/.exec(value);
	const role = parts && contributorRoles[lang][parts[2]];
	if (!parts || !role) return value;
	const polishNames: Record<string, string> = {
		'Benedictines of Solesmes': 'benedyktyni z Solesmes',
		'Third Plenary Council of Baltimore': 'III Synodu Plenarnego w Baltimore'
	};
	const name = lang === 'pl' ? (polishNames[parts[1]] ?? parts[1]) : parts[1];
	return role + ' ' + name;
}

function sourceMeta(
	work: WorkRecord,
	edition: EditionRecord,
	items: DigitalItemRecord[],
	lang: Lang
): string[] {
	const statement = edition.edition_statement;
	const printer = !edition.publisher && statement?.startsWith('Drukiem ') ? statement : undefined;
	const publication = [edition.place, edition.publisher ?? printer].filter(Boolean).join(': ');
	const events = edition.publication_events ?? [];
	const copies = items.filter((item) => item.edition === edition.id);
	const copyEvents = copies.flatMap((item) => item.publication_events ?? []);
	const journal =
		edition.publication_type === 'periodical' || edition.publication_type === 'official_act';
	const dateInCitation =
		journal && edition.year && statement?.match(/\b\d{4}\b/g)?.includes(edition.year);
	const revision = events.find((event) => event.kind === 'revision');
	const undated = edition.year === 's.a.';
	const year = publicationYear(edition.year, events, lang);
	const volume =
		edition.volume && /^[IVXLCDM]+(?:[.,]|$)/.test(edition.volume)
			? (lang === 'pl' ? 't. ' : 'vol. ') + edition.volume
			: edition.volume;
	const version = Boolean(
		revision && edition.edition_statement && /^[a-f0-9]{8}$/.test(edition.edition_statement)
	);
	const eventDetails = new Set(
		[...events, ...copyEvents].map(({ kind, date }) => {
			const label = publicationEventLabels[lang][kind];
			const identifier =
				kind === 'revision' && version ? ' (' + edition.edition_statement + ')' : '';
			return label + ' ' + publicationDate(date, lang) + identifier;
		})
	);
	const contributors = edition.contributors ?? [];
	const editorsOnly =
		contributors.length > 1 && contributors.every((name) => name.endsWith(' (editor)'));
	const credits = editorsOnly
		? [
				contributorRoles[lang].editors +
					' ' +
					new Intl.ListFormat(lang === 'pl' ? 'pl' : 'en-GB').format(
						contributors.map((name) => name.slice(0, -' (editor)'.length))
					)
			]
		: contributors.map((person) => credit(person, lang));
	const versionYear =
		edition.publication_type === 'web_resource' && !revision && year && !undated
			? lang === 'pl'
				? 'wersja z ' + year
				: year + ' version'
			: year;
	const byline = work.responsible && credit(work.responsible, lang);
	const accessDates = new Set(
		copies.flatMap((item) => (item.accessed_on ? [item.accessed_on] : []))
	);
	const accessLabel = lang === 'pl' ? 'dostęp ' : 'accessed ';

	return [
		byline,
		...credits,
		volume,
		version || printer ? undefined : statement,
		publication === byline ? undefined : publication,
		...(edition.additional_imprints ?? []).map(({ place, publisher }) => place + ': ' + publisher),
		dateInCitation || revision?.date.slice(0, 4) === year ? undefined : versionYear,
		...eventDetails,
		...[...accessDates].sort().map((value) => accessLabel + publicationDate(value, lang))
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
				meta: sourceMeta(work, edition, catalog.digital_items, lang),
				authority: edition.authority,
				roles: entry.roles,
				texts: entry.texts,
				lemmas: entry.lemmas,
				textCount: entry.texts.length,
				lemmaCount: entry.lemmas.length,
				useCount: [...entry.texts, ...entry.lemmas].reduce((total, item) => total + item.uses, 0)
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
			href: textHref(lang, key, {
				segment: `${first.segment}${run.length > 1 ? `-${last.segment}` : ''}`
			}),
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
				href: textHref(lang, key, { segment: item.segment }),
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
	entries: { textId?: string; address: EvidenceAddress }[],
	lang: Lang
): BibliographyUse[] {
	const byText = new Map<string, EvidenceAddress[]>();
	const lemmas = new Set<string>();
	for (const entry of entries) {
		if (entry.address.kind === 'lemma') {
			if (!entry.address.lemma) throw new Error('A lemma use has no dictionary address');
			lemmas.add(entry.address.lemma);
			continue;
		}
		if (!entry.textId) throw new Error('A text use has no text address');
		const addresses = byText.get(entry.textId) ?? [];
		addresses.push(entry.address);
		byText.set(entry.textId, addresses);
	}
	const textUses = [...byText.entries()].flatMap(([textId, addresses]) => {
		const title = localizedTitle(textId, lang);
		const key = textId.replace('.', '/');
		const out: BibliographyUse[] = [];
		if (addresses.some(({ kind }) => kind === 'text')) {
			out.push({ key: `${textId}:text`, title, href: textHref(lang, key), kind: 'text' });
		}
		out.push(
			...compactSegments(
				textId,
				addresses.flatMap(({ kind, segment }) => (kind === 'segment' && segment ? [segment] : [])),
				lang
			)
		);
		for (const word of new Set(
			addresses.flatMap(({ kind, word }) => (kind === 'word' && word ? [word] : []))
		)) {
			out.push({
				key: `${textId}:${word}`,
				title,
				href: textHref(lang, key, { word }),
				kind: 'word'
			});
		}
		return out;
	});
	return [
		...textUses,
		...[...lemmas].sort().map((lemma): BibliographyUse => ({
			key: `lemma:${lemma}`,
			title: lemma,
			href: lemmaHref(lang, lemma),
			kind: 'lemma'
		}))
	];
}

function evidenceNotes(group: EvidenceSourceGroup, lang: Lang): string[] {
	const notes = new Set(
		group.entries.flatMap(({ reader_note }) => (reader_note ? [reader_note] : []))
	);
	const passageNote =
		group.locator.passages?.length && sourcePassageNote(group.locator.section, lang);
	if (passageNote) notes.add(passageNote);
	return [...notes];
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
		{
			source: EvidenceSourceGroup;
			entries: { textId?: string; address: EvidenceAddress }[];
			notes: Set<string>;
		}
	>();
	const records = [
		...loaded,
		...source.lemmas.map((lemma) => ({
			textId: undefined,
			evidence: { id: lemma.id, source_groups: lemma.source_groups }
		}))
	];
	for (const { textId, evidence } of records) {
		for (const group of evidence.source_groups.filter(
			({ edition, role }) => edition === source.id && source.roles.includes(role)
		)) {
			const key = [group.digital_item, group.role, JSON.stringify(group.locator)].join('\u0000');
			const found = groups.get(key) ?? { source: group, entries: [], notes: new Set<string>() };
			found.entries.push(...group.entries.map(({ address }) => ({ textId, address })));
			for (const note of evidenceNotes(group, lang)) found.notes.add(note);
			groups.set(key, found);
		}
	}
	return [...groups.entries()].map(([key, group]) => {
		const item = items.get(group.source.digital_item);
		if (!item) throw new Error(`${group.source.digital_item} has no catalogue record`);
		const { section, printed, scan } = group.source.locator;
		const raw = [section, printed, scan].filter(Boolean).join(' · ');
		const passages = group.source.locator.passages?.map((part) => sourcePassageLink(part, lang));
		const displayLocator =
			passages?.map((part) => part.label).join(' · ') ?? formatSourceLocator(raw, lang);
		return {
			key,
			...(displayLocator === raw ? {} : { displayLocator }),
			...(passages ? { passages } : {}),
			role: group.source.role,
			printed: group.source.locator.printed,
			scan: group.source.locator.scan,
			section: group.source.locator.section,
			url: group.source.locator.page_url ?? item.scan_url ?? item.record_url,
			repository: item.repository,
			uses: compactUses(group.entries, lang),
			...(group.notes.size ? { notes: [...group.notes] } : {})
		};
	});
}

/** The original locator remains the key for grouping and links. */
export function citationForLanguage(citation: Citation, lang: Lang): Citation {
	const displayLocator =
		citation.passages?.map((part) => part.label).join(' · ') ??
		formatSourceLocator(citation.locator, lang);
	return displayLocator === citation.locator ? citation : { ...citation, displayLocator };
}

function evidenceCitation(
	lang: Lang,
	group: EvidenceSourceGroup,
	editions: Map<string, EditionRecord>,
	items: Map<string, DigitalItemRecord>
): Citation {
	const edition = editions.get(group.edition);
	if (!edition) throw new Error(`${group.edition} has no catalogue record`);
	const item = items.get(group.digital_item);
	if (!item) throw new Error(`${group.digital_item} has no catalogue record`);
	const notes = evidenceNotes(group, lang);
	return citationForLanguage(
		{
			title: edition.title,
			...(group.locator.passages
				? { passages: group.locator.passages.map((part) => sourcePassageLink(part, lang)) }
				: {}),
			...(notes.length ? { notes } : {}),
			locator: [group.locator.section, group.locator.printed, group.locator.scan]
				.filter(Boolean)
				.join(' · '),
			url: group.locator.page_url ?? item.scan_url ?? item.record_url
		},
		lang
	);
}

export function uniqueCitations(citations: Citation[]): Citation[] {
	const found = new Map<string, Citation>();
	for (const citation of citations) {
		const key = `${citation.title}\u0000${citation.locator}\u0000${citation.url ?? ''}`;
		const previous = found.get(key);
		const notes = [...new Set([...(previous?.notes ?? []), ...(citation.notes ?? [])])];
		found.set(key, { ...citation, ...(notes.length ? { notes } : {}) });
	}
	return [...found.values()];
}

function citationMapper(lang: Lang, catalog: Catalog): (group: EvidenceSourceGroup) => Citation {
	const editions = new Map(catalog.editions.map((record) => [record.id, record]));
	const items = new Map(catalog.digital_items.map((record) => [record.id, record]));
	return (group) => evidenceCitation(lang, group, editions, items);
}

function lemmaSourceGroups(index: BibliographyIndex, lemma: string): EvidenceSourceGroup[] {
	return index.sections.flatMap((section) =>
		section.entries.flatMap((entry) =>
			entry.lemmas.filter(({ id }) => id === lemma).flatMap((record) => record.source_groups)
		)
	);
}

/** Neutral lexical/grammatical support for a dictionary entry, never a token gloss. */
export async function loadLemmaSupport(lang: Lang, lemma: string): Promise<Citation[]> {
	const paths = bibliographyResourcePaths(lang).root;
	const [catalog, index] = await Promise.all([
		loadResource<Catalog>(paths.catalog),
		loadResource<BibliographyIndex>(paths.index)
	]);
	const cite = citationMapper(lang, catalog);
	return uniqueCitations(
		lemmaSourceGroups(index, lemma)
			.filter(({ role }) => role === 'lexical_support' || role === 'grammatical_support')
			.map((group) => {
				if (
					!group.entries.length ||
					group.entries.some(({ address }) => address.kind !== 'lemma' || address.lemma !== lemma)
				) {
					throw new Error('Dictionary support has a different or missing lemma address');
				}
				return cite(group);
			})
	);
}

/** The lemmata this edition supports with at least one dictionary or grammar
 * source, decided by the same index and roles as loadLemmaSupport. A page
 * lexicon marks them so the word panel can hold the closed sources line's
 * room before the lazy module arrives (never the panel's own guess). */
export async function lemmataWithSupport(lang: Lang): Promise<Set<string>> {
	const index = await loadResource<BibliographyIndex>(bibliographyResourcePaths(lang).root.index);
	const supported = new Set<string>();
	for (const section of index.sections) {
		for (const entry of section.entries) {
			for (const record of entry.lemmas) {
				if (
					record.source_groups.some(
						({ role }) => role === 'lexical_support' || role === 'grammatical_support'
					)
				)
					supported.add(record.id);
			}
		}
	}
	return supported;
}

/** Dictionary-level support is not evidence for an entire prayer or translation. */
export async function loadLemmaBibliography(lang: Lang, lemma: string): Promise<Citation[]> {
	const { catalog, index } = await resources(lang);
	const cite = citationMapper(lang, catalog);
	return uniqueCitations(lemmaSourceGroups(index, lemma).map(cite));
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
			(neutral?.source_groups ?? []).map((group) => evidenceCitation(lang, group, editions, items))
		),
		translation: uniqueCitations(
			(language?.source_groups ?? []).map((group) => evidenceCitation(lang, group, editions, items))
		)
	};
}
