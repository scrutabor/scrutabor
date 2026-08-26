import { bibliographyData } from '$lib/loaders';
import type { Lang } from '$lib/i18n';

export const prerender = true;

export async function load({ params }) {
	return await bibliographyData(params.lang as Lang);
}
