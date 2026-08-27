import { CATALOG, sectionFor } from './catalog';
import { CONCORDANCE, everyTextInOrder, type LatinPosting } from './concordance';
import { LEXICON, loadSenses, loadTexts, type TextEntry } from './corpus';
import {
	languageConcordancePath,
	languageTextMetadataFor,
	textMetadataFor
} from './corpus-metadata';
import type { Lang } from './i18n';
import { remember } from './remember';
import { MAX_QUERY_LENGTH, MAX_QUERY_TOKENS } from './search-limits';

export interface SnippetPart {
	text: string;
	hit: boolean;
}

export interface TitleSearchResult {
	kind: 'title';
	textKey: string;
	title: string;
	latinTitle: string;
	context: string;
	matchedAlias?: string;
	href: string;
}

export interface ContentSearchResult {
	kind: 'content';
	textKey: string;
	segmentId: string;
	title: string;
	latinTitle: string;
	context: string;
	source: 'la' | Lang;
	parts: SnippetPart[];
	href: string;
}

export interface GrammarSearchResult {
	kind: 'grammar';
	lemma: string;
	head: string;
	senses: string[];
	href: string;
}

export interface SearchResults {
	query: string;
	titles: TitleSearchResult[];
	contents: ContentSearchResult[];
	grammar: GrammarSearchResult[];
	/** The target-language index could not be fetched; Latin and titles only. */
	degraded?: boolean;
}

type LanguagePosting = [number, string, number];

interface LanguageConcordance {
	schema_version: string;
	language: Lang;
	texts: (string | null)[];
	terms: Record<string, LanguagePosting[]>;
}

interface TermMatch<P> {
	term: string;
	cost: number;
	postings: P[];
}

interface SiteScore {
	textKey: string;
	segmentId: string;
	quality: number;
	cost: number;
	span: number;
	source: 'la' | Lang;
}

const LANGUAGE_CONCORDANCE_MODULES = import.meta.glob(
	'./data/languages/*/concordance.json'
) as Record<string, () => Promise<{ default: unknown }>>;
const LANGUAGE_CONCORDANCES = new Map<Lang, Promise<LanguageConcordance>>();
const BOOK_ORDER = new Map(everyTextInOrder().map((key, index) => [key, index]));
const MAX_CONTENT_RESULTS = 12;
const MAX_GRAMMAR_RESULTS = 8;

/** Matching form only. Authored strings keep their capitalization and accents.
 *
 * Decompose and strip marks BEFORE expanding ligatures: ǽ (U+01FD) is a
 * precomposed accented ligature, so an æ→ae replacement that runs first
 * never sees it and a bare æ survives into the key — which is how sǽcula
 * and quǽsumus were unfindable. The corpus emitter normalizes in this same
 * order and ships the shared vectors this is tested against
 * (src/lib/data/normalization.json). The explicit 'la' locale keeps a
 * Turkish host from lowercasing I to ı.
 */
export function normalizeSearch(value: string): string {
	return value
		.toLocaleLowerCase('la')
		.normalize('NFKD')
		.replaceAll(/\p{M}/gu, '')
		.replaceAll('ß', 'ss')
		.replaceAll('æ', 'ae')
		.replaceAll('œ', 'oe')
		.replaceAll('ł', 'l')
		.replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.replaceAll(/\s+/g, ' ');
}

export function tokenizeSearch(value: string): string[] {
	const normalized = normalizeSearch(value);
	return normalized ? normalized.split(' ') : [];
}

/** Damerau–Levenshtein with a small cutoff; search never needs a full matrix. */
export function editDistance(left: string, right: string, cutoff = Infinity): number {
	if (left === right) return 0;
	if (Math.abs(left.length - right.length) > cutoff) return cutoff + 1;
	let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
	let beforePrevious = previous;
	for (let row = 1; row <= left.length; row++) {
		const current = [row];
		let rowBest = row;
		for (let column = 1; column <= right.length; column++) {
			let value = Math.min(
				previous[column] + 1,
				current[column - 1] + 1,
				previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1)
			);
			if (
				row > 1 &&
				column > 1 &&
				left[row - 1] === right[column - 2] &&
				left[row - 2] === right[column - 1]
			) {
				value = Math.min(value, beforePrevious[column - 2] + 1);
			}
			current[column] = value;
			rowBest = Math.min(rowBest, value);
		}
		if (rowBest > cutoff) return cutoff + 1;
		beforePrevious = previous;
		previous = current;
	}
	return previous[right.length];
}

function typoAllowance(term: string): number {
	if (term.length < 4) return 0;
	return term.length < 8 ? 1 : 2;
}

function tokenCost(query: string, candidate: string): number | undefined {
	if (query === candidate) return 0;
	if (query.length >= 3 && candidate.startsWith(query)) return 0.25;
	const allowance = typoAllowance(query);
	if (!allowance) return undefined;
	const distance = editDistance(query, candidate, allowance);
	return distance <= allowance ? distance : undefined;
}

function termMatches<P>(terms: Record<string, P[]>, query: string): TermMatch<P>[] {
	const exact = terms[query];
	if (exact) return [{ term: query, cost: 0, postings: exact }];
	return Object.entries(terms)
		.flatMap(([term, postings]) => {
			const cost = tokenCost(query, term);
			return cost === undefined ? [] : [{ term, cost, postings }];
		})
		.sort(
			(a, b) => a.cost - b.cost || a.term.length - b.term.length || a.term.localeCompare(b.term)
		)
		.slice(0, 12);
}

function titleMatch(query: string[], value: string): { rank: number; cost: number } | undefined {
	const candidate = tokenizeSearch(value);
	if (!candidate.length) return undefined;
	const phrase = query.join(' ');
	const whole = candidate.join(' ');
	if (whole === phrase) return { rank: 0, cost: 0 };
	if (whole.startsWith(`${phrase} `)) return { rank: 1, cost: 0 };
	if (` ${whole} `.includes(` ${phrase} `)) return { rank: 2, cost: 0 };

	let from = 0;
	let cost = 0;
	for (const term of query) {
		let found = -1;
		let foundCost = Infinity;
		for (let index = from; index < candidate.length; index++) {
			const next = tokenCost(term, candidate[index]);
			if (next !== undefined && next < foundCost) {
				found = index;
				foundCost = next;
				if (next === 0) break;
			}
		}
		if (found < 0) return undefined;
		from = found + 1;
		cost += foundCost;
	}
	return { rank: cost === 0 ? 3 : 4, cost };
}

function compareNumberTuples(left: number[], right: number[]): number {
	for (let index = 0; index < Math.max(left.length, right.length); index++) {
		const difference = (left[index] ?? 0) - (right[index] ?? 0);
		if (difference) return difference;
	}
	return 0;
}

function titlesFor(query: string[], lang: Lang, exactLatinForm: boolean): TitleSearchResult[] {
	const scored = CATALOG.flatMap((section, sectionRank) =>
		section.texts.flatMap((text, textRank) => {
			const textKey = `${text.category}/${text.slug}`;
			const displayTitle = text.localizedTitle[lang] ?? text.title;
			const candidates = [
				{ value: displayTitle, alias: false },
				{ value: text.title, alias: false },
				...(text.aliases[lang] ?? []).map((value) => ({ value, alias: true }))
			];
			const best = candidates
				.flatMap((candidate) => {
					const match = titleMatch(query, candidate.value);
					return match ? [{ ...candidate, ...match }] : [];
				})
				.sort(
					(a, b) =>
						a.rank - b.rank ||
						Number(a.alias) - Number(b.alias) ||
						a.cost - b.cost ||
						a.value.localeCompare(b.value)
				)[0];
			if (!best) return [];
			return [
				{
					kind: 'title' as const,
					textKey,
					title: displayTitle,
					latinTitle: text.title,
					context: section.label[lang],
					matchedAlias: best.alias ? best.value : undefined,
					href: `/app/${lang}/${textKey}`,
					_score: [best.rank, Number(best.alias), best.cost, sectionRank, textRank]
				}
			];
		})
	);
	const strong = scored.filter((result) => result._score[0] < 4);
	const relevant = strong.length ? strong : exactLatinForm ? [] : scored;
	return relevant
		.sort((a, b) => compareNumberTuples(a._score, b._score))
		.slice(0, 12)
		.map(({ _score, ...result }) => {
			void _score;
			return result;
		});
}

async function languageConcordance(lang: Lang): Promise<LanguageConcordance> {
	const path = languageConcordancePath(lang);
	const loader = LANGUAGE_CONCORDANCE_MODULES[`./data/${path}`];
	if (!loader) throw new Error(`${lang} names absent search index ${path}`);
	return remember(LANGUAGE_CONCORDANCES, lang, () =>
		loader().then((module) => {
			const data = module.default as LanguageConcordance;
			if (data.language !== lang) throw new Error(`${path} calls itself ${data.language}`);
			return data;
		})
	);
}

function keyFor(texts: (string | null)[], number: number): string | undefined {
	return texts[number]?.replace('.', '/');
}

function scoreSites<P extends LatinPosting | LanguagePosting>(
	query: string[],
	terms: Record<string, P[]>,
	texts: (string | null)[],
	source: 'la' | Lang
): SiteScore[] {
	const sites = new Map<
		string,
		{ textKey: string; segmentId: string; hits: { p: number; c: number }[][] }
	>();
	query.forEach((term, queryPosition) => {
		for (const match of termMatches(terms, term)) {
			for (const posting of match.postings) {
				const [number, segmentId] = posting;
				const position =
					source === 'la' ? (posting as LatinPosting)[3] : (posting as LanguagePosting)[2];
				const textKey = keyFor(texts, number);
				if (!textKey) continue;
				const siteKey = `${textKey}\u0000${segmentId}`;
				const site = sites.get(siteKey) ?? {
					textKey,
					segmentId,
					hits: Array.from({ length: query.length }, () => [])
				};
				site.hits[queryPosition].push({ p: position, c: match.cost });
				sites.set(siteKey, site);
			}
		}
	});

	return [...sites.values()].flatMap((site) => {
		if (site.hits.some((hits) => hits.length === 0)) return [];
		for (const hits of site.hits) hits.sort((a, b) => a.p - b.p || a.c - b.c);
		let bestSpan = Infinity;
		let bestCost = Infinity;
		let phrase = false;
		for (const start of site.hits[0]) {
			let previous = start.p;
			let cost = start.c;
			let consecutive = start.c === 0;
			let complete = true;
			for (let index = 1; index < site.hits.length; index++) {
				const next = site.hits[index].find((hit) => hit.p > previous);
				if (!next) {
					complete = false;
					break;
				}
				consecutive &&= next.p === previous + 1 && next.c === 0;
				previous = next.p;
				cost += next.c;
			}
			if (!complete) continue;
			const span = previous - start.p + 1;
			if (span < bestSpan || (span === bestSpan && cost < bestCost)) {
				bestSpan = span;
				bestCost = cost;
			}
			phrase ||= consecutive;
		}
		const ordered = Number.isFinite(bestSpan);
		const cost = ordered
			? bestCost
			: site.hits.reduce((sum, hits) => sum + Math.min(...hits.map((hit) => hit.c)), 0);
		return [
			{
				textKey: site.textKey,
				segmentId: site.segmentId,
				quality: phrase ? 0 : ordered ? 1 : 2,
				cost,
				span: ordered ? bestSpan : 999,
				source
			}
		];
	});
}

function compareSites(left: SiteScore, right: SiteScore): number {
	return (
		left.quality - right.quality ||
		left.cost - right.cost ||
		left.span - right.span ||
		Number(left.source === 'la') - Number(right.source === 'la') ||
		(BOOK_ORDER.get(left.textKey) ?? Infinity) - (BOOK_ORDER.get(right.textKey) ?? Infinity) ||
		left.segmentId.localeCompare(right.segmentId)
	);
}

function isHit(term: string, query: string[]): boolean {
	return query.some((candidate) => tokenCost(candidate, term) !== undefined);
}

function compactParts(parts: SnippetPart[]): SnippetPart[] {
	const compacted: SnippetPart[] = [];
	for (const part of parts) {
		if (!part.text) continue;
		const previous = compacted.at(-1);
		if (previous?.hit === part.hit) previous.text += part.text;
		else compacted.push({ ...part });
	}
	return compacted;
}

function latinSnippet(entry: TextEntry, segmentId: string, query: string[]): SnippetPart[] {
	const words = entry.text.segments.find((segment) => segment.id === segmentId)?.words ?? [];
	const hitAt = words.findIndex((word) => isHit(normalizeSearch(word.form), query));
	const start = Math.max(0, hitAt - 8);
	const stop = Math.min(words.length, Math.max(hitAt, 0) + 13);
	const parts: SnippetPart[] = [];
	if (start > 0) parts.push({ text: '… ', hit: false });
	words.slice(start, stop).forEach((word, index) => {
		if (index) parts.push({ text: ' ', hit: false });
		parts.push({ text: word.form, hit: isHit(normalizeSearch(word.form), query) });
		if (word.post) parts.push({ text: word.post, hit: false });
	});
	if (stop < words.length) parts.push({ text: ' …', hit: false });
	return compactParts(parts);
}

function translatedSnippet(entry: TextEntry, segmentId: string, query: string[]): SnippetPart[] {
	const translation = entry.gloss.segments[segmentId]?.translation ?? '';
	const pieces = translation.split(/([\p{L}\p{M}\p{N}’'-]+)/gu).filter(Boolean);
	const words = pieces.map((piece) => ({
		text: piece,
		hit: /[\p{L}\p{N}]/u.test(piece) && isHit(normalizeSearch(piece), query)
	}));
	const first = words.findIndex((part) => part.hit);
	if (translation.length <= 230 || first < 0) return compactParts(words);
	let start = first;
	let stop = first + 1;
	let size = words[first].text.length;
	while (size < 190 && (start > 0 || stop < words.length)) {
		if (start > 0) size += words[--start].text.length;
		if (stop < words.length) size += words[stop++].text.length;
	}
	return compactParts([
		...(start ? [{ text: '… ', hit: false }] : []),
		...words.slice(start, stop),
		...(stop < words.length ? [{ text: ' …', hit: false }] : [])
	]);
}

function resultTitle(
	textKey: string,
	lang: Lang
): { title: string; latinTitle: string; context: string } {
	const [category] = textKey.split('/');
	const latinTitle = textMetadataFor(textKey)?.title ?? textKey;
	return {
		title: languageTextMetadataFor(textKey, lang)?.title ?? latinTitle,
		latinTitle,
		context: sectionFor(category)?.label[lang] ?? category
	};
}

function contentResults(
	sites: SiteScore[],
	texts: Record<string, TextEntry>,
	query: string[],
	lang: Lang
): ContentSearchResult[] {
	return sites.flatMap((site) => {
		const entry = texts[site.textKey];
		if (!entry) return [];
		const parts =
			site.source === 'la'
				? latinSnippet(entry, site.segmentId, query)
				: translatedSnippet(entry, site.segmentId, query);
		if (!parts.length) return [];
		return [
			{
				kind: 'content' as const,
				textKey: site.textKey,
				segmentId: site.segmentId,
				...resultTitle(site.textKey, lang),
				source: site.source,
				parts,
				href: `/app/${lang}/${site.textKey}?s=${encodeURIComponent(site.segmentId)}`
			}
		];
	});
}

async function grammarResults(
	query: string[],
	loaded: Record<string, TextEntry>,
	lang: Lang
): Promise<GrammarSearchResult[]> {
	if (query.length !== 1) return [];
	const term = query[0];
	const formMatches = termMatches(CONCORDANCE.latin.forms, term);
	const lemmaMatches = termMatches(CONCORDANCE.latin.lemmata, term);
	const wantedWords = new Map<string, Set<string>>();
	for (const match of formMatches) {
		for (const posting of match.postings) {
			const [number, , wordId] = posting;
			const key = keyFor(CONCORDANCE.texts, number);
			if (!key || !loaded[key]) continue;
			const ids = wantedWords.get(key) ?? new Set<string>();
			ids.add(wordId);
			wantedWords.set(key, ids);
		}
	}
	const lemmata = new Map<string, Set<string>>();
	for (const [key, ids] of wantedWords) {
		for (const segment of loaded[key].text.segments) {
			for (const word of segment.words ?? []) {
				if (!ids.has(word.id)) continue;
				const forms = lemmata.get(word.lemma) ?? new Set<string>();
				forms.add(word.form);
				lemmata.set(word.lemma, forms);
			}
		}
	}
	for (const match of lemmaMatches) {
		lemmata.set(match.term, lemmata.get(match.term) ?? new Set<string>());
	}
	if (!lemmata.size) return [];
	const senses = await loadSenses(lang);
	return [...lemmata]
		.map(([lemma]) => ({
			kind: 'grammar' as const,
			lemma,
			head: LEXICON.lemmata[lemma]?.head ?? lemma,
			senses: senses[lemma]?.senses ?? [],
			href: `/app/${lang}/lemma/${encodeURIComponent(lemma)}`
		}))
		.sort(
			(a, b) =>
				Number(a.lemma !== term) - Number(b.lemma !== term) || a.lemma.localeCompare(b.lemma)
		)
		.slice(0, MAX_GRAMMAR_RESULTS);
}

export async function searchBook(rawQuery: string, lang: Lang): Promise<SearchResults> {
	const bounded = rawQuery.slice(0, MAX_QUERY_LENGTH);
	const query = tokenizeSearch(bounded).slice(0, MAX_QUERY_TOKENS);
	if (!query.length || normalizeSearch(bounded).length < 2) {
		return { query: rawQuery, titles: [], contents: [], grammar: [] };
	}
	// The Latin index and the titles live in this chunk; only the target
	// language's index is a further fetch. When that fetch fails, search
	// degrades to what is already resident instead of failing whole — the
	// page says so, and the next attempt retries the fetch (the rejection
	// is not memoized).
	let localized: Pick<LanguageConcordance, 'terms' | 'texts'>;
	let degraded = false;
	try {
		localized = await languageConcordance(lang);
	} catch {
		localized = { terms: {}, texts: CONCORDANCE.texts };
		degraded = true;
	}
	const sites = [
		...scoreSites(query, localized.terms, localized.texts, lang),
		...scoreSites(query, CONCORDANCE.latin.forms, CONCORDANCE.texts, 'la')
	]
		.sort(compareSites)
		.slice(0, MAX_CONTENT_RESULTS);
	const candidateKeys = [...new Set(sites.map(({ textKey }) => textKey))];
	const loaded = await loadTexts(candidateKeys, lang);
	return {
		query: rawQuery,
		titles: titlesFor(
			query,
			lang,
			query.length === 1 && Boolean(CONCORDANCE.latin.forms[query[0]])
		),
		contents: contentResults(sites, loaded, query, lang),
		grammar: await grammarResults(query, loaded, lang),
		degraded
	};
}
