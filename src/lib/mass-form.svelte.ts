// Which kind of Mass the reader is at, and therefore which lines are theirs
// to say.
//
// The 1958 instruction grades the two forms apart, and the difference is not
// small: at a sung Mass the people sing the Ordinary — Kyrie, Gloria, Credo,
// Sanctus, Agnus (n. 25 b) — while at a low Mass the same texts are theirs
// only at the third degree (n. 31 c), and the Kyrie there is theirs as the
// server's part instead. A reader who cannot say which Mass they are at
// cannot be told what to answer.
//
// SUNG IS THE DEFAULT (owner, 2026-08-10). The instruction itself asks that
// the parish Mass on Sundays and feasts be sung (n. 26), and where the
// traditional rite is celebrated at all it is usually the Sunday Mass — so
// the sung form is what a first-time reader is most likely to be standing
// in, and the default should be the common case rather than the simple one.

import { browser } from '$app/environment';
import { readStored, writeStored } from '$lib/storage';
import type { MassForm } from '$lib/corpus';

export const MASS_FORMS = ['cantu', 'lecta'] as const;

const KEY = 'scrutabor-mass-form';

function stored(): MassForm {
	if (!browser) return 'cantu';
	const saved = readStored(KEY);
	return (MASS_FORMS as readonly string[]).includes(saved ?? '') ? (saved as MassForm) : 'cantu';
}

// Prerender has no localStorage, so the served HTML is always the sung
// Mass's view and the reader's own choice is applied once the page is alive
// — the same rule the role store follows, and for the same reason.
let current = $state<MassForm>('cantu');

export const massForm = {
	get value(): MassForm {
		return current;
	},
	set(next: MassForm) {
		current = next;
		if (browser) writeStored(KEY, next);
	}
};

/** Apply the reader's stored choice. Called once, from the root layout. */
export function loadMassForm(): void {
	if (browser) current = stored();
}
