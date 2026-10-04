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
	applyFromLocation(): void;
	toggle(id: string): void;
	close(): void;
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
	grouped?: boolean;
	centerBottom?: number;
	panel?: boolean;
	reducedMotion?: boolean;
};
type Module = Record<string, unknown>;

function setup(options: Options = {}) {
	let next = 1;
	let frames = new Map<number, () => void>();
	const timers = new Map<number, () => void>();
	const cleanups: (() => void)[] = [];
	const listeners = new Map<string, Set<() => void>>();
	const events: Event[] = [];
	let url = new URL('https://example.test/app/en/ordinarium/praefatio-communis?w=w052');
	let page = 'first';
	let bottom = 700;
	const add = (name: string, fn: () => void) => {
		if (!listeners.has(name)) listeners.set(name, new Set());
		listeners.get(name)!.add(fn);
	};
	const remove = (name: string, fn: () => void) => listeners.get(name)?.delete(fn);
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
		history: { back() {} },
		window: {
			innerHeight: 844,
			scrollY: 0,
			addEventListener: add,
			removeEventListener: remove,
			matchMedia: () => ({ matches: options.reducedMotion ?? false }),
			scrollBy: (scroll: { top: number; behavior: string }) => {
				events.push({ operation: 'raise', page, ...scroll });
				bottom -= scroll.top;
			},
			scrollTo: (scroll: { top: number; behavior: string }) =>
				events.push({ operation: 'pin', page, ...scroll })
		},
		document: {
			documentElement: { scrollHeight: 4000 },
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
	const panel = createPanel({ has: () => true });
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
		gesture(kind: string) {
			for (const fn of listeners.get(kind) ?? []) fn();
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
