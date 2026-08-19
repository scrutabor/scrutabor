import { bibliographyData } from '$lib/loaders';
import type { Lang } from '$lib/i18n';

export const prerender = true;

export function load({ params }) {
	return bibliographyData(params.lang as Lang);
}
