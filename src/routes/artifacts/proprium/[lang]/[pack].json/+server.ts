// A small, fixed pack of complete formularies.
//
// The browser still fetches lazily when a reader chooses a day. Grouping five
// adjacent formularies only changes the transport boundary: it cuts hundreds
// of tiny hosted objects to a few dozen without turning a first visit into a
// download of the whole missal.
import { properData } from '$lib/loaders';
import { LANGS, type Lang } from '$lib/i18n';
import { formularyPacks } from '$lib/proprium';
import { error, json } from '@sveltejs/kit';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;

const packs = formularyPacks();
const packName = (index: number) => `pack-${String(index + 1).padStart(2, '0')}`;

export const entries: EntryGenerator = () =>
	LANGS.flatMap((lang) => packs.map((_, index) => ({ lang, pack: packName(index) })));

export const GET: RequestHandler = async ({ params }) => {
	const lang = params.lang as Lang;
	if (!LANGS.includes(lang)) error(404, 'no such language');
	const index = Number(/^pack-(\d+)$/.exec(params.pack)?.[1]) - 1;
	const days = packs[index];
	if (!days) error(404, 'no such formulary pack');
	const loaded = await Promise.all(
		days.map(async (day) => [day.id, await properData(day.id, lang)] as const)
	);
	return json(
		{ days: Object.fromEntries(loaded) },
		{ headers: { 'cache-control': 'public, max-age=604800, immutable' } }
	);
};
