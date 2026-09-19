import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { expandDocument, loadText, type Segment } from './corpus';
import core from './data/texts/proprium/dominica-vi-post-epiphaniam-epistola.json';
import english from './data/languages/en/texts/proprium/dominica-vi-post-epiphaniam-epistola.json';
import { sourceFaceText, sourceWindow } from './source-punctuation';
import { latinSnippet, normalizeSearch } from './search';
import { interlinearRuns } from './interlinear';
import { inMassForm } from './speaker-marks';
import { constructionForWord } from './word-construction';
import TextBody from './components/TextBody.svelte';
import { CHARSET } from './fonts/charset';

const pair = { from: 'w167', through: 'w170' };
const original = (await loadText('proprium/dominica-vi-post-epiphaniam-epistola', 'en'))!;
function fixture() {
	const entry = structuredClone(original);
	entry.text.segments[0].parentheses = [pair];
	return entry;
}
const surface = (segment: Segment, start?: number, end?: number) =>
	sourceWindow(segment, start, end).faces.map(sourceFaceText).join(' ');
const withoutHydrationComments = (html: string) => html.replace(/<!--.*?-->/g, '');

describe('source parentheses', () => {
	it('has both source marks in the guarded font charset', () => {
		expect(CHARSET).toContain('(');
		expect(CHARSET).toContain(')');
	});
	it('retains the actual compact metadata through the ordinary decoder', () => {
		const artifact = structuredClone(core) as Parameters<typeof expandDocument>[0];
		artifact.seg[0].parentheses = [pair];
		const before = JSON.stringify(artifact);
		const entry = expandDocument(artifact, english as Parameters<typeof expandDocument>[1], []);
		expect(entry.text.segments[0].parentheses).toEqual([pair]);
		expect(entry.text.segments[0].words).toEqual(original.text.segments[0].words);
		expect(entry.gloss).toEqual(original.gloss);
		expect(JSON.stringify(artifact)).toBe(before);
		expect(surface(entry.text.segments[0])).toContain('(quem suscitávit ex mórtuis)');
	});

	it('changes only the two source faces, never 177 word identities or normal forms', () => {
		const entry = fixture();
		const segment = entry.text.segments[0];
		const before = JSON.stringify(entry);
		const projected = sourceWindow(segment);
		expect(projected.faces).toHaveLength(177);
		for (const [index, face] of projected.faces.entries()) {
			expect(face.word).toBe(segment.words![index]);
			expect(normalizeSearch(sourceFaceText(face))).toBe(normalizeSearch(face.word.form));
		}
		expect(projected.faces.filter((face) => face.prefix)).toHaveLength(1);
		expect(projected.faces[166].prefix).toBe('(');
		expect(projected.faces[169].suffix).toBe(')');
		expect(JSON.stringify(entry)).toBe(before);
	});

	it('keeps every possible nonempty window balanced, including either boundary inside the pair', () => {
		const segment = fixture().text.segments[0];
		for (let start = 0; start < 177; start++) {
			for (let end = start + 1; end <= 177; end++) {
				const result = sourceWindow(segment, start, end);
				const text = result.faces.map(sourceFaceText).join(' ');
				expect(text.includes('(')).toBe(text.includes(')'));
				expect(result.start).toBeLessThanOrEqual(start);
				expect(result.end).toBeGreaterThanOrEqual(end);
			}
		}
	});

	it('uses document order, supports a one-word pair and both source closing positions', () => {
		const segment: Segment = {
			id: 's01',
			type: 'verse',
			words: [
				{ id: 'w900', form: 'Inquit', lemma: 'inquam', morph: { pos: 'verb' }, post: ',' },
				{ id: 'w001', form: 'Amen', lemma: 'amen', morph: { pos: 'interj' }, post: '.' }
			],
			parentheses: [{ from: 'w900', through: 'w001' }]
		};
		expect(surface(segment)).toBe('(Inquit, Amen).');
		segment.parentheses![0].closing = 'after-post';
		expect(surface(segment)).toBe('(Inquit, Amen.)');
		segment.parentheses = [
			{ from: 'w900', through: 'w900' },
			{ from: 'w001', through: 'w001' }
		];
		expect(surface(segment)).toBe('(Inquit), (Amen).');
		expect(sourceWindow(segment, 1, 1).faces).toEqual([]);
	});

	it('fails visibly on missing or reversed endpoints rather than dropping source marks', () => {
		const segment = fixture().text.segments[0];
		for (const range of [
			{ from: 'w000', through: 'w170' },
			{ from: 'w170', through: 'w167' }
		]) {
			segment.parentheses = [range];
			expect(() => sourceWindow(segment)).toThrow('invalid source range');
		}
	});

	it('closes interacting pair and construction boundaries to a fixed point', () => {
		const segment = fixture().text.segments[0];
		segment.parentheses = [{ from: 'w160', through: 'w165' }, pair];
		const groups = [['w165', 'w166', 'w167']];
		const window = sourceWindow(segment, 169, 170, groups);
		expect([window.start, window.end]).toEqual([159, 170]);
		expect(window.faces.map(sourceFaceText).join(' ')).toMatch(/\).*\(/);
	});

	it('does not alter a legacy full segment or speaker/mass-form identity', () => {
		const segment = original.text.segments[0];
		expect(surface(segment)).toBe(
			segment.words!.map((word) => word.form + (word.post ?? '')).join(' ')
		);
		const paired = fixture().text.segments[0];
		paired.delivery = { cantu: { speaker: 'schola', voice: 'clara' } };
		expect(inMassForm(paired, 'cantu').parentheses).toEqual([pair]);
	});
});

describe('Latin search snippets', () => {
	it.each(['quem', 'suscitavit', 'mortuis', 'ira'])(
		'keeps a complete pair around a %s hit',
		(query) => {
			const entry = fixture();
			const parts = latinSnippet(entry, 's01', [query]);
			expect(parts.map((part) => part.text).join('')).toContain('(quem suscitávit ex mórtuis)');
			expect(parts[0].text.startsWith('… ')).toBe(true);
			expect(parts.filter((part) => part.hit).length).toBeGreaterThan(0);
			expect(parts.filter((part) => part.hit).every((part) => !/[()….,]/.test(part.text))).toBe(
				true
			);
		}
	);

	it('widens a right-cut snippet and places its ellipsis outside the complete pair', () => {
		const entry = fixture();
		entry.text.segments[0].parentheses = [{ from: 'w010', through: 'w020' }];
		const parts = latinSnippet(entry, 's01', ['fratres']);
		const text = parts.map((part) => part.text).join('');
		expect(text).toMatch(/\(.*\).* …$/);
		expect(parts.filter((part) => part.hit).map((part) => part.text)).toEqual(['Fratres']);
	});
});

describe('shared reader rendering', () => {
	it.each([0, 1, 2])('renders actual text marks in reading mode %s', (helpLevel) => {
		const entry = fixture();
		const html = withoutHydrationComments(
			render(TextBody, { props: { doc: entry.text, gloss: entry.gloss, lang: 'en', helpLevel } })
				.body
		);
		expect(html).toMatch(/\(quem/);
		expect(html).toMatch(/mórtuis\)/);
	});

	it('keeps a grouped construction and its lexical card independent of punctuation', () => {
		const entry = fixture();
		const words = entry.text.segments[0].words!.slice(166, 170);
		const alignment = {
			words: words.map((word) => word.id),
			forms: words.map((word) => word.form),
			gloss: 'whom He raised from the dead'
		};
		entry.gloss.segments.s01.alignments = [alignment];
		for (const word of words) entry.gloss.words[word.id] = { alignment };
		const runs = interlinearRuns(entry.text.segments[0].words!, entry.gloss.segments.s01);
		expect(runs.find((run) => run.alignment === alignment)?.words).toEqual(words);
		expect(
			constructionForWord(entry.text, entry.gloss, 'w170')?.parts.map((part) => part.word.form)
		).toEqual(words.map((word) => word.form));
		const html = render(TextBody, {
			props: { doc: entry.text, gloss: entry.gloss, lang: 'en', helpLevel: 1, ontap: () => {} }
		}).body;
		expect(html).toContain(
			'aria-label="(quem suscitávit ex mórtuis) — whom He raised from the dead"'
		);
		expect(html).toMatch(/\(quem/);
		expect(html).toMatch(/mórtuis\)/);
	});

	it('opens before the raised letter and completes a folded pair before the ellipsis', () => {
		const entry = fixture();
		entry.text.segments[0].parentheses = [{ from: 'w001', through: 'w006' }];
		const html = withoutHydrationComments(
			render(TextBody, {
				props: {
					doc: entry.text,
					gloss: entry.gloss,
					lang: 'en',
					helpLevel: 1,
					collapsedSegments: ['s01']
				}
			}).body
		);
		expect(html).toMatch(/\(<span class="initial/);
		expect(html).toMatch(/>F<\/span>/);
		expect(html).not.toMatch(/>\(<\/span>/);
		expect(html.indexOf(')')).toBeLessThan(html.lastIndexOf('…'));
		for (const word of entry.text.segments[0].words!.slice(0, 6))
			expect(html).toContain(word.form === 'Fratres' ? 'ratres' : word.form);
	});

	it('keeps a folded final post and never clips a shared expression reached by a pair', () => {
		const entry = fixture();
		const segment = entry.text.segments[0];
		segment.parentheses = [{ from: 'w001', through: 'w006' }];
		const words = segment.words!.slice(5, 8);
		const alignment = {
			words: words.map((word) => word.id),
			forms: words.map((word) => word.form),
			gloss: 'for you all'
		};
		entry.gloss.segments.s01.alignments = [alignment];
		for (const word of words) entry.gloss.words[word.id] = { alignment };
		const html = withoutHydrationComments(
			render(TextBody, {
				props: {
					doc: entry.text,
					gloss: entry.gloss,
					lang: 'en',
					helpLevel: 1,
					collapsedSegments: ['s01']
				}
			}).body
		);
		expect(html.match(/class="base /g) ?? []).toHaveLength(8);
		expect(html).toContain('pro)');
		expect(html).toContain('vobis,');
		expect(html).toContain('for you all');
		expect(html).toMatch(/<\/span> …<\/p>/);
	});
});
