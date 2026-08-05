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

const ORDO_SOURCE: OrdoMovement[] = [
	{
		id: 'praeparatio',
		title: 'Præparátio',
		label: { pl: 'modlitwy u stopni ołtarza', en: 'prayers at the foot of the altar' },
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
					pl: 'odpada w okresie Męki Pańskiej i we Mszach żałobnych — wraz z doksologią i powtórzoną antyfoną',
					en: 'omitted in Passiontide and at Requiem Masses — with its doxology and the repeated antiphon'
				}
			},
			{
				id: 'adiutorium',
				title: 'Adjutórium nostrum',
				kind: 'text',
				text: 'ordinarium/adiutorium',
				note: {
					pl: 'Werset i odpowiedź; kapłan żegna się drugi raz i zaraz potem, głęboko pochylony, zaczyna spowiedź powszechną.',
					en: 'A versicle and its response; the priest signs himself a second time and, bowing low, begins the confession.'
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
					pl: 'Ostatnie wersety u stopni, mówione na przemian; zaraz po nich kapłan wstępuje na ołtarz.',
					en: 'The last versicles at the foot, said in alternation; immediately after them the priest goes up to the altar.'
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
		label: { pl: 'msza katechumenów', en: 'mass of the catechumens' },
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
					pl: 'Kapłan intonuje hymn anielski na środku ołtarza; we Mszy śpiewanej podejmuje go chór.',
					en: 'At the middle of the altar the priest intones the angelic hymn; at a sung Mass the choir takes it up.'
				},
				when: {
					pl: 'opuszcza się w Adwencie, Przedpościu i Wielkim Poście oraz we Mszach żałobnych, wraca w święta tych okresów',
					en: 'omitted in Advent, Pre-Lent and Lent and at Requiem Masses; it returns on the feasts of those seasons'
				}
			},
			{
				id: 'collecta',
				title: 'Orátio',
				kind: 'proper',
				note: {
					pl: 'Kapłan pozdrawia wiernych, wzywa Orémus i odmawia modlitwę dnia — czasem kilka, gdy przypadają wspomnienia; każdą zamyka Amen.',
					en: 'The priest greets the people, calls Orémus and says the day’s prayer — sometimes several, when commemorations fall — each closed by the Amen.'
				}
			},
			{
				id: 'epistola',
				title: 'Epístola',
				kind: 'proper',
				note: {
					pl: 'Kapłan czyta po stronie lekcji czytanie dnia; że się skończyło, poznać po odpowiedzi ministranta: Deo grátias.',
					en: 'At the Epistle side the priest reads the day’s reading; that it has ended you know from the server’s Deo grátias.'
				}
			},
			{
				id: 'graduale',
				title: 'Graduále, Allelúia, Tractus',
				kind: 'proper',
				note: {
					pl: 'Śpiew między czytaniami, wzięty z formularza dnia; we Mszy recytowanej kapłan czyta go na głos po stronie lekcji.',
					en: 'The chant between the readings, taken from the day’s proper; at low Mass the priest reads it aloud at the Epistle side.'
				},
				when: {
					pl: 'od Siedemdziesiątnicy do Wielkanocy zamiast Allelúia śpiewa się traktus; w kilka dni roku dochodzi sekwencja',
					en: 'from Septuagesima to Easter the Tract replaces the Allelúia; on a few days of the year a Sequence is added'
				}
			},
			{
				id: 'evangelium',
				title: 'Evangélium',
				kind: 'proper',
				note: {
					pl: 'Mszał przenosi się na stronę Ewangelii i wszyscy wstają; kapłan po cichej modlitwie Munda cor meum znaczy krzyżem księgę oraz własne czoło, usta i piersi.',
					en: 'The missal is carried to the Gospel side and all stand; after the silent Munda cor meum the priest signs the book and his own forehead, lips and breast.'
				}
			},
			{
				id: 'credo',
				title: 'Credo',
				kind: 'text',
				text: 'ordinarium/credo',
				note: {
					pl: 'Po Ewangelii, a w niedziele zwykle po kazaniu, kapłan intonuje wyznanie wiary; przy słowach o Wcieleniu wszyscy przyklękają.',
					en: 'After the Gospel — on Sundays usually after the sermon — the priest intones the profession of faith; all genuflect at the words of the Incarnation.'
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
		label: { pl: 'ofiarowanie', en: 'the offertory' },
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
					pl: 'Do wina dolewa się kropla wody; modlitwa nad nią jest starą kolektą Bożego Narodzenia.',
					en: 'A drop of water goes into the wine; the prayer said over it is an old Christmas collect.'
				},
				when: {
					pl: 'we Mszach żałobnych wody się nie błogosławi',
					en: 'at Requiem Masses the water is not blessed'
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
					pl: 'Chwała Ojcu odpada we Mszach żałobnych i w okresie Męki Pańskiej',
					en: 'the Glória Patri is omitted at Requiem Masses and in Passiontide'
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
					pl: 'Kapłan odwraca się i prosi o modlitwę; odpowiedź ministranta jest najdłuższą, jaka pada we Mszy.',
					en: 'The priest turns and asks for prayer; the server\u2019s answer is the longest in the whole Mass.'
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
		label: { pl: 'kanon', en: 'the canon' },
		part: 'fidelium',
		entries: [
			{
				id: 'praefatio',
				title: 'Præfátio',
				kind: 'proper',
				note: {
					pl: 'Dialog Sursum corda, a po nim uroczyste dziękczynienie śpiewane albo mówione na głos.',
					en: 'The Sursum corda dialogue, and after it the solemn thanksgiving, sung or said aloud.'
				},
				when: {
					pl: 'prefacja własna, gdy dzień ją ma; w przeciwnym razie prefacja okresu albo wspólna',
					en: 'the proper preface where the day has one; otherwise the seasonal preface, otherwise the common'
				}
			},
			{
				id: 'sanctus',
				title: 'Sanctus',
				kind: 'text',
				text: 'ordinarium/sanctus',
				note: {
					pl: 'Ostatnie słowa prefacji przechodzą wprost w Sanctus; zaraz po nim zaczyna się cichy Kanon.',
					en: 'The Preface runs straight into the Sanctus; the silent Canon begins the moment it ends.'
				}
			},
			{
				id: 'te-igitur',
				title: 'Te ígitur',
				kind: 'pending',
				note: {
					pl: 'Zaczyna się Kanon, odmawiany po cichu: modlitwa za Kościół, papieża i biskupa, wspomnienie żywych i świętych, a przy Hanc ígitur kapłan wyciąga ręce nad darami i dzwonek uprzedza o Przeistoczeniu.',
					en: 'The Canon begins, said silently: prayer for the Church, the Pope and the bishop, the remembrance of the living and of the saints, and at the Hanc ígitur the priest spreads his hands over the gifts while the bell warns that the Consecration is near.'
				}
			},
			{
				id: 'consecratio',
				title: 'Consecrátio',
				kind: 'pending',
				note: {
					pl: 'Kapłan powtarza słowa Chrystusa nad chlebem (Qui prídie), potem nad kielichem (Símili modo); po każdym przyklęka, unosi Postać w górę, a dzwonek dzwoni trzy razy.',
					en: 'The priest repeats Christ’s words over the bread (Qui prídie), then over the chalice (Símili modo); after each he genuflects and raises it for all to see, and the bell rings three times.'
				}
			},
			{
				id: 'unde-et-memores',
				title: 'Unde et mémores',
				kind: 'pending',
				note: {
					pl: 'Kapłan ofiaruje obecną już Ofiarę, przypomina ofiary Abla, Abrahama i Melchizedeka i prosi, by anioł zaniósł ją na ołtarz w niebie.',
					en: 'The priest offers the Victim now present, recalls the sacrifices of Abel, Abraham and Melchisedech, and asks that an angel carry it to the altar on high.'
				}
			},
			{
				id: 'memento-etiam',
				title: 'Meménto étiam',
				kind: 'pending',
				note: {
					pl: 'Kapłan wspomina zmarłych, milknie na chwilę, po czym uderza się w piersi i podnosi głos przy słowach Nobis quoque peccatóribus.',
					en: 'The priest remembers the dead, pauses in silence, then strikes his breast and raises his voice at the words Nobis quoque peccatóribus.'
				}
			},
			{
				id: 'per-ipsum',
				title: 'Per ipsum',
				kind: 'pending',
				note: {
					pl: 'Kapłan czyni Hostią pięć znaków krzyża — trzy nad kielichem, dwa przed nim — i unosi oba naczynia nieco nad ołtarz; to małe podniesienie zamyka Kanon, a Per ómnia sǽcula sæculórum i Amen słychać już na głos.',
					en: 'With the Host the priest makes five crosses — three over the chalice, two before it — and lifts both vessels a little above the altar; this minor elevation closes the Canon, and the Per ómnia sǽcula sæculórum with its Amen is heard aloud.'
				}
			}
		]
	},
	{
		id: 'communio',
		title: 'Commúnio',
		label: { pl: 'komunia', en: 'communion' },
		part: 'fidelium',
		entries: [
			{
				id: 'pater-noster',
				title: 'Pater noster',
				kind: 'pending',
				note: {
					pl: 'Modlitwę Pańską kapłan śpiewa lub mówi sam; ministrant włącza się dopiero na końcu: Sed líbera nos a malo.',
					en: 'The priest sings or says the Lord’s Prayer alone; the server joins only at the end: Sed líbera nos a malo.'
				}
			},
			{
				id: 'libera-nos',
				title: 'Líbera nos',
				kind: 'pending',
				note: {
					pl: 'Po cichu kapłan przedłuża ostatnią prośbę, łamie Hostię na trzy części, pozdrawia lud słowami Pax Dómini sit semper vobíscum i wpuszcza cząstkę do kielicha.',
					en: 'Silently the priest extends the last petition, breaks the Host into three, greets the people with Pax Dómini sit semper vobíscum and lets a particle fall into the chalice.'
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
					pl: 'we Mszach żałobnych zamiast miserére nobis mówi się dona eis réquiem',
					en: 'at Requiem Masses dona eis réquiem takes the place of miserére nobis'
				}
			},
			{
				id: 'communio-sacerdotis',
				title: 'Panem cæléstem accípiam',
				kind: 'pending',
				note: {
					pl: 'Po trzech cichych modlitwach — a we Mszy uroczystej i po pocałunku pokoju — kapłan trzy razy uderza się w piersi przy Dómine, non sum dignus i przyjmuje Ciało, a potem Krew Pańską.',
					en: 'After three silent prayers — and, at Solemn Mass, the kiss of peace — the priest strikes his breast three times at Dómine, non sum dignus and receives the Body, then the Blood of the Lord.'
				}
			},
			{
				id: 'communio-fidelium',
				title: 'Ecce Agnus Dei',
				kind: 'pending',
				note: {
					pl: 'Kapłan ukazuje Hostię, trzy razy powtarza się Dómine, non sum dignus, po czym rozdaje Komunię przy balaskach, mówiąc każdemu Corpus Dómini nostri Jesu Christi.',
					en: 'The priest shows the Host, Dómine, non sum dignus is said three times, and he gives Communion at the rail with Corpus Dómini nostri Jesu Christi to each.'
				},
				when: {
					pl: 'gdy wierni przystępują do Komunii',
					en: 'when the faithful receive Communion'
				}
			},
			{
				id: 'ablutiones',
				title: 'Quod ore súmpsimus',
				kind: 'pending',
				note: {
					pl: 'Kapłan oczyszcza kielich winem, obmywa palce winem z wodą i wyciera naczynia; dwie ciche modlitwy wypełniają tę przerwę.',
					en: 'The priest purifies the chalice with wine, washes his fingers with wine and water and wipes the vessels; two silent prayers fill the pause.'
				}
			}
		]
	},
	{
		id: 'conclusio',
		title: 'Conclúsio',
		label: { pl: 'zakończenie', en: 'the conclusion' },
		part: 'fidelium',
		entries: [
			{
				id: 'communio',
				title: 'Commúnio',
				kind: 'proper',
				note: {
					pl: 'Antyfona z formularza dnia, odczytana po stronie lekcji; we Mszy śpiewanej chór śpiewa ją już podczas rozdawania Komunii.',
					en: 'The day’s antiphon, read at the Epistle side; at a sung Mass the choir has already sung it during the distribution of Communion.'
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
				kind: 'pending',
				note: {
					pl: 'Kapłan wraca na środek, całuje ołtarz i zwrócony do wiernych odsyła ich; odpowiedź brzmi Deo grátias.',
					en: 'The priest returns to the middle, kisses the altar and, facing the people, dismisses them; the answer is Deo grátias.'
				},
				when: {
					pl: 'we Mszach żałobnych zamiast tego: Requiéscant in pace, z odpowiedzią Amen',
					en: 'at Requiem Masses instead: Requiéscant in pace, answered Amen'
				}
			},
			{
				id: 'placeat-tibi',
				title: 'Pláceat tibi',
				kind: 'pending',
				note: {
					pl: 'Pochylony nad ołtarzem kapłan po cichu prosi, by Bóg przyjął złożoną Ofiarę, i całuje ołtarz.',
					en: 'Bowed over the altar the priest silently asks God to accept the sacrifice offered, and kisses the altar.'
				}
			},
			{
				id: 'benedictio',
				title: 'Benedícat vos',
				kind: 'pending',
				note: {
					pl: 'Kapłan podnosi oczy i ręce, odwraca się do wiernych i błogosławi ich jednym znakiem krzyża.',
					en: 'The priest raises his eyes and hands, turns to the people and blesses them with a single sign of the cross.'
				},
				when: {
					pl: 'we Mszach żałobnych błogosławieństwa się nie udziela',
					en: 'at Requiem Masses no blessing is given'
				}
			},
			{
				id: 'evangelium-ultimum',
				title: 'In princípio',
				kind: 'pending',
				note: {
					pl: 'Kapłan przechodzi na stronę Ewangelii i czyta prolog św. Jana; na słowa Et Verbum caro factum est wszyscy przyklękają, a całość zamyka Deo grátias.',
					en: 'The priest goes to the Gospel side and reads the prologue of St John; all genuflect at Et Verbum caro factum est, and Deo grátias closes it.'
				},
				when: {
					pl: 'w trzeciej Mszy Bożego Narodzenia prolog jest już ewangelią dnia, więc na końcu czyta się ewangelię Objawienia',
					en: 'at the third Mass of Christmas the prologue is already the Gospel of the day, so the Epiphany Gospel is read at the end instead'
				}
			},
			{
				id: 'preces-leoninae',
				title: 'Preces Leonínæ',
				kind: 'pending',
				note: {
					pl: 'Kapłan klęka u stopni ołtarza i odmawia z wiernymi trzykrotne Ave María, Salve Regína z modlitwą, wezwanie do św. Michała i trzy razy Cor Jesu sacratíssimum.',
					en: 'The priest kneels at the foot of the altar and says with the people the Ave María three times, the Salve Regína with its prayer, the invocation of St Michael and Cor Jesu sacratíssimum three times.'
				},
				when: {
					pl: 'po Mszy recytowanej',
					en: 'after low Mass'
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
