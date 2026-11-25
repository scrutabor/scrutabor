import type { Lang } from './i18n';
import { bindOrphans } from './polish';
import polish from './source-locators.pl.json';
import english from './source-locators.en.json';

const translations: Record<Lang, Readonly<Record<string, string>>> = { pl: polish, en: english };

// Each slot is an original coordinate or identifier. Reordering slots lets a
// translation keep the relationship between an address and the words it locates.
const sourceTokens =
	/\{[^{}\n]*\}|\[[^\]\n]+\]|\bAufer a nobis\b|https?:\/\/[^\s;]+|(?:\b(?:web|horas?|missa|latin|ordo|tempora|sancti|commune|witnesses|perseus|data|xml)\/[\w./-]+|\b[\w.-]+\.(?:txt|xml)\b)|\b(?:pr[oó]prium|ordinarium|orationes)\.[\w.-]+|\b(?:n|w|s|B|V)\d+(?:\.\d+)*|\b[0-9a-f]{8,40}\b|\d+(?:[.:]\d+)*|\b(?:XVII?I?|XIX|XXXI?I?I?|LX?I?I?I?)\b/giu;

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
	const localized = prose.replace(/\{(\d+)\}/gu, (_, index: string) => tokens[Number(index)]);
	return clause.replace(content, () => localized);
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
