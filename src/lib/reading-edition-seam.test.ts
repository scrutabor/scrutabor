import { freshProperFixture, actualPackResponse } from './proper-browser-test-fixtures';
import { announcedBodyFixtures, currentReadingState } from './reading-test-fixtures';
// All dated consumers must initialize against one declared reader edition.
import { expect, it, vi } from 'vitest';
import { ROOT_MANIFEST } from './corpus-metadata';
import plManifest from './data/languages/pl/manifest.json';
import enManifest from './data/languages/en/manifest.json';
import { introductionLookup } from './introductiones';
import { canonLookup } from './canon';
import { dismissalLookup } from './dismissal';
import { commemorationLookup } from './commemorationes';
import { ordoData, properData } from './loaders';
import type { TextDocument } from './corpus';

const runtime = freshProperFixture();

it('declares every dated resource against the same freshly vendored reader edition', () => {
	expect(ROOT_MANIFEST.schema_version).toBe('6.7.0');
	expect([plManifest.schema_version, enManifest.schema_version]).toEqual(['6.7.0', '6.7.0']);
	expect(introductionLookup).not.toBeNull();
	expect(introductionLookup!.announcements.size).toBe(205);
	expect(canonLookup).not.toBeNull();
	expect(dismissalLookup).not.toBeNull();
	expect(commemorationLookup).not.toBeNull();
});

it.each(['pl', 'en'] as const)(
	'%s assembles a normal selected Mass using the actual vendored data and all real lookups',
	async (lang) => {
		const mass = 'dominica-iii-post-pascha';
		const fetcher = vi.fn(async (url: string) =>
			actualPackResponse(url, lang, async () => ({
				days: { [mass]: await properData(mass, lang) }
			}))
		);
		vi.stubGlobal('fetch', fetcher);
		await runtime.chooseDay({ date: '2026-04-26', mass }, lang);
		expect(fetcher).toHaveBeenCalled();
		expect(runtime.proper.loading).toBe(false);
		expect(runtime.proper.failed).toBe(false);
		expect(runtime.proper.unwritten).toBe(false);
		expect(runtime.proper.date).toBe('2026-04-26');
		expect(runtime.proper.day).toBe(mass);
		expect(runtime.proper.payload?.lang).toBe(lang);
		const selected = runtime.proper.forSlot('epistola');
		expect(selected).toHaveLength(1);
		expect(selected[0].key).toBe(`proprium/${mass}-epistola`);
		expect((selected[0].doc as TextDocument).id).toBe(`proprium.${mass}-epistola`);
		const data = await ordoData(lang, 'catechumenorum');
		expect(data).not.toBeNull();
		const { announcedReadings, readingPayloadReady } = await import('./reading-announcements');
		expect(readingPayloadReady(currentReadingState(runtime.proper), lang)).toBe(true);
		const result = announcedReadings(
			'epistola',
			announcedBodyFixtures(selected),
			data!.readingOwners
		);
		expect(result).toHaveLength(2);
		expect(result[0].doc.id).toBe('ordinarium.lectio-epistolae-beati-petri-apostoli');
		expect(result[0].gloss.lang).toBe(lang);
		expect(result[1].key).toBe(`proprium/${mass}-epistola`);
	}
);

it.each(['6.6.0', '6.8.0'])(
	'rejects root reader %s at every declared lookup and restores the real edition',
	async (version) => {
		const resources = async () => [
			(await import('./canon')).canonLookup,
			(await import('./dismissal')).dismissalLookup,
			(await import('./commemorationes')).commemorationLookup,
			(await import('./introductiones')).introductionLookup
		];
		const original = JSON.stringify(ROOT_MANIFEST);
		vi.resetModules();
		for (const lookup of await resources()) {
			expect(lookup).toBeDefined();
			expect(lookup).not.toBeNull();
		}
		vi.doMock('./corpus-metadata', async (importOriginal) => {
			const actual = await importOriginal<typeof import('./corpus-metadata')>();
			return {
				...actual,
				ROOT_MANIFEST: { ...actual.ROOT_MANIFEST, schema_version: version }
			};
		});
		try {
			vi.resetModules();
			expect(await resources()).toEqual([null, null, null, null]);
		} finally {
			vi.doUnmock('./corpus-metadata');
			vi.resetModules();
		}
		for (const lookup of await resources()) {
			expect(lookup).toBeDefined();
			expect(lookup).not.toBeNull();
		}
		expect(JSON.stringify(ROOT_MANIFEST)).toBe(original);
	}
);
