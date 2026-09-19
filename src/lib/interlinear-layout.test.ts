import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitInterlinear } from './interlinear-layout';

afterEach(() => vi.unstubAllGlobals());

function fixture() {
	const callbacks = new Map<number, FrameRequestCallback>();
	let nextFrame = 0;
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		callbacks.set(++nextFrame, callback);
		return nextFrame;
	});
	vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
	const observers: { callback: () => void; disconnect: ReturnType<typeof vi.fn> }[] = [];
	class Observer {
		disconnect = vi.fn();
		observe = vi.fn();
		constructor(public callback: () => void) {
			observers.push(this);
		}
	}
	vi.stubGlobal('ResizeObserver', Observer);
	vi.stubGlobal('MutationObserver', Observer);
	const events = new EventTarget();
	const fonts = Object.assign(new EventTarget(), { ready: Promise.resolve() });
	vi.stubGlobal('window', events);
	vi.stubGlobal('document', { fonts });
	vi.stubGlobal('getComputedStyle', () => ({ paddingLeft: '45px', paddingRight: '0px' }));
	const units = [155, 278, 314, 325].map((width) => {
		const classes = new Set<string>();
		return {
			classes,
			classList: {
				add: (name: string) => classes.add(name),
				remove: (name: string) => classes.delete(name)
			},
			querySelector: () => ({}),
			getBoundingClientRect: () => ({ width: classes.has('wrapped-unit') ? 278 : width })
		};
	});
	const verse = { clientWidth: 323, querySelectorAll: () => units };
	const action = fitInterlinear(verse as unknown as HTMLElement, 1);
	const flush = () => {
		for (const [id, callback] of [...callbacks]) {
			callbacks.delete(id);
			callback(0);
		}
	};
	const wrapped = () => units.map((unit) => unit.classes.has('wrapped-unit'));
	return { action, verse, observers, events, fonts, callbacks, flush, wrapped };
}

describe('interlinear width fallback', () => {
	it('uses the full content width and leaves fitting units native', () => {
		const f = fixture();
		f.flush();
		expect(f.wrapped()).toEqual([false, false, true, true]);
		f.action.destroy();
	});

	it('remeasures intrinsic widths and restores native ruby when space returns', () => {
		const f = fixture();
		f.flush();
		f.verse.clientWidth = 500;
		f.observers[0].callback();
		f.flush();
		expect(f.wrapped()).toEqual([false, false, false, false]);
		f.verse.clientWidth = 323;
		f.observers[0].callback();
		f.flush();
		expect(f.wrapped()).toEqual([false, false, true, true]);
		f.action.destroy();
	});

	it('removes the fallback in bare mode and responds to content and font changes', async () => {
		const f = fixture();
		f.flush();
		f.action.update(0);
		f.flush();
		expect(f.wrapped()).toEqual([false, false, false, false]);
		f.action.update(1);
		f.flush();
		f.observers[1].callback();
		f.fonts.dispatchEvent(new Event('loadingdone'));
		await Promise.resolve();
		expect(f.callbacks.size, 'coalesce invalidations into one frame').toBe(1);
		f.flush();
		expect(f.wrapped()).toEqual([false, false, true, true]);
		f.action.destroy();
	});

	it('fits synchronously for print and disposes observers and pending callbacks', async () => {
		const f = fixture();
		f.events.dispatchEvent(new Event('beforeprint'));
		expect(f.wrapped()).toEqual([false, false, true, true]);
		expect(f.callbacks.size).toBe(0);
		f.events.dispatchEvent(new Event('afterprint'));
		expect(f.callbacks.size).toBe(1);
		f.action.destroy();
		await Promise.resolve();
		f.fonts.dispatchEvent(new Event('loadingdone'));
		f.events.dispatchEvent(new Event('afterprint'));
		expect(f.callbacks.size).toBe(0);
		for (const observer of f.observers) expect(observer.disconnect).toHaveBeenCalledOnce();
	});
});
