import type { ParamMatcher } from '@sveltejs/kit';
import { LANGS } from '$lib/i18n';

export const match: ParamMatcher = (param) => (LANGS as string[]).includes(param);
