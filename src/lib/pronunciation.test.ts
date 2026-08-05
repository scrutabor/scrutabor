import { describe, expect, it } from 'vitest';
import { TEXTS } from './corpus';
import { ipa, pronunciations, stressIndex, syllabify, syllabized } from './pronunciation';

const ACCENTED = /[áéíóúýǽ]/i;

describe('syllabify', () => {
	it('divides in the liturgical (maximal-onset) style', () => {
		expect(syllabized('Confíteor')).toBe('Con-fí-te-or');
		expect(syllabized('noster')).toBe('no-ster'); // s+stop opens
		expect(syllabized('patrem')).toBe('pa-trem'); // muta cum liquida
		expect(syllabized('peccávi')).toBe('pec-cá-vi'); // geminates split
		expect(syllabized('Joánni')).toBe('Jo-án-ni');
		expect(syllabized('sanctificétur')).toBe('san-cti-fi-cé-tur'); // 1961 books: San-ctus
		expect(syllabized('quotidiánum')).toBe('quo-ti-di-á-num');
		expect(syllabized('excélsis')).toBe('ex-cél-sis');
		expect(syllabized('Agnus')).toBe('A-gnus'); // gn opens
	});

	it('handles the diphthong and glide edge cases from review', () => {
		expect(syllabized('gáudium')).toBe('gáu-di-um'); // accented á opens au
		expect(syllabized('árguo')).toBe('ár-gu-o'); // gu is a glide only after n
		expect(syllabized('sanguis')).toBe('san-guis');
		expect(syllabized('monstrum')).toBe('mon-strum'); // s+muta+liquida in a long cluster
		expect(syllabized('p\u0153\u0301nitens')).toBe('p\u0153\u0301-ni-tens'); // combining acute on \u0153
		expect(stressIndex(syllabify('p\u0153\u0301nitens'))).toBe(0);
	});

	it('keeps ligatures, diphthongs and the diaeresis honest', () => {
		expect(syllabized('sǽcula')).toBe('sǽ-cu-la');
		expect(syllabized('cælis')).toBe('cæ-lis');
		expect(syllabized('Paulo')).toBe('Pau-lo'); // au diphthong
		expect(syllabized('Míchaël')).toBe('Mí-cha-ël'); // ë its own syllable
		expect(syllabized('tuum')).toBe('tu-um'); // uu is not a diphthong
	});

	it('reassembles to the original form for every corpus word', () => {
		for (const key of Object.keys(TEXTS)) {
			for (const seg of TEXTS[key].text.segments) {
				for (const w of seg.words ?? []) {
					expect(syllabify(w.form).join(''), w.form).toBe(w.form);
				}
			}
		}
	});

	it('agrees with the corpus accent rule on every corpus word', () => {
		// The corpus lint enforces: 3+ syllables carry exactly one accent,
		// 1-2 carry none. If our division disagrees with the corpus's
		// counting anywhere, this cross-check fails.
		for (const key of Object.keys(TEXTS)) {
			for (const seg of TEXTS[key].text.segments) {
				for (const w of seg.words ?? []) {
					const n = syllabify(w.form).length;
					const accented = ACCENTED.test(w.form);
					if (n >= 3) expect(accented, `${w.form} (${n} syllables)`).toBe(true);
					else expect(accented, `${w.form} (${n} syllables)`).toBe(false);
				}
			}
		}
	});
});

describe('stress', () => {
	it('follows the printed accent', () => {
		expect(stressIndex(syllabify('Confíteor'))).toBe(1);
		expect(stressIndex(syllabify('sanctificétur'))).toBe(3);
	});

	it('falls on the first of one or two syllables', () => {
		expect(stressIndex(syllabify('mater'))).toBe(0);
		expect(stressIndex(syllabify('et'))).toBe(0);
	});
});

describe('ipa', () => {
	it('renders the flagship Roman/Polish difference', () => {
		expect(ipa('cælis', 'roman')).toBe('ˈtʃɛ.lis');
		expect(ipa('cælis', 'polish')).toBe('ˈtsɛ.lis');
	});

	it('keeps soft g Roman-only', () => {
		expect(ipa('cogitatióne', 'roman')).toBe('kɔ.dʒi.ta.tsiˈɔ.nɛ');
		expect(ipa('cogitatióne', 'polish')).toBe('kɔ.gi.ta.tsiˈɔ.nɛ');
	});

	it('treats h, qu and z per tradition', () => {
		expect(ipa('hódie', 'roman')).toBe('ˈɔ.di.ɛ');
		expect(ipa('hódie', 'polish')).toBe('ˈxɔ.di.ɛ');
		expect(ipa('qui', 'roman')).toBe('kwi');
		expect(ipa('qui', 'polish')).toBe('kvi');
	});

	it('applies ti+vowel in both traditions, syllable-preserving', () => {
		expect(ipa('grátia', 'roman')).toBe('ˈgra.tsi.a');
		expect(ipa('grátia', 'polish')).toBe('ˈgra.tsi.a');
		// but not initially, not before consonants, not after s/t/x
		expect(ipa('tibi', 'roman')).toBe('ˈti.bi');
		expect(ipa('sanctificétur', 'roman')).toBe('san.kti.fiˈtʃɛ.tur');
	});

	it('voices intervocalic s in both traditions', () => {
		expect(ipa('Jesus', 'roman')).toBe('ˈjɛ.zus');
		expect(ipa('Jesus', 'polish')).toBe('ˈjɛ.zus');
	});

	it('renders gn per tradition', () => {
		expect(ipa('Agnus', 'roman')).toBe('ˈa.ɲus');
		expect(ipa('Agnus', 'polish')).toBe('ˈa.gnus');
		expect(ipa('regnum', 'roman')).toBe('ˈrɛ.ɲum');
		expect(ipa('regnum', 'polish')).toBe('ˈrɛ.gnum');
	});

	it('renders digraphs and xce', () => {
		expect(ipa('Míchaël', 'roman')).toBe('ˈmi.ka.ɛl');
		expect(ipa('excélsis', 'roman')).toBe('ɛkˈʃɛl.sis');
		expect(ipa('excélsis', 'polish')).toBe('ɛksˈtsɛl.sis');
	});

	it('marks no stress on monosyllables', () => {
		expect(ipa('et', 'roman')).toBe('ɛt');
		expect(ipa('a', 'roman')).toBe('a');
	});

	it('collapses identical traditions in the pair view', () => {
		expect(pronunciations('Mater').differ).toBe(false);
		expect(pronunciations('cælis').differ).toBe(true);
	});

	it('produces nonempty dotted IPA for every corpus word', () => {
		for (const key of Object.keys(TEXTS)) {
			for (const seg of TEXTS[key].text.segments) {
				for (const w of seg.words ?? []) {
					for (const tradition of ['roman', 'polish'] as const) {
						const out = ipa(w.form, tradition);
						expect(out.length, `${w.form} ${tradition}`).toBeGreaterThan(0);
						expect(out.split(/[.ˈ]/).filter(Boolean).length, `${w.form} ${tradition}`).toBe(
							syllabify(w.form).length
						);
					}
				}
			}
		}
	});
});
