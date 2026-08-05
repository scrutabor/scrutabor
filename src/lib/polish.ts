// Polish typography does not leave a one-letter word hanging at the end of
// a line. The words are the one-letter conjunctions and prepositions —
// a, i, o, u, w, z — and their capitals at the start of a sentence.
//
// PWN calls this an editorial convention rather than an orthographic rule
// (Bańko: leaving them is not an error, but a good editor avoids it), and
// allows them to stand in very narrow columns; it asks for them to be
// moved in titles and headings without exception. This is a typeset book,
// so it binds them everywhere.
//
// The binding is presentation, not content: the corpus stores ordinary
// spaces (a corpus check forbids the character outright) and the app puts
// the non-breaking space in on the way to the page. Latin is left alone —
// the convention is Polish, and Latin prose has its own one-letter words
// (a fronte, e regione) that no Polish rule governs.

const ORPHAN = /(^|\s|[„“"(])([aiouwzAIOUWZ])[ \t]+/g;

/** Binds one-letter words to what follows them. Idempotent. */
export function bindOrphans(text: string): string {
	let out = text;
	// A run of them ("i o tym") needs another pass: the first replacement
	// consumes the space the next match would have started from.
	for (let i = 0; i < 4; i++) {
		const next = out.replace(ORPHAN, '$1$2\u00a0');
		if (next === out) break;
		out = next;
	}
	return out;
}

/** Finds what bindOrphans would have bound — the guard's other half. */
export function findOrphans(text: string): string[] {
	return [...text.matchAll(ORPHAN)].map((m) => m[2]);
}

/**
 * Walks a Polish content object and binds every string in it. Used on the
 * data at module load, so the prerendered HTML already carries the
 * non-breaking spaces — no hydration reflow, and no-JS readers get them too.
 */
export function bindProse<T>(value: T): T {
	if (typeof value === 'string') return bindOrphans(value) as T;
	if (Array.isArray(value)) return value.map(bindProse) as T;
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) out[k] = bindProse(v);
		return out as T;
	}
	return value;
}

/**
 * Binds only what sits under a `pl` key. Authored content (the catalog,
 * the ordo spine, the grammar pages) keeps Latin titles and English prose
 * in the same objects — those are not Polish and are left exactly as they
 * are.
 */
export function bindPlFields<T>(value: T): T {
	if (Array.isArray(value)) return value.map(bindPlFields) as T;
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = k === 'pl' ? bindProse(v) : bindPlFields(v);
		}
		return out as T;
	}
	return value;
}
