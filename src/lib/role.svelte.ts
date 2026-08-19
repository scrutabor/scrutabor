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
import { readStored, writeStored } from '$lib/storage';
import type { MassForm, Segment } from '$lib/corpus';

export const ROLES = ['populus', 'minister', 'sacerdos'] as const;
export type Role = (typeof ROLES)[number];

const KEY = 'scrutabor-role';

function stored(): Role {
	if (!browser) return 'populus';
	const saved = readStored(KEY);
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
		if (browser) writeStored(KEY, next);
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
 * own lines from it. `omnes` is everyone by definition, and a priest owns
 * what he says and not what is said to him — which is why the marking
 * cannot simply be "anything that is not the celebrant".
 */
const OWNED: Record<Role, ReadonlySet<string>> = {
	sacerdos: new Set(['sacerdos', 'omnes']),
	minister: new Set(['minister', 'omnes']),
	// The pew's own lines are NOT read from the speaker — see below.
	populus: new Set(['populus', 'omnes'])
};

/**
 * For a reader in the pew this is answered by the corpus's participation
 * layer, not by the speaker: the Missale gives every response at low Mass
 * to the minister and says nothing about the people, so a rule reading the
 * speaker could only ever guess. The 1958 instruction is what grants them
 * their parts, it grades them, and it grades the sung Mass differently from
 * the said one — so which lines are the reader's depends on which Mass they
 * are at, which is why the form is asked for (corpus SCHEMA.md 0.10.0).
 */
export function isYours(seg: Segment, of: Role, form: MassForm): boolean {
	if (of === 'populus') return seg.participation?.[form] !== undefined;
	return seg.speaker !== undefined && OWNED[of].has(seg.speaker);
}

/**
 * Of the lines that are the reader's, the ones EVERYONE answers: the first
 * degree, the short responses the instruction asks that the faithful be
 * able to make everywhere (nn. 25 a, 31 a). A first-timer's question is not
 * "which lines may I say" but "which ones is everybody about to say", and
 * that is this one.
 */
export function isEveryonesResponse(seg: Segment, form: MassForm): boolean {
	return seg.participation?.[form]?.gradus === 1;
}
