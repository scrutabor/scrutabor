import { dev } from '$app/environment';
import { LANGS, type Lang } from './i18n';
import { error, json } from '@sveltejs/kit';

export const languageArtifactEntries = () => LANGS.map((lang) => ({ lang }));

/** Stable artifact URLs revalidate when a new edition replaces their bodies. */
export function languageArtifact(load: (language: Lang) => Promise<unknown>) {
	return async ({ params }: { params: { lang: string } }) => {
		const lang = params.lang as Lang;
		if (!LANGS.includes(lang)) error(404, 'no such language');
		return json(await load(lang), {
			headers: { 'cache-control': dev ? 'no-store' : 'no-cache' }
		});
	};
}
