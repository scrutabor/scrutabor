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
 * Does this reader want the words of a part, or only the note that says
 * what is happening?
 *
 * Only wholly silent prayers fold, and only for the pew: a server answers
 * through them and a priest says them. `submissa` never folds — the raised
 * voice exists precisely so that the people can hear it.
 *
 * A prayer is wholly silent only if the CORPUS says every one of its lines
 * is (schema 0.9.0, sourced from Rubricae generales 511). That distinction
 * is not pedantry: the embolism and the Canon's doxology are said silently
 * and then end aloud with Per ómnia sǽcula sæculórum, which the people
 * answer — folding those on the voice of the prayer as a whole hides the
 * one line the reader is there to say.
 */
export function showsWords(
	voices: (string | undefined)[],
	fallback: 'secreto' | 'submissa' | undefined,
	of: Role
): boolean {
	if (of !== 'populus') return true;
	const known = voices.filter(Boolean);
	if (known.length) return !known.every((v) => v === 'secreto');
	// no corpus voice (a proper, or a part this edition does not carry yet):
	// fall back to the spine's own reading
	return fallback !== 'secreto';
}

/**
 * Whose line is this — is it one the reader says?
 *
 * The books mark the Ordo S. and M., the priest and the one who answers
 * him; this edition asks the reader which of them they are and marks their
 * own lines from it. At a low Mass the server gives every response, and at
 * a dialogue Mass the faithful answer with him, so both of those parts own
 * the answering lines. `omnes` is everyone by definition. A priest reading
 * this owns what he says and not what is said to him — which is why the
 * marking cannot simply be "anything that is not the celebrant".
 */
const OWNED: Record<Role, ReadonlySet<string>> = {
	sacerdos: new Set(['sacerdos']),
	minister: new Set(['minister', 'omnes']),
	populus: new Set(['minister', 'populus', 'omnes'])
};

export function isYours(speaker: string | undefined, of: Role): boolean {
	return speaker !== undefined && OWNED[of].has(speaker);
}
