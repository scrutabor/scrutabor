import { afterEach, expect, it, vi } from 'vitest';
import { replaceState } from '$app/navigation';
import { presentReadingLocation, readingLocationFrame } from './reading-location';

vi.mock('$app/navigation', () => ({ replaceState: vi.fn() }));
const url = new URL('https://example.test/book');

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

it.each([
	[{ segments: ['s02', 's03'] }, 's02'],
	[{ segments: ['s02'], part: 'prayer~communio' }, 'prayer~communio-s02']
])('scrolls to the first selected line of its exact reading occurrence', (selection, id) => {
	const scrollIntoView = vi.fn();
	const getElementById = vi.fn(() => ({ scrollIntoView }));
	vi.stubGlobal('document', { getElementById });
	presentReadingLocation(url, url.href, selection, vi.fn(), true);
	expect(getElementById).toHaveBeenCalledWith(id);
	expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
});

it('does not scroll for an empty, unresolved or explicitly non-scrolling selection', () => {
	const getElementById = vi.fn();
	vi.stubGlobal('document', { getElementById });
	presentReadingLocation(url, url.href, { segments: [] }, vi.fn(), true);
	presentReadingLocation(url, url.href, { segments: ['s01'], part: null }, vi.fn(), true);
	presentReadingLocation(url, url.href, { segments: ['s01'] }, vi.fn(), false);
	expect(getElementById).not.toHaveBeenCalled();
});

it('tolerates a cited element absent from the rendered slice', () => {
	vi.stubGlobal('document', { getElementById: () => null });
	expect(() =>
		presentReadingLocation(url, url.href, { segments: ['s01'] }, vi.fn(), true)
	).not.toThrow();
});

it('publishes a repaired URL before refreshing its word panel, without redundant history writes', () => {
	const refresh = vi.fn(() => expect(replaceState).toHaveBeenCalledWith(url, {}));
	presentReadingLocation(url, `${url.href}?w=retired`, { segments: [] }, refresh, false);
	expect(refresh).toHaveBeenCalledOnce();
	vi.clearAllMocks();
	const unchangedRefresh = vi.fn();
	presentReadingLocation(url, url.href, { segments: [] }, unchangedRefresh, false);
	expect(replaceState).not.toHaveBeenCalled();
	expect(unchangedRefresh).toHaveBeenCalledOnce();
});

it('cancels an earlier frame and cancels pending work on cleanup', () => {
	const callbacks = new Map<number, () => void>();
	let next = 0;
	vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
		callbacks.set(++next, callback);
		return next;
	});
	vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
	const frame = readingLocationFrame();
	const earlier = vi.fn();
	const latest = vi.fn();
	frame.schedule(earlier);
	frame.schedule(latest);
	expect([...callbacks.keys()]).toEqual([2]);
	callbacks.get(2)!();
	expect(earlier).not.toHaveBeenCalled();
	expect(latest).toHaveBeenCalledOnce();
	frame.schedule(earlier);
	frame.cancel();
	expect(callbacks.has(3)).toBe(false);
});
