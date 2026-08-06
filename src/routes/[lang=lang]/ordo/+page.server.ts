// What each part of the Mass actually has to say, counted from the corpus
// at prerender time.
//
// On the server, like every other page that touches the corpus: this index
// shows no text and must not pull the texts into its bundle (decisions
// #27). What crosses to the browser is three small numbers and two titles.
import { TEXTS } from '$lib/corpus';
import { ORDO } from '$lib/ordo';
import { ROLES, isYours, type Role } from '$lib/role.svelte';
import type { PageServerLoad } from './$types';

/** A part is SAID by this reader when most of its words are theirs; where
 * they have a line or two in someone else's prayer, they are answering. The
 * line between the two is where a reader's own experience puts it: saying
 * the Confíteor is not the same act as answering Amen. */
const SAYS_IT = 0.6;

export const load: PageServerLoad = () => {
	const parts = ORDO.flatMap((m) => m.entries)
		.map((e) => (e.text ? TEXTS[e.text] : undefined))
		.filter((t) => t !== undefined);

	const summary = Object.fromEntries(
		ROLES.map((role) => {
			let answers = 0;
			const says: string[] = [];
			for (const part of parts) {
				const verses = part.text.segments.filter((s) => s.type === 'verse');
				const total = verses.reduce((n, s) => n + (s.words?.length ?? 0), 0);
				const mine = verses
					.filter((s) => isYours(s.speaker, role))
					.reduce((n, s) => n + (s.words?.length ?? 0), 0);
				if (!mine) continue;
				if (total && mine / total > SAYS_IT) says.push(part.text.title);
				else answers += 1;
			}
			return [role, { answers, says }];
		})
	) as Record<Role, { answers: number; says: string[] }>;

	return { summary };
};
