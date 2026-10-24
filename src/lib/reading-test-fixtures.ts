import { settledSelection } from './ordinary-test-fixtures';
/** Actual reader-data fixtures; no inferred ritual or linguistic approvals. */
import { beforeAll, expect } from 'vitest';
import table from './data/introductiones.json';
import { FORMULARY_METADATA, TEXT_KEYS } from './corpus-metadata';
import { loadText, type GlossDocument, type TextDocument } from './corpus';
import { loadTextBibliography } from './bibliography';
import { textAnchor } from './text-anchor';
import { parseIntroductionResource, type ReadingRole } from './introduction-contract';
import {
	announcementOwners,
	type AnnouncementOwner,
	type AnnouncedReading
} from './reading-announcements';
import { ordoData, properData } from './loaders';
import { componentApplies, dayById } from './proprium';
import { properOccurrences } from './proper-occurrences';
import { ordoResponseContext, type GospelPreparationState } from './ordo-context';
import type { Lang } from './i18n';

export const readingRoles = new Map<string, ReadingRole>();
for (const formulary of FORMULARY_METADATA)
	for (const component of formulary.components)
		if (component.role === 'epistola' || component.role === 'evangelium')
			readingRoles.set(component.text.replace('.', '/'), component.role);
export const parseReadingFixture = (value: unknown) =>
	parseIntroductionResource(value, new Set(TEXT_KEYS), readingRoles);
export const readingLookup = parseReadingFixture(table);

export async function readingOwnerFixture(lang: Lang): Promise<Record<string, AnnouncementOwner>> {
	return Object.fromEntries(
		await Promise.all(
			announcementOwners(readingLookup).map(async (key) => {
				const body = await actualReadingFixture(key, lang);
				return [key, { doc: body.doc, gloss: body.gloss, bibliography: body.bibliography }];
			})
		)
	);
}

export async function actualReadingFixture(
	key: string,
	lang: Lang,
	suffix = ''
): Promise<AnnouncedReading> {
	const entry = await loadText(key, lang);
	if (!entry) throw new Error(`missing actual reading fixture ${key}`);
	return {
		key,
		slug: key.split('/')[1] + suffix,
		anchor: textAnchor(key) + suffix,
		doc: entry.text,
		gloss: entry.gloss,
		bibliography: await loadTextBibliography(lang, key)
	};
}

export function announcedBodyFixtures<T extends { doc: unknown; gloss: unknown }>(parts: T[]) {
	return parts.map((part) => ({
		...part,
		doc: part.doc as TextDocument,
		gloss: part.gloss as GlossDocument
	}));
}

export function currentReadingState({
	date,
	day: mass,
	payload,
	loading,
	failed,
	unwritten
}: {
	date: string | null;
	day: string | null;
	payload: { day: string; lang: string } | null;
	loading: boolean;
	failed: boolean;
	unwritten: boolean;
}): GospelPreparationState {
	return {
		date,
		mass,
		loadedMass: payload?.day ?? null,
		loadedLanguage: payload?.lang ?? null,
		loading,
		failed,
		unwritten
	};
}

export const responseReadingRole = (entry: string) =>
	entry === 'deo-gratias-epistolae' ? 'epistola' : 'evangelium';
export async function selectedResponseFixture(
	choice: { date: string; mass: string },
	lang: Lang,
	entry: string
) {
	const payload = await properData(choice.mass, lang);
	const data = await ordoData(lang, 'catechumenorum');
	expect(payload).not.toBeNull();
	expect(data).not.toBeNull();
	const readings = announcedBodyFixtures(
		properOccurrences(payload!.parts).filter(
			(part) =>
				part.slot === responseReadingRole(entry) && componentApplies(part.condition, choice.date)
		)
	);
	expect(readings).toHaveLength(1);
	expect(readings[0].key).toBe(
		dayById(choice.mass)!.components.find((c) => c.role === responseReadingRole(entry))!.text
	);
	return structuredClone({
		state: settledSelection(choice.date, choice.mass, lang),
		readings,
		owners: data!.readingOwners as Record<string, AnnouncementOwner>,
		lex: payload!.lex
	});
}

export function responseFixtureContext(
	entry: string,
	fixture: Awaited<ReturnType<typeof selectedResponseFixture>>,
	lang: Lang
) {
	return ordoResponseContext(
		entry,
		fixture.state,
		fixture.readings,
		fixture.owners,
		fixture.lex,
		lang
	)!;
}

export async function responseCatalogueFixture(
	choice: { date: string; mass: string },
	lang: Lang,
	entry: string
) {
	const f = await selectedResponseFixture(choice, lang, entry);
	const snapshot = structuredClone(f);
	const baseline = responseFixtureContext(entry, f, lang);
	expect(baseline).toEqual({ referenceOnly: false, reason: 'ordinary-reading' });
	const day = dayById(choice.mass)!;
	const original = day.components;
	const component = original.find((c) => c.role === responseReadingRole(entry))!;
	expect(component).toBeDefined();
	const applicable: typeof component = { ...component, condition: { weekday: 'sunday' } };
	return { f, snapshot, baseline, day, original, component, applicable };
}

/** Own the async suite setup without supplying any expected assembly result. */
export function readingSuiteFixture(lang: Lang) {
	let owners: Record<string, AnnouncementOwner>;
	beforeAll(async () => {
		owners = await readingOwnerFixture(lang);
	});
	return {
		get owners() {
			return owners;
		},
		reading: (key: string, suffix = '') => actualReadingFixture(key, lang, suffix)
	};
}

type ResponseCatalogueFixture = Awaited<ReturnType<typeof responseCatalogueFixture>>;

/** Assert the rejected body and then restore only the selected applicable occurrence. */
export function expectResponseCatalogueRoundTrip(
	testCase: ResponseCatalogueFixture,
	entry: string,
	lang: Lang
) {
	const { f, day, original, component, applicable, baseline } = testCase;
	expect(f.readings).toHaveLength(1);
	expect(responseFixtureContext(entry, f, lang)).toMatchObject({
		referenceOnly: true,
		reason: 'unconfirmed'
	});
	day.components = original.map((item) => (item === component ? applicable : item));
	expect(responseFixtureContext(entry, f, lang)).toEqual(baseline);
}

/** The caller's finally must have restored the actual catalogue before this check. */
export function expectResponseCatalogueRestored(
	testCase: ResponseCatalogueFixture,
	entry: string,
	lang: Lang
) {
	const { f, day, original, baseline, snapshot } = testCase;
	expect(day.components).toBe(original);
	expect(responseFixtureContext(entry, f, lang)).toEqual(baseline);
	expect(f).toEqual(snapshot);
}
