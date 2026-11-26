import type { Lang } from './i18n';
import type { CitationLink } from './corpus';
import { bindOrphans } from './polish';
import polish from './source-locators.pl.json';
import english from './source-locators.en.json';

const translations: Record<Lang, Readonly<Record<string, string>>> = { pl: polish, en: english };

// Each slot is an original coordinate or identifier. Reordering slots lets a
// translation keep the relationship between an address and the words it locates.
const sourceTokens =
	/\{[^{}\n]*\}|\[[^\]\n]+\]|\bAufer a nobis\b|https?:\/\/[^\s;]+|(?:\b(?:web|horas?|missa|latin|ordo|tempora|sancti|commune|witnesses|perseus|data|xml)\/[\w./-]+|\b[\w.-]+\.(?:txt|xml)\b)|\b(?:pr[oó]prium|ordinarium|orationes)\.[\w.-]+|\b(?:n|w|s|B|V)\d+(?:\.\d+)*|\b[0-9a-f]{8,40}\b|\d+(?:[.:]\d+)*|\b(?:XVII?I?|XIX|XXXI?I?I?|LX?I?I?I?)\b/giu;

const dateOptions = { day: 'numeric', month: 'long', timeZone: 'UTC' } as const;
const feastDate = {
	pl: new Intl.DateTimeFormat('pl', dateOptions),
	en: new Intl.DateTimeFormat('en-GB', dateOptions)
};

function formatFeastDate(month: string, day: string, lang: Lang): string {
	const date = new Date(Date.UTC(2000, Number(month) - 1, Number(day)));
	return date.getUTCMonth() + 1 === Number(month) && date.getUTCDate() === Number(day)
		? feastDate[lang].format(date)
		: month + '-' + day;
}

function formatClause(clause: string, lang: Lang): string {
	const tokens: string[] = [];
	const content = clause.trim();
	const key = content.replace(sourceTokens, (token) => {
		tokens.push(token);
		return `{${tokens.length - 1}}`;
	});
	const template = translations[lang][key];
	if (typeof template !== 'string') return clause;
	// Bind only the translated prose, before restoring the unaltered source fields.
	const prose = lang === 'pl' ? bindOrphans(template) : template;
	const localized = prose
		.replace('{date}', () => formatFeastDate(tokens[0], tokens[1], lang))
		.replace(/\{(\d+)\}/gu, (_, index: string) => tokens[Number(index)]);
	return clause.replace(content, () => localized);
}

/** A reader's note for a source whose individual passages have separate links. */
export function sourcePassageNote(section: string | undefined, lang: Lang): string | undefined {
	if (!section) return;
	const note = translations[lang]['passage note: ' + section];
	return note && lang === 'pl' ? bindOrphans(note) : note;
}

export function formatSourceLocator(raw: string, lang: Lang): string {
	// A semicolon in a source key belongs to the key. A middle dot joins the
	// section, print and scan fields. Reading notes may join several citations.
	return raw
		.split(' · ')
		.map((part) =>
			part.replace(/(?:\{[^{}]*\}|[^;{}]|\{(?![^{}]*\}))+|[;]/gu, (clause) =>
				clause === ';' ? clause : formatClause(clause, lang)
			)
		)
		.join(' · ');
}

/** Display the named part and its exact points of reference in a digital edition. */
export function sourcePassageLink(
	passage: { heading: string; url: string },
	lang: Lang
): CitationLink {
	const source = new URL(passage.url);
	const lines = /^#L(\d+)(?:-L(\d+))?$/.exec(source.hash);
	const path = decodeURI(source.pathname);
	const editionPart = /\/(missa|horas)\/Latin\/(.+)$/.exec(path);
	const archivedPath = /\/(obsolete\/.+)$/u.exec(path)?.[1];
	const file =
		archivedPath ??
		(editionPart
			? (editionPart[1] === 'missa' ? 'Missa' : 'Horae') + '/' + editionPart[2]
			: path.split('/').at(-1));
	const range = lines && (lines[2] && lines[2] !== lines[1] ? lines[1] + '–' + lines[2] : lines[1]);
	const unit = lang === 'pl' ? 'w.' : range?.includes('–') ? 'lines' : 'line';
	const heading = formatSourceLocator(passage.heading, lang);
	const label = [heading, file, range && unit + ' ' + range].filter(Boolean).join(' · ');
	return { label, url: passage.url };
}
