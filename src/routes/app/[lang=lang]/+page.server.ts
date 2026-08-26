import { catalogData } from '$lib/loaders';
import type { Lang } from '$lib/i18n';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => catalogData(params.lang as Lang);
