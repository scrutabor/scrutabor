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
					pl: 'Modlitwy u stopni ołtarza opuszcza się w Wigilię Paschalną oraz wtedy, gdy Mszę poprzedza poświęcenie świec lub palm z procesją, poświęcenie popiołu albo procesja błagalna. Kapłan podchodzi wówczas do ołtarza i całuje go.',
					en: 'The prayers at the foot of the altar are omitted at the Easter Vigil and when Mass follows the blessing and procession of candles or palms, the blessing of ashes, or a Rogation procession. The priest goes directly to the altar and kisses it.'
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
					pl: 'Psalm, doksologię i powtórzenie antyfony opuszcza się we Mszach za zmarłych oraz we Mszach okresowych (de Tempore) od I Niedzieli Męki Pańskiej do Wielkiego Czwartku włącznie.',
					en: 'The psalm, the doxology and the repetition of the antiphon are omitted at Masses for the Dead and at Masses of the season (de Tempore) from the First Sunday of the Passion through Holy Thursday.'
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
					pl: 'Stojąc pośrodku przed ołtarzem, kapłan intonuje hymn anielski. We Mszy śpiewanej podejmuje go chór.',
					en: 'At the middle of the altar the priest intones the angelic hymn. At a sung Mass the choir takes it up.'
				},
				when: {
					pl: 'Gloria opuszcza się we Mszach za zmarłych oraz w niedziele Adwentu, Przedpościa i Wielkiego Postu. W święta przypadające w tych okresach hymn odmawia się zgodnie z rubrykami.',
					en: 'The Gloria is omitted at Masses for the Dead and on the Sundays of Advent, Septuagesima and Lent. On feasts during these seasons it is said as the rubrics prescribe.'
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
					pl: 'Kapłan stoi po stronie lekcji i czyta wyznaczony na ten dzień fragment Pisma Świętego.',
					en: 'The priest reads the lesson of the day at the Epistle side of the altar.'
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
					pl: 'Przed Ewangelią kapłan odprawiający bez diakona odmawia tę modlitwę po cichu, także gdy sam śpiewa Ewangelię. We Mszy uroczystej mówi ją diakon, a celebrans jej nie powtarza. We Mszach za zmarłych odmawia się Munda cor meum z zakończeniem Per Christum, a opuszcza prośbę o błogosławieństwo i samo błogosławieństwo. Modlitwy tej nie odmawia się przed ostatnią Ewangelią.',
					en: 'When the priest celebrates without a deacon, he says this prayer quietly before the Gospel, even when he sings the Gospel himself. At solemn Mass the deacon says it, and the celebrant does not repeat it. At Masses for the Dead, Munda cor meum is said through its conclusion, Per Christum. The request for a blessing and the blessing itself are omitted. This prayer is not said before the Last Gospel.'
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
					pl: 'Po Munda cor meum kapłan odprawiający bez diakona i subdiakona prosi Boga o błogosławieństwo słowami Iube, Domine, a następnie odmawia Dominus sit in corde meo. Obie modlitwy mówi po cichu, także gdy sam śpiewa Ewangelię. We Mszy uroczystej diakon prosi celebransa o błogosławieństwo. We Mszach za zmarłych i przed ostatnią Ewangelią obie modlitwy się opuszcza.',
					en: 'After Munda cor meum, the priest celebrating without a deacon and subdeacon asks God for a blessing with Iube, Domine, then says Dominus sit in corde meo. The priest says both prayers in a voice only he can hear, even when singing the Gospel himself. At solemn Mass the deacon asks the celebrant for a blessing. Both prayers are omitted at Masses for the Dead and before the Last Gospel.'
				}
			},
			{
				id: 'iube-domne-benedicere',
				title: 'Iube, domne, benedícere (Diáconi)',
				kind: 'text',
				text: 'ordinarium/iube-domne-benedicere',
				note: {
					pl: 'Przed Ewangelią diakon prosi celebransa o błogosławieństwo. Celebrans błogosławi go i sam mówi końcowe Amen. Gdy kapłan głosi Ewangelię bez diakona, odmawia własne modlitwy. Błogosławieństwo diakona opuszcza się we Mszach za zmarłych i przed ostatnią Ewangelią.',
					en: 'Before the Gospel the deacon asks the celebrant for a blessing. The celebrant blesses him and says the final Amen himself. A priest who proclaims the Gospel without a deacon says his own prayers. The deacon’s blessing is omitted at Masses for the Dead and before the Last Gospel.'
				}
			},
			{
				id: 'iube-domne-benedicere-in-passione',
				title: 'Iube, domne, benedícere (in Passióne)',
				kind: 'text',
				text: 'ordinarium/iube-domne-benedicere-in-passione',
				note: {
					pl: 'Gdy w Niedzielę Palmową Pasję śpiewają lub czytają wyznaczeni duchowni mający co najmniej święcenia diakonatu, po Munda cor meum proszą celebransa o błogosławieństwo. Celebrans błogosławi ich razem, głosem umiarkowanym (media voce), a oni odpowiadają Amen. Gdy kapłan sam czyta lub śpiewa Pasję, odmawia własne modlitwy. Ewangelia przy poświęceniu palm przed Mszą ma odrębne przygotowanie.',
					en: 'On Palm Sunday, if appointed clergy who are at least deacons chant or read the Passion, they ask the celebrant for a blessing after Munda cor meum. The celebrant blesses them together in a moderate voice (media voce), and they answer Amen. A priest who reads or chants the Passion himself says his own prayers. The Gospel at the blessing of palms before Mass has its own preparation.'
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
					pl: 'Credo odmawia się m.in. w niedziele i w większe święta.',
					en: 'The Creed is said on Sundays and on greater feasts, among other occasions.'
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
					pl: 'Kapłan pozdrawia wiernych, mówi Orémus i czyta antyfonę ofiarowania z formularza dnia, po czym odsłania kielich.',
					en: 'The priest greets the people, says Orémus, reads the day’s Offertory antiphon, and then uncovers the chalice.'
				}
			},
			{
				id: 'suscipe-sancte-pater',
				title: 'Súscipe, sancte Pater',
				kind: 'text',
				text: 'ordinarium/suscipe-sancte-pater',
				note: {
					pl: 'Kapłan unosi patenę z hostią i ofiaruje ją po cichu.',
					en: 'The priest raises the paten with the host and says the offering prayer in a low voice.'
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
					pl: 'We Mszach za zmarłych wody się nie błogosławi.',
					en: 'At Masses for the Dead the water is not blessed.'
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
					pl: 'Doksologię Chwała Ojcu opuszcza się we Mszach za zmarłych oraz we Mszach okresowych (de Tempore) od I Niedzieli Męki Pańskiej do Wielkiego Czwartku włącznie. W Wigilię Paschalną kapłan ją odmawia.',
					en: 'The Glória Patri is omitted at Masses for the Dead and at Masses of the season (de Tempore) from the First Sunday of the Passion through Holy Thursday. It is said at the Easter Vigil.'
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
					en: 'The priest says the day’s prayer over the gifts in a low voice. Only its ending is heard aloud: Per ómnia sǽcula sæculórum.'
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
					en: 'The priest begins the Canon in a low voice, praying for the Church, the Pope and the bishop.'
				}
			},
			{
				id: 'memento-vivorum',
				title: 'Meménto (vivórum)',
				kind: 'text',
				text: 'ordinarium/memento-vivorum',
				note: {
					pl: 'W miejscu oznaczonym w mszale literami N. et N. kapłan zatrzymuje się, by polecić Bogu żywych. Może po cichu wymienić ich imiona.',
					en: 'At the place marked N. et N. in the missal, the priest pauses to pray for the living and may say their names quietly.'
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
					pl: 'Po konsekracji chleba kapłan przyklęka, podnosi Hostię, kładzie ją na korporale i ponownie przyklęka. Przy podniesieniu Hostii, a potem kielicha, usługujący dzwoni trzykrotnie lub nieprzerwanie, aż kapłan je opuści.',
					en: 'After consecrating the bread, the priest genuflects, raises the Host, sets it on the corporal and genuflects again. At each elevation, first of the Host and then of the chalice, the server rings the bell three times or continuously until the priest lowers it.'
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
					pl: 'Wspominając Mękę, Zmartwychwstanie i Wniebowstąpienie Chrystusa, kapłan ofiaruje Bogu Chleb życia i Kielich zbawienia. Czyni pięć znaków krzyża nad konsekrowanymi darami.',
					en: 'Recalling Christ’s Passion, Resurrection and Ascension, the priest offers God the Bread of life and the Chalice of salvation. In making this offering, the priest traces five signs of the cross over the consecrated gifts.'
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
					pl: 'Kapłan zwraca się do Boga, który przez Chrystusa stwarza te dobra, uświęca je, ożywia, błogosławi i nam ich udziela.',
					en: 'The priest addresses God, who through Christ creates these gifts, sanctifies them, gives them life, blesses them and gives them to us.'
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
					en: 'The priest prays in a low voice for deliverance from past, present, and future evils and breaks the Host. The closing words are said or sung aloud.'
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
					en: 'The priest drops the particle of the Host into the chalice and prays in a low voice.'
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
					pl: 'We Mszach za zmarłych pierwsze dwa wezwania kończą się słowami dona eis réquiem, a trzecie słowami dona eis réquiem sempitérnam.',
					en: 'At Masses for the Dead the first two invocations end with dona eis réquiem and the third with dona eis réquiem sempitérnam.'
				}
			},
			{
				id: 'qui-dixisti',
				title: 'Dómine Iesu Christe, qui dixísti',
				kind: 'text',
				text: 'ordinarium/qui-dixisti',
				note: {
					pl: 'Pierwsza z trzech cichych modlitw przed Komunią — o pokój dla Kościoła. We Mszy uroczystej po niej następuje pocałunek pokoju.',
					en: 'The priest prays for the peace of the Church. This is the first of three prayers he says in a low voice before Communion. At solemn Mass the kiss of peace follows it.'
				},
				when: {
					pl: 'We Mszach za zmarłych opuszcza się tę modlitwę i pocałunek pokoju.',
					en: 'At Masses for the Dead this prayer and the kiss of peace are omitted.'
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
					en: 'The priest genuflects, takes both halves of the Host and strikes his breast three times at Dómine, non sum dignus — the opening words a little louder, the rest in a low voice — and receives the Body of the Lord.'
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
					pl: 'Jeśli nikt z wiernych nie przystępuje do Komunii, kapłan pomija tę część.',
					en: 'If none of the faithful receive Communion, the priest omits this part.'
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
					en: 'The priest washes his fingers with wine and water and dries the chalice and vessels. The priest says this second prayer in a low voice to close the Communion rite.'
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
					pl: 'Po ostatniej modlitwie w dni powszednie Wielkiego Postu, z wyjątkiem Triduum, kapłan odmawia jeszcze modlitwę nad ludem (Orátio super pópulum).',
					en: 'At weekday Masses of Lent and Passiontide, except during the Triduum, the priest adds the prayer over the people (Orátio super pópulum) after the last Postcommunion.'
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
					pl: 'Gdy po Mszy następuje procesja liturgiczna, śpiewa się lub mówi Benedicámus Dómino. We Mszach za zmarłych kapłan lub diakon mówi albo śpiewa Requiéscant in pace, a odpowiedź brzmi Amen.',
					en: 'When a liturgical procession follows Mass, the dismissal is Benedicámus Dómino. At Masses for the Dead the priest or deacon says or sings Requiéscant in pace, and the response is Amen.'
				}
			},
			{
				id: 'placeat-tibi',
				title: 'Pláceat tibi',
				kind: 'text',
				text: 'ordinarium/placeat-tibi',
				note: {
					pl: 'Pochylony nad ołtarzem kapłan prosi po cichu, aby złożona ofiara podobała się Trójcy Świętej, i całuje ołtarz.',
					en: 'Bowed over the altar the priest asks in a low voice that the sacrifice may please the Holy Trinity, then kisses the altar.'
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
					pl: 'Po Benedicámus Dómino i po Requiéscant in pace opuszcza się końcowe błogosławieństwo.',
					en: 'The final blessing is omitted after Benedicámus Dómino and after Requiéscant in pace.'
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
					pl: 'Modlitwy te odmawia się po Mszy cichej.',
					en: 'These prayers are said after Low Mass.'
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
					pl: 'Po antyfonie kapłan prosi za grzeszników oraz o wolność i wywyższenie Kościoła. W 1930 roku Pius XI polecił odmawiać modlitwy po Mszy cichej o pokój i swobodę wyznawania wiary w Rosji.',
					en: 'After the antiphon the priest prays for sinners and for the freedom and exaltation of the Church. In 1930 Pius XI directed that the prayers after Low Mass be offered for peace and the freedom to practice the faith in Russia.'
				}
			},
			{
				id: 'sancte-michael',
				title: 'Sancte Míchaël',
				kind: 'text',
				text: 'orationes/sancte-michael',
				note: {
					pl: 'W modlitwie Leona XIII wierni proszą świętego Michała Archanioła o obronę przed złem.',
					en: 'In this prayer of Leo XIII, the faithful ask Saint Michael the Archangel to defend them against evil.'
				}
			},
			{
				id: 'cor-iesu',
				title: 'Cor Iesu sacratíssimum',
				kind: 'text',
				text: 'orationes/cor-iesu',
				note: {
					pl: 'Na zakończenie można trzykrotnie wezwać Najświętsze Serce Jezusa, prosząc o miłosierdzie.',
					en: 'These prayers may end with a threefold invocation of the Sacred Heart of Jesus, asking for mercy.'
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
