// Grammar-concept pages: one page per term of the controlled grammar
// vocabulary, every example drawn from the corpus texts. Content lives here
// (UI-language educational prose, not corpus data); the module validates at
// load time that every example points at a real word and quotes its form —
// a wrong reference fails the prerender, not the reader.
import type { Lang } from './i18n';
import { bindPlFields } from './polish';

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

const CONCEPTS_SOURCE: Concept[] = [
	{
		id: 'nominativus',
		group: 'casus',
		la: 'nominativus',
		label: { pl: 'mianownik', en: 'nominative' },
		what: {
			pl: 'Mianownik to zwykle przypadek podmiotu zdania. W krótkich formułach modlitwy czasownik „być” często pozostaje domyślny.',
			en: 'The subject of a sentence is usually in the nominative. In short prayer formulas, a form of “to be” is often understood.'
		},
		spot: {
			pl: 'W słowniku rzeczownik znajdziesz zwykle pod mianownikiem liczby pojedynczej.',
			en: 'Most nouns are listed under the nominative singular in a dictionary.'
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
					en: 'In “Thy will be done,” the subject is “Thy will.”'
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
			pl: 'Dopełniacz często wskazuje, do kogo coś należy albo z czym się wiąże. W „Mater Dei” słowo „Dei” mówi, czyją Matką jest Maryja.',
			en: 'The genitive often shows who or what something belongs to. In “Mater Dei,” the word “Dei” tells us whose mother Mary is.'
		},
		spot: {
			pl: 'Polski przekład często zachowuje ten sam przypadek.',
			en: 'English usually renders it with “of” or a possessive.'
		},
		examples: [
			{
				la: 'fructus ventris tui',
				textKey: 'orationes/ave-maria',
				wordId: 'w014',
				note: {
					pl: 'owoc żywota Twojego — „żywota” odpowiada na pytanie „owoc czego?”.',
					en: '“Of thy womb” describes the fruit. Both “ventris” and “tui” are genitive.'
				}
			},
			{
				la: 'Mater Dei',
				textKey: 'orationes/ave-maria',
				wordId: 'w020',
				note: {
					pl: '„Boga” odpowiada na pytanie „czyją Matką jest Maryja?”.',
					en: '“Of God” tells us whose mother Mary is.'
				}
			},
			{
				la: 'in hora mortis nostræ',
				textKey: 'orationes/ave-maria',
				wordId: 'w029',
				note: {
					pl: 'w godzinie śmierci naszej — „śmierci” odpowiada na pytanie „w godzinie czego?”.',
					en: '“Of our death” describes the hour. Both “mortis” and “nostræ” are genitive.'
				}
			},
			{
				la: 'in sǽcula sæculórum',
				textKey: 'orationes/gloria-patri',
				wordId: 'w019',
				note: {
					pl: 'W wyrażeniu „na wieki wieków” powtórzenie rzeczownika oznacza trwanie bez końca.',
					en: 'In “ages of ages,” the repeated noun expresses time without end.'
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
			pl: 'Celownik często wskazuje odbiorcę czynności. Przy „da nobis” odpowiada na pytanie „komu dać?”, a przy „Confíteor Deo” wskazuje, komu wyznajemy winy.',
			en: 'The dative often identifies the recipient. In “da nobis” it tells us who is to receive the bread. In “Confíteor Deo” it shows to whom the confession is addressed.'
		},
		examples: [
			{
				la: 'Confíteor Deo omnipoténti',
				textKey: 'ordinarium/confiteor',
				wordId: 'w002',
				note: {
					pl: 'Komu się spowiadam? Bogu. „Deo” to pierwszy z szeregu celowników.',
					en: 'To whom do I confess? To God. “Deo” is the first in a series of datives.'
				}
			},
			{
				la: 'Glória Patri',
				textKey: 'orationes/gloria-patri',
				wordId: 'w002',
				note: { pl: 'Komu należy się chwała? Ojcu.', en: 'To whom is glory given? To the Father.' }
			},
			{
				la: 'da nobis hódie',
				textKey: 'orationes/pater-noster',
				wordId: 'w026',
				note: { pl: 'Komu? Nam.', en: 'To whom? To us.' }
			}
		]
	},
	{
		id: 'accusativus',
		group: 'casus',
		la: 'accusativus',
		label: { pl: 'biernik', en: 'accusative' },
		what: {
			pl: 'Biernik często wskazuje dopełnienie bliższe. W prośbie „Panem nostrum … da nobis” prosimy o chleb. W wyrażeniach kierunku biernik stoi po przyimkach takich jak „ad” i „in”.',
			en: 'The accusative often marks the direct object. In “Panem nostrum … da nobis,” the bread is what we ask to be given. In phrases of direction, the accusative follows prepositions such as “ad” and “in.”'
		},
		examples: [
			{
				la: 'Panem nostrum quotidiánum da nobis',
				textKey: 'orationes/pater-noster',
				wordId: 'w022',
				note: {
					pl: 'O co prosimy? O chleb. „Panem” jest dopełnieniem czasownika „da”.',
					en: 'What do we ask for? Our daily bread.'
				}
			},
			{
				la: 'precor beátam Maríam',
				textKey: 'ordinarium/confiteor',
				wordId: 'w041',
				note: { pl: 'Kogo błagam? Maryję.', en: 'Whom do I beseech? Mary.' }
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
			pl: 'Ablativus może wskazywać między innymi środek, sposób, miejsce lub czas. W polszczyźnie tym funkcjom służą na przykład narzędnik i wyrażenia z przyimkami. W łacinie ablativus występuje po „cum”, „pro” i „a/ab”, a w wyrażeniach miejsca także po „in”.',
			en: 'The ablative can express means, manner, place, or time. English often uses a preposition such as “by,” “with,” “from,” or “in.” In Latin the ablative follows “cum,” “pro,” and “a/ab,” as well as “in” when it indicates location.'
		},
		examples: [
			{
				la: 'grátia plena',
				textKey: 'orationes/ave-maria',
				wordId: 'w003',
				note: {
					pl: 'łaski pełna — po polsku „łaski” jest dopełniaczem. Łacińskie „grátia” to ablativus.',
					en: 'full of grace — the ablative “grátia” tells us what Mary is full of.'
				}
			},
			{
				la: 'cogitatióne, verbo et ópere',
				textKey: 'ordinarium/confiteor',
				wordId: 'w027',
				note: {
					pl: '„Myślą, mową i uczynkiem” wskazuje trzy sposoby grzeszenia. Wszystkie trzy łacińskie rzeczowniki mają formę ablativu.',
					en: '“In thought, word, and deed” names three ways of sinning. All three nouns are ablative.'
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
			pl: 'Wołacza używamy, gdy zwracamy się do kogoś wprost. Tak zaczynają się „Ojcze nasz” i „Zdrowaś Maryjo”.',
			en: 'The vocative is the case of direct address, as in “Father” in the Lord’s Prayer and “Mary” in the Hail Mary.'
		},
		examples: [
			{
				la: 'Pater noster',
				textKey: 'orationes/pater-noster',
				wordId: 'w001',
				note: {
					pl: 'Ojcze — cała modlitwa jest mową wprost.',
					en: 'Father — the whole prayer is direct address.'
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
					pl: '„Tibi” to celownik („tobie”). „Pater” to wołacz („ojcze”).',
					en: '“Tibi” is dative (“to you”). “Pater” is vocative (“father”).'
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
			pl: 'W modlitwach tryb łączący często wyraża prośbę lub życzenie. W „Fiat volúntas tua” słowo „fiat” oddajemy jako „niech się stanie”.',
			en: 'In prayer, the subjunctive often expresses a wish or petition. In “Fiat volúntas tua,” the verb “fiat” means “may it be done.”'
		},
		examples: [
			{
				la: 'Sanctificétur nomen tuum',
				textKey: 'orationes/pater-noster',
				wordId: 'w007',
				note: {
					pl: '„Niech się święci” jest prośbą o uświęcenie imienia Boga.',
					en: '“Hallowed be” asks that God’s name be held holy.'
				}
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
					en: '“Lead us not” is a negative petition introduced by “ne.”'
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
			pl: 'Tryb rozkazujący pozwala prosić wprost. W „Ojcze nasz” używamy go, gdy mówimy „daj”, „odpuść” i „zbaw”.',
			en: 'The imperative can express a direct request. In the Lord’s Prayer we use it when we say “give,” “forgive,” and “deliver.”'
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
					pl: 'tryb rozkazujący jako pozdrowienie: witaj.',
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
			pl: 'Deponens to czasownik o formach strony biernej i znaczeniu czynnym. W haśle „confíteor, confitéri, conféssus sum” widać takie formy, a w modlitwie „confíteor” znaczy „spowiadam się”.',
			en: 'A deponent verb generally has passive forms and an active meaning. The dictionary lists “confíteor, confitéri, conféssus sum.” In the prayer, “confíteor” means “I confess.”'
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
			pl: 'Apozycja to dopowiedzenie, które mówi więcej o tej samej osobie lub rzeczy. W „Michaéli Archángelo” oba słowa stoją w celowniku, tak jak po polsku „Michałowi Archaniołowi”.',
			en: 'An apposition gives another name or description for the same person or thing. In “Michaéli Archángelo” the two nouns name the same person and both are in the dative.'
		},
		examples: [
			{
				la: 'Michaéli Archángelo',
				textKey: 'ordinarium/confiteor',
				wordId: 'w010',
				note: {
					pl: 'Michałowi — Archaniołowi: ten sam celownik.',
					en: '“To Michael the Archangel” — both his name and his title are dative.'
				}
			},
			{
				la: 'fructus ventris tui Iesus',
				textKey: 'orationes/ave-maria',
				wordId: 'w016',
				note: {
					pl: 'owoc… — Jezus: apozycja w mianowniku.',
					en: '“Jesus” names the fruit of Mary’s womb. Both “Iesus” and “fructus” are nominative.'
				}
			},
			{
				la: 'Sancta María, Mater Dei',
				textKey: 'orationes/ave-maria',
				wordId: 'w019',
				note: {
					pl: 'Maryjo — Matko: dopowiedzenie w wołaczu.',
					en: '“Mother of God” is another way of addressing Mary. Both “María” and “Mater” are vocative.'
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

/** Polish one-letter words bound to what follows (lib/polish); Latin
 * titles and English prose in the same objects are untouched. */
export const CONCEPTS: Concept[] = bindPlFields(CONCEPTS_SOURCE);

export function conceptById(id: string): Concept | undefined {
	return CONCEPTS.find((c) => c.id === id);
}
