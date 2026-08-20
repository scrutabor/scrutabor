// Ecclesiastical pronunciation, derived mechanically from the display form
// — nothing is stored, everything follows from recorded rules, and every
// output was reviewed exhaustively against the whole corpus while it was
// small (see the pronuntiatio page for the rules in reader form).
//
// Two rule tables: Roman ecclesiastical (as the 1962 books are sung, the
// Solesmes convention) and the Polish parish tradition. Syllable division
// is IDENTICAL in both — chant assigns notes per syllable, and both
// traditions sing grá-ti-a as three — so only the phoneme tables differ.
// Division follows the liturgical books' Italian style: maximal onsets
// (no-ster, pa-trem, A-gnus), geminates split (mis-sa, Io-án-ni).

const VOWELS = new Set('aeiouyáéíóúýæœǽë'.split(''));
// Front vowels trigger the soft readings of c, g, sc, xc.
const FRONT = new Set('eiyéíýæǽœë'.split(''));
const MUTA = new Set(['b', 'c', 'd', 'f', 'g', 'p', 't', 'ch', 'ph', 'th']);
const LIQUID = new Set(['l', 'r']);
// qu/gu are handled separately (only before a vowel); a bare gu would
// otherwise swallow its vowel (gus-tus).
const DIGRAPHS = new Set(['ch', 'ph', 'th', 'gn']);

const ACCENTED = new Set('áéíóúýǽ'.split(''));

// A compound keeps the consonantal i of the simplex it is built on:
// adiutórium is ad + iuvo, so its i is the consonant and the word divides
// ad-iu-tó-ri-um. Prefix AND stem both have to be named, because the same
// position holds a VOCALIC i in the compounds of eo — ábiit is ab + iit,
// a-bi-it — and nothing in the spelling tells the two apart. Kept in step
// with checks/normalize.py in the corpus, which the unit tests cross-check.
const GLIDE_PREFIXES = new Set([
	'ab',
	'ad',
	'con',
	'de',
	'dis',
	'in',
	'inter',
	'ob',
	'per',
	'prae',
	'sub',
	'trans'
]);
const GLIDE_STEMS = ['iac', 'iect', 'iud', 'iung', 'iunct', 'iur', 'iust', 'iut', 'iuv'];

function bare(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/æ/g, 'ae')
		.replace(/œ/g, 'oe');
}

/** True when everything before `at` is a prefix and what follows is a stem
 * beginning with the consonant (ad|iutórium). */
function afterPrefix(word: string, at: number): boolean {
	if (!GLIDE_PREFIXES.has(bare(word.slice(0, at)))) return false;
	const stem = bare(word.slice(at));
	return GLIDE_STEMS.some((s) => stem.startsWith(s));
}

export type Tradition = 'roman' | 'polish';

interface Unit {
	text: string; // original characters (lowercased)
	vowel: boolean;
}

/** Split a lowercased form into vowel/consonant units: digraphs stay
 * whole, au is one vowel unit, qu/gu before a vowel are consonant units. */
function tokenize(word: string): Unit[] {
	const units: Unit[] = [];
	let i = 0;
	while (i < word.length) {
		const two = word.slice(i, i + 2);
		// u is a glide only after q, and after g only in the ngu group
		// (sanguis, languente) — not in arguo/exiguus.
		if (two === 'qu' || (two === 'gu' && word[i - 1] === 'n' && VOWELS.has(word[i + 2] ?? ''))) {
			units.push({ text: two, vowel: false });
			i += 2;
			continue;
		}
		if (DIGRAPHS.has(two)) {
			units.push({ text: two, vowel: false });
			i += 2;
			continue;
		}
		const ch = word[i];
		// Consonantal i — this orthography prints the glide as i, not j
		// (ORTHOGRAPHY.md), so it is common. It joins the next syllable's
		// onset rather than making one of its own: between two vowels
		// (E-ia, al-le-lú-ia, e-ius), at the head of a word before another
		// vowel (Ie-sus, Io-án-nes, iu-be), and across a prefix seam
		// (ad-iu-tó-ri-um). The vowel test is on the preceding UNIT, not the
		// preceding letter: qu and gu are consumed above as consonants, so
		// the u of quia must not count as the vowel before the i.
		if (
			(ch === 'i' || ch === 'í') &&
			VOWELS.has(word[i + 1] ?? '') &&
			(units[units.length - 1]?.vowel === true || units.length === 0 || afterPrefix(word, i))
		) {
			units.push({ text: ch, vowel: false });
			i += 1;
			continue;
		}
		if (VOWELS.has(ch)) {
			// au as a diphthong (lau-dá-mus, gáu-di-um); other pairs stay
			// separate vowels
			if ((ch === 'a' || ch === 'á') && word[i + 1] === 'u' && !VOWELS.has(word[i + 2] ?? '')) {
				units.push({ text: ch + 'u', vowel: true });
				i += 2;
				continue;
			}
			// a combining acute (œ́ has no precomposed form) rides its vowel
			if (word[i + 1] === '\u0301') {
				units.push({ text: ch + '\u0301', vowel: true });
				i += 2;
				continue;
			}
			units.push({ text: ch, vowel: true });
			i += 1;
			continue;
		}
		units.push({ text: ch, vowel: false });
		i += 1;
	}
	return units;
}

/** How many trailing consonant units of a cluster may open the next
 * syllable (Italian/liturgical style: single C, muta cum liquida, s+C,
 * s+muta+liquida — but geminates always split). */
function onsetLength(cluster: Unit[]): number {
	const n = cluster.length;
	if (n === 0) return 0;
	if (n === 1) return 1;
	const last = cluster[n - 1].text;
	const prev = cluster[n - 2].text;
	if (prev === last) return 1; // geminate: mis-sa, il-la
	// The 1961 Solesmes books attach ct to the following syllable
	// (San-ctus, Bene-dí-ctus, fa-ctum) — adopted, with the caveat that
	// print practice is not perfectly uniform (fac-tó-rem exists).
	if (prev === 'c' && last === 't') return 2;
	if (MUTA.has(prev) && LIQUID.has(last)) {
		// s + muta + liquida: no-strum, mon-strum
		if (n >= 3 && cluster[n - 3].text === 's') return 3;
		return 2; // pa-trem
	}
	if (prev === 's' && n === 2) return 2; // no-ster, a-scén-dit
	return 1;
}

/** Syllables of a display form, original characters preserved
 * (case, accents, ligatures): "Confíteor" -> ["Con","fí","te","or"]. */
export function syllabify(form: string): string[] {
	const lower = form.toLowerCase();
	const units = tokenize(lower);
	const vowelIdx = units.flatMap((u, i) => (u.vowel ? [i] : []));
	if (vowelIdx.length === 0) return [form];

	// Cut points in unit space: before each vowel's chosen onset.
	const cuts: number[] = [];
	for (let v = 1; v < vowelIdx.length; v++) {
		const prevVowel = vowelIdx[v - 1];
		const thisVowel = vowelIdx[v];
		const cluster = units.slice(prevVowel + 1, thisVowel);
		cuts.push(thisVowel - onsetLength(cluster));
	}

	// Map unit cuts back to character offsets of the ORIGINAL string.
	const offsets: number[] = [];
	let pos = 0;
	for (let i = 0; i < units.length; i++) {
		if (cuts.includes(i)) offsets.push(pos);
		pos += units[i].text.length;
	}
	const out: string[] = [];
	let start = 0;
	for (const off of offsets) {
		out.push(form.slice(start, off));
		start = off;
	}
	out.push(form.slice(start));
	return out;
}

/** Index of the stressed syllable: the one carrying the printed accent;
 * initial for unaccented one- and two-syllable words (Latin stresses the
 * penult, which is the first of two). An unaccented longer word is -1 \u2014 the
 * book printed no accent, so the edition has no claim to make, and a
 * first-syllable default would print in IPA as a claim it never made.
 * (One form reaches this today: Isra\u00ebl, whose Hebrew stress the 1962
 * books leave unmarked.) */
export function stressIndex(syllables: string[]): number {
	for (let i = 0; i < syllables.length; i++) {
		for (const ch of syllables[i].toLowerCase()) {
			if (ACCENTED.has(ch) || ch === '\u0301') return i;
		}
	}
	return syllables.length <= 2 ? 0 : -1;
}

/** "Con-fí-te-or" — the reading aid shown beside the form. */
export function syllabized(form: string): string {
	return syllabify(form).join('-');
}

// ---------------------------------------------------------------- phonemes

const VOWEL_IPA: Record<string, string> = {
	a: 'a',
	á: 'a',
	e: 'ɛ',
	é: 'ɛ',
	ë: 'ɛ',
	i: 'i',
	í: 'i',
	o: 'ɔ',
	ó: 'ɔ',
	u: 'u',
	ú: 'u',
	y: 'i',
	ý: 'i',
	æ: 'ɛ',
	ǽ: 'ɛ',
	œ: 'ɛ',
	au: 'au',
	áu: 'au'
};

/** Convert one word to IPA phonemes, one entry per unit (empty string =
 * silent). Context rules look across units, so this runs on the flat unit
 * stream; syllable boundaries are applied afterwards. */
function phonemes(units: Unit[], tradition: Tradition): string[] {
	const out: string[] = [];
	const frontAt = (i: number) => {
		const u = units[i];
		return u !== undefined && u.vowel && FRONT.has(u.text[0]);
	};
	const vowelAt = (i: number) => units[i] !== undefined && units[i].vowel;

	for (let i = 0; i < units.length; i++) {
		const u = units[i];
		const t = u.text;
		if (u.vowel) {
			out.push(VOWEL_IPA[t.replace('\u0301', '')] ?? t);
			continue;
		}
		switch (t) {
			case 'c':
				out.push(frontAt(i + 1) ? (tradition === 'roman' ? 'tʃ' : 'ts') : 'k');
				break;
			case 'g':
				out.push(frontAt(i + 1) && tradition === 'roman' ? 'dʒ' : 'g');
				break;
			case 'gn':
				// Roman ɲ (A-gnus as the scholas sing it); the Polish school
				// tradition keeps /gn/, the same conservatism as its hard g.
				out.push(tradition === 'roman' ? 'ɲ' : 'gn');
				break;
			case 'ch':
				out.push('k');
				break;
			case 'ph':
				out.push('f');
				break;
			case 'th':
				out.push('t');
				break;
			case 'qu':
				out.push(tradition === 'roman' ? 'kw' : 'kv');
				break;
			case 'gu':
				out.push(tradition === 'roman' ? 'gw' : 'gv');
				break;
			case 'h':
				out.push(tradition === 'roman' ? '' : 'x');
				break;
			case 'i':
			case 'í':
			case 'j':
				// reached only for a non-vowel unit, so an i here is the
				// glide the books still spell with an i (E-ia, al-le-lú-ia)
				out.push('j');
				break;
			case 's': {
				// intervocalic s is voiced in both traditions (mi-se-ré-re,
				// Je-sus); sc before a front vowel is handled at the c.
				const soft = vowelAt(i - 1) && vowelAt(i + 1);
				out.push(soft ? 'z' : 's');
				break;
			}
			case 't': {
				// ti + vowel -> ts (grá-ti-a), except after s/t/x and in
				// initial position (both traditions; the syllable count is
				// preserved — the spoken Polish collapse is prose for the
				// pronuntiatio page, not a rule here)
				const next = units[i + 1];
				const prev = units[i - 1];
				const isTi =
					next !== undefined &&
					next.vowel &&
					next.text[0] === 'i' &&
					vowelAt(i + 2) &&
					prev !== undefined &&
					!['s', 't', 'x'].includes(prev.text);
				out.push(isTi ? 'ts' : 't');
				break;
			}
			case 'x': {
				// Roman xce/xci -> kʃ (ex-cél-sis); otherwise ks
				const next = units[i + 1];
				if (tradition === 'roman' && next !== undefined && next.text === 'c' && frontAt(i + 2)) {
					out.push('k'); // the following c contributes ʃ
				} else {
					out.push('ks');
				}
				break;
			}
			case 'z':
				out.push(tradition === 'roman' ? 'dz' : 'z');
				break;
			case 'v':
				out.push('v');
				break;
			default:
				out.push(t);
		}
	}

	// Roman sce/sci -> ʃ (a-scén-dit): the s falls silent into the ʃ.
	if (tradition === 'roman') {
		for (let i = 0; i < units.length - 1; i++) {
			if (units[i].text === 's' && units[i + 1].text === 'c' && out[i + 1] === 'tʃ') {
				out[i] = '';
				out[i + 1] = 'ʃ';
			}
		}
	}
	// Roman xc before front vowel: the c is ʃ after the k above.
	if (tradition === 'roman') {
		for (let i = 0; i < units.length - 1; i++) {
			if (units[i].text === 'x' && out[i] === 'k' && out[i + 1] === 'tʃ') {
				out[i + 1] = 'ʃ';
			}
		}
	}
	return out;
}

/** IPA of a display form: /kɔn.fiˈtɛ.ɔr/ (without the slashes). */
export function ipa(form: string, tradition: Tradition): string {
	const lower = form.toLowerCase();
	const units = tokenize(lower);
	const sylls = syllabify(form);
	const stress = stressIndex(sylls);
	const phon = phonemes(units, tradition);

	// Group phonemes per syllable by walking units against syllable lengths.
	const perSyllable: string[] = [];
	let unitIdx = 0;
	for (const syl of sylls) {
		let remaining = syl.length;
		let acc = '';
		while (remaining > 0 && unitIdx < units.length) {
			acc += phon[unitIdx];
			remaining -= units[unitIdx].text.length;
			unitIdx += 1;
		}
		perSyllable.push(acc);
	}

	const marked = perSyllable.map((s, i) => (i === stress && perSyllable.length > 1 ? `ˈ${s}` : s));
	// The stress mark replaces the syllable dot before it.
	let joined = '';
	for (let i = 0; i < marked.length; i++) {
		if (i > 0 && !marked[i].startsWith('ˈ')) joined += '.';
		joined += marked[i];
	}
	return joined;
}

/** Both traditions; identical outputs collapse to one entry. */
export function pronunciations(form: string): { roman: string; polish: string; differ: boolean } {
	const roman = ipa(form, 'roman');
	const polish = ipa(form, 'polish');
	return { roman, polish, differ: roman !== polish };
}
