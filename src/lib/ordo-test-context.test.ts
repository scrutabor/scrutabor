import { expect, it } from 'vitest';
import { expectParagraphLatin, renderedParagraphLatin } from './ordo-test-context';

it('extracts the selected Latin paragraph and excludes ruby translations', () => {
	const html =
		'<p id="other">Other.</p><p id="target" class="verse"><ruby>Iube,<rt>command</rt></ruby>\n' +
		'<ruby><span>domne,</span><rt class="gloss">master</rt></ruby> benedícere.</p>' +
		'<p id="next">Next.</p>';
	expect(renderedParagraphLatin(html, 'target')).toBe('Iube, domne, benedícere.');
});

it('does not conceal a missing paragraph', () => {
	expect(() => renderedParagraphLatin('<p id="other">Latin.</p>', 'missing')).toThrow();
});

const greeting = [{ form: 'Dóminus' }, { form: 'vobíscum', post: '.' }];

it('matches the full expected Latin sequence with punctuation', () => {
	expectParagraphLatin('<p id="target"><b>Dóminus</b> vobíscum.</p>', 'target', greeting);
});

it.each(['Dóminus tecum.', 'Dóminus vobíscum,'])(
	'rejects changed Latin or punctuation in %s',
	(latin) => {
		expect(() =>
			expectParagraphLatin('<p id="target">' + latin + '</p>', 'target', greeting)
		).toThrow(/to contain/);
	}
);
