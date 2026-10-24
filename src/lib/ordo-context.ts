import type { Lang } from './i18n';
import { componentApplies, dayById, PROPER_DAYS } from './proprium';
import {
	announcedReadings,
	readingPayloadReady,
	type AnnouncedReading,
	type AnnouncementOwner
} from './reading-announcements';
import { validateLocalizedBody } from './localized-body';
import { resolveOrdoChoice } from './ordo-choice';
import { bindOrphans } from './polish';

// These describe the selected rite; they do not filter Ordinary prayers or
// replace the complete ceremonies which precede the Vigil Mass.
const VIGIL: Record<string, Record<Lang, string>> = {
	introibo: {
		pl: 'W Wigilię Paschalną opuszcza się modlitwy u stopni ołtarza oraz Aufer a nobis i Oramus te, Domine. Mszę muszą poprzedzać przepisane obrzędy Wigilii. Nie wolno odprawiać jej osobno. Ich pełne teksty nie są tu zamieszczone. Kyrie rozpoczyna się na końcu litanii, gdy celebrans podchodzi do ołtarza.',
		en: 'At the Easter Vigil, the prayers at the foot of the altar, Aufer a nobis, and Oramus te, Domine are omitted. The prescribed Vigil ceremonies must precede the Mass. It may not be celebrated separately. Their complete texts are not included here. The Kyrie begins at the end of the litany as the celebrant approaches the altar.'
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
		pl: 'W Wigilię Paschalną nie ma antyfony ofiarowania. Pozostają Dominus vobiscum, Oremus i zwykłe modlitwy ofiarowania.',
		en: 'At the Easter Vigil there is no Offertory antiphon. Dominus vobiscum, Oremus, and the usual offering prayers remain.'
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
		pl: 'W Wigilię Paschalną opuszcza się ostatnią Ewangelię. Po Placeat i błogosławieństwie wszyscy wracają do zakrystii.',
		en: 'The Last Gospel is omitted at the Easter Vigil. After the Placeat and blessing, all return to the sacristy.'
	},
	evangelium: {
		pl: 'W Wigilię Paschalną prosi się o błogosławieństwo przed Ewangelią i używa kadzidła, ale nie niesie się świateł. Pozostałe obrzędy odbywają się jak zwykle.',
		en: 'At the Easter Vigil the blessing before the Gospel is requested and incense is used, but no lights are carried. The other ceremonies are performed as usual.'
	},
	'munda-cor-meum': {
		pl: 'Przed Ewangelią Mszy Wigilii Paschalnej zachowuje się Munda cor meum oraz odrębną prośbę o błogosławieństwo i błogosławieństwo. W pokazanym wariancie bez diakona kapłan odmawia Munda po cichu. We Mszy uroczystej mówi ją diakon, a celebrans jej nie powtarza. Przy Ewangelii nie niesie się świateł, ale nie pomija się tego przygotowania.',
		en: 'Before the Gospel of the Easter Vigil Mass, Munda cor meum and the separate blessing request and blessing remain. In the priest-alone form shown here, the priest says Munda silently. At solemn Mass the deacon says it, and the celebrant does not repeat it. No lights are carried at the Gospel, but this preparation is not omitted.'
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

const PENTECOST_VIGIL: Record<string, Record<Lang, string>> = {
	credo: {
		pl: 'W Wigilię Zesłania Ducha Świętego Credo się nie odmawia.',
		en: 'The Creed is omitted at the Vigil of Pentecost.'
	}
};

const PALM: Record<string, Record<Lang, string>> = {
	'munda-cor-meum': {
		pl: 'Ten wpis dotyczy przygotowania do Pasji we Mszy Niedzieli Palmowej. Gdy kapłan wykonuje Pasję sam, odmawia Munda cor meum po cichu, po czym odmawia zwykłą odrębną prośbę o błogosławieństwo i błogosławieństwo. Gdy Pasję wykonują wyznaczeni duchowni mający co najmniej święcenia diakonatu, każdy z nich odmawia Munda półgłosem. Proszą następnie celebransa o odrębne błogosławieństwo dla nich. Sam wybór Mszy śpiewanej nie rozstrzyga, który wariant zachodzi. Ewangelia w poprzedzających Mszę obrzędach palm ma osobne przygotowanie, nie drugi wpis w tym miejscu Mszy.',
		en: 'This entry prepares for the Passion at the Palm Sunday Mass. When the priest delivers the Passion alone, he says Munda cor meum silently, followed by the usual separate blessing request and blessing. When appointed clergy who are at least deacons deliver the Passion, each says Munda in a low voice. They then request the celebrant’s separate blessing for them. Selecting sung Mass alone does not determine which form applies. The Gospel in the preceding palm ceremonies has its own preparation, not a second entry at this point of the Mass.'
	},
	evangelium: {
		pl: 'Przed Pasją zachowuje się Munda cor meum oraz właściwą dla wykonujących ją odrębną prośbę o błogosławieństwo i błogosławieństwo. Nie odmawia się Dominus vobiscum ani nie znaczy krzyżem księgi i siebie. Nie stosuje się tu zwykłego wprowadzenia do Ewangelii.',
		en: 'Before the Passion, Munda cor meum and the separate blessing request and blessing appropriate to its ministers remain. Dominus vobiscum is not said, and neither the book nor the reader is signed with the cross. The usual Gospel introduction does not apply here.'
	},
	'laus-tibi-christe': {
		pl: 'Po Pasji nie odpowiada się Laus tibi, Christe. Nie całuje się też księgi ani nie okadza celebransa.',
		en: 'After the Passion, Laus tibi, Christe is not answered. The book is not kissed and the celebrant is not incensed.'
	}
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
	if (mass === 'dominica-ii-passionis' && PALM[entry]) notes.push(PALM[entry][lang]);
	if (mass === 'vigilia-pentecostes' && PENTECOST_VIGIL[entry])
		notes.push(PENTECOST_VIGIL[entry][lang]);
	if (!notes.length) return undefined;
	// Polish guidance binds its one-letter words like the Ordo's own notes (lib/polish).
	return lang === 'pl' ? bindOrphans(notes.join(' ')) : notes.join(' ');
}

export interface AfterReadingContext {
	referenceOnly: boolean;
	reason: 'ordinary-only' | 'unconfirmed' | 'ordinary-reading' | 'passion';
	note?: string;
}

/** Fixed words remain readable until this selected reading is confirmed.
 * Reference display is not a claim that the rite omits its response. */
export function ordoResponseContext(
	entry: string,
	state: GospelPreparationState,
	readings: readonly AnnouncedReading[],
	owners: Record<string, AnnouncementOwner | undefined>,
	lex: unknown,
	lang: Lang
): AfterReadingContext | undefined {
	if (entry !== 'deo-gratias-epistolae' && entry !== 'laus-tibi-christe') return undefined;
	const reference = (reason: AfterReadingContext['reason'], note: string): AfterReadingContext => ({
		referenceOnly: true,
		reason,
		note: lang === 'pl' ? bindOrphans(note) : note
	});
	if (
		state.date &&
		state.mass === null &&
		!state.loading &&
		!state.failed &&
		!state.unwritten &&
		state.loadedMass === null &&
		state.loadedLanguage === null &&
		resolveOrdoChoice(state.date, 'none')
	)
		return reference(
			'ordinary-only',
			lang === 'pl'
				? 'Nie wybrano czytania. Pełny tekst odpowiedzi pokazano tylko do wglądu.'
				: 'No reading has been selected. The complete response is shown for reference only.'
		);
	const unconfirmed = () =>
		reference(
			'unconfirmed',
			lang === 'pl'
				? 'Wybrane czytanie nie jest jeszcze dostępne. Pełny tekst odpowiedzi pokazano tylko do wglądu.'
				: 'The selected reading is not yet available. The complete response is shown for reference only.'
		);
	if (!readingPayloadReady(state, lang) || !state.mass || !state.date) return unconfirmed();
	const readingRole = entry === 'deo-gratias-epistolae' ? 'epistola' : 'evangelium';
	const expected =
		dayById(state.mass)?.components.filter(
			(component) =>
				component.role === readingRole && componentApplies(component.condition, state.date)
		) ?? [];
	if (expected.length !== 1 || readings.length !== 1 || readings[0].key !== expected[0].text)
		return unconfirmed();
	try {
		validateLocalizedBody(readings[0], lang, lex);
		// The same checked owner/body contract supplies the displayed announcement.
		announcedReadings(readingRole, [...readings], owners);
	} catch {
		return unconfirmed();
	}
	if (
		readingRole === 'evangelium' &&
		state.mass === 'dominica-ii-passionis' &&
		readings[0].key === 'proprium/dominica-ii-passionis-evangelium'
	)
		return reference('passion', PALM['laus-tibi-christe'][lang]);
	return { referenceOnly: false, reason: 'ordinary-reading' };
}

export interface GospelPreparationState {
	date: string | null;
	mass: string | null;
	loadedMass: string | null;
	loadedLanguage: string | null;
	loading: boolean;
	failed: boolean;
	unwritten: boolean;
}

const GOSPEL_BLESSING_REQUIEMS = [
	'commemoratio-omnium-fidelium-defunctorum',
	'commemoratio-omnium-fidelium-defunctorum-missa-ii',
	'commemoratio-omnium-fidelium-defunctorum-missa-iii'
];

/** This fixed priest-alone preparation remains readable even when omitted.
 * Unsettled choices are not evidence of its present applicability. */
export function ordoBlessingContext(
	entry: string,
	state: GospelPreparationState,
	lang: Lang
): { referenceOnly: boolean; note?: string } | undefined {
	if (entry !== 'iube-domine-benedicere') return undefined;
	// Polish guidance binds its one-letter words like the Ordo's own notes (lib/polish).
	const guidance = (pl: string, en: string) => (lang === 'pl' ? bindOrphans(pl) : en);
	if (
		!state.date ||
		state.loading ||
		state.failed ||
		state.unwritten ||
		(state.mass !== null &&
			(!dayById(state.mass) || state.loadedMass !== state.mass || state.loadedLanguage !== lang))
	)
		return {
			referenceOnly: true,
			note: guidance(
				'Nie potwierdzono formularza Mszy dla tego miejsca. Prośbę o błogosławieństwo i błogosławieństwo pokazano tylko do wglądu. We Mszach za zmarłych opuszcza się obie części. Poza nimi ten tekst dotyczy kapłana odprawiającego bez diakona i subdiakona.',
				'The Mass formulary at this point has not been confirmed. The blessing request and blessing are shown for reference only. Both parts are omitted at Masses for the Dead. Otherwise this text is for the priest celebrating without a deacon and subdeacon.'
			)
		};
	if (state.mass === null)
		return {
			referenceOnly: false,
			note: guidance(
				'Pokazano kompletne części stałe Mszy bez wybranego formularza. Ta prośba i błogosławieństwo należą do wariantu bez diakona i subdiakona, z wyjątkiem Mszy za zmarłych. Sam wybór Mszy śpiewanej nie rozstrzyga o obecności tych posługujących.',
				'The complete Ordinary is shown without a selected formulary. This request and blessing belong to the form without a deacon and subdeacon, except at Masses for the Dead. Selecting sung Mass alone does not determine whether these ministers are present.'
			)
		};
	if (GOSPEL_BLESSING_REQUIEMS.includes(state.mass))
		return {
			referenceOnly: true,
			note: guidance(
				'Wybrano Mszę za zmarłych. Opuszcza się prośbę o błogosławieństwo i następującą po niej modlitwę. Cały tekst zachowano tu tylko do wglądu. Odrębne Munda cor meum wraz ze swoim zakończeniem pozostaje.',
				'A Mass for the Dead is selected. The blessing request and the following prayer are omitted. The complete text is retained here for reference only. The separate Munda cor meum and its own conclusion remain.'
			)
		};
	return { referenceOnly: false };
}

/** A retained reference has no active silent-run, folding or aside instruction.
 * With referenceOnly false this is the existing Ordo visibility truth table. */
export function ordoEntryVisibility(referenceOnly: boolean, wantsWords: boolean, opened: boolean) {
	const words = referenceOnly || wantsWords;
	return {
		words,
		silent: !words,
		folded: !words && !opened,
		revealed: !words && opened
	};
}

/** These complete alternatives describe possible ministers, never their presence.
 * Keys must come from the current validated payload's first-Gospel slot.
 * The catalogue-role check below is a sanity check, not independent proof
 * that a key belongs to this selected Mass or its delivered payload. */
export function ordoMinisterBlessingContext(
	entry: string,
	state: GospelPreparationState,
	gospelKeys: readonly string[],
	lang: Lang
): { referenceOnly: true; note: string } | undefined {
	const palm = entry === 'iube-domne-benedicere-in-passione';
	if (!palm && entry !== 'iube-domne-benedicere') return undefined;
	const reference =
		lang === 'pl'
			? 'Cały tekst pokazano tylko do wglądu.'
			: 'The complete text is shown for reference only.';
	const result = (pl: string, en: string) => ({
		referenceOnly: true as const,
		// Polish guidance binds its one-letter words like the Ordo's own notes (lib/polish).
		note: lang === 'pl' ? bindOrphans(pl + ' ' + reference) : en + ' ' + reference
	});
	const unconfirmed = () =>
		result(
			'Nie można jeszcze ustalić, czy ta forma przygotowania ma zastosowanie w wybranej Mszy.',
			'It is not yet clear whether this form of preparation applies to the selected Mass.'
		);
	if (!state.date || state.loading || state.failed || state.unwritten) return unconfirmed();
	if (state.mass === null) {
		if (
			!resolveOrdoChoice(state.date, 'none') ||
			state.loadedMass !== null ||
			state.loadedLanguage !== null
		)
			return unconfirmed();
		return palm
			? result(
					'Pokazano części stałe bez wybranego formularza. Ten wariant dotyczy Pasji Niedzieli Palmowej, nie dowolnej Ewangelii.',
					'The Ordinary is shown without a selected formulary. This form belongs to the Palm Sunday Passion, not to any Gospel.'
				)
			: result(
					'Pokazano części stałe bez wybranego formularza. Ten wariant dotyczy Ewangelii z udziałem diakona, z wyjątkiem Mszy za zmarłych.',
					'The Ordinary is shown without a selected formulary. This form is for the Gospel with a deacon, except at Masses for the Dead.'
				);
	}
	if (
		resolveOrdoChoice(state.date, state.mass)?.mass !== state.mass ||
		state.loadedMass !== state.mass ||
		state.loadedLanguage !== lang ||
		gospelKeys.length !== 1 ||
		!gospelKeys[0] ||
		!PROPER_DAYS.some((day) =>
			day.components.some(
				(component) => component.role === 'evangelium' && component.text === gospelKeys[0]
			)
		)
	)
		return unconfirmed();
	if (GOSPEL_BLESSING_REQUIEMS.includes(state.mass))
		return result(
			'We Mszy za zmarłych opuszcza się prośbę o błogosławieństwo i błogosławieństwo. Munda cor meum wraz ze swoim zakończeniem pozostaje. Wariant dla wykonujących Pasję nie jest przygotowaniem do tej Mszy.',
			'At Masses for the Dead, the blessing request and blessing are omitted. Munda cor meum and its own conclusion remain. The Passion ministers’ form is not preparation for this Mass.'
		);
	const passion =
		state.mass === 'dominica-ii-passionis' &&
		gospelKeys[0] === 'proprium/dominica-ii-passionis-evangelium';
	if (passion)
		return palm
			? result(
					'Ewangelią tej Mszy jest Pasja Niedzieli Palmowej. Ten wariant dotyczy jej śpiewu przez uprawnionych duchownych, jeśli są obecni.',
					'The Gospel of this Mass is the Palm Sunday Passion. This form is for its singing by qualified ministers, if present.'
				)
			: result(
					'Ewangelią tej Mszy jest Pasja Niedzieli Palmowej. Jeśli wykonują ją wyznaczeni duchowni, otrzymują osobne błogosławieństwo w liczbie mnogiej. Kapłan wykonujący Pasję sam ma własne przygotowanie.',
					'The Gospel of this Mass is the Palm Sunday Passion. If appointed ministers deliver it, they receive the separate plural blessing. The priest delivering the Passion alone has his own preparation.'
				);
	if (palm)
		return result(
			'Ewangelią tej Mszy nie jest Pasja Niedzieli Palmowej. Ten wariant nie ma tu zastosowania.',
			'The Gospel of this Mass is not the Palm Sunday Passion. This form does not apply here.'
		);
	if (state.mass === 'vigilia-paschalis')
		return result(
			'Przed Ewangelią Mszy Wigilii Paschalnej zachowuje się zwykłe przygotowanie. Jeśli wykonuje ją diakon, prosi o błogosławieństwo. Nie niesie się świateł, ale nie opuszcza się z tego powodu prośby i błogosławieństwa.',
			'The usual preparation remains before the Easter Vigil Mass Gospel. If a deacon delivers it, he requests the blessing. No lights are carried, but this does not omit the request and blessing.'
		);
	return result(
		'To przygotowanie dotyczy diakona wykonującego Ewangelię, jeśli jest obecny.',
		'This preparation is for a deacon proclaiming the Gospel, if one is present.'
	);
}
