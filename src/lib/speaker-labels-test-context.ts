import { render } from 'svelte/server';
import TextBody from './components/TextBody.svelte';
import type { GlossDocument, TextDocument } from './corpus';
import type { Lang } from './i18n';

/** The speaker names, voice labels and V./R. marks TextBody prints over a document's lines,
 * in the selected form of Mass, read from its server render. A no-break space from the Polish
 * binding reads as a space. */
export function speakerLabels(
	doc: TextDocument,
	gloss: GlossDocument,
	lang: Lang,
	idPrefix: string
) {
	const html = render(TextBody, {
		props: { doc, gloss, lang, helpLevel: 0, idPrefix }
	}).body.replaceAll('\u00a0', ' ');
	const of = (name: string) =>
		[...html.matchAll(new RegExp(`class="${name}(?: [^"]*)?"[^>]*>([^<]+)<`, 'g'))].map(
			(match) => match[1]
		);
	return { names: of('who-name'), voices: of('who-voice'), marks: of('mark') };
}
