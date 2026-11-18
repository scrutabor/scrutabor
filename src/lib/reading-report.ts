import pkg from '../../package.json' with { type: 'json' };
import edition from './data/provenance.json' with { type: 'json' };
import type { MassForm } from './corpus';
import { M, type Lang } from './i18n';
import type { Role } from './role.svelte';
import { ORIGIN } from './site';

interface ReadingReportContext {
	word: string;
	lang: Lang;
	mode: number;
	role: Role;
	form: MassForm;
}

/** Keep the existing citation and day choice. The copied text names the
 * view options independently of the recipient's saved settings. */
export function readingReport(location: URL, context: ReadingReportContext): string {
	const { lang, mode, role, form, word } = context;
	const sourcePath = location.pathname;
	const path = sourcePath.startsWith('/app/') ? sourcePath : `/app${sourcePath}`;
	const link = new URL(path, ORIGIN);
	for (const key of ['dies', 'missa', 'v', 's']) {
		const value = location.searchParams.get(key);
		if (value) link.searchParams.set(key, value);
	}
	link.searchParams.set('w', word);
	if (location.hash.startsWith('#text-')) link.hash = location.hash;
	const strings = M[lang];
	const settings = [lang.toUpperCase(), strings.levels[mode]];
	if (path.includes('/ordo/')) settings.push(strings.roles[role], strings.massForms[form]);
	const version = lang === 'pl' ? 'edycja korpusu' : 'corpus edition';
	return [
		link.href,
		settings.join(' · '),
		`Scrutabor ${pkg.version} · ${version} ${edition.edition}`
	].join('\n');
}
