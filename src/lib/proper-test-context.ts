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
