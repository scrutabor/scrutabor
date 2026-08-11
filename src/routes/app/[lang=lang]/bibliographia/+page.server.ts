import { buildBibliography } from '$lib/bibliography';
import type { Lang } from '$lib/i18n';

export const prerender = true;

export function load({ params }) {
	return { sources: buildBibliography(params.lang as Lang) };
}
