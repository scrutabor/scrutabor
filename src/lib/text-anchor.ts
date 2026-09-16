/** A stable DOM fragment for a corpus text inside a multi-text page. */
export function textAnchor(textKey: string): string {
	return `text-${textKey.replaceAll('/', '-')}`;
}
