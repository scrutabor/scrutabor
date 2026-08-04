import { CONCEPTS } from '$lib/grammar';
import { LANGS } from '$lib/i18n';
import type { EntryGenerator } from './$types';

// Concept pages are reached from the word panel's parse line (client-side)
// — enumerate them for the prerenderer.
export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) => CONCEPTS.map((c) => ({ lang, concept: c.id })));
