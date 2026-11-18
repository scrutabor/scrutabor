// The spine of the Mass: every part of the 1962 ordo in sequence, whether or
// not this edition carries its text yet — so a reader in the pew can see
// where they are, including at the parts that change with the day.
//
// The spine is grouped into MOVEMENTS, one page each. Not because the Mass
// divides that way on paper — it is continuous — but because a reader looks
// up at these seams anyway, and because one page carrying the whole ordo
// would run to some 870K of HTML with the corpus complete, most of it far
// from wherever the reader is. Six pages of 50-260K, walked with the same
// chevrons the book pager uses, cost one tap at a seam and save a great
// deal of scrolling.
//
// Low Mass (Missa lecta) is the default throughout: what a reader sees and
// hears at a said Mass. Sung-Mass differences are named only where they
// change what happens.
//
// Sequence verified against the 1960 Code of Rubrics (nn. 425, 427, 431-432,
// 466-482, 502-510), the Ritus servandus in celebratione Missae of the 1962
// Missal, and the Ordo Missae of the 1962 Schott (Beuron/Herder). Where a
// conditional rule could not be pinned to a 1962 rubric it is left unstated
// rather than guessed: a companion that is wrong about when something is
// omitted is worse than one that is silent.
import type { Lang } from './i18n';
import { bindPlFields } from './polish';

export type OrdoKind =
	/** a fixed text this edition carries — `text` names the corpus key */
	| 'text'
	/** the day's own text, from the proper of the season or feast */
	| 'proper'
	/** a fixed text still to come into this edition */
	| 'pending';

export interface OrdoEntry {
	id: string;
	title: string;
	kind: OrdoKind;
	text?: string;
	/** Show this addition only when the selected canonical assembly contains it. */
	onlyWhenPresent?: boolean;
	/** A neutral label where the preparation has more than one permitted minister. */
	quietLabel?: Record<Lang, string>;
	note: Record<Lang, string>;
	when?: Record<Lang, string>;
}

/** Which half of the Mass a movement belongs to (the preparation precedes
 * both, as the corpus's own `section` field has it). */
export type OrdoPart = 'praeparatio' | 'catechumenorum' | 'fidelium';

export interface OrdoMovement {
	/** URL segment: /{lang}/ordo/{id} */
	id: string;
	/** Latin name, as the page's heading */
	title: string;
	label: Record<Lang, string>;
	part: OrdoPart;
	entries: OrdoEntry[];
}

/**
 * How loudly each part is said at LOW MASS, which is the Mass this spine
 * describes throughout. Editorial, like the narrative notes beside it and
 * held to the same standard: it states the rite's own practice — the
 * offertory prayers and the Canon from Te ígitur to Per ipsum are said
 * secreto, the dialogues and the lessons aloud — and it is the claim a
 * Latinist should check first, because it is what the role filter acts on.
 *
 * `submissa` is a genuinely lowered voice, as at the priest's Amen after
 * the Suscípiat. The rubrics' *elata aliquantulum voce* is a manner of
 * `clara`, not `submissa` (corpus SCHEMA).
 *
 * A part named nowhere here is said aloud. Where the CORPUS has read a
 * voice from the rubrics (SCHEMA.md 0.9.0) that reading governs the text
 * itself; this map governs the spine, which is coarser by design — a
 * reader filtering the ordo is choosing what to walk past, not what to
 * believe about a single line.
 */
const QUIET: Record<string, 'secreto' | 'submissa'> = {
	// preparation: the psalm and its versicles are said with the server;
	// these two the priest says going up to the altar
	'aufer-a-nobis': 'secreto',
	// before the Mass Gospel, in the priest-alone base
	'munda-cor-meum': 'secreto',
	'iube-domine-benedicere': 'secreto',
	// offertory: every one of these prayers is said silently
	'suscipe-sancte-pater': 'secreto',
	'deus-qui-humanae': 'secreto',
	'offerimus-tibi': 'secreto',
	'in-spiritu-humilitatis': 'secreto',
	lavabo: 'secreto',
	'suscipe-sancta-trinitas': 'secreto',
	'orate-fratres': 'submissa',
	secreta: 'secreto',
	// the Canon, silent from Te ígitur to the doxology
	'te-igitur': 'secreto',
	'memento-vivorum': 'secreto',
	communicantes: 'secreto',
	'hanc-igitur': 'secreto',
	'quam-oblationem': 'secreto',
	'qui-pridie': 'secreto',
	'simili-modo': 'secreto',
	'unde-et-memores': 'secreto',
	'supra-quae': 'secreto',
	'supplices-te-rogamus': 'secreto',
	'memento-defunctorum': 'secreto',
	'nobis-quoque': 'submissa',
	'per-quem-haec-omnia': 'secreto',
	'per-ipsum': 'secreto',
	// communion: the embolism, the commixture, the three prayers, the
	// priest's own communion and the ablutions
	'libera-nos': 'secreto',
	'haec-commixtio': 'secreto',
	'qui-dixisti': 'secreto',
	'fili-dei-vivi': 'secreto',
	'perceptio-corporis': 'secreto',
	'panem-caelestem': 'submissa',
	'quid-retribuam': 'secreto',
	'quod-ore-sumpsimus': 'secreto',
	'corpus-tuum': 'secreto',
	// after the dismissal
	'placeat-tibi': 'secreto'
};

/** How loudly this part is said; undefined means aloud. */
export function partVoice(id: string): 'secreto' | 'submissa' | undefined {
	return QUIET[id];
}

const ORDO_SOURCE: OrdoMovement[] = [
	{
		id: 'praeparatio',
		title: 'Præparátio',
		label: { pl: 'Modlitwy u stopni ołtarza', en: 'the prayers at the foot of the altar' },
		part: 'praeparatio',
		entries: [
			{
				id: 'introibo',
				title: 'Introíbo ad altáre Dei',
				kind: 'text',
				text: 'ordinarium/introibo',
				note: {
					pl: 'Kapłan staje u stopni ołtarza, żegna się i mówi pierwsze słowa Mszy — na ołtarz jeszcze nie wstępuje.',
					en: 'The priest stands at the foot of the altar, signs himself, and says the first words of the Mass — he has not gone up yet.'
				},
				when: {
					pl: 'opuszcza się wraz ze wszystkimi modlitwami u stopni ołtarza, gdy Mszę poprzedza poświęcenie świec albo palm z procesją, poświęcenie popiołu lub procesja błagalna, a także w Wigilię Paschalną — kapłan od razu wstępuje na ołtarz i całuje go',
					en: 'omitted with all the prayers at the foot of the altar when the Mass follows the blessing and procession of candles or of palms, the blessing of ashes or a Rogation procession, and at the Easter Vigil — the priest goes straight up to the altar and kisses it'
				}
			},
			{
				id: 'iudica-me',
				title: 'Psalmus Júdica me',
				kind: 'text',
				text: 'ordinarium/iudica-me',
				note: {
					pl: 'Psalm 42 odmawiany na przemian z usługującym, zakończony Chwała Ojcu i powtórzoną antyfoną.',
					en: 'Psalm 42, said in alternation with the server, closed by the Glória Patri and the antiphon again.'
				},
				when: {
					pl: 'opuszcza się we Mszach za zmarłych oraz we Mszach okresowych (de Tempore) od I Niedzieli Męki Pańskiej do Wielkiego Czwartku włącznie — wraz z doksologią i powtórzoną antyfoną',
					en: 'omitted at Masses for the Dead and at Masses of the season (de Tempore) from the First Sunday of the Passion through Holy Thursday inclusive — with its doxology and the repeated antiphon'
				}
			},
			{
				id: 'adiutorium',
				title: 'Adiutórium nostrum',
				kind: 'text',
				text: 'ordinarium/adiutorium',
				note: {
					pl: 'Werset i odpowiedź. Kapłan żegna się drugi raz i zaraz potem, głęboko pochylony, zaczyna spowiedź powszechną.',
					en: 'A versicle and its response. The priest signs himself a second time and, bowing low, begins the confession.'
				}
			},
			{
				id: 'confiteor-sacerdotis',
				title: 'Confíteor (Sacerdotis)',
				kind: 'text',
				text: 'ordinarium/confiteor-sacerdotis',
				note: {
					pl: 'Kapłan wyznaje grzechy pierwszy, zwracając się do usługujących: „wam, bracia”.',
					en: 'The priest confesses first, addressing the servers: “to you, brothers”.'
				}
			},
			{
				id: 'misereatur-tui',
				title: 'Misereátur tui',
				kind: 'text',
				text: 'ordinarium/misereatur-tui',
				note: {
					pl: 'Usługujący proszą Boga o miłosierdzie dla kapłana.',
					en: 'The servers ask God to have mercy on the priest.'
				}
			},
			{
				id: 'confiteor',
				title: 'Confíteor (Ministrórum)',
				kind: 'text',
				text: 'ordinarium/confiteor',
				note: {
					pl: 'Usługujący odmawiają Confíteor po spowiedzi kapłana. Kapłan odpowiada modlitwami Misereátur i Indulgéntiam.',
					en: 'After the priest’s confession, the servers say the Confíteor. The priest answers with the Misereátur and Indulgéntiam.'
				}
			},
			{
				id: 'misereatur',
				title: 'Misereátur',
				kind: 'text',
				text: 'ordinarium/misereatur',
				note: {
					pl: 'Dwie modlitwy o przebaczenie po spowiedzi usługujących: Misereátur i Indulgéntiam — prośby, nie rozgrzeszenie sakramentalne.',
					en: 'Two prayers for pardon after the servers’ confession, the Misereátur and the Indulgéntiam — petitions, not sacramental absolution.'
				}
			},
			{
				id: 'deus-tu-conversus',
				title: 'Deus, tu convérsus',
				kind: 'text',
				text: 'ordinarium/deus-tu-conversus',
				note: {
					pl: 'Ostatnie wersety u stopni, mówione na przemian. Zaraz po nich kapłan wstępuje na ołtarz.',
					en: 'The last versicles at the foot, said in alternation. Immediately after them the priest goes up to the altar.'
				}
			},
			{
				id: 'aufer-a-nobis',
				title: 'Aufer a nobis',
				kind: 'text',
				text: 'ordinarium/aufer-a-nobis',
				note: {
					pl: 'Kapłan wstępuje po stopniach, prosząc o oczyszczenie z grzechów, i całuje ołtarz w miejscu relikwii.',
					en: 'The priest goes up the steps asking to be cleansed of sin, and kisses the altar over the relics.'
				}
			}
		]
	},
	{
		id: 'catechumenorum',
		title: 'Missa Catechumenórum',
		label: { pl: 'Msza katechumenów', en: 'the Mass of the catechumens' },
		part: 'catechumenorum',
		entries: [
			{
				id: 'introitus',
				title: 'Intróitus',
				kind: 'proper',
				note: {
					pl: 'Kapłan po stronie lekcji czyta Introit — antyfonę na wejście z wersetem psalmu, zwykle także z Glória Patri, po czym powtarza antyfonę.',
					en: 'At the Epistle side, the priest reads the Introit antiphon with its psalm verse, usually also the Glória Patri, then repeats the antiphon.'
				},
				when: {
					pl: 'Glória Patri opuszcza się we Mszach za zmarłych oraz we Mszach okresowych (de Tempore) od I Niedzieli Męki Pańskiej do Wielkiego Czwartku włącznie. W Wigilię Paschalną nie ma Introitu.',
					en: 'The Glória Patri is omitted at Masses for the Dead and at Masses of the season (de Tempore) from the First Sunday of the Passion through Holy Thursday inclusive. There is no Introit at the Easter Vigil.'
				}
			},
			{
				id: 'kyrie',
				title: 'Kýrie eléison',
				kind: 'text',
				text: 'ordinarium/kyrie',
				note: {
					pl: 'Kapłan wraca na środek ołtarza. We Mszy cichej odmawia dziewięć wezwań na przemian z usługującym. We Mszy śpiewanej wierni mogą dołączyć do śpiewu.',
					en: 'The priest returns to the middle of the altar. At low Mass he alternates the nine invocations with the server. At sung Mass the faithful may join the singing.'
				}
			},
			{
				id: 'gloria',
				title: 'Glória in excélsis',
				kind: 'text',
				text: 'ordinarium/gloria',
				note: {
					pl: 'Kapłan intonuje hymn anielski na środku ołtarza. We Mszy śpiewanej podejmuje go chór.',
					en: 'At the middle of the altar the priest intones the angelic hymn. At a sung Mass the choir takes it up.'
				},
				when: {
					pl: 'opuszcza się w Adwencie, Przedpościu i Wielkim Poście oraz we Mszach za zmarłych, wraca w święta tych okresów',
					en: 'omitted in Advent, Pre-Lent, and Lent and at Masses for the Dead, and returns on the feasts of those seasons'
				}
			},
			{
				id: 'collecta',
				title: 'Orátio',
				kind: 'proper',
				note: {
					pl: 'Kapłan pozdrawia wiernych i mówi Orémus. Odmawia modlitwę dnia, a gdy przypadają wspomnienia, także ich modlitwy.',
					en: 'The priest greets the people and says Orémus. The Collect of the day follows, along with the Collect of each prescribed commemoration.'
				}
			},
			{
				id: 'epistola',
				title: 'Epístola',
				kind: 'proper',
				note: {
					pl: 'Po stronie lekcji kapłan czyta lekcję dnia.',
					en: 'At the Epistle side the priest reads the day’s Epistle.'
				}
			},
			{
				id: 'deo-gratias-epistolae',
				title: 'Deo grátias',
				kind: 'text',
				text: 'ordinarium/deo-gratias-epistolae',
				note: {
					pl: 'Po lekcji odpowiada usługujący. We Mszy cichej wierni mogą dołączyć do odpowiedzi.',
					en: 'The server answers at the end of the Epistle. At low Mass the faithful may join in the response.'
				}
			},
			{
				id: 'graduale',
				title: 'Graduále, Allelúia, Tractus',
				kind: 'proper',
				note: {
					pl: 'Śpiewy między czytaniami pochodzą z formularza dnia. We Mszy cichej kapłan czyta je na głos po stronie lekcji.',
					en: 'The chants between the readings come from the day’s formulary. At low Mass the priest reads them aloud at the Epistle side.'
				},
				when: {
					pl: 'Traktus i sekwencja pojawiają się zgodnie z rubrykami formularza.',
					en: 'The Tract and the Sequence are included where prescribed.'
				}
			},
			{
				id: 'munda-cor-meum',
				title: 'Munda cor meum',
				kind: 'text',
				text: 'ordinarium/munda-cor-meum',
				quietLabel: {
					pl: 'przygotowanie do Ewangelii',
					en: 'preparation for the Gospel'
				},
				note: {
					pl: 'W przedstawionym tu wariancie bez diakona kapłan przed Ewangelią Mszy odmawia tę modlitwę po cichu, także gdy sam śpiewa Ewangelię. We Mszy uroczystej mówi ją diakon, a celebrans jej nie powtarza. We Mszach za zmarłych opuszcza się odrębną prośbę o błogosławieństwo i samo błogosławieństwo, ale Munda cor meum wraz ze swoim zakończeniem pozostaje. Nie odmawia się jej przed ostatnią Ewangelią.',
					en: 'In the priest-alone form shown here, the priest says this prayer silently before the Mass Gospel, including when he sings the Gospel himself. At solemn Mass the deacon says it, and the celebrant does not repeat it. The separate blessing request and blessing are omitted at Masses for the Dead, but Munda cor meum and its own conclusion remain. It is not said before the Last Gospel.'
				}
			},
			{
				id: 'iube-domine-benedicere',
				title: 'Iube, Dómine, benedícere',
				kind: 'text',
				text: 'ordinarium/iube-domine-benedicere',
				quietLabel: {
					pl: 'prośba o błogosławieństwo',
					en: 'prayer for a blessing'
				},
				note: {
					pl: 'Po Munda cor meum kapłan odprawiający bez diakona i subdiakona odmawia po cichu tę prośbę i błogosławieństwo przed Ewangelią Mszy, także gdy sam śpiewa Ewangelię. We Mszy uroczystej diakon ma odrębny obrzęd. Sam wybór Mszy śpiewanej nie oznacza jego obecności. We Mszach za zmarłych opuszcza się obie części. Nie odmawia się ich przed ostatnią Ewangelią.',
					en: 'After Munda cor meum, the priest celebrating without a deacon and subdeacon says this request and blessing silently before the Mass Gospel, including when he sings the Gospel himself. At solemn Mass the deacon has a separate rite. Selecting sung Mass alone does not imply his presence. Both parts are omitted at Masses for the Dead. They are not said before the Last Gospel.'
				}
			},
			{
				id: 'iube-domne-benedicere',
				title: 'Iube, domne, benedícere (Diáconi)',
				kind: 'text',
				text: 'ordinarium/iube-domne-benedicere',
				note: {
					pl: 'Odrębna forma przygotowania do Ewangelii z udziałem diakona. Prośbę wypowiada diakon. Celebrans udziela błogosławieństwa i sam mówi końcowe Amen. Nie odmawia się tej formuły po przygotowaniu kapłana odprawiającego bez diakona i subdiakona. Opuszcza się ją we Mszach za zmarłych. Nie stosuje się jej przed ostatnią Ewangelią.',
					en: 'A separate form of preparation for the Gospel with a deacon. The deacon makes the request. The celebrant gives the blessing and says the final Amen himself. This formula is not said after the preparation of the priest celebrating without a deacon and subdeacon. It is omitted at Masses for the Dead and is not used before the Last Gospel.'
				}
			},
			{
				id: 'iube-domne-benedicere-in-passione',
				title: 'Iube, domne, benedícere (in Passióne)',
				kind: 'text',
				text: 'ordinarium/iube-domne-benedicere-in-passione',
				note: {
					pl: 'Gdy w Niedzielę Palmową Pasję śpiewają wyznaczeni duchowni mający co najmniej święcenia diakonatu, po Munda cor meum proszą celebransa o błogosławieństwo. Celebrans udziela im błogosławieństwa w liczbie mnogiej, głosem umiarkowanym (media voce). Ci duchowni odpowiadają Amen. Jest to odrębna forma od przygotowania kapłana wykonującego Pasję sam. Nie dotyczy Ewangelii w obrzędach palm przed Mszą.',
					en: 'When appointed clergy who are at least deacons sing the Palm Sunday Passion, they request the celebrant’s blessing after Munda cor meum. The celebrant gives them the plural blessing in a moderate voice (media voce). Those ministers answer Amen. This is distinct from the preparation of a priest delivering the Passion alone. It is not the preparation for the Gospel in the palm ceremonies before Mass.'
				}
			},
			{
				id: 'evangelium',
				title: 'Evangélium',
				kind: 'proper',
				note: {
					pl: 'Mszał przenosi się na stronę Ewangelii i wszyscy wstają. Kapłan po cichej modlitwie Munda cor meum znaczy krzyżem księgę oraz własne czoło, usta i piersi.',
					en: 'The missal is carried to the Gospel side and all stand. After the silent Munda cor meum the priest signs the book and his own forehead, lips, and breast.'
				}
			},
			{
				id: 'laus-tibi-christe',
				title: 'Laus tibi, Christe',
				kind: 'text',
				text: 'ordinarium/laus-tibi-christe',
				note: {
					pl: 'Po Ewangelii odpowiada usługujący. We Mszy cichej wierni mogą dołączyć do odpowiedzi.',
					en: 'The server answers at the end of the Gospel. At low Mass the faithful may join in the response.'
				}
			},
			{
				id: 'credo',
				title: 'Credo',
				kind: 'text',
				text: 'ordinarium/credo',
				note: {
					pl: 'Po Ewangelii, a w niedziele zwykle po kazaniu, kapłan intonuje wyznanie wiary. Przy słowach o Wcieleniu wszyscy przyklękają.',
					en: 'After the Gospel — on Sundays usually after the sermon — the priest intones the profession of faith. All genuflect at the words of the Incarnation.'
				},
				when: {
					pl: 'w niedziele i większe święta',
					en: 'on Sundays and greater feasts'
				}
			}
		]
	},
	{
		id: 'offertorium',
		title: 'Offertórium',
		label: { pl: 'Ofiarowanie', en: 'the Offertory' },
		part: 'fidelium',
		entries: [
			{
				id: 'offertorium',
				title: 'Offertórium',
				kind: 'proper',
				note: {
					pl: 'Kapłan pozdrawia wiernych, wzywa Orémus i czyta antyfonę ofiarowania z formularza dnia, po czym odsłania kielich.',
					en: 'The priest greets the people, calls Orémus, and reads the day’s Offertory antiphon, then uncovers the chalice.'
				}
			},
			{
				id: 'suscipe-sancte-pater',
				title: 'Súscipe, sancte Pater',
				kind: 'text',
				text: 'ordinarium/suscipe-sancte-pater',
				note: {
					pl: 'Kapłan unosi patenę z hostią i ofiaruje ją po cichu.',
					en: 'The priest raises the paten with the host and offers it silently.'
				}
			},
			{
				id: 'deus-qui-humanae',
				title: 'Deus, qui humánæ substántiæ',
				kind: 'text',
				text: 'ordinarium/deus-qui-humanae',
				note: {
					pl: 'Do wina dolewa się kroplę wody. Modlitwa nad nią jest starą kolektą Bożego Narodzenia.',
					en: 'A drop of water goes into the wine. The prayer said over it is an old Christmas collect.'
				},
				when: {
					pl: 'we Mszach za zmarłych wody się nie błogosławi',
					en: 'at Masses for the Dead the water is not blessed'
				}
			},
			{
				id: 'offerimus-tibi',
				title: 'Offérimus tibi, Dómine',
				kind: 'text',
				text: 'ordinarium/offerimus-tibi',
				note: {
					pl: 'Kapłan bierze kielich i ofiaruje go, prosząc o zbawienie nasze i całego świata.',
					en: 'The priest takes the chalice and offers it, praying for our salvation and that of the whole world.'
				}
			},
			{
				id: 'in-spiritu-humilitatis',
				title: 'In spíritu humilitátis',
				kind: 'text',
				text: 'ordinarium/in-spiritu-humilitatis',
				note: {
					pl: 'Dwie krótkie modlitwy nad złożonymi już darami: prośba, by przyjęto nas samych, i wezwanie Uświęciciela.',
					en: 'Two short prayers over gifts already laid down: that we ourselves be received, and a call to the Sanctifier.'
				}
			},
			{
				id: 'lavabo',
				title: 'Lavábo',
				kind: 'text',
				text: 'ordinarium/lavabo',
				note: {
					pl: 'Kapłan obmywa końce palców, mówiąc psalm 25 od wersetu o ołtarzu.',
					en: 'The priest washes his fingertips, saying Psalm 25 from the verse that names the altar.'
				},
				when: {
					pl: 'Chwały Ojcu nie odmawia się we Mszach za zmarłych ani we Mszach okresowych (de Tempore) od I Niedzieli Męki Pańskiej do Wielkiego Czwartku włącznie. W Wigilię Paschalną odmawia się Chwała Ojcu.',
					en: 'the Glória Patri is omitted at Masses for the Dead and at Masses of the season (de Tempore) from the First Sunday of the Passion through Holy Thursday inclusive. It is said at the Easter Vigil'
				}
			},
			{
				id: 'suscipe-sancta-trinitas',
				title: 'Súscipe, sancta Trínitas',
				kind: 'text',
				text: 'ordinarium/suscipe-sancta-trinitas',
				note: {
					pl: 'Jedyna modlitwa ofiarowania zwrócona do Trójcy — i jedyna, która mówi, czego ta Ofiara jest pamiątką.',
					en: 'The one offertory prayer addressed to the Trinity, and the one that says what the sacrifice recalls.'
				}
			},
			{
				id: 'orate-fratres',
				title: 'Oráte, fratres',
				kind: 'text',
				text: 'ordinarium/orate-fratres',
				note: {
					pl: 'Kapłan zwraca się do obecnych i prosi o modlitwę. Usługujący lub obecni proszą Boga, by przyjął ofiarę.',
					en: 'The priest turns to those present and asks them to pray. The server or the people present ask God to accept the sacrifice.'
				}
			},
			{
				id: 'secreta',
				title: 'Secréta',
				kind: 'proper',
				note: {
					pl: 'Modlitwa nad darami z formularza dnia, odmawiana po cichu — słychać dopiero jej zakończenie: Per ómnia sǽcula sæculórum.',
					en: 'The day’s prayer over the gifts, said silently — only its ending is heard: Per ómnia sǽcula sæculórum.'
				}
			}
		]
	},
	{
		id: 'canon',
		title: 'Canon Missæ',
		label: { pl: 'Kanon', en: 'the Canon' },
		part: 'fidelium',
		entries: [
			{
				id: 'praefatio-dialogus',
				title: 'Sursum corda',
				kind: 'text',
				text: 'ordinarium/praefatio-dialogus',
				note: {
					pl: 'Dialog, którym zaczyna się prefacja — kapłan rozkłada ręce i podnosi je przy „Sursum corda”.',
					en: 'The dialog that opens the preface — the priest spreads his hands and raises them at Sursum corda.'
				}
			},
			{
				id: 'praefatio',
				title: 'Præfátio',
				kind: 'proper',
				text: 'ordinarium/praefatio-communis',
				note: {
					pl: 'Kapłan odmawia lub śpiewa prefację przewidzianą dla danej Mszy. Gdy nie przepisano innej, wybiera prefację wspólną.',
					en: 'The priest says or sings the preface appointed for the Mass. The Common Preface is used when no other preface is appointed.'
				}
			},
			{
				id: 'sanctus',
				title: 'Sanctus',
				kind: 'text',
				text: 'ordinarium/sanctus',
				note: {
					pl: 'Po prefacji kapłan odmawia Sanctus i rozpoczyna cichy Kanon. We Mszy śpiewanej schola śpiewa ten sam tekst, a wierni mogą dołączyć. Śpiew może trwać już podczas Kanonu.',
					en: 'After the Preface the priest recites the Sanctus and begins the silent Canon. At sung Mass the choir sings the same text and the faithful may join. The singing may continue during the Canon.'
				}
			},
			{
				id: 'te-igitur',
				title: 'Te ígitur',
				kind: 'text',
				text: 'ordinarium/te-igitur',
				note: {
					pl: 'Kanon zaczyna się po cichu: modlitwa za Kościół, papieża i biskupa.',
					en: 'The Canon begins in silence: the prayer for the Church, the Pope, and the bishop.'
				}
			},
			{
				id: 'memento-vivorum',
				title: 'Meménto (vivórum)',
				kind: 'text',
				text: 'ordinarium/memento-vivorum',
				note: {
					pl: 'Kapłan milknie i wspomina żywych — w miejscu, gdzie mszał drukuje N. et N.',
					en: 'The priest falls silent and remembers the living — where the missal prints N. et N.'
				}
			},
			{
				id: 'communicantes',
				title: 'Communicántes',
				kind: 'text',
				text: 'ordinarium/communicantes',
				note: {
					pl: 'Lista świętych: Maryja, dwunastu apostołów i dwunastu męczenników rzymskich. Świętego Józefa dopisał tu Jan XXIII w 1962 roku.',
					en: 'The list of saints: Mary, twelve apostles, and twelve Roman martyrs. John XXIII added Saint Joseph here in 1962.'
				}
			},
			{
				id: 'hanc-igitur',
				title: 'Hanc ígitur',
				kind: 'text',
				text: 'ordinarium/hanc-igitur',
				note: {
					pl: 'Kapłan wyciąga ręce nad darami, a dzwonek uprzedza, że Przeistoczenie jest blisko.',
					en: 'The priest spreads his hands over the gifts, and the bell warns that the Consecration is near.'
				}
			},
			{
				id: 'quam-oblationem',
				title: 'Quam oblatiónem',
				kind: 'text',
				text: 'ordinarium/quam-oblationem',
				note: {
					pl: 'Ostatnia prośba przed słowami Chrystusa: aby ta ofiara stała się Ciałem i Krwią.',
					en: 'The last petition before Christ\u2019s own words: that this offering become the Body and Blood.'
				}
			},
			{
				id: 'qui-pridie',
				title: 'Qui prídie',
				kind: 'text',
				text: 'ordinarium/qui-pridie',
				note: {
					pl: 'Konsekracja chleba. Kapłan przyklęka, unosi Hostię, przyklęka znowu. Usługujący dzwoni przy każdym geście.',
					en: 'The consecration of the bread. The priest genuflects, raises the Host, genuflects again. The bell rings at each.'
				}
			},
			{
				id: 'simili-modo',
				title: 'Símili modo',
				kind: 'text',
				text: 'ordinarium/simili-modo',
				note: {
					pl: 'Kapłan konsekruje wino, a potem podnosi kielich.',
					en: 'The priest consecrates the wine and then raises the chalice.'
				}
			},
			{
				id: 'unde-et-memores',
				title: 'Unde et mémores',
				kind: 'text',
				text: 'ordinarium/unde-et-memores',
				note: {
					pl: 'Kapłan ofiaruje to, co już jest obecne, i czyni pięć znaków krzyża nad darami konsekrowanymi.',
					en: 'The priest offers what is now present, and makes five crosses over the consecrated gifts.'
				}
			},
			{
				id: 'supra-quae',
				title: 'Supra quæ',
				kind: 'text',
				text: 'ordinarium/supra-quae',
				note: {
					pl: 'Przypomnienie ofiar Abla, Abrahama i Melchizedeka — trzech ofiar sprzed Prawa.',
					en: 'The prayer recalls the sacrifices of Abel, Abraham, and Melchisedech — three offerings older than the Law.'
				}
			},
			{
				id: 'supplices-te-rogamus',
				title: 'Súpplices te rogámus',
				kind: 'text',
				text: 'ordinarium/supplices-te-rogamus',
				note: {
					pl: 'Prośba, by anioł zaniósł Ofiarę na ołtarz w niebie. Anioł pozostaje nienazwany.',
					en: 'The prayer that an angel carry the sacrifice to the altar on high. The angel is never named.'
				}
			},
			{
				id: 'memento-defunctorum',
				title: 'Meménto (defunctórum)',
				kind: 'text',
				text: 'ordinarium/memento-defunctorum',
				note: {
					pl: 'Wspomnienie zmarłych, których kapłan poleca Bogu w cichej modlitwie.',
					en: 'The remembrance of the dead, whom the priest commends to God in silent prayer.'
				}
			},
			{
				id: 'nobis-quoque',
				title: 'Nobis quoque peccatóribus',
				kind: 'text',
				text: 'ordinarium/nobis-quoque',
				note: {
					pl: 'Przy pierwszych trzech słowach kapłan mówi nieco głośniej i uderza się w piersi. Dalej modli się po cichu i wymienia świętych, wśród nich siedem kobiet.',
					en: 'At the first three words the priest raises his voice a little and strikes his breast. In the quiet prayer that follows, the priest names the saints, including seven women.'
				}
			},
			{
				id: 'per-quem-haec-omnia',
				title: 'Per quem hæc ómnia',
				kind: 'text',
				text: 'ordinarium/per-quem-haec-omnia',
				note: {
					pl: 'Krótka modlitwa, w której miejscu dawniej błogosławiono oleje i płody ziemi.',
					en: 'A short prayer. At this point the oils and the fruits of the earth were once blessed.'
				}
			},
			{
				id: 'per-ipsum',
				title: 'Per ipsum',
				kind: 'text',
				text: 'ordinarium/per-ipsum',
				note: {
					pl: 'Pod koniec Kanonu następuje małe podniesienie. Po nim kapłan wypowiada głośno lub śpiewa Per ómnia sǽcula sæculórum.',
					en: 'The minor elevation comes at the end of the Canon. The priest then says aloud or sings Per ómnia sǽcula sæculórum.'
				}
			}
		]
	},
	{
		id: 'communio',
		title: 'Commúnio',
		label: { pl: 'Komunia', en: 'the Communion' },
		part: 'fidelium',
		entries: [
			{
				id: 'pater-noster',
				title: 'Pater noster',
				kind: 'text',
				text: 'ordinarium/pater-noster',
				note: {
					pl: 'Kapłan śpiewa lub odmawia Modlitwę Pańską. Ostatnia prośba, Sed líbera nos a malo, jest odpowiedzią wiernych i usługujących. Po niej kapłan mówi Amen po cichu. We Mszy cichej wierni mogą odmówić z nim całą modlitwę po łacinie i wspólnie dodać Amen.',
					en: 'The priest sings or says the Lord’s Prayer. The faithful and servers answer with the last petition, Sed líbera nos a malo, and the priest says Amen quietly. At low Mass the faithful may say the entire prayer with him in Latin and join in the final Amen.'
				}
			},
			{
				id: 'libera-nos',
				title: 'Líbera nos',
				kind: 'text',
				text: 'ordinarium/libera-nos',
				note: {
					pl: 'Kapłan prosi po cichu o wybawienie od zła przeszłego, obecnego i przyszłego. Pod koniec modlitwy łamie Hostię. Ostatnie słowa mówi głośno lub śpiewa.',
					en: 'During this silent prayer for deliverance from past, present, and future evils, the priest breaks the Host. The closing words are said or sung aloud.'
				}
			},
			{
				id: 'pax-domini',
				title: 'Pax Dómini',
				kind: 'text',
				text: 'ordinarium/pax-domini',
				note: {
					pl: 'Kapłan czyni cząstką Hostii trzy znaki krzyża nad kielichem, po czym pozdrawia wiernych.',
					en: 'The priest makes three signs of the cross over the chalice with the particle of the Host and then greets the people.'
				}
			},
			{
				id: 'haec-commixtio',
				title: 'Hæc commíxtio',
				kind: 'text',
				text: 'ordinarium/haec-commixtio',
				note: {
					pl: 'Kapłan wpuszcza cząstkę Hostii do kielicha i modli się po cichu.',
					en: 'The priest drops the particle of the Host into the chalice and prays silently.'
				}
			},
			{
				id: 'agnus-dei',
				title: 'Agnus Dei',
				kind: 'text',
				text: 'ordinarium/agnus-dei',
				note: {
					pl: 'Wezwania padają po łamaniu Hostii i pozdrowieniu pokoju, tuż przed Komunią.',
					en: 'The invocations come after the breaking of the Host and the greeting of peace, just before Communion.'
				},
				when: {
					pl: 'we Mszach za zmarłych zamiast miserére nobis mówi się dona eis réquiem',
					en: 'at Masses for the Dead dona eis réquiem takes the place of miserére nobis'
				}
			},
			{
				id: 'qui-dixisti',
				title: 'Dómine Iesu Christe, qui dixísti',
				kind: 'text',
				text: 'ordinarium/qui-dixisti',
				note: {
					pl: 'Pierwsza z trzech cichych modlitw przed Komunią — o pokój dla Kościoła. We Mszy uroczystej po niej następuje pocałunek pokoju.',
					en: 'The first of three silent prayers before Communion, for the peace of the Church. At solemn Mass the kiss of peace follows it.'
				},
				when: {
					pl: 'we Mszach za zmarłych opuszcza się tę modlitwę i pocałunek pokoju',
					en: 'at Masses for the Dead this prayer and the kiss of peace are omitted'
				}
			},
			{
				id: 'fili-dei-vivi',
				title: 'Dómine Iesu Christe, Fili Dei vivi',
				kind: 'text',
				text: 'ordinarium/fili-dei-vivi',
				note: {
					pl: 'Kapłan prosi przed Komunią o uwolnienie od win i o to, by nigdy nie odłączyć się od Chrystusa.',
					en: 'Before Communion the priest asks to be freed from sin and never to be separated from Christ.'
				}
			},
			{
				id: 'perceptio-corporis',
				title: 'Percéptio Córporis tui',
				kind: 'text',
				text: 'ordinarium/perceptio-corporis',
				note: {
					pl: 'Kapłan prosi, by przyjęcie Ciała Pańskiego stało się dla niego lekarstwem i nie ściągnęło na niego sądu.',
					en: 'The priest prays that receiving the Lord’s Body may bring him healing and spare him judgment.'
				}
			},
			{
				id: 'panem-caelestem',
				title: 'Panem cæléstem',
				kind: 'text',
				text: 'ordinarium/panem-caelestem',
				note: {
					pl: 'Kapłan przyklęka, bierze obie części Hostii i trzy razy uderza się w piersi: Dómine, non sum dignus — pierwsze słowa nieco głośniej, resztę po cichu — po czym przyjmuje Ciało Pańskie.',
					en: 'The priest genuflects, takes both halves of the Host and strikes his breast three times at Dómine, non sum dignus — the opening words a little louder, the rest silently — and receives the Body of the Lord.'
				}
			},
			{
				id: 'quid-retribuam',
				title: 'Quid retríbuam',
				kind: 'text',
				text: 'ordinarium/quid-retribuam',
				note: {
					pl: 'Kapłan odkrywa kielich, zbiera na patenę okruchy, żegna się kielichem i przyjmuje Krew Pańską.',
					en: 'The priest uncovers the chalice, gathers any fragments onto the paten, signs himself with the chalice, and receives the Blood of the Lord.'
				}
			},
			{
				id: 'ecce-agnus-dei',
				title: 'Ecce Agnus Dei',
				kind: 'text',
				text: 'ordinarium/ecce-agnus-dei',
				note: {
					pl: 'Kapłan ukazuje wiernym Hostię. Po trzykrotnym Dómine, non sum dignus udziela Komunii, mówiąc każdemu Corpus Dómini nostri Iesu Christi.',
					en: 'The priest shows the Host to the faithful. After Dómine, non sum dignus has been said three times, he gives Communion, saying Corpus Dómini nostri Iesu Christi to each person.'
				},
				when: {
					pl: 'gdy wierni przystępują do Komunii',
					en: 'when the faithful receive Communion'
				}
			},
			{
				id: 'quod-ore-sumpsimus',
				title: 'Quod ore súmpsimus',
				kind: 'text',
				text: 'ordinarium/quod-ore-sumpsimus',
				note: {
					pl: 'Usługujący wlewa do kielicha trochę wina, które kapłan następnie wypija.',
					en: 'The server pours a little wine into the chalice, and the priest drinks it.'
				}
			},
			{
				id: 'corpus-tuum',
				title: 'Corpus tuum',
				kind: 'text',
				text: 'ordinarium/corpus-tuum',
				note: {
					pl: 'Kapłan obmywa palce winem z wodą, wyciera kielich i naczynia. Ta druga cicha modlitwa zamyka obrzęd Komunii.',
					en: 'The priest washes his fingers with wine and water and dries the chalice and vessels. This second silent prayer closes the Communion rite.'
				}
			}
		]
	},
	{
		id: 'conclusio',
		title: 'Conclúsio',
		label: { pl: 'Zakończenie', en: 'the conclusion' },
		part: 'fidelium',
		entries: [
			{
				id: 'communio',
				title: 'Commúnio',
				kind: 'proper',
				note: {
					pl: 'Antyfona z formularza dnia, odczytana po stronie lekcji. We Mszy śpiewanej chór śpiewa ją już podczas rozdawania Komunii.',
					en: 'The day’s antiphon, read at the Epistle side. At a sung Mass the choir has already sung it during the distribution of Communion.'
				}
			},
			{
				id: 'laudes',
				title: 'Laudes',
				kind: 'proper',
				onlyWhenPresent: true,
				note: {
					pl: 'Po Komunii i ablucjach następują śpiewane laudesy: Psalm 150 i kantyk Zachariasza, każdy z antyfoną i doksologią. Podczas kantyku następuje okadzenie.',
					en: 'After Communion and the ablutions, sung Lauds follows: Psalm 150 and the Canticle of Zechariah, each with its antiphon and doxology. Incensation takes place during the canticle.'
				}
			},
			{
				id: 'postcommunio',
				title: 'Postcommúnio',
				kind: 'proper',
				note: {
					pl: 'Kapłan całuje ołtarz, pozdrawia wiernych i wraca na stronę lekcji po modlitwę końcową — tyle modlitw, ile było kolekt.',
					en: 'The priest kisses the altar, greets the people, and returns to the Epistle side for the closing prayer — as many prayers as there were collects.'
				},
				when: {
					pl: 'w dni powszednie Wielkiego Postu dochodzi jeszcze Orátio super pópulum',
					en: 'on the ferias of Lent an Orátio super pópulum is added'
				}
			},
			{
				id: 'ite-missa-est',
				title: 'Ite, missa est',
				kind: 'text',
				text: 'ordinarium/ite-missa-est',
				note: {
					pl: 'Kapłan zwraca się do ludu i odsyła go słowami Ite, missa est. Usługujący odpowiada Deo grátias.',
					en: 'The priest turns to the people and dismisses them with Ite, missa est. The server answers Deo grátias.'
				},
				when: {
					pl: 'gdy po Mszy następuje procesja, mówi się Benedicámus Dómino, a we Mszach za zmarłych — Requiéscant in pace',
					en: 'when a procession follows the Mass the dismissal is Benedicámus Dómino, and at Masses for the Dead Requiéscant in pace'
				}
			},
			{
				id: 'placeat-tibi',
				title: 'Pláceat tibi',
				kind: 'text',
				text: 'ordinarium/placeat-tibi',
				note: {
					pl: 'Pochylony nad ołtarzem kapłan prosi po cichu, aby złożona ofiara podobała się Trójcy Świętej, i całuje ołtarz.',
					en: 'Bowed over the altar the priest asks silently that the sacrifice may please the Holy Trinity, and kisses the altar.'
				}
			},
			{
				id: 'benedictio',
				title: 'Benedícat vos',
				kind: 'text',
				text: 'ordinarium/benedictio',
				note: {
					pl: 'Kapłan podnosi oczy, wyciąga ręce i błogosławi lud jednym znakiem krzyża.',
					en: 'The priest raises his eyes, extends his hands, and blesses the people with one sign of the cross.'
				},
				when: {
					pl: 'we Mszach za zmarłych błogosławieństwa się nie udziela',
					en: 'at Masses for the Dead no blessing is given'
				}
			},
			{
				id: 'evangelium-ultimum',
				title: 'In princípio',
				kind: 'text',
				text: 'ordinarium/evangelium-ultimum',
				note: {
					pl: 'Przy ołtarzu po stronie Ewangelii kapłan czyta prolog świętego Jana. Na słowa Et Verbum caro factum est wszyscy przyklękają.',
					en: 'At the Gospel side the priest reads the prologue of Saint John. At Et Verbum caro factum est everyone genuflects.'
				}
			},
			// The prayers of Leo XIII, prescribed in 1884 and said kneeling at
			// the foot of the altar after low Mass. They are five, and they
			// are here as five: the block stood as one PENDING entry while
			// two of its texts were already in the book and unreachable, and
			// the remaining two were waiting on a second Latin witness.
			{
				id: 'ave-maria',
				title: 'Ave María',
				kind: 'text',
				text: 'orationes/ave-maria',
				note: {
					pl: 'Kapłan klęka u stopni ołtarza i zaczyna z ludem trzy Zdrowaś Maryjo, a wierni odpowiadają drugą połową każdego z nich.',
					en: 'The priest kneels at the foot of the altar and begins three Hail Marys with the people, who answer the second half of each.'
				},
				when: {
					pl: 'po Mszy cichej, a po śpiewanej opuszcza się je',
					en: 'after low Mass, and omitted after a sung Mass'
				}
			},
			{
				id: 'salve-regina',
				title: 'Salve Regína',
				kind: 'text',
				text: 'orationes/salve-regina',
				note: {
					pl: 'Antyfona odmawiana wspólnie, a po niej werset: kapłan mówi „Módl się za nami”, lud odpowiada.',
					en: 'The antiphon is said by all together, and a versicle follows it: the priest says “Pray for us”, and the people answer.'
				}
			},
			{
				id: 'deus-refugium',
				title: 'Deus, refúgium nostrum',
				kind: 'text',
				text: 'orationes/deus-refugium',
				note: {
					pl: 'Kolekta, którą kapłan zamyka antyfonę. Leon XIII prosił w niej o wolność Kościoła. Od roku 1930 modlitwy te ofiarowuje się w intencji Rosji.',
					en: 'The collect with which the priest closes the antiphon. Leo XIII asked in it for the freedom of the Church. Since 1930 these prayers have been offered for Russia.'
				}
			},
			{
				id: 'sancte-michael',
				title: 'Sancte Míchaël',
				kind: 'text',
				text: 'orationes/sancte-michael',
				note: {
					pl: 'Modlitwa do świętego Michała Archanioła, ułożona przez samego Leona XIII.',
					en: 'The prayer to St Michael the Archangel, composed by Leo XIII himself.'
				}
			},
			{
				id: 'cor-iesu',
				title: 'Cor Iesu sacratíssimum',
				kind: 'text',
				text: 'orationes/cor-iesu',
				note: {
					pl: 'Wezwanie powtarzane trzykrotnie, którym kończą się modlitwy. Dodał je Pius X w roku 1904.',
					en: 'The invocation that ends the prayers, said three times. Pius X added it in 1904.'
				}
			}
		]
	}
];

/** Polish one-letter words bound to what follows (lib/polish); Latin
 * titles and English prose in the same objects are untouched. */
export const ORDO: OrdoMovement[] = bindPlFields(ORDO_SOURCE);

export function movementById(id: string): OrdoMovement | undefined {
	return ORDO.find((m) => m.id === id);
}

/** The movement before and after, for the pager. */
export function movementNeighbors(id: string): { prev?: OrdoMovement; next?: OrdoMovement } {
	const i = ORDO.findIndex((m) => m.id === id);
	if (i < 0) return {};
	return { prev: ORDO[i - 1], next: ORDO[i + 1] };
}
