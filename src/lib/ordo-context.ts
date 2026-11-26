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
		pl: 'W Wigilię Paschalną przed Ewangelią prosi się o błogosławieństwo i używa kadzidła. Do Ewangelii nie niesie się świec.',
		en: 'At the Easter Vigil the blessing is requested and incense is used as usual before the Gospel. No candles are carried for the Gospel.'
	},
	'munda-cor-meum': {
		pl: 'W Wigilię Paschalną kapłan głoszący Ewangelię bez diakona odmawia po cichu Munda cor meum, a potem prosi Boga o błogosławieństwo słowami Iube, Domine i odmawia Dominus sit in corde meo. We Mszy uroczystej Munda odmawia diakon, który następnie prosi celebransa o błogosławieństwo. Celebrans nie powtarza Munda. Do Ewangelii nie niesie się świec.',
		en: 'At the Easter Vigil, a priest who proclaims the Gospel without a deacon says Munda cor meum quietly, asks God for a blessing with Iube, Domine, and says Dominus sit in corde meo. At solemn Mass the deacon says Munda and then asks the celebrant for a blessing. The celebrant does not repeat Munda. No candles are carried for the Gospel.'
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
		pl: 'Gdy kapłan sam czyta lub śpiewa Pasję, po cichu odmawia Munda cor meum, prosi Boga o błogosławieństwo słowami Iube, Domine i odmawia Dominus sit in corde meo. Jeśli Pasję czytają lub śpiewają wyznaczeni duchowni mający co najmniej święcenia diakonatu, każdy z nich odmawia Munda półgłosem. Potem razem proszą celebransa o błogosławieństwo. Obie formy przygotowania są możliwe także we Mszy śpiewanej. Ewangelia przy poświęceniu palm przed Mszą ma własne przygotowanie.',
		en: 'When the priest reads or chants the Passion himself, he quietly says Munda cor meum, asks God for a blessing with Iube, Domine, and says Dominus sit in corde meo. If appointed clergy who are at least deacons read or chant the Passion, each says Munda in a low voice. They then ask the celebrant together for his blessing. Either form of preparation is possible at sung Mass. The Gospel at the blessing of palms before Mass has its own preparation.'
	},
	evangelium: {
		pl: 'Przed Pasją odmawia się Munda cor meum. Gdy kapłan sam czyta lub śpiewa Pasję, prosi Boga o błogosławieństwo. Wyznaczeni do Pasji duchowni proszą o nie celebransa. Nie odmawia się Dominus vobiscum. Czytający nie kreśli znaku krzyża ani na księdze, ani na sobie. Kapłan, który odprawia tego dnia drugą lub trzecią Mszę cichą, może zamiast powtarzać Pasję odczytać w zwykły sposób Ewangelię Mt 27, 45–52.',
		en: 'Before the Passion, those who read or chant it say Munda cor meum. A priest proclaiming the Passion himself asks God for a blessing. Appointed ministers ask the celebrant to bless them. Dominus vobiscum is not said. The reader makes no sign of the cross on the book or on himself. A priest celebrating a second or third Low Mass that day may read Matthew 27:45–52 in the usual manner instead of repeating the Passion.'
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
	if (entry === 'ite-missa-est' && mass === 'feria-v-in-cena-domini')
		notes.push(
			lang === 'pl'
				? 'Przed uroczystym przeniesieniem Najświętszego Sakramentu śpiewa się Benedicámus Dómino. Odpowiedź brzmi Deo grátias. W dozwolonej Mszy cichej kapłan mówi zwykłe Ite, missa est.'
				: 'Before the solemn transfer of the Blessed Sacrament the dismissal is sung as Benedicamus Domino. The response is Deo gratias. At a permitted Low Mass the priest says the usual Ite, missa est.'
		);
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
	if (ordinaryGuideReady(state))
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

/** A completed generic Ordinary is distinct from an unsettled selected occurrence.
 * This is the existing response-context predicate, shared without guessing intent. */
export function ordinaryGuideReady(state: GospelPreparationState): boolean {
	return !!(
		state.date &&
		state.mass === null &&
		!state.loading &&
		!state.failed &&
		!state.unwritten &&
		state.loadedMass === null &&
		state.loadedLanguage === null &&
		resolveOrdoChoice(state.date, 'none')
	);
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
				'Nie potwierdzono formularza wybranej Mszy. Obie modlitwy pokazano tylko do wglądu. Odmawia je kapłan odprawiający bez diakona i subdiakona, z wyjątkiem Mszy za zmarłych.',
				'The selected Mass formulary has not been confirmed. These two prayers are shown for reference only. A priest celebrating without a deacon and subdeacon says them except at Masses for the Dead.'
			)
		};
	if (state.mass === null)
		return {
			referenceOnly: false,
			note: guidance(
				'Pokazano części stałe bez wybranego formularza. Obie modlitwy odmawia kapłan odprawiający bez diakona i subdiakona, z wyjątkiem Mszy za zmarłych. Mszę śpiewaną można odprawiać także bez ich udziału.',
				'The Ordinary is shown without a selected formulary. A priest celebrating without a deacon and subdeacon says both prayers, except at Masses for the Dead. Sung Mass can also be celebrated without these ministers.'
			)
		};
	if (GOSPEL_BLESSING_REQUIEMS.includes(state.mass))
		return {
			referenceOnly: true,
			note: guidance(
				'We Mszy za zmarłych odmawia się Munda cor meum z zakończeniem Per Christum. Opuszcza się prośbę Iube, Domine i następującą po niej modlitwę Dominus sit in corde meo. Obie pokazano tu tylko do wglądu.',
				'At Masses for the Dead, Munda cor meum is said through its conclusion, Per Christum. The petition Iube, Domine and the prayer Dominus sit in corde meo that follows it are omitted. Both are shown here for reference only.'
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
					'Pokazano części stałe bez wybranego formularza. Tę formę błogosławieństwa stosuje się przy śpiewie lub czytaniu Pasji w Niedzielę Palmową.',
					'The Ordinary is shown without a selected formulary. This blessing is used when the Passion is chanted or read on Palm Sunday.'
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
			'We Mszach za zmarłych opuszcza się prośbę o błogosławieństwo i samo błogosławieństwo. Munda cor meum odmawia się z jego własnym zakończeniem.',
			'At Masses for the Dead, the request for a blessing and the blessing itself are omitted. Munda cor meum is said with its own conclusion.'
		);
	const passion =
		state.mass === 'dominica-ii-passionis' &&
		gospelKeys[0] === 'proprium/dominica-ii-passionis-evangelium';
	if (passion)
		return palm
			? result(
					'Przy czytaniu lub śpiewie Pasji to błogosławieństwo otrzymują wyznaczeni do niej duchowni.',
					'When the Passion is read or chanted, this blessing is for the appointed clergy who proclaim it.'
				)
			: result(
					'W Niedzielę Palmową duchowni wyznaczeni do Pasji otrzymują błogosławieństwo razem. Jeśli kapłan sam czyta lub śpiewa Pasję, prosi Boga o błogosławieństwo.',
					'On Palm Sunday the celebrant blesses the appointed ministers of the Passion together. If the priest reads or chants the Passion himself, he asks God for a blessing.'
				);
	if (palm)
		return result(
			'Tę formę błogosławieństwa stosuje się tylko w Niedzielę Palmową, podczas przygotowania do Pasji.',
			'This blessing is used only in preparation for the Palm Sunday Passion.'
		);
	if (state.mass === 'vigilia-paschalis')
		return result(
			'W Wigilię Paschalną diakon przed Ewangelią prosi celebransa o błogosławieństwo. Do Ewangelii nie niesie się świec.',
			'At the Easter Vigil a deacon who proclaims the Gospel first asks the celebrant for a blessing. No candles are carried for the Gospel.'
		);
	return result(
		'Tę prośbę wypowiada diakon, jeśli to on głosi Ewangelię.',
		'This petition is used when a deacon proclaims the Gospel.'
	);
}
