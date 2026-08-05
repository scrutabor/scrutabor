// Which part of the Mass the reader has, and therefore how much of the
// ordo they want in front of them.
//
// Most missals print what a person in the pew hears and says, and that is
// the default here: the parts said aloud, and the answers. The prayers
// the priest says silently are not hidden — nothing is ever hidden — they
// are folded to a line that says what is happening, and open on a tap.
// Someone serving or celebrating chooses their own part and sees it all.
//
// Prayer-book first (decisions #20): the control is a setting the reader
// visits, not chrome that sits over the text while they pray.

import { browser } from '$app/environment';

export const ROLES = ['populus', 'minister', 'sacerdos'] as const;
export type Role = (typeof ROLES)[number];

const KEY = 'scrutabor-role';

function stored(): Role {
	if (!browser) return 'populus';
	const saved = localStorage.getItem(KEY);
	return (ROLES as readonly string[]).includes(saved ?? '') ? (saved as Role) : 'populus';
}

// Prerender has no localStorage, so the served HTML is always the pew's
// view; the reader's own choice is read once the page is alive. Reading it
// lazily inside the getter instead would write state while a derived value
// is being computed, which Svelte rejects outright — and rightly, since a
// read that writes is a read whose result depends on who asked first.
let current = $state<Role>('populus');

export const role = {
	get value(): Role {
		return current;
	},
	set(next: Role) {
		current = next;
		if (browser) localStorage.setItem(KEY, next);
	}
};

/** Apply the reader's stored choice. Called once, from the root layout. */
export function loadRole(): void {
	if (browser) current = stored();
}

/**
 * Does this reader want the words of a part said in this voice, or only
 * the note that says what is happening?
 *
 * Only the silent prayers fold, and only for the pew: a server answers
 * through them and a priest says them. `submissa` never folds — the
 * raised voice exists precisely so that the people can hear it.
 */
export function showsWords(voice: 'secreto' | 'submissa' | undefined, of: Role): boolean {
	return of !== 'populus' || voice !== 'secreto';
}
