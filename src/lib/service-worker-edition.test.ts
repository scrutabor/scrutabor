import { describe, expect, it } from 'vitest';
import { editionLists, isRouteDataSidecar } from './service-worker-edition';

// A manifest shaped like the one `$service-worker` hands the worker: the
// framework lists the route sidecars it prerendered even though the build
// step prunes the files. The lists the worker promises must never name them.
const manifest = {
	build: [
		'/_app/immutable/entry/app.abc.js',
		'/_app/immutable/corpus/corpus-texts.def.js',
		'/_app/immutable/corpus/concordance.ghi.js'
	],
	files: ['/manifest.webmanifest', '/icon-192.png'],
	prerendered: [
		'/app/',
		'/app/pl',
		'/app/pl/ordo',
		'/app/pl/editio',
		'/app/pl/ordinarium/credo',
		'/app/pl/ordinarium/credo/__data.json',
		'/app/pl/formularium/dominica-i-adventus',
		'/app/pl/formularium/dominica-i-adventus/__data.json',
		'/app/pl/__data.json',
		'/artifacts/proprium/pl/pack-01.json',
		'/pl',
		'/pl/__data.json',
		'/sitemap.xml'
	]
};

describe('the worker derives its promises from the served edition', () => {
	const lists = editionLists(manifest);

	it('recognises the client-router sidecar by its exact basename', () => {
		expect(isRouteDataSidecar('/app/pl/ordinarium/credo/__data.json')).toBe(true);
		expect(isRouteDataSidecar('/app/pl/ordinarium/credo')).toBe(false);
		expect(isRouteDataSidecar('/artifacts/proprium/pl/pack-01.json')).toBe(false);
	});

	it('names no pruned sidecar anywhere: shell, book, or completion bar', () => {
		for (const path of [...lists.shell, ...lists.everything, ...lists.edition]) {
			expect(isRouteDataSidecar(path), path).toBe(false);
		}
	});

	it('precaches the shell only: app code, files and the shell pages', () => {
		expect(lists.shell).toEqual([
			'/_app/immutable/entry/app.abc.js',
			'/manifest.webmanifest',
			'/icon-192.png',
			'/app/',
			'/app/pl',
			'/app/pl/ordo',
			'/app/pl/editio'
		]);
	});

	it('keeps the corpus facades out of the shell and inside the book', () => {
		expect(lists.lazyCorpus).toEqual([
			'/_app/immutable/corpus/corpus-texts.def.js',
			'/_app/immutable/corpus/concordance.ghi.js'
		]);
		expect(lists.everything).toEqual(expect.arrayContaining(lists.lazyCorpus));
	});

	it('promises the whole book and nothing outside it', () => {
		expect(lists.days).toEqual(['/artifacts/proprium/pl/pack-01.json']);
		expect(lists.everything).toEqual([
			...lists.shell,
			...lists.lazyCorpus,
			'/app/',
			'/app/pl',
			'/app/pl/ordo',
			'/app/pl/editio',
			'/app/pl/ordinarium/credo',
			'/app/pl/formularium/dominica-i-adventus',
			'/artifacts/proprium/pl/pack-01.json'
		]);
		expect(lists.everything).not.toContain('/pl');
		expect(lists.everything).not.toContain('/sitemap.xml');
	});

	it('measures a migration only against paths the host can answer', () => {
		expect(lists.edition.has('/app/pl/ordinarium/credo')).toBe(true);
		expect(lists.edition.has('/app/pl/ordinarium/credo/__data.json')).toBe(false);
		expect(lists.edition.has('/sitemap.xml')).toBe(true);
	});
});
