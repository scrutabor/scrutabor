/** Isolated actual-data transport fixtures for browser-state unit tests. */
import { vi } from 'vitest';
vi.mock('$lib/storage', () => ({ readStored: () => null, writeStored: () => {} }));
vi.mock('$app/environment', () => ({ browser: true, dev: false }));
import { canonData, commemorationData, dismissalData } from './loaders';
import { useFreshProperState } from './proper-test-context';
import type { Lang } from './i18n';

export function freshProperFixture() {
	const state = {} as typeof import('./proper.svelte');
	useFreshProperState((fresh) => Object.assign(state, fresh));
	return state;
}

export function deferredTransport() {
	let release!: () => void;
	const promise = new Promise<void>((resolve) => {
		release = resolve;
	});
	return { promise, release };
}

const packs = { canon: canonData, dismissal: dismissalData, commemorationes: commemorationData };
export async function actualPackResponse(url: string, lang: Lang, proper: () => Promise<unknown>) {
	const kind = (Object.keys(packs) as (keyof typeof packs)[]).find((key) =>
		url.includes(`/${key}/`)
	);
	if (!kind && !url.includes('/proprium/')) throw new Error(`unexpected transport ${url}`);
	return { ok: true, json: async () => (kind ? packs[kind](lang) : proper()) };
}
