// UI strings live here; corpus content lives in the gloss layers.
import { bindProse } from './polish';
import type { Season } from './proprium';
import type { Situation } from './commemorationes';
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
	lemmaSourcesLabel: string;
	lemmaSourcesScope: string;
	lemmaSourcesLoading: string;
	lemmaSourcesFailed: string;
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
	revisedTranslationScope: string;
	translationRelationships: Record<
		'exact' | 'normalized' | 'revised' | 'traditional-composite',
		string
	>;
	pagerAria: string;
	ordoLead: string;
	ordoSubtitle: string;
	ordoDescription: string;
	ordoProper: string;
	/** A commemoration's oration, joined after the Mass oration it follows. */
	ordoCommemoration: string;
	/** RG 480–481: a Secret that is not the last keeps its words but not its audible ending. */
	commemorationQuiet: string;
	/** A commemoration falls on the chosen date while the Mass of that day is not in the edition. */
	dayCommemorationOnly: string;
	/** A required commemoration of the season that the edition cannot yet supply; '{where}'
	 * names the Mass that owes it and '{title}' the commemoration omitted for it. */
	dayCommemorationUnavailable: string;
	/** Who owes it: the one determinate Mass, or one of the two described sung Masses. */
	commemorationWhere: Record<'mass' | Exclude<Situation, 'lecta'>, string>;
	/** The same, in the slot where its orations would follow the Mass's own. */
	commemorationUnavailable: string;
	/** Why a slot shows two sung sequences: the low/sung choice cannot settle conventual status. */
	commemorationVariants: string;
	/** The label of each described sequence. */
	commemorationSituations: Record<Situation, string>;
	/** A required commemoration resolved to a formulary whose orations the edition does not yet
	 * carry; '{title}' names it as its heading does, or by its own title where that formulary is
	 * not in this edition. */
	dayCommemorationMissing: string;
	/** A resolved commemoration that keeps its own title and names the formulary its orations
	 * come from (the Advent feria): '{commemoration}' and '{formulary}' are the two titles. */
	commemorationPrayersOf: string;
	/** A commemoration resolved per date has no orations of its own: its page says what it is,
	 * keyed by commemoration identity, before the dates this edition resolves. */
	commemorationRules: Record<string, readonly string[]>;
	/** The heading over those dates, grouped by the Mass that makes the commemoration. */
	commemorationDates: string;
	/** Standalone title. The short calendar label is part of a longer phrase. */
	impededVigilHeading: string;
	/** A listed date whose formulary's orations the edition does not yet carry. */
	commemorationPrayersMissing: string;
	/** A Mass a resolved commemoration names on a listed date that this edition does not yet
	 * author (the Ember days of Advent), keyed by its identity: named, never linked. */
	commemorationAbsentMasses: Record<string, string>;
	/** Capability limit, not a claim that every date needs an additional prayer. */
	formularyScope: string;
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
		catalogTitle: string;
		catalogDescription: string;
		invalidChoice: string;
		today: string;
		previousMonth: string;
		nextMonth: string;
		searchLabel: string;
		searchPlaceholder: string;
		noResults: string;
		available: string;
		partial: string;
		outsideTitle: string;
		outsideText: string;
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
	markLegendAction: string;
	markLegendNote: string;
	markResponsum: string;
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
	quietPriest: string;
	choirSings: string;
	sings: string;
	participationPerformance: string;
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
		textSizes: { normal: 'standardowa', larger: 'większa', largest: 'największa' },
		langMenuAria: 'wybór języka',
		searchLabel: 'szukaj',
		searchTitle: 'Wyszukiwanie',
		searchClear: 'wyczyść wyszukiwanie',
		segmentSelect: 'wybierz ten werset',
		segmentNarrow: 'zawęź wybór do tego wersetu',
		segmentDeselect: 'usuń wybór tego wersetu',
		segmentRangeHint:
			'Wybrany fragment możesz udostępnić, kopiując adres strony. Jeśli używasz klawiatury, przytrzymaj Shift i wybierz drugi werset, aby zaznaczyć cały fragment.',
		searchHint: 'Wpisz tytuł modlitwy, znany fragment albo łacińskie słowo.',
		searchLoading: 'szukam…',
		searchNoResults: 'Brak wyników.',
		searchFailed: 'Wyszukiwanie nie powiodło się.',
		searchDegraded:
			'Wyszukiwanie w przekładach jest chwilowo niedostępne. Nadal można szukać tytułów modlitw, łacińskich fragmentów i haseł.',
		searchRetry: 'Spróbuj ponownie',
		searchTitles: 'tytuły modlitw',
		searchContents: 'fragmenty tekstów',
		searchGrammar: 'hasła słownikowe',
		searchMatchedAlias: 'znaleziono także jako',
		searchCount: (n) =>
			`Wyświetlono ${n} ${
				n === 1
					? 'wynik'
					: n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
						? 'wyniki'
						: 'wyników'
			}.`,
		close: 'zamknij',
		updateAvailable: 'Nowa wersja jest dostępna.',
		updateReload: 'Wczytaj',
		updateReloading: 'Wczytywanie…',
		updateLater: 'Później',
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
		lemmaSourcesLabel: 'źródła hasła',
		lemmaSourcesScope: 'Źródła do wybranych objaśnień znaczenia i gramatyki.',
		lemmaSourcesLoading: 'Wczytywanie źródeł…',
		lemmaSourcesFailed: 'Źródła niedostępne.',
		occurrences: 'w tekstach',
		externalDict: 'słownik zewnętrzny',
		notFound: 'Nie ma takiego hasła.',
		catalogDescription:
			'Modlitewnik łaciński z przekładami, objaśnieniami gramatycznymi i wymową łaciny.',
		editioDescription:
			'Z jakich źródeł korzystamy, jak sprawdzamy łacinę i co jeszcze czeka na przegląd.',
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
		goHome: 'Wróć na stronę główną',
		aboutLabel: 'o modlitwie',
		sourcesLabel: 'źródła',
		translationRelationshipLabel: 'relacja z brzmieniem historycznym',
		revisedTranslationScope: 'W podanych wersetach zredagowano brzmienie historyczne.',
		translationRelationships: {
			exact: 'Brzmienie jest zgodne ze wskazanym świadectwem historycznym.',
			normalized:
				'Brzmienie zachowuje tekst źródłowy. Zmiany dotyczą wyłącznie pisowni, wielkich liter i interpunkcji.',
			revised:
				'Przekład opiera się na wskazanym brzmieniu historycznym, zredagowanym z uwzględnieniem łaciny.',
			'traditional-composite':
				'Brzmienie zachowuje znaną formułę tradycyjną, zestawioną z poświadczonych wariantów i jawnych modernizacji.'
		},
		pagerAria: 'sąsiednie teksty',
		ordoLead: 'Porządek Mszy świętej według Mszału Rzymskiego z 1962 roku',
		ordoSubtitle: 'Mszał Rzymski z 1962 roku',
		ordoDescription:
			'Porządek Mszy według Mszału Rzymskiego z 1962 roku. Teksty stałe i modlitwy oraz czytania właściwe dla wybranego dnia.',
		ordoProper: 'z formularza dnia',
		ordoCommemoration: 'wspomnienie',
		commemorationQuiet:
			'Zakończenie i Amen tej sekrety kapłan odmawia po cichu. Głośno kończy się tylko ostatnia sekreta.',
		dayCommemorationOnly:
			'tego dnia przypada wspomnienie: {title}. Mszy tego dnia nie ma jeszcze w tym wydaniu',
		dayCommemorationUnavailable:
			'{where} wymaga wspomnienia okresowego (de Tempore), którego nie ma jeszcze w tym wydaniu. Pomija się inne wspomnienie: {title}',
		commemorationWhere: {
			mass: 'ta Msza',
			'cantu-conventualis': 'śpiewana Msza konwentualna',
			'cantu-non-conventualis': 'śpiewana Msza niekonwentualna'
		},
		commemorationUnavailable:
			'Po modlitwie z formularza dnia następuje wymagane wspomnienie okresowe (de Tempore), którego nie ma jeszcze w tym wydaniu.',
		commemorationVariants:
			'We Mszy śpiewanej wspomnienie zależy od tego, czy jest to Msza konwentualna. Pokazano oba warianty.',
		commemorationSituations: {
			lecta: 'we Mszy cichej',
			'cantu-conventualis': 'we Mszy śpiewanej konwentualnej',
			'cantu-non-conventualis': 'we Mszy śpiewanej niekonwentualnej'
		},
		dayCommemorationMissing:
			'tego dnia przypada wspomnienie: {title}. Jego modlitw nie ma jeszcze w tym wydaniu',
		commemorationPrayersOf: '{commemoration} (modlitwy: {formulary})',
		commemorationRules: {
			'dominica-impedita': [
				'Gdy jedno z poniższych świąt pierwszej klasy przypada w niedzielę, odprawia się Mszę święta. Po każdej z trzech modlitw święta (kolekcie, sekrecie i pokomunii) odmawia się odpowiednią modlitwę niedzieli z własnym zakończeniem. To wspomnienie jest uprzywilejowane i występuje we wszystkich Mszach.',
				'Modlitwy bierze się z formularza niedzieli, która przypadałaby tego dnia. Można je przeczytać w porządku Mszy dla wybranej daty.'
			],
			'feria-adventus': [
				'Gdy jedno z poniższych świąt przypada w dzień powszedni Adwentu, odprawia się Mszę święta ze wspomnieniem dnia powszedniego. Po każdej modlitwie święta (kolekcie, sekrecie i pokomunii) następuje odpowiednia modlitwa wspomnienia z własnym zakończeniem. To wspomnienie jest uprzywilejowane i występuje we wszystkich Mszach.',
				'Modlitwy wspomnienia zwykle pochodzą z formularza poprzedniej niedzieli Adwentu. Porządek Mszy dla wybranej daty pokazuje właściwe teksty. Suche Dni Adwentu mają własne formularze, które czekają na uzupełnienie. Dla tych dat wskazujemy brak modlitw wspomnienia.'
			],
			'festum-impeditum': [
				'Gdy jedno z poniższych świąt drugiej klasy przypada w niedzielę drugiej klasy, odprawia się Mszę niedzieli. Święto wspomina się tylko we Mszy cichej i śpiewanej Mszy konwentualnej. Wtedy po kolekcie, sekrecie i pokomunii niedzieli dodaje się odpowiednie modlitwy święta, każdą z własnym zakończeniem.',
				'Modlitwy bierze się z formularza święta, które przypada tego dnia. Można je przeczytać w porządku Mszy dla wybranej daty.'
			],
			'vigilia-ascensionis-impedita': [
				'Gdy wskazane święto drugiej klasy ma pierwszeństwo przed Wigilią Wniebowstąpienia, Wigilię wspomina się tylko we Mszy cichej i śpiewanej Mszy konwentualnej. Po kolekcie, sekrecie i pokomunii święta następują wtedy odpowiednie modlitwy Wigilii, każda z własnym zakończeniem.',
				'Poniżej podano święta i daty objęte tą regułą. W ustawieniu „Msza śpiewana” pokazujemy wariant konwentualny i niekonwentualny.'
			]
		},
		commemorationDates: 'Święta i daty w tym wydaniu',
		impededVigilHeading: 'Wigilia Wniebowstąpienia Pańskiego ustępująca świętu',
		commemorationPrayersMissing: 'modlitw nie ma jeszcze w tym wydaniu',
		commemorationAbsentMasses: {
			'feria-sexta-quatuor-temporum-adventus': 'Piątek Suchych Dni Adwentu',
			'sabbato-quatuor-temporum-adventus': 'Sobota Suchych Dni Adwentu'
		},
		formularyScope:
			'Przy doborze modlitw uwzględniamy wspomnienia Litanii Większych, św. Petroneli, niedziel i świąt, które ustępują innym obchodom, oraz dni powszednich Adwentu. W wybranych przypadkach uwzględniamy także wspomnienia świętych w Wigilię Wniebowstąpienia oraz wspomnienie samej Wigilii, gdy ustępuje świętu. Pozostałe wspomnienia i kalendarze lokalne czekają na uzupełnienie.',
		dayLabel: 'dzień',
		dayStatusLabel: 'o dniu',
		dayNone: 'bez formularza',
		dayLoading: 'wczytywanie',
		dayFailed: 'nie udało się wczytać tekstów dnia',
		dayUnwritten: 'jeszcze nie w tym wydaniu',
		dayInPlace: 'wczytano dostępne teksty dnia',
		dayPartial: '(część tekstów)',
		dayAhead: 'formularz na ten dzień nie jest jeszcze w tym wydaniu — można wybrać inny dzień',
		dayWeekOf: 'dziś dzień powszedni — ostatnia niedziela to',
		dayHint: {
			none: 'sam porządek Mszy, bez tekstów zmiennych'
		},
		dayPicker: {
			title: 'Wybór dnia',
			open: 'wybierz datę',
			catalogTitle: 'Formularze Mszy',
			catalogDescription:
				'Teksty do lektury i nauki, bez przypisania do konkretnej daty. Aby przygotować porządek Mszy na wybrany dzień, otwórz Ordo Missae.',
			invalidChoice: 'Nie można otworzyć Mszy z tego adresu. Wybierz dzień w kalendarzu.',
			today: 'Dzisiaj',
			previousMonth: 'poprzedni miesiąc',
			nextMonth: 'następny miesiąc',
			searchLabel: 'szukaj formularza',
			searchPlaceholder: 'Wpisz nazwę święta lub niedzieli',
			noResults: 'Nie znaleziono takiego formularza.',
			available: 'formularz dostępny w tym wydaniu',
			partial: 'w tym wydaniu dostępna jest część tekstów',
			outsideTitle: 'Data poza zakresem kalendarza',
			outsideText: 'Wybierz datę z kalendarza lub otwórz części stałe Mszy.',
			unresolvedTitle: 'Brak danych dla tego dnia',
			unresolvedText: 'W tym wydaniu można otworzyć na ten dzień tylko części stałe Mszy.',
			unresolvedWeek: 'Niedziela tego tygodnia to',
			unwrittenTitle: 'Brak tekstów Mszy na ten dzień',
			unwrittenText:
				'Ten dzień figuruje w kalendarzu. Jego formularz mszalny czeka jeszcze na dodanie do tego wydania.',
			chooseVariant: 'Wybierz formularz Mszy',
			openFormulary: 'Otwórz formularz',
			openWithout: 'Otwórz części stałe',
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
			sacerdos: 'Versículus — werset kapłana',
			ductor: 'Versículus — werset osoby prowadzącej modlitwę',
			minister: 'Respónsum — odpowiedź',
			populus: 'Respónsum — odpowiedź wiernych',
			omnes: 'Omnes — wszyscy razem',
			schola: 'Respónsum — śpiewa schola',
			chronista: 'Chronista — opowiada wydarzenia Męki Pańskiej',
			christus: 'Christus — słowa Chrystusa',
			synagoga: 'Synagoga — słowa pozostałych osób i tłumu'
		},
		markLegendTitle: 'znaki przy wierszach',
		markLegendAction: 'Otwórz legendę',
		markLegendNote:
			'Znak wskazuje zmianę głosu i pojawia się ponownie po rubryce. Bez nowego znaku trwa ten sam głos.',
		markResponsum: 'Respónsum — odpowiedź lub śpiew scholi',
		voices: { submissa: 'półgłosem', secreto: 'po cichu', cantus: 'śpiew' },
		verseAria: (n) => `odnośnik do wersetu ${n}`,
		roleLabel: 'rola',
		massLabel: 'msza',
		massForms: { cantu: 'śpiewana', lecta: 'cicha' },
		everyone: 'odpowiadają wszyscy',
		mayJoin: 'wierni mogą dołączyć',
		quietPriest: 'kapłan mówi po cichu.',
		choirSings: 'schola śpiewa.',
		sings: 'śpiewa.',
		participationPerformance:
			'Schola śpiewa, a wierni mogą dołączyć. Kapłan odmawia ten sam tekst po cichu.',
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
			'Copy the page address to share the selected passage. If you use a keyboard, hold Shift and select the second verse to mark the whole passage.',
		searchHint: 'Enter a prayer title, a remembered phrase, or a Latin word.',
		searchLoading: 'searching…',
		searchNoResults: 'No results found.',
		searchFailed: 'Search failed.',
		searchDegraded:
			'Search in translations is temporarily unavailable. You can still search prayer titles, Latin passages, and dictionary entries.',
		searchRetry: 'Try again',
		searchTitles: 'prayer titles',
		searchContents: 'text passages',
		searchGrammar: 'dictionary entries',
		searchMatchedAlias: 'also found as',
		searchCount: (n) => `Showing ${n} ${n === 1 ? 'result' : 'results'}.`,
		close: 'close',
		updateAvailable: 'A new version is available.',
		updateReload: 'Reload',
		updateReloading: 'Reloading…',
		updateLater: 'Later',
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
		lemmaSourcesLabel: 'dictionary sources',
		lemmaSourcesScope: 'References for selected explanations of meaning and grammar.',
		lemmaSourcesLoading: 'Loading sources…',
		lemmaSourcesFailed: 'Sources unavailable.',
		occurrences: 'in the texts',
		externalDict: 'external dictionary',
		notFound: 'No such entry.',
		catalogDescription:
			'A Latin prayer book with translations, grammar notes, and a guide to pronunciation.',
		editioDescription:
			'The sources behind this edition, how we check the Latin, and what still needs review.',
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
		goHome: 'Go to the home page',
		aboutLabel: 'about this prayer',
		sourcesLabel: 'sources',
		translationRelationshipLabel: 'relationship to historical wording',
		revisedTranslationScope: 'The verses listed below revise historical wording.',
		translationRelationships: {
			exact: 'The wording matches the cited historical witness.',
			normalized:
				'The source wording is retained, with changes limited to spelling, capitalization and punctuation.',
			revised:
				'The translation is based on the cited historical wording, revised with reference to the Latin.',
			'traditional-composite':
				'The wording preserves a familiar traditional formula assembled from attested variants and stated modernizations.'
		},
		pagerAria: 'neighboring texts',
		ordoLead: 'The order of Mass in the Roman Missal of 1962',
		ordoSubtitle: 'the Roman Missal of 1962',
		ordoDescription:
			'The Order of Mass from the 1962 Roman Missal, with the fixed texts and the prayers and readings for the selected day.',
		ordoProper: 'from the day’s formulary',
		ordoCommemoration: 'commemoration',
		commemorationQuiet:
			'The celebrant says this Secret’s conclusion and Amen quietly. Only the last Secret ends aloud.',
		dayCommemorationOnly:
			'a commemoration falls on this day: {title}. The Mass of this day is not yet in this edition',
		dayCommemorationUnavailable:
			'{where} requires a commemoration of the season (de Tempore) that is not yet in this edition. The other commemoration is omitted: {title}',
		commemorationWhere: {
			mass: 'this Mass',
			'cantu-conventualis': 'a sung conventual Mass',
			'cantu-non-conventualis': 'a sung Mass that is not conventual'
		},
		commemorationUnavailable:
			'The prayer of the day is followed by a required commemoration of the season (de Tempore), which is not yet in this edition.',
		commemorationVariants:
			'In a sung Mass the commemoration depends on whether the Mass is conventual. Both forms are shown.',
		commemorationSituations: {
			lecta: 'in a low Mass',
			'cantu-conventualis': 'in a sung conventual Mass',
			'cantu-non-conventualis': 'in a sung Mass that is not conventual'
		},
		dayCommemorationMissing:
			'a commemoration is due on this day: {title}. Its prayers are not yet in this edition',
		commemorationPrayersOf: '{commemoration} (prayers: {formulary})',
		commemorationRules: {
			'dominica-impedita': [
				'When one of the first-class feasts below falls on a Sunday, the Mass is that of the feast. After each of the feast’s three prayers (Collect, Secret and Postcommunion), the priest says the corresponding Sunday prayer with its own conclusion. This privileged commemoration is made at every Mass.',
				'The prayers come from the formulary of the Sunday that would have been kept on that date. You can read them in the Order of Mass for the chosen day.'
			],
			'feria-adventus': [
				'When one of the feasts below falls on a weekday of Advent, the Mass of the feast commemorates the weekday. After each of the feast’s three prayers (Collect, Secret and Postcommunion), the priest says the corresponding weekday prayer with its own conclusion. This privileged commemoration is made at every Mass.',
				'The prayers usually come from the preceding Sunday of Advent. You can read them in the Order of Mass for the chosen day. The Ember days of Advent have their own formularies, which are still to be added. The dates below show where their prayers are missing.'
			],
			'festum-impeditum': [
				'When one of the second-class feasts below falls on a second-class Sunday, the Mass is that of the Sunday. The feast receives an ordinary commemoration only at Low Mass and sung conventual Mass. In those cases the priest follows each of the Sunday’s prayers (Collect, Secret and Postcommunion) with the corresponding prayer of the feast, using its own conclusion.',
				'The prayers come from the formulary of the feast that falls on that date. You can read them in the Order of Mass for the chosen day.'
			],
			'vigilia-ascensionis-impedita': [
				'When a second-class feast listed here takes precedence over the Vigil of the Ascension, the feast’s Mass commemorates the Vigil at Low Mass and sung conventual Mass. After each of the feast’s prayers (Collect, Secret and Postcommunion), the priest says the corresponding Vigil prayer with its own conclusion.',
				'The dates below show when this happens. When you select sung Mass, the reader shows the conventual and non-conventual forms.'
			]
		},
		commemorationDates: 'Feasts and dates in this edition',
		impededVigilHeading: 'When a feast takes precedence over the Vigil of the Ascension',
		commemorationPrayersMissing: 'prayers not yet in this edition',
		commemorationAbsentMasses: {
			'feria-sexta-quatuor-temporum-adventus': 'Ember Friday of Advent',
			'sabbato-quatuor-temporum-adventus': 'Ember Saturday of Advent'
		},
		formularyScope:
			'This edition includes commemorations of the Greater Litanies, Saint Petronilla, Sundays and feasts that give way to another observance, and Advent weekdays. In the cases listed here, it also includes commemorations of saints on the Vigil of the Ascension and of the Vigil itself when a feast takes precedence. Other commemorations and local calendars are still to be added.',
		dayLabel: 'day',
		dayStatusLabel: 'about the day',
		dayNone: 'no formulary',
		dayLoading: 'loading',
		dayFailed: 'the day’s texts could not be loaded',
		dayUnwritten: 'not yet in this edition',
		dayInPlace: 'the available texts are ready',
		dayPartial: '(some texts)',
		dayAhead: 'the formulary for this day is not yet in this edition — another day can be chosen',
		dayWeekOf: 'today is a weekday — the last Sunday:',
		dayHint: {
			none: 'the order of Mass alone, without the day’s own texts'
		},
		dayPicker: {
			title: 'Choose a day',
			open: 'choose a date',
			catalogTitle: 'Mass formularies',
			catalogDescription:
				'Texts for reading and study, without a specific date. To follow the order of Mass for a chosen day, open the Ordo Missae.',
			invalidChoice: 'The Mass in this link could not be opened. Choose a day in the calendar.',
			today: 'Today',
			previousMonth: 'previous month',
			nextMonth: 'next month',
			searchLabel: 'search formularies',
			searchPlaceholder: 'Enter a feast or Sunday',
			noResults: 'No such formulary was found.',
			available: 'formulary available in this edition',
			partial: 'some of its texts are available in this edition',
			outsideTitle: 'Date outside the calendar range',
			outsideText: 'Choose a date in the calendar or open the Ordinary of the Mass.',
			unresolvedTitle: 'No calendar entry for this day',
			unresolvedText: 'For this day, you can open the Ordinary of the Mass.',
			unresolvedWeek: 'Sunday of this week:',
			unwrittenTitle: 'Mass texts not yet available',
			unwrittenText:
				'This day is listed in the calendar. Its Mass texts have yet to be added to this edition.',
			chooseVariant: 'Choose the Mass formulary',
			openFormulary: 'Open formulary',
			openWithout: 'Open the Ordinary',
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
			sacerdos: 'Versículus — the priest’s verse',
			ductor: 'Versículus — the verse said by the prayer leader',
			minister: 'Respónsum — response',
			populus: 'Respónsum — the answer of the faithful',
			omnes: 'Omnes — all together',
			schola: 'Respónsum — sung by the choir',
			chronista: 'Chronista — the Passion narrator',
			christus: 'Christus — the words of Christ',
			synagoga: 'Synagoga — the words of the other speakers and the crowd'
		},
		markLegendTitle: 'marks beside the lines',
		markLegendAction: 'Open the key',
		markLegendNote:
			'A mark shows where the voice changes and appears again after a rubric. The same voice continues until the next mark.',
		markResponsum: 'Respónsum — a response or chant by the choir',
		voices: { submissa: 'in a low voice', secreto: 'audible only to the speaker', cantus: 'sung' },
		verseAria: (n) => `link to verse ${n}`,
		roleLabel: 'role',
		massLabel: 'Mass',
		massForms: { cantu: 'sung', lecta: 'low' },
		everyone: 'everyone answers',
		mayJoin: 'the faithful may join',
		quietPriest: 'the priest says it in a low voice.',
		choirSings: 'the choir sings.',
		sings: 'sings.',
		participationPerformance:
			'The choir sings, and the faithful may join. The priest recites the same text quietly.',
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
		// The congregation takes the collective label “the faithful”.
		roles: { populus: 'the faithful', minister: 'server', sacerdos: 'priest' },
		quietCollapsed: 'the priest prays in a low voice',
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
