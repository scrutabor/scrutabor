import type { Lang } from './i18n';

// These describe the selected rite; they do not filter Ordinary prayers or
// replace the complete ceremonies which precede the Vigil Mass.
const VIGIL: Record<string, Record<Lang, string>> = {
	introibo: {
		pl: 'W Wigilię Paschalną opuszcza się modlitwy u stopni ołtarza oraz Aufer a nobis i Oramus te, Domine. Mszę muszą poprzedzać przepisane obrzędy Wigilii; nie wolno odprawiać jej osobno. Ich pełne teksty nie są tu zamieszczone. Kyrie rozpoczyna się na końcu litanii, gdy celebrans podchodzi do ołtarza.',
		en: 'At the Easter Vigil, the prayers at the foot of the altar, Aufer a nobis, and Oramus te, Domine are omitted. The prescribed Vigil ceremonies must precede the Mass; it may not be celebrated separately. Their complete texts are not included here. The Kyrie begins at the end of the litany as the celebrant approaches the altar.'
	},
	'aufer-a-nobis': {
		pl: 'W Wigilię Paschalną opuszcza się Aufer a nobis i Oramus te, Domine wraz z modlitwami u stopni ołtarza.',
		en: 'At the Easter Vigil, Aufer a nobis and Oramus te, Domine are omitted with the prayers at the foot of the altar.'
	},
	'iudica-me': {
		pl: 'W Wigilię Paschalną opuszcza się Psalm Iudica me wraz ze wszystkimi modlitwami u stopni ołtarza.',
		en: 'At the Easter Vigil, Psalm Iudica me is omitted with all the prayers at the foot of the altar.'
	},
	adiutorium: {
		pl: 'W Wigilię Paschalną opuszcza się ten werset i odpowiedź wraz z modlitwami u stopni ołtarza.',
		en: 'At the Easter Vigil, this versicle and response are omitted with the prayers at the foot of the altar.'
	},
	'confiteor-sacerdotis': {
		pl: 'W Wigilię Paschalną opuszcza się Confiteor kapłana wraz z modlitwami u stopni ołtarza.',
		en: 'At the Easter Vigil, the priest’s Confiteor is omitted with the prayers at the foot of the altar.'
	},
	'misereatur-tui': {
		pl: 'W Wigilię Paschalną opuszcza się tę odpowiedź po Confiteor kapłana wraz z modlitwami u stopni ołtarza.',
		en: 'At the Easter Vigil, this response to the priest’s Confiteor is omitted with the prayers at the foot of the altar.'
	},
	confiteor: {
		pl: 'W Wigilię Paschalną opuszcza się Confiteor usługujących wraz z modlitwami u stopni ołtarza.',
		en: 'At the Easter Vigil, the servers’ Confiteor is omitted with the prayers at the foot of the altar.'
	},
	misereatur: {
		pl: 'W Wigilię Paschalną opuszcza się Misereatur i Indulgentiam wraz z modlitwami u stopni ołtarza.',
		en: 'At the Easter Vigil, Misereatur and Indulgentiam are omitted with the prayers at the foot of the altar.'
	},
	'deus-tu-conversus': {
		pl: 'W Wigilię Paschalną opuszcza się te końcowe wersety wraz z modlitwami u stopni ołtarza.',
		en: 'At the Easter Vigil, these final versicles are omitted with the prayers at the foot of the altar.'
	},
	introitus: {
		pl: 'W Wigilię Paschalną nie ma antyfony Introitu ani jej wersetu psalmu i Gloria Patri.',
		en: 'At the Easter Vigil, there is no Introit antiphon, psalm verse, or Gloria Patri.'
	},
	kyrie: {
		pl: 'W Wigilię Paschalną kantorzy rozpoczynają Kyrie na końcu litanii, gdy celebrans z usługującymi podchodzi do ołtarza. Po zakończeniu Kyrie przez chór celebrans intonuje Gloria.',
		en: 'At the Easter Vigil, the cantors begin the Kyrie at the end of the litany as the celebrant and ministers approach the altar. When the choir finishes the Kyrie, the celebrant intones the Gloria.'
	},
	credo: {
		pl: 'W Wigilię Paschalną Credo się nie odmawia.',
		en: 'The Creed is omitted at the Easter Vigil.'
	},
	offertorium: {
		pl: 'W Wigilię Paschalną nie ma antyfony ofiarowania; pozostają Dominus vobiscum, Oremus i zwykłe modlitwy ofiarowania.',
		en: 'At the Easter Vigil there is no Offertory antiphon; Dominus vobiscum, Oremus, and the usual offering prayers remain.'
	},
	'agnus-dei': {
		pl: 'W Wigilię Paschalną Agnus Dei się opuszcza.',
		en: 'The Agnus Dei is omitted at the Easter Vigil.'
	},
	communio: {
		pl: 'W Wigilię Paschalną nie ma antyfony na Komunię. Po Komunii i ablucjach następują laudesy.',
		en: 'At the Easter Vigil, there is no Communion antiphon. Lauds follows Communion and the ablutions.'
	},
	'qui-dixisti': {
		pl: 'W Wigilię Paschalną opuszcza się tę modlitwę i pocałunek pokoju, ale zachowuje się pozdrowienie Pax Domini oraz dwie pozostałe modlitwy przed Komunią.',
		en: 'At the Easter Vigil this prayer and the kiss of peace are omitted, but the Pax Domini greeting and the other two prayers before Communion remain.'
	},
	'evangelium-ultimum': {
		pl: 'W Wigilię Paschalną opuszcza się ostatnią Ewangelię; po Placeat i błogosławieństwie wszyscy wracają do zakrystii.',
		en: 'The Last Gospel is omitted at the Easter Vigil; after the Placeat and blessing, all return to the sacristy.'
	},
	evangelium: {
		pl: 'W Wigilię Paschalną prosi się o błogosławieństwo przed Ewangelią i używa kadzidła, ale nie niesie się świateł; pozostałe obrzędy odbywają się jak zwykle.',
		en: 'At the Easter Vigil the blessing before the Gospel is requested and incense is used, but no lights are carried; the other ceremonies are performed as usual.'
	},
	'ite-missa-est': {
		pl: 'W Wigilię rozesłanie śpiewa diakon lub sam kapłan.',
		en: 'At the Vigil the deacon or priest sings the dismissal.'
	}
};

const PASCHAL_DISMISSAL = {
	pl: 'W Wigilię Paschalną oraz we Mszach z cyklu roku liturgicznego (De Tempore) w oktawie Wielkanocy do Ite, missa est i Deo gratias dodaje się dwukrotne Alleluja.',
	en: 'At the Easter Vigil and at temporal Masses within the Easter octave, two Alleluias are added to Ite, missa est and Deo gratias.'
};

export function ordoContext(
	entry: string,
	mass: string | null,
	paschalDismissal: boolean,
	lang: Lang
): string | undefined {
	const notes: string[] = [];
	if (entry === 'ite-missa-est' && paschalDismissal) notes.push(PASCHAL_DISMISSAL[lang]);
	if (mass === 'vigilia-paschalis' && VIGIL[entry]) notes.push(VIGIL[entry][lang]);
	return notes.length ? notes.join(' ') : undefined;
}
