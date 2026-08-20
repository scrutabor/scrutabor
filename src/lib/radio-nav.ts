// The radiogroup contract's keyboard half, shared by every control that
// renders choices as a row of words: one tab stop (the checked radio) and
// the arrows move the check, wrapping at the ends — the APG pattern that
// arrow-nav already yields the arrow keys to. It lived in RolePicker
// first; when the help control became the same kind of row, the handler
// moved here rather than growing a twin.
import { tick } from 'svelte';

export function radiogroupKeydown<T>(opts: {
	options: () => readonly T[];
	current: () => T;
	choose: (option: T) => void;
	group: () => HTMLElement | undefined;
}) {
	return async (e: KeyboardEvent) => {
		const delta =
			e.key === 'ArrowRight' || e.key === 'ArrowDown'
				? 1
				: e.key === 'ArrowLeft' || e.key === 'ArrowUp'
					? -1
					: 0;
		if (!delta) return;
		e.preventDefault();
		const options = opts.options();
		const at = options.indexOf(opts.current());
		opts.choose(options[(at + delta + options.length) % options.length]);
		// The check moved; focus follows it once the DOM agrees.
		await tick();
		opts.group()?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
	};
}
