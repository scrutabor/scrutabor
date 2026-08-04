// Grammar-concept pages: one page per term of the controlled grammar
// vocabulary, every example drawn from the corpus texts. Content lives here
// (UI-language educational prose, not corpus data); the module validates at
// load time that every example points at a real word and quotes its form —
// a wrong reference fails the prerender, not the reader.
import { TEXTS } from './corpus';
import type { Lang } from './i18n';

export type ConceptGroup = 'casus' | 'verbum' | 'syntaxis';

export interface ConceptExample {
	/** Display phrase in corpus orthography; must contain the word's form. */
	la: string;
	/** "category/slug" of the text the phrase comes from. */
	textKey: string;
	/** The word the concept anchors to — the ?w= deep-link target. */
	wordId: string;
	note: Record<Lang, string>;
}

export interface Concept {
	/** Canonical Latin id — also the URL segment. */
	id: string;
	group: ConceptGroup;
	/** Latin name shown as subtitle when it differs from the label. */
	la: string;
	label: Record<Lang, string>;
	what: Record<Lang, string>;
	spot?: Record<Lang, string>;
	examples: ConceptExample[];
}

export const CONCEPT_GROUPS: Record<ConceptGroup, Record<Lang, string>> = {
	casus: { pl: 'przypadki', en: 'the cases' },
	verbum: { pl: 'czasownik', en: 'the verb' },
	syntaxis: { pl: 'składnia', en: 'syntax' }
};

export const CONCEPTS: Concept[] = [
	{
		id: 'nominativus',
		group: 'casus',
		la: 'nominativus',
		label: { pl: 'mianownik', en: 'nominative' },
		what: {
			pl: 'Przypadek podmiotu: kto lub co działa albo o kim zdanie orzeka. W modlitwach często stoi przy domyślnym „jest” — łacina chętnie opuszcza łącznik.',
			en: 'The case of the subject: who or what acts, or whom the sentence is about. In the prayers it often stands with an understood “is” — Latin likes to drop the copula.'
		},
		spot: {
			pl: 'To forma słownikowa rzeczownika w liczbie pojedynczej — ta, którą znajdziesz w haśle.',
			en: 'It is the dictionary form of a noun in the singular — the one you find in the entry.'
		},
		examples: [
			{
				la: 'Dóminus tecum',
				textKey: 'orationes/ave-maria',
				wordId: 'w005',
				note: {
					pl: 'Pan [jest] z Tobą — podmiot z domyślnym „est”.',
					en: 'the Lord [is] with thee — the subject with an understood “est”.'
				}
			},
			{
				la: 'Fiat volúntas tua',
				textKey: 'orationes/pater-noster',
				wordId: 'w014',
				note: {
					pl: 'wola — podmiot prośby: co ma się stać?',
					en: 'the will — the subject of the petition: what is to be done?'
				}
			},
			{
				la: 'Glória Patri',
				textKey: 'orationes/gloria-patri',
				wordId: 'w001',
				note: {
					pl: 'chwała [niech będzie] — mianownik bez wyrażonego orzeczenia.',
					en: 'glory [be] — a nominative with the verb left unexpressed.'
				}
			}
		]
	},
	{
		id: 'genetivus',
		group: 'casus',
		la: 'genetivus',
		label: { pl: 'dopełniacz', en: 'genitive' },
		what: {
			pl: 'Przypadek przynależności: czyj? czego? Spina dwa rzeczowniki w jedno wyrażenie.',
			en: 'The case of belonging: whose? of what? It binds two nouns into one phrase.'
		},
		spot: {
			pl: 'Po polsku prawie zawsze odda go dopełniacz.',
			en: 'English usually renders it with “of” or a possessive.'
		},
		examples: [
			{
				la: 'fructus ventris tui',
				textKey: 'orationes/ave-maria',
				wordId: 'w014',
				note: { pl: 'owoc żywota — owoc czego.', en: 'the fruit of the womb — fruit of what.' }
			},
			{
				la: 'Mater Dei',
				textKey: 'orationes/ave-maria',
				wordId: 'w020',
				note: { pl: 'Matko Boga — Matko kogo.', en: 'Mother of God — Mother of whom.' }
			},
			{
				la: 'in hora mortis nostræ',
				textKey: 'orationes/ave-maria',
				wordId: 'w029',
				note: {
					pl: 'w godzinie śmierci — w godzinie czego.',
					en: 'at the hour of death — the hour of what.'
				}
			},
			{
				la: 'in sǽcula sæculórum',
				textKey: 'orationes/gloria-patri',
				wordId: 'w019',
				note: {
					pl: 'wieki wieków — dopełniacz wzmacnia przez powtórzenie.',
					en: 'ages of ages — the genitive intensifies by repetition.'
				}
			}
		]
	},
	{
		id: 'dativus',
		group: 'casus',
		la: 'dativus',
		label: { pl: 'celownik', en: 'dative' },
		what: {
			pl: 'Przypadek adresata i odbiorcy: komu? dla kogo? W modlitwach wskazuje, komu coś oddajemy — chwałę, wyznanie, prośbę.',
			en: 'The case of the addressee and receiver: to whom? for whom? In the prayers it marks the one to whom something is given — glory, confession, a petition.'
		},
		examples: [
			{
				la: 'Confíteor Deo omnipoténti',
				textKey: 'ordinarium/confiteor',
				wordId: 'w002',
				note: {
					pl: 'spowiadam się komu — Bogu; pierwszy z długiej listy celowników.',
					en: 'I confess to whom — to God; the first of a long chain of datives.'
				}
			},
			{
				la: 'Glória Patri',
				textKey: 'orationes/gloria-patri',
				wordId: 'w002',
				note: { pl: 'chwała komu — Ojcu.', en: 'glory to whom — to the Father.' }
			},
			{
				la: 'da nobis hódie',
				textKey: 'orationes/pater-noster',
				wordId: 'w026',
				note: { pl: 'daj komu — nam.', en: 'give to whom — to us.' }
			}
		]
	},
	{
		id: 'accusativus',
		group: 'casus',
		la: 'accusativus',
		label: { pl: 'biernik', en: 'accusative' },
		what: {
			pl: 'Przypadek dopełnienia bliższego: kogo? co? — to, co czynność obejmuje wprost. Z przyimkami takimi jak „in” i „ad” oznacza kierunek.',
			en: 'The case of the direct object: whom? what? — what the action reaches directly. With prepositions such as “in” and “ad” it marks direction.'
		},
		examples: [
			{
				la: 'Panem nostrum quotidiánum da nobis',
				textKey: 'orationes/pater-noster',
				wordId: 'w022',
				note: { pl: 'daj co — chleb.', en: 'give what — bread.' }
			},
			{
				la: 'precor beátam Maríam',
				textKey: 'ordinarium/confiteor',
				wordId: 'w041',
				note: { pl: 'błagam kogo — Maryję.', en: 'I beseech whom — Mary.' }
			},
			{
				la: 'ne nos indúcas in tentatiónem',
				textKey: 'orationes/pater-noster',
				wordId: 'w044',
				note: {
					pl: '„in” z biernikiem — kierunek: w pokusę.',
					en: '“in” with the accusative — direction: into temptation.'
				}
			},
			{
				la: 'ad Dóminum Deum nostrum',
				textKey: 'ordinarium/confiteor',
				wordId: 'w064',
				note: { pl: '„ad” z biernikiem — do Pana.', en: '“ad” with the accusative — to the Lord.' }
			}
		]
	},
	{
		id: 'ablativus',
		group: 'casus',
		la: 'ablativus',
		label: { pl: 'ablativus', en: 'ablative' },
		what: {
			pl: 'Przypadek okoliczności: czym? jak? skąd? kiedy? Polszczyzna nie ma jego odpowiednika — oddajemy go narzędnikiem, miejscownikiem albo wyrażeniem z przyimkiem. Stoi też po przyimkach takich jak „in” (miejsce), „pro”, „a/ab”, „cum”.',
			en: 'The case of circumstance: by what? how? whence? when? English has no single equivalent — it becomes “by”, “with”, “from”, “in”. It also follows prepositions such as “in” (place), “pro”, “a/ab”, “cum”.'
		},
		examples: [
			{
				la: 'grátia plena',
				textKey: 'orationes/ave-maria',
				wordId: 'w003',
				note: { pl: 'pełna czym — łaską.', en: 'full of what — of grace.' }
			},
			{
				la: 'cogitatióne, verbo et ópere',
				textKey: 'ordinarium/confiteor',
				wordId: 'w027',
				note: {
					pl: 'zgrzeszyłem czym — myślą, mową, uczynkiem: trzy ablativy narzędzia.',
					en: 'sinned by what — by thought, word and deed: three ablatives of means.'
				}
			},
			{
				la: 'ora pro nobis',
				textKey: 'orationes/ave-maria',
				wordId: 'w023',
				note: { pl: 'po przyimku „pro” — za nami.', en: 'after the preposition “pro” — for us.' }
			},
			{
				la: 'qui es in cælis',
				textKey: 'orationes/pater-noster',
				wordId: 'w006',
				note: {
					pl: '„in” z ablativem — miejsce: w niebiosach.',
					en: '“in” with the ablative — place: in the heavens.'
				}
			}
		]
	},
	{
		id: 'vocativus',
		group: 'casus',
		la: 'vocativus',
		label: { pl: 'wołacz', en: 'vocative' },
		what: {
			pl: 'Przypadek bezpośredniego zwrotu: tak wołamy kogoś po imieniu. Modlitwa żyje wołaczem — od „Pater noster” po „Sancta María”.',
			en: 'The case of direct address: how you call someone by name. Prayer lives in the vocative — from “Pater noster” to “Sancta María”.'
		},
		examples: [
			{
				la: 'Pater noster',
				textKey: 'orationes/pater-noster',
				wordId: 'w001',
				note: {
					pl: 'Ojcze — cała modlitwa jest mową wprost.',
					en: 'Father — the whole prayer is speech to a Thou.'
				}
			},
			{
				la: 'Ave María',
				textKey: 'orationes/ave-maria',
				wordId: 'w002',
				note: { pl: 'Maryjo — zwrot anioła.', en: 'Mary — the angel’s address.' }
			},
			{
				la: 'et tibi, pater',
				textKey: 'ordinarium/confiteor',
				wordId: 'w023',
				note: {
					pl: 'wołacz, nie celownik — przywołanie osoby, nie element wyliczenia.',
					en: 'vocative, not dative — an address to the person, not an item in the list.'
				}
			}
		]
	},
	{
		id: 'coniunctivus',
		group: 'verbum',
		la: 'coniunctivus',
		label: { pl: 'tryb łączący', en: 'subjunctive' },
		what: {
			pl: 'W modlitwach to tryb życzenia i prośby: „niech się stanie”. Tam, gdzie polszczyzna mówi „niech…” albo „abyś nie…”, łacina stawia tryb łączący — nim modlitwa prosi, nie rozkazuje.',
			en: 'In the prayers it is the mood of wish and petition: “may it be”. Where English says “may…” or “that Thou not…”, Latin uses the subjunctive — with it the prayer asks rather than commands.'
		},
		examples: [
			{
				la: 'Sanctificétur nomen tuum',
				textKey: 'orationes/pater-noster',
				wordId: 'w007',
				note: { pl: 'niech się święci — prośba-życzenie.', en: 'hallowed be — a wish-petition.' }
			},
			{
				la: 'Advéniat regnum tuum',
				textKey: 'orationes/pater-noster',
				wordId: 'w010',
				note: { pl: 'niech przyjdzie.', en: 'may it come.' }
			},
			{
				la: 'Fiat volúntas tua',
				textKey: 'orationes/pater-noster',
				wordId: 'w013',
				note: { pl: 'niech się stanie.', en: 'may it be done.' }
			},
			{
				la: 'ne nos indúcas',
				textKey: 'orationes/pater-noster',
				wordId: 'w042',
				note: {
					pl: 'z „ne” — prośba przecząca: abyś nie wiódł.',
					en: 'with “ne” — a negative petition: that Thou not lead.'
				}
			}
		]
	},
	{
		id: 'imperativus',
		group: 'verbum',
		la: 'imperativus',
		label: { pl: 'tryb rozkazujący', en: 'imperative' },
		what: {
			pl: 'Tryb bezpośredniej prośby do „ty”: daj, odpuść, wybaw. W modlitwie to tryb śmiały — mówi wprost do Boga i świętych.',
			en: 'The mood of direct request to a “thou”: give, forgive, deliver. In prayer it is a bold mood — it speaks straight to God and the saints.'
		},
		examples: [
			{
				la: 'da nobis hódie',
				textKey: 'orationes/pater-noster',
				wordId: 'w025',
				note: { pl: 'daj.', en: 'give.' }
			},
			{
				la: 'dimítte nobis débita nostra',
				textKey: 'orationes/pater-noster',
				wordId: 'w029',
				note: { pl: 'odpuść.', en: 'forgive.' }
			},
			{
				la: 'ora pro nobis',
				textKey: 'orationes/ave-maria',
				wordId: 'w021',
				note: { pl: 'módl się.', en: 'pray.' }
			},
			{
				la: 'Ave María',
				textKey: 'orationes/ave-maria',
				wordId: 'w001',
				note: {
					pl: 'rozkaźnik jako pozdrowienie: witaj.',
					en: 'an imperative as a greeting: hail.'
				}
			}
		]
	},
	{
		id: 'deponens',
		group: 'verbum',
		la: 'verbum deponens',
		label: { pl: 'deponens', en: 'deponent' },
		what: {
			pl: 'Czasownik o formie biernej i znaczeniu czynnym: wygląda jak „jestem spowiadany”, znaczy „spowiadam się”. Deponens ma w haśle bezokolicznik na -i: confitéri, precári (uwaga: „fíeri” od „fio” też kończy się na -i, choć „fio” deponensem nie jest).',
			en: 'A verb passive in form, active in meaning: it looks like “I am confessed”, it means “I confess”. A deponent’s entry shows an infinitive in -i: confitéri, precári (though “fíeri”, from “fio”, also ends in -i without being deponent).'
		},
		examples: [
			{
				la: 'Confíteor Deo',
				textKey: 'ordinarium/confiteor',
				wordId: 'w001',
				note: {
					pl: 'spowiadam się — forma bierna, znaczenie czynne.',
					en: 'I confess — passive form, active meaning.'
				}
			},
			{
				la: 'Ídeo precor',
				textKey: 'ordinarium/confiteor',
				wordId: 'w039',
				note: {
					pl: 'błagam — drugi deponens tej modlitwy.',
					en: 'I beseech — the prayer’s second deponent.'
				}
			}
		]
	},
	{
		id: 'appositio',
		group: 'syntaxis',
		la: 'appositio',
		label: { pl: 'apozycja (dopowiedzenie)', en: 'apposition' },
		what: {
			pl: 'Dopowiedzenie: drugi rzeczownik, który bliżej określa pierwszy i dziedziczy jego przypadek — Michałowi Archaniołowi, owoc… Jezus.',
			en: 'A second noun that restates the first and inherits its case — to Michael the Archangel; the fruit… Jesus.'
		},
		examples: [
			{
				la: 'Michaéli Archángelo',
				textKey: 'ordinarium/confiteor',
				wordId: 'w010',
				note: {
					pl: 'Michałowi — Archaniołowi: ten sam celownik.',
					en: 'to Michael — the Archangel: the same dative.'
				}
			},
			{
				la: 'fructus ventris tui Jesus',
				textKey: 'orationes/ave-maria',
				wordId: 'w016',
				note: {
					pl: 'owoc… — Jezus: apozycja w mianowniku.',
					en: 'the fruit… — Jesus: an apposition in the nominative.'
				}
			},
			{
				la: 'Sancta María, Mater Dei',
				textKey: 'orationes/ave-maria',
				wordId: 'w019',
				note: {
					pl: 'Maryjo — Matko: dopowiedzenie w wołaczu.',
					en: 'Mary — Mother: an apposition in the vocative.'
				}
			},
			{
				la: 'pro nobis peccatóribus',
				textKey: 'orationes/ave-maria',
				wordId: 'w024',
				note: { pl: 'za nami — grzesznikami.', en: 'for us — sinners.' }
			}
		]
	}
];

export function conceptById(id: string): Concept | undefined {
	return CONCEPTS.find((c) => c.id === id);
}

// Load-time validation: every example must point at a real word whose form
// appears in the quoted phrase. A failure here fails the prerender.
for (const c of CONCEPTS) {
	for (const ex of c.examples) {
		const entry = TEXTS[ex.textKey];
		const word = entry?.text.segments.flatMap((s) => s.words ?? []).find((w) => w.id === ex.wordId);
		if (!word) {
			throw new Error(`grammar: ${c.id}: no word ${ex.wordId} in ${ex.textKey}`);
		}
		if (!ex.la.includes(word.form)) {
			throw new Error(
				`grammar: ${c.id}: phrase ${JSON.stringify(ex.la)} does not contain form ${JSON.stringify(word.form)} (${ex.wordId})`
			);
		}
	}
}
