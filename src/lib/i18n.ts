// UI strings live here; corpus content lives in the gloss layers.
import { bindProse } from './polish';
import type { Season } from './proprium';
import type { ConstructionParticipleKind } from './word-construction';

export type Lang = 'pl' | 'en';

// English first, everywhere a language list renders (owner rule).
export const LANGS: Lang[] = ['en', 'pl'];

export interface Messages {
	langName: string;
	tagline: string;
	mottoRef: string;
	/** The colophon's word for an edition of the app. */
	edition: string;
	/** Accessible name for the compact home control inside the prayer book. */
	bookHome: string;
	/** The three reading modes, as the words the control shows: bare
	 * Latin, the word-by-word, the bilingual view. */
	levels: [string, string, string];
	levelsLabel: string;
	themeAria: { toLight: string; toDark: string };
	textSizeAria: string;
	textSizes: { normal: string; larger: string; largest: string };
	langMenuAria: string;
	searchLabel: string;
	searchTitle: string;
	searchClear: string;
	segmentSelect: string;
	segmentNarrow: string;
	segmentDeselect: string;
	segmentRangeHint: string;
	searchHint: string;
	searchLoading: string;
	searchNoResults: string;
	searchFailed: string;
	searchDegraded: string;
	searchRetry: string;
	searchTitles: string;
	searchContents: string;
	searchGrammar: string;
	searchMatchedAlias: string;
	searchCount: (n: number) => string;
	close: string;
	updateAvailable: string;
	updateReload: string;
	updateReloading: string;
	updateLater: string;
	updateStale: string;
	panelAria: string;
	constructionPanelAria: string;
	wordContextLabel: string;
	sharedGloss: (latin: string, target: string) => string;
	sharedConstruction: (latin: string, target: string) => string;
	auxiliaryParticipleConstruction: (
		auxiliary: string,
		participle: string,
		participleDescription: string,
		target: string
	) => string;
	constructionParticiple: Record<ConstructionParticipleKind, string>;
	zeroGloss: Record<'idiom' | 'inflection' | 'punctuation' | 'word-order', string>;
	wordEntryLabel: string;
	wordFormLabel: string;
	working: string;
	lemmaLoading: string;
	lemmaLoadFailed: string;
	lemmaPageHint: string;
	occurrences: string;
	externalDict: string;
	notFound: string;
	catalogDescription: string;
	editioDescription: string;
	bibliographyTitle: string;
	bibliographyPageTitle: string;
	bibliographyDescription: string;
	bibliographyLink: string;
	grammarDescription: string;
	pronunciationDescription: string;
	/** '{title}' is replaced with the text's Latin title. */
	readingDescription: string;
	pageNotFound: string;
	errorGeneric: string;
	goHome: string;
	aboutLabel: string;
	sourcesLabel: string;
	translationRelationshipLabel: string;
	translationRelationships: Record<
		'exact' | 'normalized' | 'revised' | 'traditional-composite',
		string
	>;
	pagerAria: string;
	ordoLead: string;
	ordoSubtitle: string;
	ordoDescription: string;
	ordoProper: string;
	dayLabel: string;
	/** The day-status icon and its sheet: which week, or why no texts. */
	dayStatusLabel: string;
	dayNone: string;
	dayLoading: string;
	dayFailed: string;
	/** A real day of the calendar whose Mass this edition has not written.
	 * A different absence from `dayFailed`: nothing went wrong. */
	dayUnwritten: string;
	/** Announced when the picked day's texts have landed in the page. */
	dayInPlace: string;
	dayPartial: string;
	dayAhead: string;
	dayWeekOf: string;
	/** What the day setting is doing, as the role and Mass hints do. */
	dayHint: Record<'none', string>;
	/** The modal date/formulary picker. Calendar knowledge and text
	 * availability are deliberately separate reader-facing states. */
	dayPicker: {
		title: string;
		open: string;
		calendarTab: string;
		listTab: string;
		today: string;
		previousMonth: string;
		nextMonth: string;
		searchLabel: string;
		searchPlaceholder: string;
		noResults: string;
		available: string;
		partial: string;
		unresolvedTitle: string;
		unresolvedText: string;
		unresolvedWeek: string;
		unwrittenTitle: string;
		unwrittenText: string;
		chooseVariant: string;
		openFormulary: string;
		openWithout: string;
		dateOnly: string;
	};
	/** The seasons of the year, for grouping the day picker. */
	seasons: Record<Season, string>;
	ordoPending: string;
	grammarTitle: string;
	grammarPageTitle: string;
	derivativesLabel: string;
	pronunciationHint: string;
	/** Who says a line, and how loudly (corpus 0.9.0). */
	speakers: Record<
		| 'sacerdos'
		| 'ductor'
		| 'minister'
		| 'populus'
		| 'omnes'
		| 'schola'
		| 'chronista'
		| 'christus'
		| 'synagoga',
		string
	>;
	/** What the red mark beside a line stands for, for a reader meeting it
	 * for the first time. Shown on hover; the abbreviation is Latin and the
	 * expansion names both the word and who says the line. */
	markTitle: Record<
		| 'sacerdos'
		| 'ductor'
		| 'minister'
		| 'populus'
		| 'omnes'
		| 'schola'
		| 'chronista'
		| 'christus'
		| 'synagoga',
		string
	>;
	/** The key to the marks, opened by tapping one. */
	markLegendTitle: string;
	markLegendNote: string;
	voices: Record<'submissa' | 'secreto' | 'cantus', string>;
	/** A verse number that cites its verse in the URL (the psalter). */
	verseAria: (n: number) => string;
	/** The reader's part at Mass, and the control that sets it. */
	roleLabel: string;
	roles: Record<'populus' | 'minister' | 'sacerdos', string>;
	/** Which kind of Mass the reader is at — the people's parts differ. */
	massLabel: string;
	massForms: Record<'cantu' | 'lecta', string>;
	/** Marks the responses EVERYONE makes, the first degree of the 1958
	 * instruction — the answer to a newcomer's real question. */
	everyone: string;
	/** A conditional faculty: available to the faithful, but not their
	 * unconditional response. */
	mayJoin: string;
	/** What the reader in the pew is called over their own lines. The
	 * corpus's own word for that speaker is `populus`, printed as lud; this
	 * is the word the picker uses, so that the setting and the page agree. */
	faithful: string;
	/** Reader-facing attribution when the faithful make a line whose
	 * rubrical speaker is someone else. Both truths remain visible. */
	faithfulWith: Record<
		| 'sacerdos'
		| 'ductor'
		| 'minister'
		| 'populus'
		| 'omnes'
		| 'schola'
		| 'chronista'
		| 'christus'
		| 'synagoga',
		string
	>;
	quietCollapsed: string;
	quietReveal: string;
	quietHide: string;
	quietAside: string;
	prayerFormsLabel: string;
	prayerFormShort: string;
	prayerFormLong: string;
	repeatedPrayerShow: string;
	repeatedPrayerHide: string;
}

const MESSAGES: Record<Lang, Messages> = {
	pl: {
		langName: 'Polski',
		tagline: 'Modlitwa po łacinie ze zrozumieniem',
		mottoRef: 'ps\u00a0118,\u00a034',
		edition: 'wydanie',
		bookHome: 'strona główna modlitewnika',
		levels: ['łaciński', 'interlinearny', 'dwujęzyczny'],
		levelsLabel: 'tryb',
		themeAria: { toLight: 'przełącz na tryb jasny', toDark: 'przełącz na tryb ciemny' },
		textSizeAria: 'wielkość pisma',
		textSizes: { normal: 'normalne', larger: 'większe', largest: 'największe' },
		langMenuAria: 'wybór języka',
		searchLabel: 'szukaj',
		searchTitle: 'Wyszukiwanie',
		searchClear: 'wyczyść wyszukiwanie',
		segmentSelect: 'wybierz ten werset',
		segmentNarrow: 'zawęź wybór do tego wersetu',
		segmentDeselect: 'usuń wybór tego wersetu',
		segmentRangeHint:
			'Wybrany werset można udostępnić z adresu strony. Shift z kliknięciem zaznacza zakres wersetów.',
		searchHint: 'Wpisz tytuł modlitwy, znany fragment albo łacińskie słowo.',
		searchLoading: 'szukam…',
		searchNoResults: 'Nie znaleziono pasujących miejsc.',
		searchFailed: 'Nie udało się przeszukać tego wydania.',
		searchDegraded:
			'Wyszukiwanie przekładu jest chwilowo niedostępne. Widać wyniki łacińskie i tytuły.',
		searchRetry: 'spróbuj ponownie',
		searchTitles: 'tytuły modlitw',
		searchContents: 'fragmenty tekstów',
		searchGrammar: 'gramatyka',
		searchMatchedAlias: 'znaleziono także jako',
		searchCount: (n) =>
			`Znaleziono ${n} ${
				n === 1
					? 'wynik'
					: n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
						? 'wyniki'
						: 'wyników'
			}.`,
		close: 'zamknij',
		updateAvailable: 'Nowa wersja jest gotowa.',
		updateReload: 'Wczytaj',
		updateReloading: 'Wczytywanie…',
		updateLater: 'później',
		updateStale:
			'Ta kopia nie może już pobrać swoich plików. Zastosuj aktualizację, aby czytać dalej.',
		panelAria: 'analiza słowa',
		constructionPanelAria: 'analiza konstrukcji',
		wordContextLabel: 'znaczenie w kontekście',
		sharedGloss: (latin, target) => `Słowa „${latin}” mają tu wspólny odpowiednik: „${target}”.`,
		sharedConstruction: (latin, target) =>
			`Wyrazy „${latin}” tworzą tu jedną całość znaczeniową, oddaną w przekładzie słowo po słowie jako „${target}”.`,
		auxiliaryParticipleConstruction: (auxiliary, participle, description, target) =>
			`${auxiliary} pełni tu funkcję czasownika posiłkowego, a ${participle} jest ${description}. Całe wyrażenie oddajemy po polsku jako „${target}”.`,
		constructionParticiple: {
			'future-active': 'imiesłowem czasu przyszłego',
			'perfect-passive': 'imiesłowem biernym czasu przeszłego',
			'perfect-deponent': 'imiesłowem czasu przeszłego czasownika deponującego',
			'future-passive': 'imiesłowem przyszłym strony biernej (gerundivum)',
			'present-active': 'imiesłowem teraźniejszym strony czynnej'
		},
		zeroGloss: {
			idiom:
				'Znaczenie tego słowa zawiera się tu w całym zwrocie. Nie ma ono osobnego polskiego odpowiednika.',
			inflection:
				'Znaczenie tego słowa wyraża tu forma sąsiedniego wyrazu. Nie ma ono osobnego polskiego odpowiednika.',
			punctuation:
				'Funkcję tego słowa oddaje tu interpunkcja. Nie ma ono osobnego polskiego odpowiednika.',
			'word-order':
				'Funkcję tego słowa oddaje tu szyk zdania. Nie ma ono osobnego polskiego odpowiednika.'
		},
		wordEntryLabel: 'hasło',
		wordFormLabel: 'forma',
		working: 'o wydaniu · wydanie robocze przed przeglądem eksperckim',
		lemmaLoading: 'Wczytywanie hasła…',
		lemmaLoadFailed: 'Nie udało się wczytać hasła.',
		lemmaPageHint: 'otwórz hasło',
		occurrences: 'w tekstach',
		externalDict: 'słownik zewnętrzny',
		notFound: 'Nie ma takiego hasła.',
		catalogDescription:
			'Modlitewnik łaciński z analizą słowo po słowie — przekład, gramatyka i wymowa każdego słowa.',
		editioDescription:
			'Jak powstaje to wydanie: świadkowie tekstu i ich kolacjonowanie, mechaniczna weryfikacja analiz, etapy przeglądu.',
		bibliographyTitle: 'bibliografia',
		bibliographyPageTitle: 'Bibliografia',
		bibliographyDescription:
			'Zweryfikowane łacińskie świadectwa tekstu, historyczne źródła przekładów i dokumenty liturgiczne Scrutabor.',
		bibliographyLink: 'pełna bibliografia',
		grammarDescription: 'Pojęcia gramatyki łacińskiej objaśnione na przykładach z modlitw.',
		pronunciationDescription:
			'Zasady wymowy łaciny kościelnej — tradycja rzymska i polska, z transkrypcją.',
		readingDescription:
			'{title} — tekst łaciński z analizą słowo po słowie, przekładem i objaśnieniami gramatycznymi.',
		pageNotFound: 'Ta strona nie istnieje.',
		errorGeneric: 'Wystąpił błąd.',
		goHome: 'wróć na stronę główną',
		aboutLabel: 'o modlitwie',
		sourcesLabel: 'źródła',
		translationRelationshipLabel: 'relacja z brzmieniem historycznym',
		translationRelationships: {
			exact: 'Brzmienie jest zgodne ze wskazanym świadectwem historycznym.',
			normalized:
				'Brzmienie zachowuje świadectwo historyczne po jawnej normalizacji pisowni lub interpunkcji.',
			revised:
				'Przekład został zredagowany bezpośrednio z łaciny z wykorzystaniem wskazanych świadectw historycznych.',
			'traditional-composite':
				'Brzmienie zachowuje znaną formułę tradycyjną, zestawioną z poświadczonych wariantów i jawnych modernizacji.'
		},
		pagerAria: 'sąsiednie teksty',
		ordoLead: 'Porządek Mszy świętej według Mszału Rzymskiego z 1962 roku',
		ordoSubtitle: 'Mszał Rzymski z 1962 roku',
		ordoDescription:
			'Cały porządek Mszy w rycie z 1962 roku, część po części — z tekstami stałymi i miejscami, w których wchodzą teksty własne dnia.',
		ordoProper: 'z formularza dnia',
		dayLabel: 'dzień',
		dayStatusLabel: 'o dniu',
		dayNone: 'bez formularza',
		dayLoading: 'wczytywanie',
		dayFailed: 'nie udało się wczytać',
		dayUnwritten: 'jeszcze nie w tym wydaniu',
		dayInPlace: 'teksty dnia są na stronie',
		dayPartial: '(część tekstów)',
		dayAhead: 'formularz na ten dzień nie jest jeszcze w tym wydaniu — można wybrać inny dzień',
		dayWeekOf: 'dziś dzień powszedni — ostatnia niedziela to',
		dayHint: {
			none: 'sam porządek Mszy, bez tekstów zmiennych'
		},
		dayPicker: {
			title: 'Wybór dnia',
			open: 'wybierz dzień lub formularz',
			calendarTab: 'Kalendarz',
			listTab: 'Lista i wyszukiwanie',
			today: 'Dzisiaj',
			previousMonth: 'poprzedni miesiąc',
			nextMonth: 'następny miesiąc',
			searchLabel: 'szukaj formularza',
			searchPlaceholder: 'Wpisz nazwę święta lub niedzieli',
			noResults: 'Nie znaleziono takiego formularza.',
			available: 'formularz dostępny w tym wydaniu',
			partial: 'w tym wydaniu dostępna jest część tekstów',
			unresolvedTitle: 'Kalendarz jeszcze niedostępny',
			unresolvedText:
				'To wydanie nie zawiera jeszcze pełnych danych kalendarzowych dla wybranego dnia. Ordo można otworzyć bez tekstów własnych.',
			unresolvedWeek: 'Dzień należy do tygodnia, którego niedzielą jest',
			unwrittenTitle: 'Dzień rozpoznany, formularz jeszcze niedostępny',
			unwrittenText:
				'Kalendarium rozpoznaje ten dzień, ale jego tekstów nie ma jeszcze w tym wydaniu.',
			chooseVariant: 'Wybierz formularz Mszy',
			openFormulary: 'Otwórz formularz',
			openWithout: 'Otwórz bez formularza',
			dateOnly: 'bez dostępnego formularza'
		},
		seasons: {
			adventus: 'Adwent',
			nativitas: 'Okres Bożego Narodzenia',
			epiphania: 'Okres Objawienia Pańskiego',
			septuagesima: 'Przedpoście',
			quadragesima: 'Wielki Post',
			passionis: 'Okres Męki Pańskiej',
			paschale: 'Okres wielkanocny',
			'per-annum': 'Okres w ciągu roku'
		},
		ordoPending: 'jeszcze nie w tym wydaniu',
		grammarTitle: 'gramatyka',
		grammarPageTitle: 'Gramatyka',
		derivativesLabel: 'w polszczyźnie',
		speakers: {
			sacerdos: 'kapłan',
			ductor: 'prowadzący',
			minister: 'usługujący',
			populus: 'lud',
			omnes: 'wszyscy',
			schola: 'schola',
			chronista: 'chronista',
			christus: 'Chrystus',
			synagoga: 'synagoga'
		},
		markTitle: {
			sacerdos: 'Versículus — werset, który mówi kapłan',
			ductor: 'Versículus — werset osoby prowadzącej modlitwę',
			minister: 'Respónsum — odpowiedź usługującego i wiernych',
			populus: 'Respónsum — odpowiedź wiernych',
			omnes: 'Omnes — mówią wszyscy razem',
			schola: 'Respónsum — śpiewa schola',
			chronista: 'Chronista — opowiada wydarzenia Męki Pańskiej',
			christus: 'Christus — słowa Chrystusa',
			synagoga: 'Synagoga — słowa pozostałych osób i tłumu'
		},
		markLegendTitle: 'znaki przy wierszach',
		markLegendNote:
			'Znak stoi tam, gdzie zmienia się mówiący, i powtarza się po każdej rubryce. Wiersze bez znaku należą do głosu powyżej.',
		voices: { submissa: 'półgłosem', secreto: 'po cichu', cantus: 'śpiew' },
		verseAria: (n) => `odnośnik do wersetu ${n}`,
		roleLabel: 'rola',
		massLabel: 'msza',
		massForms: { cantu: 'śpiewana', lecta: 'cicha' },
		everyone: 'odpowiadają wszyscy',
		mayJoin: 'wierni mogą dołączyć',
		faithful: 'wierni',
		faithfulWith: {
			sacerdos: 'kapłan i wierni',
			ductor: 'prowadzący i wierni',
			minister: 'usługujący i wierni',
			populus: 'wierni',
			omnes: 'wszyscy',
			schola: 'schola i wierni',
			chronista: 'chronista i wierni',
			christus: 'Chrystus i wierni',
			synagoga: 'synagoga i wierni'
		},
		roles: { populus: 'wierni', minister: 'usługujący', sacerdos: 'kapłan' },
		quietCollapsed: 'kapłan modli się po cichu',
		quietReveal: 'pokaż',
		quietHide: 'ukryj',
		quietAside: 'modlitwa kapłana',
		prayerFormsLabel: 'forma modlitwy',
		prayerFormShort: 'antyfona',
		prayerFormLong: 'forma rozszerzona',
		repeatedPrayerShow: 'rozwiń powtórzoną modlitwę',
		repeatedPrayerHide: 'zwiń powtórzoną modlitwę',
		pronunciationHint: 'zasady wymowy'
	},
	en: {
		langName: 'English',
		tagline: 'Prayer in Latin with understanding',
		mottoRef: 'ps\u00a0118\u00a0(119),\u00a034',
		edition: 'edition',
		bookHome: 'prayer book home',
		levels: ['Latin', 'interlinear', 'bilingual'],
		levelsLabel: 'mode',
		themeAria: { toLight: 'switch to light mode', toDark: 'switch to dark mode' },
		textSizeAria: 'text size',
		textSizes: { normal: 'normal', larger: 'larger', largest: 'largest' },
		langMenuAria: 'language selection',
		searchLabel: 'search',
		searchTitle: 'Search',
		searchClear: 'clear search',
		segmentSelect: 'select this verse',
		segmentNarrow: 'narrow the selection to this verse',
		segmentDeselect: 'clear the selected verse',
		segmentRangeHint:
			'A selected verse travels in the page address. Shift with a click selects a range of verses.',
		searchHint: 'Enter a prayer title, a remembered phrase, or a Latin word.',
		searchLoading: 'searching…',
		searchNoResults: 'No matching places were found.',
		searchFailed: 'This edition could not be searched.',
		searchDegraded:
			'Translation search is unavailable right now. Latin and title results are shown.',
		searchRetry: 'try again',
		searchTitles: 'prayer titles',
		searchContents: 'text passages',
		searchGrammar: 'grammar',
		searchMatchedAlias: 'also found as',
		searchCount: (n) => `${n} ${n === 1 ? 'result' : 'results'} found.`,
		close: 'close',
		updateAvailable: 'A new version is ready.',
		updateReload: 'Reload',
		updateReloading: 'Reloading…',
		updateLater: 'later',
		updateStale: 'This copy can no longer fetch its files. Apply the update to keep reading.',
		panelAria: 'word analysis',
		constructionPanelAria: 'construction analysis',
		wordContextLabel: 'meaning in context',
		sharedGloss: (latin, target) => `“${latin}” is rendered here as one expression: “${target}”.`,
		sharedConstruction: (latin, target) =>
			`The words “${latin}” form a single unit of meaning here, rendered in the word-by-word translation as “${target}”.`,
		auxiliaryParticipleConstruction: (auxiliary, participle, description, target) =>
			`${auxiliary} functions here as an auxiliary verb, while ${participle} is ${description}. The whole expression is rendered in English as “${target}”.`,
		constructionParticiple: {
			'future-active': 'a future active participle',
			'perfect-passive': 'a perfect passive participle',
			'perfect-deponent': 'the perfect participle of a deponent verb',
			'future-passive': 'a future passive participle (gerundive)',
			'present-active': 'a present active participle'
		},
		zeroGloss: {
			idiom:
				'This word is expressed by the phrase as a whole and has no separate English counterpart here.',
			inflection:
				'This word is expressed by the form of a neighbouring word and has no separate English counterpart here.',
			punctuation:
				'Punctuation carries this word’s function here. It has no separate English counterpart.',
			'word-order':
				'English word order carries this word’s function here. It has no separate English counterpart.'
		},
		wordEntryLabel: 'dictionary entry',
		wordFormLabel: 'form',
		working: 'about this edition · working edition awaiting expert review',
		lemmaLoading: 'Loading entry…',
		lemmaLoadFailed: 'The entry could not be loaded.',
		lemmaPageHint: 'open the entry',
		occurrences: 'in the texts',
		externalDict: 'external dictionary',
		notFound: 'No such entry.',
		catalogDescription:
			'A Latin prayer book with word-by-word analysis — translation, grammar, and pronunciation for every word.',
		editioDescription:
			'How this edition is made: text witnesses and collation, mechanical verification of the analyses, review states.',
		bibliographyTitle: 'bibliography',
		bibliographyPageTitle: 'Bibliography',
		bibliographyDescription:
			'Scrutabor’s verified Latin textual witnesses, historical translation sources, and liturgical documents.',
		bibliographyLink: 'complete bibliography',
		grammarDescription: 'Latin grammar concepts explained with examples from the prayers.',
		pronunciationDescription:
			'How to pronounce ecclesiastical Latin — the Roman and Polish traditions, with transcriptions.',
		readingDescription:
			'{title} — the Latin text with word-by-word analysis, translation, and grammar notes.',
		pageNotFound: 'This page does not exist.',
		errorGeneric: 'Something went wrong.',
		goHome: 'go to the home page',
		aboutLabel: 'about this prayer',
		sourcesLabel: 'sources',
		translationRelationshipLabel: 'relationship to historical wording',
		translationRelationships: {
			exact: 'The wording matches the cited historical witness.',
			normalized:
				'The wording preserves the historical witness after stated spelling or punctuation normalization.',
			revised:
				'The translation was edited directly from the Latin with the cited historical witnesses as controls.',
			'traditional-composite':
				'The wording preserves a familiar traditional formula assembled from attested variants and stated modernizations.'
		},
		pagerAria: 'neighboring texts',
		ordoLead: 'The order of Mass in the Roman Missal of 1962',
		ordoSubtitle: 'the Roman Missal of 1962',
		ordoDescription:
			'The whole order of Mass in the 1962 rite, part by part — the fixed texts, and where the day’s own texts belong.',
		ordoProper: 'from the day’s formulary',
		dayLabel: 'day',
		dayStatusLabel: 'about the day',
		dayNone: 'no formulary',
		dayLoading: 'loading',
		dayFailed: 'could not be loaded',
		dayUnwritten: 'not yet in this edition',
		dayInPlace: 'the day’s texts are on the page',
		dayPartial: '(some texts)',
		dayAhead: 'the formulary for this day is not yet in this edition — another day can be chosen',
		dayWeekOf: 'today is a weekday — the last Sunday:',
		dayHint: {
			none: 'the order of Mass alone, without the day’s own texts'
		},
		dayPicker: {
			title: 'Choose a day',
			open: 'choose a day or formulary',
			calendarTab: 'Calendar',
			listTab: 'List and search',
			today: 'Today',
			previousMonth: 'previous month',
			nextMonth: 'next month',
			searchLabel: 'search formularies',
			searchPlaceholder: 'Enter a feast or Sunday',
			noResults: 'No such formulary was found.',
			available: 'formulary available in this edition',
			partial: 'some of its texts are available in this edition',
			unresolvedTitle: 'Calendar not yet available',
			unresolvedText:
				'This edition does not yet contain complete calendar data for the selected day. The Ordo can be opened without the day’s proper texts.',
			unresolvedWeek: 'This day belongs to the week whose Sunday is',
			unwrittenTitle: 'Day resolved, formulary not yet available',
			unwrittenText: 'The calendar recognises this day, but its texts are not yet in this edition.',
			chooseVariant: 'Choose the Mass formulary',
			openFormulary: 'Open formulary',
			openWithout: 'Open without a formulary',
			dateOnly: 'no available formulary'
		},
		seasons: {
			adventus: 'Advent',
			nativitas: 'Christmastide',
			epiphania: 'Epiphanytide',
			septuagesima: 'Septuagesima',
			quadragesima: 'Lent',
			passionis: 'Passiontide',
			paschale: 'Eastertide',
			'per-annum': 'Through the year'
		},
		ordoPending: 'not yet in this edition',
		grammarTitle: 'grammar',
		grammarPageTitle: 'Grammar',
		derivativesLabel: 'in English',
		speakers: {
			sacerdos: 'priest',
			ductor: 'leader',
			minister: 'server',
			populus: 'people',
			omnes: 'all',
			schola: 'choir',
			chronista: 'narrator',
			christus: 'Christ',
			synagoga: 'synagoga'
		},
		markTitle: {
			sacerdos: 'Versículus — the verse the priest says',
			ductor: 'Versículus — the verse said by the prayer leader',
			minister: 'Respónsum — the answer of the server and the faithful',
			populus: 'Respónsum — the answer of the faithful',
			omnes: 'Omnes — said by all together',
			schola: 'Respónsum — sung by the choir',
			chronista: 'Chronista — the Passion narrator',
			christus: 'Christus — the words of Christ',
			synagoga: 'Synagoga — the words of the other speakers and the crowd'
		},
		markLegendTitle: 'the marks beside the lines',
		markLegendNote:
			'A mark stands where the voice changes, and again after every rubric. Lines without one belong to the voice above them.',
		voices: { submissa: 'in a low voice', secreto: 'silently', cantus: 'sung' },
		verseAria: (n) => `link to verse ${n}`,
		roleLabel: 'part',
		massLabel: 'Mass',
		massForms: { cantu: 'sung', lecta: 'low' },
		everyone: 'everyone answers',
		mayJoin: 'the faithful may join',
		faithful: 'the faithful',
		faithfulWith: {
			sacerdos: 'priest and faithful',
			ductor: 'leader and faithful',
			minister: 'server and faithful',
			populus: 'the faithful',
			omnes: 'all',
			schola: 'choir and faithful',
			chronista: 'narrator and faithful',
			christus: 'Christ and faithful',
			synagoga: 'synagoga and faithful'
		},
		// Bare nouns, no article: this is a label, and a label is what the
		// missals put in the margin beside a line — Priest, Server, Faithful.
		// The article belongs in the sentence underneath, where it reads as
		// English rather than as three repetitions of "the".
		roles: { populus: 'faithful', minister: 'server', sacerdos: 'priest' },
		quietCollapsed: 'the priest prays silently',
		quietReveal: 'show',
		quietHide: 'hide',
		quietAside: 'the priest’s prayer',
		prayerFormsLabel: 'prayer form',
		prayerFormShort: 'antiphon',
		prayerFormLong: 'extended form',
		repeatedPrayerShow: 'expand repeated prayer',
		repeatedPrayerHide: 'collapse repeated prayer',
		pronunciationHint: 'pronunciation guide'
	}
};

// Polish one-letter words are bound to what follows them (see lib/polish);
// English needs nothing of the kind.
export const M: Record<Lang, Messages> = { en: MESSAGES.en, pl: bindProse(MESSAGES.pl) };
