import { describe, expect, it } from 'vitest';
import { printShortVoicePages } from './print-voices';

const voice = {
	label: 'silently',
	words: [
		'ut',
		'meum',
		'ac',
		'vestrum',
		'sacrifícium',
		'acceptábile',
		'fiat',
		'apud',
		'Deum',
		'Patrem',
		'omnipoténtem.'
	],
	initial: null
};
const word = (text: string, x: number, y: number) =>
	`<word xMin="${x}" yMin="${y}" xMax="${x + 8}" yMax="${y + 5}">${text}</word>`;
const label = word('silently', 30, 10);
const utterance = voice.words
	.map((text, i) => word(text, 40 + (i % 9) * 20, i < 9 ? 20 : 35))
	.join('');
const page = (body: string) => `<page>${body}</page>`;

describe('complete short voice association on actual paper', () => {
	it('requires the whole utterance, including the second line', () => {
		expect(printShortVoicePages(page(label + utterance), voice)).toEqual([1]);
		for (let removed = 0; removed < voice.words.length; removed++) {
			const incomplete = voice.words
				.map((text, i) => (i === removed ? '' : word(text, 40 + (i % 9) * 20, i < 9 ? 20 : 35)))
				.join('');
			expect(printShortVoicePages(page(label + incomplete), voice)).toEqual([]);
		}
	});
	it('rejects a detached, missing, wrong, later or remote label', () => {
		for (const bbox of [
			page(label) + page(utterance),
			page(utterance),
			page(word('server', 30, 10) + utterance),
			page(utterance + word('silently', 30, 50)),
			page(word('silently', 300, 10) + utterance)
		]) {
			expect(printShortVoicePages(bbox, voice)).toEqual([]);
		}
	});
	it('does not turn a first-word or first-line-only match into a pass', () => {
		expect(printShortVoicePages(page(label + word('ut', 40, 20)), voice)).toEqual([]);
		expect(
			printShortVoicePages(page(label + utterance.split('<word').slice(0, 10).join('<word')), voice)
		).toEqual([]);
	});
	it('refuses unsupported raised initials and unbounded rows', () => {
		expect(() =>
			printShortVoicePages(page(label + utterance), { ...voice, initial: 'U' })
		).toThrow();
		expect(() =>
			printShortVoicePages(page(label + utterance), { ...voice, words: Array(13).fill('ut') })
		).toThrow();
	});
});
