import { dev } from '$app/environment';
import { canonData } from '$lib/loaders';
import { LANGS, type Lang } from '$lib/i18n';
import { error, json } from '@sveltejs/kit';
import type { EntryGenerator, RequestHandler } from './$types';
export const prerender = true;
export const entries: EntryGenerator = () => LANGS.map((lang) => ({ lang }));
export const GET: RequestHandler = async ({ params }) => {
	const lang = params.lang as Lang;
	if (!LANGS.includes(lang)) error(404, 'no such language');
	return json(await canonData(lang), {
		headers: { 'cache-control': dev ? 'no-store' : 'no-cache' }
	});
};
