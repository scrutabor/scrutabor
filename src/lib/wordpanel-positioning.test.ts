/// <reference types="node" />
// Run the actual panel and frame-helper modules with a deterministic browser
// clock. Rune storage and mount/cleanup are stubbed, not Svelte rendering;
// the reader tests separately cover the rendered component and real layout.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { expect, it } from 'vitest';

type Panel = {
	readonly id: string | null;
	readonly keepPad: boolean;
	applyFromLocation(): void;
	toggle(id: string): void;
	close(): void;
	closeThen(action: () => void): void;
	goTo(id: string): void;
};
type Event = {
	operation: string;
	page: string;
	id?: string;
	selector?: string;
	top?: number;
	behavior?: string;
};
type Options = {
	closeGeometry?: boolean;
	initialWord?: string | null;
	grouped?: boolean;
	centerBottom?: number;
	panel?: boolean;
	reducedMotion?: boolean;
	wordAvailable?: boolean;
};
type Module = Record<string, unknown>;

function setup(options: Options = {}) {
	let next = 1;
	let frames = new Map<number, () => void>();
	const timers = new Map<number, () => void>();
	const cleanups: (() => void)[] = [];
	const deferredEffects = new Set<() => unknown>();
	const listeners = new Map<string, Set<() => void>>();
	const captureListeners = new Map<string, Set<() => void>>();
	const events: Event[] = [];
	let url = new URL('https://example.test/app/en/ordinarium/praefatio-communis?w=w052');
	if (options.initialWord === null) url.searchParams.delete('w');
	else if (options.initialWord !== undefined) url.searchParams.set('w', options.initialWord);
	let page = 'first';
	let bottom = 700;
	let y = 0;
	let activePanel: Panel | null = null;
	let historyBacks = 0;
	const height = () =>
		options.closeGeometry
			? Math.round(9131 + (activePanel?.id || activePanel?.keepPad ? 844 * 0.45 : 0))
			: 4000;
	const clamp = (value: number) => Math.max(0, Math.min(value, height() - 844));
	const registry = (options?: boolean | { capture?: boolean }) =>
		(typeof options === 'boolean' ? options : options?.capture) ? captureListeners : listeners;
	const add = (name: string, fn: () => void, options?: boolean | { capture?: boolean }) => {
		const target = registry(options);
		if (!target.has(name)) target.set(name, new Set());
		target.get(name)!.add(fn);
	};
	const remove = (name: string, fn: () => void, options?: boolean | { capture?: boolean }) =>
		registry(options).get(name)?.delete(fn);
	// Activate an initially dormant conditional subscription at explicit model
	// state boundaries. This is not a general implementation of Svelte reactivity.
	const flushDeferredEffects = () => {
		for (const mount of deferredEffects) {
			const cleanup = mount();
			if (typeof cleanup === 'function') {
				cleanups.push(cleanup as () => void);
				deferredEffects.delete(mount);
			}
		}
	};
	const element = (id: string, grouped: boolean): object => ({
		closest: () => (options.grouped === false ? null : element(id, true)),
		getBoundingClientRect: () => ({ bottom }),
		scrollIntoView: () => {
			events.push({ operation: grouped ? 'center-group' : 'center-word', page, id });
			bottom = options.centerBottom ?? 500;
		}
	});
	const mocks: Module = {
		svelte: { untrack: (fn: () => unknown) => fn() },
		'./url': { pageUrl: () => new URL(url) },
		'$app/navigation': {
			pushState: (value: URL) => {
				url = value;
			},
			replaceState: (value: URL) => {
				url = value;
			}
		},
		// Not called by wordPanel; its separate data-resolution tests cover it.
		'./word-construction': {
			constructionForWord: () => {
				throw new Error('Unexpected data lookup');
			}
		}
	};
	const context = vm.createContext({
		URL,
		$state: (value: unknown) => value,
		$effect: (mount: () => unknown) => {
			const cleanup = mount();
			if (typeof cleanup === 'function') cleanups.push(cleanup as () => void);
			else deferredEffects.add(mount);
		},
		requestAnimationFrame: (fn: () => void) => {
			const id = next++;
			frames.set(id, fn);
			return id;
		},
		cancelAnimationFrame: (id: number) => frames.delete(id),
		setTimeout: (fn: () => void) => {
			const id = next++;
			timers.set(id, fn);
			return id;
		},
		clearTimeout: (id: number) => timers.delete(id),
		addEventListener: add,
		removeEventListener: remove,
		history: {
			back() {
				historyBacks++;
			}
		},
		window: {
			innerHeight: 844,
			get scrollY() {
				return y;
			},
			addEventListener: add,
			removeEventListener: remove,
			matchMedia: () => ({ matches: options.reducedMotion ?? false }),
			scrollBy: (scroll: { top: number; behavior: string }) => {
				events.push({ operation: 'raise', page, ...scroll });
				bottom -= scroll.top;
			},
			scrollTo: (scroll: { top: number; behavior: string }) => {
				events.push({ operation: 'pin', page, ...scroll });
				if (options.closeGeometry) y = clamp(scroll.top);
			}
		},
		document: {
			documentElement: {
				get scrollHeight() {
					return height();
				},
				clientHeight: 844
			},
			getElementById: (id: string) => {
				events.push({ operation: 'lookup', page, id });
				return element(id, false);
			},
			querySelector: (selector: string) => {
				events.push({ operation: 'sheet', page, selector });
				if (selector === 'aside.panel' && options.panel === false) return null;
				// An unrelated aside appears first and must never set the clearance.
				return { getBoundingClientRect: () => ({ top: selector === 'aside.panel' ? 460 : 80 }) };
			}
		}
	});
	const loaded = new Map<string, Module>();
	function load(name: string): Module {
		const cached = loaded.get(name);
		if (cached) return cached;
		const exports: Module = {};
		loaded.set(name, exports);
		const source = readFileSync(resolve('src/lib', name), 'utf8');
		const code = ts.transpileModule(source, {
			compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
		}).outputText;
		const execute = vm.runInContext(`(function(exports, require) {${code}\n})`, context) as (
			exports: Module,
			require: (id: string) => unknown
		) => void;
		execute(exports, (id) => {
			if (id in mocks) return mocks[id];
			if (id === './reading-location') return load('reading-location.ts');
			throw new Error(`Unexpected panel dependency: ${id}`);
		});
		return exports;
	}
	const createPanel = load('wordpanel.svelte.ts').wordPanel as (host: {
		has: (id: string) => boolean;
	}) => Panel;
	const panel = createPanel({ has: () => options.wordAvailable !== false });
	activePanel = panel;
	return {
		panel,
		events,
		frame() {
			const pending = frames;
			frames = new Map();
			for (const fn of pending.values()) fn();
		},
		destroy() {
			for (const cleanup of cleanups) cleanup();
		},
		gesture(kind: string, key?: string) {
			for (const target of [captureListeners, listeners]) {
				for (const fn of target.get(kind) ?? [])
					Reflect.apply(fn, undefined, [{ type: kind, key }]);
			}
		},
		flushTimers() {
			const pending = [...timers.values()];
			timers.clear();
			for (const fn of pending) fn();
		},
		scroll(value: number) {
			if (options.closeGeometry) flushDeferredEffects();
			y = clamp(value);
			for (const fn of listeners.get('scroll') ?? []) fn();
			// Model the browser's immediate clamp when a listener removes padding.
			y = clamp(y);
		},
		position() {
			return { y, max: height() - 844, historyBacks, word: url.searchParams.get('w') };
		},
		deferLocationApply() {
			const createFrame = load('reading-location.ts').readingLocationFrame as () => {
				schedule(action: () => void): void;
			};
			createFrame().schedule(() => panel.applyFromLocation());
		},
		popCaptureListenerCount() {
			return captureListeners.get('popstate')?.size ?? 0;
		},
		changeQuery(key: string, value: string) {
			url.searchParams.set(key, value);
		},
		popListenerCount() {
			return listeners.get('popstate')?.size ?? 0;
		},
		changeAddress(address: string) {
			url = new URL(address, url);
		},
		changePath(pathname: string) {
			url.pathname = pathname;
		},
		scrollListenerCount() {
			return listeners.get('scroll')?.size ?? 0;
		},
		replaceDocument() {
			page = 'replacement';
			bottom = 700;
		},
		clearWordAddress() {
			url.searchParams.delete('w');
		},
		raises() {
			return events.filter((event) => event.operation === 'raise');
		}
	};
}

type Run = ReturnType<typeof setup>;

function tappedAt(y: number, options: Options) {
	const run = setup(options);
	run.panel.toggle('w052');
	run.scroll(y);
	return run;
}

// Drain exactly this timer turn and two frames, not all future queued work.
function flushCloseFrames(run: Run) {
	run.flushTimers();
	run.frame();
	run.frame();
}

function pinEvents(run: Run) {
	return run.events.filter((event) => event.operation === 'pin');
}

// The boundary is an event index, so slice before filtering out non-pin events.
function pinEventsAfter(run: Run, before: number) {
	return run.events.slice(before).filter((event) => event.operation === 'pin');
}

function expectImmediateCloseThen(run: Run) {
	let actions = 0;
	run.panel.closeThen(() => actions++);
	expect(actions).toBe(1);
	expect(run.position()).toMatchObject({ historyBacks: 0, word: null });
	expect(run.popListenerCount()).toBe(0);
}

const stages = ['before-center', 'after-center'] as const;
it.each(stages)('teardown %s cancels positioning before a reused word ID appears', (stage) => {
	const run = setup();
	run.panel.applyFromLocation();
	if (stage === 'after-center') run.frame();
	const count = run.events.length;
	run.destroy();
	run.replaceDocument();
	run.frame();
	run.frame();
	expect(run.events).toHaveLength(count);
});

it.each(
	['wheel', 'touchstart', 'pointerdown', 'keydown'].flatMap((kind) =>
		stages.map((stage) => [kind, stage])
	)
)('a %s gesture %s prevents further landing work', (kind, stage) => {
	const run = setup();
	run.panel.applyFromLocation();
	if (stage === 'after-center') run.frame();
	const count = run.events.length;
	run.gesture(kind);
	run.frame();
	run.frame();
	expect(run.events).toHaveLength(count);
});

it.each(stages)('a newer selection %s supersedes pending positioning', (stage) => {
	const run = setup();
	run.panel.applyFromLocation();
	if (stage === 'after-center') run.frame();
	run.panel.toggle('w053');
	run.frame();
	run.frame();
	expect(run.raises()).toHaveLength(1);
	expect(run.events.filter((event) => event.operation === 'lookup').at(-1)?.id).toBe('w053');
});

it.each(
	[true, false].flatMap((grouped) => [420, 500].map((centerBottom) => ({ grouped, centerBottom })))
)('clears only actual overlap for $grouped group at $centerBottom', (options) => {
	const run = setup(options);
	run.panel.applyFromLocation();
	run.frame();
	run.frame();
	expect(run.events.find((event) => event.operation.startsWith('center'))?.operation).toBe(
		options.grouped ? 'center-group' : 'center-word'
	);
	expect(run.raises()).toHaveLength(options.centerBottom === 500 ? 1 : 0);
	expect(run.events.find((event) => event.operation === 'sheet')?.selector).toBe('aside.panel');
	if (run.raises().length) expect(run.raises()[0]).toMatchObject({ top: 56, behavior: 'auto' });
});

it('does not treat an unrelated aside as the word panel', () => {
	const run = setup({ panel: false });
	run.panel.applyFromLocation();
	run.frame();
	run.frame();
	expect(run.raises()).toHaveLength(0);
});

it('preserves pending tap clearance across a same-selection host refresh', () => {
	const run = setup();
	run.panel.toggle('w052');
	run.panel.applyFromLocation();
	run.frame();
	run.frame();
	expect(run.raises()).toHaveLength(1);
});

it('does not resurrect tap clearance after a reader gesture and same-selection refresh', () => {
	const run = setup();
	run.panel.toggle('w052');
	run.gesture('wheel');
	run.panel.applyFromLocation();
	run.frame();
	run.frame();
	expect(run.raises()).toHaveLength(0);
});

it('a changed location selection discards a pending tap clearance', () => {
	const run = setup();
	run.panel.toggle('w052');
	run.clearWordAddress();
	run.panel.applyFromLocation();
	run.frame();
	run.frame();
	expect(run.raises()).toHaveLength(0);
});

it('close cancels pending raise but retains the independent close-scroll pin', () => {
	const run = setup();
	run.panel.applyFromLocation();
	run.frame();
	run.panel.close();
	run.frame();
	run.frame();
	expect(run.raises()).toHaveLength(0);
	expect(run.events.some((event) => event.operation === 'pin')).toBe(true);
});

it('cross-reference navigation centers the construction, not only its member', () => {
	const run = setup();
	run.panel.goTo('w052');
	run.frame();
	expect(run.events.find((event) => event.operation.startsWith('center'))?.operation).toBe(
		'center-group'
	);
	expect(run.raises()).toHaveLength(1);
});

it.each([false, true])('ordinary taps retain the reduced-motion preference %s', (reducedMotion) => {
	const run = setup({ reducedMotion });
	run.panel.toggle('w052');
	run.frame();
	expect(run.raises()[0]?.behavior).toBe(reducedMotion ? 'auto' : 'smooth');
});

const closeOrders = ['before-timer', 'between-frames', 'after-timer'] as const;
it.each(closeOrders)('keeps close padding across a history scroll %s', (order) => {
	const run = tappedAt(8436, { closeGeometry: true });
	run.gesture('pointerdown');
	run.gesture('keydown', 'Escape');
	run.panel.close();
	expect(run.panel.keepPad).toBe(true);
	expect(run.position().historyBacks).toBe(1);
	if (order === 'between-frames') run.frame();
	if (order === 'after-timer') run.flushTimers();
	run.scroll(8287);
	expect(run.scrollListenerCount()).toBe(1);
	expect(run.panel.keepPad).toBe(true);
	expect(run.position().max).toBe(8667);
	flushCloseFrames(run);
	expect(run.position().y).toBe(8436);
	expect(run.panel.keepPad).toBe(true);
	expect(pinEvents(run).map((event) => event.top)).toEqual([8436, 8436, 8436]);
});

it('another Escape does not arm padding release or cancel pending close pins', () => {
	const run = tappedAt(8436, { closeGeometry: true });
	run.panel.close();
	run.gesture('keydown', 'Escape');
	run.scroll(8287);
	expect(run.panel.keepPad).toBe(true);
	flushCloseFrames(run);
	expect(run.position().y).toBe(8436);
});

it('programmatic focus and its scroll do not count as fresh reader intent', () => {
	const run = tappedAt(8436, { closeGeometry: true });
	run.panel.close();
	run.gesture('focusin');
	run.scroll(8287);
	expect(run.panel.keepPad).toBe(true);
	flushCloseFrames(run);
	expect(run.position().y).toBe(8436);
});

it.each(['wheel', 'touchstart', 'pointerdown', 'keydown'])(
	'a fresh %s hands position back to the reader before old pins fire',
	(kind) => {
		const run = tappedAt(8436, { closeGeometry: true });
		run.panel.close();
		run.gesture(kind, 'ArrowUp');
		run.scroll(8400);
		expect(run.panel.keepPad).toBe(true);
		run.scroll(8200);
		expect(run.panel.keepPad).toBe(false);
		expect(run.position().max).toBe(8287);
		expect(run.position().y).toBe(8200);
		flushCloseFrames(run);
		expect(run.position().y).toBe(8200);
		expect(pinEvents(run)).toHaveLength(0);
	}
);

it.each(['PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab'])(
	'a fresh %s key can relinquish close padding without an old pin overriding it',
	(key) => {
		const run = tappedAt(8436, { closeGeometry: true });
		run.panel.close();
		run.gesture('keydown', key);
		run.scroll(8200);
		expect(run.panel.keepPad).toBe(false);
		flushCloseFrames(run);
		expect(run.position().y).toBe(8200);
		expect(pinEvents(run)).toHaveLength(0);
	}
);

it('teardown cancels both close pins before a replacement document appears', () => {
	const run = tappedAt(8436, { closeGeometry: true });
	run.panel.close();
	const count = run.events.length;
	run.destroy();
	run.replaceDocument();
	flushCloseFrames(run);
	expect(run.events).toHaveLength(count);
});

it('opening another selection cancels a previous close session pin', () => {
	const run = tappedAt(8436, { closeGeometry: true });
	run.panel.close();
	run.panel.toggle('w053');
	flushCloseFrames(run);
	expect(run.panel.id).toBe('w053');
	expect(pinEvents(run)).toHaveLength(0);
});

it('a deep-link close removes its address without manufacturing a history back', () => {
	const run = setup({ closeGeometry: true });
	run.panel.applyFromLocation();
	run.scroll(8436);
	run.panel.close();
	flushCloseFrames(run);
	expect(run.position()).toMatchObject({ y: 8436, historyBacks: 0, word: null });
	expect(run.panel.keepPad).toBe(true);
});

it('closeThen still waits for exactly one real pop before applying its action', () => {
	const run = tappedAt(8436, { closeGeometry: true });
	let actions = 0;
	run.panel.closeThen(() => actions++);
	expect(actions).toBe(0);
	expect(run.position().historyBacks).toBe(1);
	run.clearWordAddress();
	run.gesture('popstate');
	expect(actions).toBe(1);
	run.gesture('popstate');
	expect(actions).toBe(1);
});

it('a close above the unpadded maximum needs no kept padding', () => {
	const run = tappedAt(8236, { closeGeometry: true });
	run.panel.close();
	flushCloseFrames(run);
	expect(run.panel.keepPad).toBe(false);
	expect(run.position().y).toBe(8236);
});

it.each(['before-pop', 'after-pop'])(
	'a delayed history restoration %s cannot outlive explicit close completion',
	(order) => {
		const run = tappedAt(8436, { closeGeometry: true });
		run.panel.close();
		flushCloseFrames(run);
		expect(run.position().y).toBe(8436);
		run.clearWordAddress();
		if (order === 'before-pop') run.scroll(8287);
		run.gesture('popstate');
		if (order === 'after-pop') run.scroll(8287);
		run.panel.applyFromLocation();
		flushCloseFrames(run);
		expect(run.position().y).toBe(8436);
		expect(run.panel.keepPad).toBe(true);
		expect(run.popListenerCount()).toBe(0);
		expect(pinEvents(run).map((event) => event.top)).toEqual([8436, 8436, 8436, 8436, 8436, 8436]);
	}
);

it('fresh intent cancels a delayed pin without losing the queued closeThen action', () => {
	const run = tappedAt(8436, { closeGeometry: true });
	let actions = 0;
	run.panel.closeThen(() => actions++);
	run.gesture('wheel');
	run.scroll(8200);
	run.clearWordAddress();
	run.gesture('popstate');
	flushCloseFrames(run);
	expect(actions).toBe(1);
	expect(run.position().y).toBe(8200);
	expect(pinEvents(run)).toHaveLength(0);
	expect(run.popListenerCount()).toBe(0);
});

it('teardown removes pending history completion and its closeThen action', () => {
	const run = tappedAt(8436, { closeGeometry: true });
	let actions = 0;
	run.panel.closeThen(() => actions++);
	const count = run.events.length;
	run.destroy();
	run.replaceDocument();
	run.clearWordAddress();
	run.gesture('popstate');
	flushCloseFrames(run);
	expect(actions).toBe(0);
	expect(run.events).toHaveLength(count);
	expect(run.popListenerCount()).toBe(0);
});

it('a new selection cancels pending history completion and the old closeThen action', () => {
	const run = tappedAt(8436, { closeGeometry: true });
	let actions = 0;
	run.panel.closeThen(() => actions++);
	run.panel.toggle('w053');
	run.gesture('popstate');
	flushCloseFrames(run);
	expect(actions).toBe(0);
	expect(run.panel.id).toBe('w053');
	expect(pinEvents(run)).toHaveLength(0);
	expect(run.popListenerCount()).toBe(0);
});

it('the latest closeThen waits on an already pending ordinary close', () => {
	const run = tappedAt(8436, { closeGeometry: true });
	run.panel.close();
	const actions: string[] = [];
	run.panel.closeThen(() => actions.push('first'));
	run.panel.closeThen(() => actions.push('last'));
	expect(actions).toEqual([]);
	expect(run.position().historyBacks).toBe(1);
	expect(run.popListenerCount()).toBe(1);
	run.clearWordAddress();
	run.gesture('popstate');
	expect(actions).toEqual(['last']);
	run.gesture('popstate');
	expect(actions).toEqual(['last']);
	expect(run.popListenerCount()).toBe(0);
});

it('a closeThen action opening a new word cancels event-rearmed pins', () => {
	const run = tappedAt(8436, { closeGeometry: true });
	run.panel.closeThen(() => run.panel.toggle('w053'));
	run.clearWordAddress();
	run.gesture('popstate');
	flushCloseFrames(run);
	expect(run.panel.id).toBe('w053');
	expect(pinEvents(run)).toHaveLength(0);
	expect(run.popListenerCount()).toBe(0);
});

it('a closeThen navigation cannot pin a reused page component at the old pathname', () => {
	const run = tappedAt(8436, { closeGeometry: true });
	let actions = 0;
	run.panel.closeThen(() => {
		actions++;
		run.changePath('/app/en/ordinarium/credo');
	});
	run.clearWordAddress();
	run.gesture('popstate');
	flushCloseFrames(run);
	expect(actions).toBe(1);
	expect(pinEvents(run)).toHaveLength(0);
});

it('a different pathname before pop cancels the stale closeThen action and pin', () => {
	const run = tappedAt(8436, { closeGeometry: true });
	let actions = 0;
	run.panel.closeThen(() => actions++);
	run.changePath('/app/en/ordinarium/credo');
	run.clearWordAddress();
	run.gesture('popstate');
	flushCloseFrames(run);
	expect(actions).toBe(0);
	expect(pinEvents(run)).toHaveLength(0);
	expect(run.popListenerCount()).toBe(0);
});

it('deep-link closeThen remains synchronous and creates no pop listener', () => {
	const run = setup({ closeGeometry: true });
	run.panel.applyFromLocation();
	run.scroll(8436);
	expectImmediateCloseThen(run);
});

// A native traversal reaches capture before the router restores its saved Y.
// The actual caller applies the panel location only in its later frame.
it.each(closeOrders)(
	'native Back captures pre-router position across deferred refresh %s',
	(order) => {
		const run = tappedAt(8439, { closeGeometry: true, initialWord: null });
		expect(run.popCaptureListenerCount()).toBe(1);
		run.clearWordAddress();
		run.gesture('popstate');
		expect(run.panel.id).toBeNull();
		expect(run.panel.keepPad).toBe(true);
		expect(run.position()).toMatchObject({ y: 8439, max: 8667, historyBacks: 0, word: null });
		if (order === 'between-frames') run.frame();
		if (order === 'after-timer') run.flushTimers();
		run.scroll(8287);
		run.deferLocationApply();
		flushCloseFrames(run);
		expect(run.position()).toMatchObject({ y: 8439, max: 8667, historyBacks: 0, word: null });
		expect(run.panel.keepPad).toBe(true);
		expect(pinEvents(run).map((event) => event.top)).toEqual([8439, 8439, 8439]);
	}
);

it('fresh reader intent cancels native-Back pins before deferred location refresh', () => {
	const run = tappedAt(8439, { closeGeometry: true, initialWord: null });
	run.clearWordAddress();
	run.gesture('popstate');
	expect(run.panel.keepPad).toBe(true);
	run.gesture('wheel');
	run.scroll(8200);
	run.deferLocationApply();
	flushCloseFrames(run);
	// Drain pins newly scheduled by the deferred location refresh as well.
	run.flushTimers();
	run.frame();
	expect(run.panel.keepPad).toBe(false);
	expect(run.position()).toMatchObject({ y: 8200, max: 8287, historyBacks: 0 });
	expect(pinEvents(run)).toHaveLength(0);
});

it('teardown removes native-Back capture and cancels its pins', () => {
	const run = tappedAt(8439, { closeGeometry: true, initialWord: null });
	expect(run.popCaptureListenerCount()).toBe(1);
	run.clearWordAddress();
	run.gesture('popstate');
	const count = run.events.length;
	run.destroy();
	expect(run.popCaptureListenerCount()).toBe(0);
	run.replaceDocument();
	flushCloseFrames(run);
	expect(run.events).toHaveLength(count);
});

it('a new selection cancels native-Back pins before deferred location refresh', () => {
	const run = tappedAt(8439, { closeGeometry: true, initialWord: null });
	run.clearWordAddress();
	run.gesture('popstate');
	expect(run.panel.id).toBeNull();
	run.panel.toggle('w053');
	flushCloseFrames(run);
	expect(run.panel.id).toBe('w053');
	expect(pinEvents(run)).toHaveLength(0);
});

it.each(['pathname', 'query'] as const)(
	'history capture does not close or pin an unrelated %s address',
	(kind) => {
		const run = tappedAt(8439, { closeGeometry: true, initialWord: null });
		run.clearWordAddress();
		if (kind === 'pathname') run.changePath('/app/en/ordinarium/credo');
		else run.changeQuery('s', 's01');
		run.gesture('popstate');
		expect(run.panel.id).toBe('w052');
		expect(run.panel.keepPad).toBe(false);
		expect(pinEvents(run)).toHaveLength(0);
		run.destroy();
	}
);

it('history capture leaves another word address for the normal location refresh', () => {
	const run = setup({ closeGeometry: true });
	run.panel.toggle('w053');
	run.scroll(8439);
	run.changeQuery('w', 'w052');
	run.gesture('popstate');
	expect(run.panel.id).toBe('w053');
	expect(run.panel.keepPad).toBe(false);
	expect(pinEvents(run)).toHaveLength(0);
	run.destroy();
});

// URL transitions below model the observed traversal order, not native browser
// history. No tap/open is used to restore the Forward selection.
function forwardSelection() {
	const run = tappedAt(8439, { closeGeometry: true, initialWord: null });
	run.clearWordAddress();
	run.gesture('popstate');
	run.deferLocationApply();
	flushCloseFrames(run);
	run.changeQuery('w', 'w052');
	run.gesture('popstate');
	run.deferLocationApply();
	run.frame();
	run.frame();
	run.frame();
	run.scroll(8493);
	return run;
}

it.each(closeOrders)('Forward-restored Back captures its own current Y %s', (order) => {
	const run = forwardSelection();
	const before = run.events.length;
	run.clearWordAddress();
	run.gesture('popstate');
	expect(run.panel.id).toBeNull();
	if (order === 'between-frames') run.frame();
	if (order === 'after-timer') run.flushTimers();
	run.scroll(8439);
	run.deferLocationApply();
	flushCloseFrames(run);
	expect(run.position()).toMatchObject({ y: 8493, historyBacks: 0, word: null });
	expect(run.panel.keepPad).toBe(true);
	expect(pinEventsAfter(run, before).map((event) => event.top)).toEqual([8493, 8493, 8493]);
});

it('fresh reader intent after Forward cancels pins without a deferred replacement', () => {
	const run = forwardSelection();
	const before = run.events.length;
	run.clearWordAddress();
	run.gesture('popstate');
	run.gesture('wheel');
	run.scroll(8200);
	run.deferLocationApply();
	flushCloseFrames(run);
	run.flushTimers();
	run.frame();
	expect(run.position()).toMatchObject({ y: 8200, max: 8287 });
	expect(pinEventsAfter(run, before)).toHaveLength(0);
});

it.each([
	'/app/en/ordinarium/credo',
	'/app/pl/ordinarium/praefatio-communis',
	'?s=s01',
	'?v=2',
	'#s01'
])('Forward capture leaves an unrelated logical address untouched: %s', (address) => {
	const run = forwardSelection();
	const before = run.events.length;
	run.clearWordAddress();
	run.changeAddress(address);
	run.gesture('popstate');
	expect(run.panel.id).toBe('w052');
	run.destroy();
	flushCloseFrames(run);
	expect(pinEventsAfter(run, before)).toHaveLength(0);
});

it.each([false, true])(
	'deep-link native dismissal requires its exact base: unrelated=%s',
	(unrelated) => {
		const run = setup({ closeGeometry: true });
		run.panel.applyFromLocation();
		run.frame();
		run.frame();
		run.scroll(8493);
		run.clearWordAddress();
		if (unrelated) run.changePath('/app/en/ordinarium/credo');
		run.gesture('popstate');
		expect(run.panel.id).toBe(unrelated ? 'w052' : null);
		flushCloseFrames(run);
		expect(pinEvents(run).map((event) => event.top)).toEqual(unrelated ? [] : [8493, 8493, 8493]);
	}
);

it.each([null, 'w052'])('no applied selection manufactures no capture: %s', (initialWord) => {
	const run = setup({ closeGeometry: true, initialWord, wordAvailable: false });
	run.panel.applyFromLocation();
	run.clearWordAddress();
	run.gesture('popstate');
	flushCloseFrames(run);
	expect(run.panel.id).toBeNull();
	expect(run.panel.keepPad).toBe(false);
	expect(pinEvents(run)).toHaveLength(0);
});

it('Forward does not manufacture push ownership for explicit closeThen', () => {
	const run = forwardSelection();
	expectImmediateCloseThen(run);
});

it('an applied section remains part of the exact wordless selection address', () => {
	const run = setup({ closeGeometry: true });
	run.changeQuery('s', 's01');
	run.panel.applyFromLocation();
	run.frame();
	run.frame();
	run.scroll(8493);
	run.clearWordAddress();
	run.gesture('popstate');
	expect(run.panel.id).toBeNull();
	run.scroll(8439);
	run.deferLocationApply();
	flushCloseFrames(run);
	expect(run.position()).toMatchObject({ y: 8493, historyBacks: 0 });
});

it('a new selection supersedes Forward-dismissal pins', () => {
	const run = forwardSelection();
	const before = run.events.length;
	run.clearWordAddress();
	run.gesture('popstate');
	run.panel.toggle('w053');
	flushCloseFrames(run);
	expect(run.panel.id).toBe('w053');
	expect(pinEventsAfter(run, before)).toHaveLength(0);
});

it('teardown removes Forward-dismissal capture and pending pins', () => {
	const run = forwardSelection();
	run.clearWordAddress();
	run.gesture('popstate');
	const before = run.events.length;
	run.destroy();
	run.replaceDocument();
	flushCloseFrames(run);
	expect(run.popCaptureListenerCount()).toBe(0);
	expect(run.events).toHaveLength(before);
});

it('navigation after Forward capture cannot pin a reused document', () => {
	const run = forwardSelection();
	run.clearWordAddress();
	run.gesture('popstate');
	const before = run.events.length;
	run.changePath('/app/en/ordinarium/credo');
	run.replaceDocument();
	run.scroll(0);
	flushCloseFrames(run);
	expect(run.position().y).toBe(0);
	expect(pinEventsAfter(run, before)).toHaveLength(0);
});

const explicitCompletionStages = ['early-pins-pending', 'early-pins-drained'] as const;
it.each(explicitCompletionStages)(
	'ordinary explicit close consumes its completion timer in the pop task: %s',
	(stage) => {
		const run = tappedAt(8436, { closeGeometry: true, initialWord: null });
		run.panel.close();
		if (stage === 'early-pins-drained') {
			flushCloseFrames(run);
		}
		const before = pinEvents(run).length;
		run.clearWordAddress();
		// Model the router's synchronous saved-Y write before our completion
		// listener. This clock model does not prove browser paint behavior.
		run.scroll(8287);
		run.gesture('popstate');
		expect(run.position()).toMatchObject({ y: 8436, historyBacks: 1, word: null });
		expect(run.popListenerCount()).toBe(0);
		const pins = () =>
			run.events
				.filter((event) => event.operation === 'pin')
				.slice(before)
				.map((event) => event.top);
		expect(pins()).toEqual([8436]);
		run.flushTimers();
		expect(pins()).toEqual([8436]);
		run.frame();
		run.frame();
		expect(pins()).toEqual([8436, 8436, 8436]);
		run.gesture('popstate');
		expect(pins()).toEqual([8436, 8436, 8436]);
		run.destroy();
	}
);

// Direct safety boundaries for the ordinary-close completion branch.
const ordinaryCloseInputs = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
it.each(ordinaryCloseInputs)(
	'ordinary explicit close respects fresh %s before its delayed pop',
	(kind) => {
		const run = tappedAt(8436, { closeGeometry: true, initialWord: null });
		run.panel.close();
		// A real delayed traversal may follow all early pins.
		flushCloseFrames(run);
		const before = run.events.length;
		run.gesture(kind, 'ArrowUp');
		run.scroll(8200);
		expect(run.panel.keepPad).toBe(false);
		run.clearWordAddress();
		run.gesture('popstate');
		expect(run.position()).toMatchObject({ y: 8200, historyBacks: 1, word: null });
		expect(run.popListenerCount()).toBe(0);
		expect(pinEventsAfter(run, before)).toHaveLength(0);
		flushCloseFrames(run);
		expect(run.position().y).toBe(8200);
		expect(pinEventsAfter(run, before)).toHaveLength(0);
		run.destroy();
	}
);
it.each(ordinaryCloseInputs)(
	'ordinary explicit close respects fresh %s after pop before its fallback frames',
	(kind) => {
		const run = tappedAt(8436, { closeGeometry: true, initialWord: null });
		run.panel.close();
		run.clearWordAddress();
		run.scroll(8287);
		run.gesture('popstate');
		expect(run.position()).toMatchObject({ historyBacks: 1, word: null });
		expect(run.popListenerCount()).toBe(0);
		const before = run.events.length;
		run.gesture(kind, 'ArrowUp');
		run.scroll(8200);
		expect(run.panel.keepPad).toBe(false);
		flushCloseFrames(run);
		expect(run.position().y).toBe(8200);
		expect(pinEventsAfter(run, before)).toHaveLength(0);
		run.destroy();
	}
);
it('ordinary explicit close cannot pin a different pathname when its pop arrives', () => {
	const run = tappedAt(8436, { closeGeometry: true, initialWord: null });
	run.panel.close();
	const before = run.events.length;
	run.changePath('/app/en/ordinarium/credo');
	run.replaceDocument();
	run.scroll(0);
	run.clearWordAddress();
	run.gesture('popstate');
	expect(run.position()).toMatchObject({ y: 0, historyBacks: 1, word: null });
	expect(run.popListenerCount()).toBe(0);
	expect(pinEventsAfter(run, before)).toHaveLength(0);
	flushCloseFrames(run);
	expect(run.position().y).toBe(0);
	expect(pinEventsAfter(run, before)).toHaveLength(0);
	run.destroy();
});

const firstFrameOrigins = ['push', 'deep-link-switch', 'forward-switch', 'native-back'] as const;
function closedForFirstFrame(origin: (typeof firstFrameOrigins)[number]) {
	const run =
		origin === 'forward-switch'
			? forwardSelection()
			: setup({ closeGeometry: true, initialWord: origin === 'deep-link-switch' ? 'w052' : null });
	if (origin === 'deep-link-switch') {
		run.panel.applyFromLocation();
		run.frame();
		run.frame();
	}
	if (origin === 'deep-link-switch' || origin === 'forward-switch') run.panel.toggle('w053');
	else run.panel.toggle('w052');
	run.frame();
	run.scroll(8436);
	if (origin === 'native-back') {
		run.clearWordAddress();
		run.gesture('popstate');
	} else {
		run.panel.close();
		if (origin === 'push') {
			run.clearWordAddress();
			run.gesture('popstate');
		}
	}
	expect(run.position()).toMatchObject({
		y: 8436,
		word: null,
		historyBacks: origin === 'push' ? 1 : 0
	});
	return run;
}

it.each(firstFrameOrigins)('pins the first and fallback close frames for %s', (origin) => {
	const run = closedForFirstFrame(origin);
	// A pending native update may arrive after the input/pop task.
	run.scroll(8438);
	run.frame();
	expect(run.position().y).toBe(8436);
	run.scroll(8437);
	run.frame();
	expect(run.position().y).toBe(8436);
	run.destroy();
});

it.each(firstFrameOrigins)(
	'reader input between close frames cancels the fallback for %s',
	(origin) => {
		const run = closedForFirstFrame(origin);
		run.scroll(8438);
		run.frame();
		expect(run.position().y).toBe(8436);
		const before = run.events.length;
		run.gesture('wheel');
		run.scroll(8400);
		run.flushTimers();
		run.frame();
		expect(run.position().y).toBe(8400);
		expect(pinEventsAfter(run, before)).toHaveLength(0);
		run.destroy();
	}
);
