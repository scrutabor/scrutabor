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
 * `submissa` is the raised-but-not-full voice the rubrics call *elata
 * aliquantulum voce*: the first Dómine non sum dignus, the opening words
 * of Nobis quoque and of Orate fratres, where the priest lets the server
 * hear him and then drops back into silence.
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
		label: { pl: 'Modlitwy u stopni ołtarza', en: 'prayers at the foot of the altar' },
		part: 'praeparatio',
		entries: [
			{
				id: 'introibo',
				title: 'Introíbo ad altáre Dei',
				kind: 'text',
				text: 'ordinarium/introibo',
				note: {
					pl: 'Kapłan staje u stopni ołtarza, żegna się i mówi pierwsze słowa Mszy — na ołtarz jeszcze nie wstępuje.',
					en: 'The priest stands at the foot of the altar, signs himself and says the first words of the Mass — he has not gone up yet.'
				}
			},
			{
				id: 'iudica-me',
				title: 'Psalmus Júdica me',
				kind: 'text',
				text: 'ordinarium/iudica-me',
				note: {
					pl: 'Psalm 42 odmawiany na przemian z ministrantem, zakończony Chwała Ojcu i powtórzoną antyfoną.',
					en: 'Psalm 42, said in alternation with the server, closed by the Glória Patri and the antiphon again.'
				},
				when: {
					pl: 'opuszcza się w okresie Męki Pańskiej i we Mszach za zmarłych — wraz z doksologią i powtórzoną antyfoną',
					en: 'omitted in Passiontide and at Masses for the Dead — with its doxology and the repeated antiphon'
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
					pl: 'Ministranci odpowiadają mu tą samą modlitwą w liczbie pojedynczej — bez Indulgéntiam, które należy tylko do kapłana.',
					en: 'The servers answer him with the same prayer in the singular — without the Indulgéntiam, which is the priest\u2019s alone.'
				}
			},
			{
				id: 'confiteor',
				title: 'Confíteor (Ministrórum)',
				kind: 'text',
				text: 'ordinarium/confiteor',
				note: {
					pl: 'Spowiedź powszechna pada dwa razy: najpierw mówi ją kapłan, potem ministranci i wierni, a po każdej następuje Misereátur — po drugiej jeszcze Indulgéntiam.',
					en: 'The general confession is said twice: first by the priest, then by the servers and the faithful, each followed by the Misereátur — and the second by the Indulgéntiam as well.'
				}
			},
			{
				id: 'misereatur',
				title: 'Misereátur',
				kind: 'text',
				text: 'ordinarium/misereatur',
				note: {
					pl: 'Dwie modlitwy o przebaczenie po spowiedzi ministrantów: Misereátur i Indulgéntiam — prośby, nie rozgrzeszenie sakramentalne.',
					en: 'Two prayers for pardon after the servers\u0027 confession, the Misereátur and the Indulgéntiam — petitions, not sacramental absolution.'
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
		label: { pl: 'Msza katechumenów', en: 'mass of the catechumens' },
		part: 'catechumenorum',
		entries: [
			{
				id: 'introitus',
				title: 'Intróitus',
				kind: 'proper',
				note: {
					pl: 'Kapłan żegna się i po stronie lekcji czyta antyfonę na wejście z wersetem psalmu, Glória Patri i powtórzoną antyfoną — to pierwszy tekst z formularza dnia.',
					en: 'The priest signs himself and at the Epistle side reads the Introit antiphon with its psalm verse, the Glória Patri and the antiphon again — the first text from the day’s proper.'
				}
			},
			{
				id: 'kyrie',
				title: 'Kýrie eléison',
				kind: 'text',
				text: 'ordinarium/kyrie',
				note: {
					pl: 'Kapłan wraca na środek ołtarza i odmawia z ministrantem na przemian dziewięć wezwań: trzy razy Kýrie, trzy Christe, trzy Kýrie.',
					en: 'The priest returns to the middle of the altar and alternates nine invocations with the server: Kýrie three times, Christe three times, Kýrie three times.'
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
					en: 'omitted in Advent, Pre-Lent and Lent and at Masses for the Dead, and returns on the feasts of those seasons'
				}
			},
			{
				id: 'collecta',
				title: 'Orátio',
				kind: 'proper',
				note: {
					pl: 'Kapłan pozdrawia wiernych, wzywa Orémus i odmawia modlitwę dnia — czasem kilka, gdy przypadają wspomnienia — a każdą zamyka Amen.',
					en: 'The priest greets the people, calls Orémus and says the day’s prayer — sometimes several, when commemorations fall — each closed by the Amen.'
				}
			},
			{
				id: 'epistola',
				title: 'Epístola',
				kind: 'proper',
				note: {
					pl: 'Po stronie lekcji kapłan czyta lekcję dnia.',
					en: 'At the Epistle side the priest reads the day’s reading.'
				}
			},
			{
				id: 'deo-gratias-epistolae',
				title: 'Deo grátias',
				kind: 'text',
				text: 'ordinarium/deo-gratias-epistolae',
				note: {
					pl: 'Po zakończeniu Epistoły ministrant odpowiada.',
					en: 'The server answers at the end of the Epistle.'
				}
			},
			{
				id: 'graduale',
				title: 'Graduále, Allelúia, Tractus',
				kind: 'proper',
				note: {
					pl: 'Śpiew między czytaniami, wzięty z formularza dnia. We Mszy recytowanej kapłan czyta go na głos po stronie lekcji.',
					en: 'The chant between the readings, taken from the day’s proper. At low Mass the priest reads it aloud at the Epistle side.'
				},
				when: {
					pl: 'od Siedemdziesiątnicy do Wielkanocy zamiast Allelúia śpiewa się traktus, a w kilka dni roku dochodzi sekwencja',
					en: 'from Septuagesima to Easter the Tract replaces the Allelúia, and on a few days of the year a Sequence is added'
				}
			},
			{
				id: 'evangelium',
				title: 'Evangélium',
				kind: 'proper',
				note: {
					pl: 'Mszał przenosi się na stronę Ewangelii i wszyscy wstają. Kapłan po cichej modlitwie Munda cor meum znaczy krzyżem księgę oraz własne czoło, usta i piersi.',
					en: 'The missal is carried to the Gospel side and all stand. After the silent Munda cor meum the priest signs the book and his own forehead, lips and breast.'
				}
			},
			{
				id: 'laus-tibi-christe',
				title: 'Laus tibi, Christe',
				kind: 'text',
				text: 'ordinarium/laus-tibi-christe',
				note: {
					pl: 'Po zakończeniu Ewangelii ministrant odpowiada.',
					en: 'The server answers at the end of the Gospel.'
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
		label: { pl: 'Ofiarowanie', en: 'the offertory' },
		part: 'fidelium',
		entries: [
			{
				id: 'offertorium',
				title: 'Offertórium',
				kind: 'proper',
				note: {
					pl: 'Kapłan pozdrawia wiernych, wzywa Orémus i czyta antyfonę ofiarowania z formularza dnia, po czym odsłania kielich.',
					en: 'The priest greets the people, calls Orémus and reads the day’s Offertory antiphon, then uncovers the chalice.'
				}
			},
			{
				id: 'suscipe-sancte-pater',
				title: 'Súscipe, sancte Pater',
				kind: 'text',
				text: 'ordinarium/suscipe-sancte-pater',
				note: {
					pl: 'Kapłan unosi patenę z hostią i ofiaruje ją po cichu — pierwsza z trzech modlitw nad darami.',
					en: 'The priest raises the paten with the host and offers it silently — the first of three prayers over the gifts.'
				}
			},
			{
				id: 'deus-qui-humanae',
				title: 'Deus, qui humánæ substántiæ',
				kind: 'text',
				text: 'ordinarium/deus-qui-humanae',
				note: {
					pl: 'Do wina dolewa się kropla wody. Modlitwa nad nią jest starą kolektą Bożego Narodzenia.',
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
					pl: 'Kapłan unosi kielich i ofiaruje go tymi samymi słowami, w liczbie mnogiej.',
					en: 'The priest raises the chalice and offers it in the same words, now in the plural.'
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
					pl: 'Chwały Ojcu nie odmawia się we Mszach za zmarłych ani w okresie Męki Pańskiej',
					en: 'the Glória Patri is omitted at Masses for the Dead and in Passiontide'
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
					pl: 'Kapłan odwraca się i prosi o modlitwę. Ministrant odpowiada za wszystkich, wyliczając cel ofiary.',
					en: 'The priest turns and asks for prayer. The server answers for everyone, naming what the sacrifice is for.'
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
		label: { pl: 'Kanon', en: 'the canon' },
		part: 'fidelium',
		entries: [
			{
				id: 'praefatio-dialogus',
				title: 'Sursum corda',
				kind: 'text',
				text: 'ordinarium/praefatio-dialogus',
				note: {
					pl: 'Dialog, którym zaczyna się prefacja — kapłan rozkłada ręce i podnosi je przy „Sursum corda”.',
					en: 'The dialogue that opens the preface — the priest spreads his hands and raises them at Sursum corda.'
				}
			},
			{
				id: 'praefatio-communis',
				title: 'Præfátio commúnis',
				kind: 'text',
				text: 'ordinarium/praefatio-communis',
				note: {
					pl: 'Prefacja wspólna: najkrótsza z rzymskich, nie nazywa żadnej tajemnicy i prowadzi wprost do chórów anielskich.',
					en: 'The common preface: the shortest of the Roman ones, naming no mystery and leading straight to the choirs of angels.'
				},
				when: {
					pl: 'w wiele dni roku ustępuje prefacji własnej albo okresowej',
					en: 'on many days a proper or seasonal preface takes its place'
				}
			},
			{
				id: 'sanctus',
				title: 'Sanctus',
				kind: 'text',
				text: 'ordinarium/sanctus',
				note: {
					pl: 'Ostatnie słowa prefacji przechodzą wprost w Sanctus. Zaraz po nim zaczyna się cichy Kanon.',
					en: 'The Preface runs straight into the Sanctus. The silent Canon begins the moment it ends.'
				}
			},
			{
				id: 'te-igitur',
				title: 'Te ígitur',
				kind: 'text',
				text: 'ordinarium/te-igitur',
				note: {
					pl: 'Kanon zaczyna się po cichu: modlitwa za Kościół, papieża i biskupa.',
					en: 'The Canon begins in silence: the prayer for the Church, the Pope and the bishop.'
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
					en: 'The list of saints: Mary, twelve apostles and twelve Roman martyrs. John XXIII added St Joseph here in 1962.'
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
					pl: 'Konsekracja chleba. Kapłan przyklęka, unosi Hostię, przyklęka znowu. Ministrant dzwoni przy każdym geście.',
					en: 'The consecration of the bread. The priest genuflects, raises the Host, genuflects again. The bell rings at each.'
				}
			},
			{
				id: 'simili-modo',
				title: 'Símili modo',
				kind: 'text',
				text: 'ordinarium/simili-modo',
				note: {
					pl: 'Konsekracja kielicha, tymi samymi gestami.',
					en: 'The consecration of the chalice, with the same gestures.'
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
					en: 'The sacrifices of Abel, Abraham and Melchisedech recalled — three offerings older than the Law.'
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
					pl: 'Na te trzy słowa kapłan podnosi głos, uderza się w piersi i wymienia siedem świętych kobiet.',
					en: 'The priest raises his voice for these three words, striking his breast, and names seven women among the saints.'
				}
			},
			{
				id: 'per-quem-haec-omnia',
				title: 'Per quem hæc ómnia',
				kind: 'text',
				text: 'ordinarium/per-quem-haec-omnia',
				note: {
					pl: 'Krótka modlitwa, w której miejscu dawniej błogosławiono oleje i płody ziemi.',
					en: 'A short prayer, at whose place the oils and the fruits of the earth were once blessed.'
				}
			},
			{
				id: 'per-ipsum',
				title: 'Per ipsum',
				kind: 'text',
				text: 'ordinarium/per-ipsum',
				note: {
					pl: 'Małe podniesienie zamyka Kanon. Dopiero Per ómnia sǽcula sæculórum słychać na głos.',
					en: 'The minor elevation closes the Canon. Only the Per ómnia sǽcula sæculórum is heard aloud.'
				}
			}
		]
	},
	{
		id: 'communio',
		title: 'Commúnio',
		label: { pl: 'Komunia', en: 'communion' },
		part: 'fidelium',
		entries: [
			{
				id: 'pater-noster',
				title: 'Pater noster',
				kind: 'text',
				text: 'ordinarium/pater-noster',
				note: {
					pl: 'Modlitwę Pańską kapłan śpiewa lub mówi, a ministrant odpowiada Sed líbera nos a malo. We Mszy czytanej lud może odmówić z nim całą modlitwę.',
					en: 'The priest sings or says the Lord’s Prayer and the server answers Sed líbera nos a malo. At low Mass the people may say the whole prayer with him.'
				}
			},
			{
				id: 'libera-nos',
				title: 'Líbera nos',
				kind: 'text',
				text: 'ordinarium/libera-nos',
				note: {
					pl: 'Po cichu kapłan rozwija ostatnią prośbę — od zła przeszłego, obecnego i przyszłego — a w trakcie niej łamie Hostię na trzy części. Głośno wraca dopiero na zakończenie.',
					en: 'Silently the priest opens out the last petition — evil past, present and to come — and during it breaks the Host into three. The priest’s voice returns only for the ending.'
				}
			},
			{
				id: 'pax-domini',
				title: 'Pax Dómini',
				kind: 'text',
				text: 'ordinarium/pax-domini',
				note: {
					pl: 'Trzymając odłamaną cząstkę, kapłan trzy razy znaczy nią kielich i pozdrawia lud: Pax Dómini sit semper vobíscum.',
					en: 'Holding the broken particle, the priest signs the chalice with it three times and greets the people: Pax Dómini sit semper vobíscum.'
				}
			},
			{
				id: 'haec-commixtio',
				title: 'Hæc commíxtio',
				kind: 'text',
				text: 'ordinarium/haec-commixtio',
				note: {
					pl: 'Cząstka wpada do kielicha. Słowa, które temu towarzyszą, kapłan mówi po cichu.',
					en: 'The particle falls into the chalice. The words that go with it the priest says silently.'
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
					en: 'The first of three silent prayers before Communion, for the peace of the Church. At Solemn Mass the kiss of peace follows it.'
				},
				when: {
					pl: 'we Mszach za zmarłych opuszcza się ją wraz z pozdrowieniem pokoju',
					en: 'at Masses for the Dead it is omitted, and so is the peace'
				}
			},
			{
				id: 'fili-dei-vivi',
				title: 'Dómine Iesu Christe, Fili Dei vivi',
				kind: 'text',
				text: 'ordinarium/fili-dei-vivi',
				note: {
					pl: 'Druga: aby Komunia uwolniła kapłana od win i nigdy nie pozwoliła mu odłączyć się od Chrystusa.',
					en: 'The second: that Communion may free the priest from his sins and never let him be parted from Christ.'
				}
			},
			{
				id: 'perceptio-corporis',
				title: 'Percéptio Córporis tui',
				kind: 'text',
				text: 'ordinarium/perceptio-corporis',
				note: {
					pl: 'Trzecia: aby przyjęcie Ciała Pańskiego nie obróciło się w sąd, lecz stało się lekarstwem.',
					en: 'The third: that receiving the Lord’s Body may not turn to judgement but be a remedy.'
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
					en: 'The priest uncovers the chalice, gathers any fragments onto the paten, signs himself with the chalice and receives the Blood of the Lord.'
				}
			},
			{
				id: 'ecce-agnus-dei',
				title: 'Ecce Agnus Dei',
				kind: 'text',
				text: 'ordinarium/ecce-agnus-dei',
				note: {
					pl: 'Kapłan ukazuje Hostię: Ecce Agnus Dei. Trzy razy powtarza się Dómine, non sum dignus, po czym rozdaje Komunię przy balaskach, mówiąc każdemu Corpus Dómini nostri Iesu Christi.',
					en: 'The priest shows the Host: Ecce Agnus Dei. Dómine, non sum dignus is said three times, and he gives Communion at the rail with Corpus Dómini nostri Iesu Christi to each.'
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
					pl: 'Ministrant wlewa wino do kielicha. Kapłan oczyszcza go i spożywa ablucję.',
					en: 'The server pours wine into the chalice. The priest purifies it and consumes the ablution.'
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
				id: 'postcommunio',
				title: 'Postcommúnio',
				kind: 'proper',
				note: {
					pl: 'Kapłan całuje ołtarz, pozdrawia wiernych i wraca na stronę lekcji po modlitwę końcową — tyle modlitw, ile było kolekt.',
					en: 'The priest kisses the altar, greets the people and returns to the Epistle side for the closing prayer — as many prayers as there were collects.'
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
					pl: 'Kapłan zwraca się do ludu i odsyła go słowami Ite, missa est. Ministrant odpowiada Deo grátias.',
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
					en: 'The priest raises his eyes, extends his hands and blesses the people with one sign of the cross.'
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
					en: 'At the Gospel side the priest reads the prologue of St John. At Et Verbum caro factum est everyone genuflects.'
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
