import { afterEach, beforeEach, vi } from 'vitest';

/** Each transport test gets a fresh store and leaves no mocked globals. */
export function useFreshProperState(receive: (state: typeof import('./proper.svelte')) => void) {
	beforeEach(async () => {
		vi.resetModules();
		const state = await import('./proper.svelte');
		state.proper.clear();
		receive(state);
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});
}

/** A promise the test settles itself, so one transport can be held in flight. */
export function deferred<T>() {
	let release!: (value: T) => void;
	const promise = new Promise<T>((resolve) => {
		release = resolve;
	});
	return { promise, release };
}

/** Every fetch succeeds; the test derives each JSON body from the requested URL. */
export function stubJsonFetch(respond: (url: string) => Promise<unknown>) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => ({ ok: true, json: () => respond(url) }))
	);
}
