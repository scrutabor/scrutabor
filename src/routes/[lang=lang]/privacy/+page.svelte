<script lang="ts">
	// Keep these descriptions aligned with the analytics gates in app.html,
	// the reader's storage and URL conventions, and the hosting setup.
	// The app stores will require this URL when the wrapped builds ship.
	import PageNav from '$lib/components/PageNav.svelte';
	import type { Lang } from '$lib/i18n';
	import { bindProse } from '$lib/polish';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);

	interface Copy {
		title: string;
		description: string;
		lede: string;
		points: string[];
		contact: string;
		back: string;
	}

	const T: Record<Lang, Copy> = {
		pl: bindProse({
			title: 'Prywatność',
			description:
				'Scrutabor nie wymaga rejestracji i nie używa plików cookie. Odwiedziny mierzymy bez profilowania czytelników.',
			lede: 'Scrutabor nie wymaga rejestracji i nie używa plików cookie. Odwiedziny mierzymy bez profilowania czytelników.',
			points: [
				'Na stronie nie ma reklam. Cloudflare Web Analytics zlicza odsłony i mierzy między innymi czas ładowania stron. Nie używa plików cookie ani trwałych identyfikatorów czytelników. Korzystamy ze zbiorczych statystyk, które pokazują między innymi, jak często otwierano polskie i angielskie strony, z jakich krajów i na jakich urządzeniach.',
				'Jeśli przeglądarka wysyła sygnał Do Not Track lub Global Privacy Control, nie wczytujemy skryptu analitycznego. Pobrana kopia książki działa bez internetu i nie zawiera tego skryptu.',
				'Przeglądarka może zapamiętać na urządzeniu język, wygląd strony, tryb czytania, rolę podczas Mszy, rodzaj Mszy i formę modlitwy. Do zapisanego miejsca w lekturze można wrócić przez 12 godzin. Wybrany dzień przeglądarka pamięta do północy czasu miejscowego. Aby usunąć zapisane ustawienia i pobrane strony, wyczyść dane tej witryny w przeglądarce.',
				'Wyszukiwanie odbywa się na urządzeniu. W wersji internetowej adres strony może zawierać szukane wyrażenie, wybrany dzień, słowo lub fragment modlitwy. Osoba, której prześlesz taki link, zobaczy również tę część adresu.',
				'Cloudflare Pages dostarcza pliki strony. Gdy przeglądarka pobiera plik, Cloudflare otrzymuje Twój adres IP oraz adres żądanego pliku. Scrutabor nie prowadzi własnych dzienników odwiedzin. Zainstalowana aplikacja pobiera książkę na urządzenie do czytania bez internetu.',
				'Jeśli zgłosisz błąd na GitHubie, treść zgłoszenia i nazwa Twojego konta będą widoczne publicznie.'
			],
			contact: 'Kontakt z redakcją',
			back: 'wróć na stronę główną'
		}),
		en: {
			title: 'Privacy',
			description:
				'You can use Scrutabor without an account or cookies. We measure visits without building reader profiles.',
			lede: 'You can use Scrutabor without an account or cookies. We measure visits without building reader profiles.',
			points: [
				'The site has no ads. Cloudflare Web Analytics counts page views and measures how long pages take to load. It uses no cookies or persistent reader identifiers. We use aggregate statistics to see, for example, how often people open the Polish and English pages, from which countries, and on which types of device.',
				'If your browser sends a Do Not Track or Global Privacy Control signal, we do not load the analytics script. The downloadable book works offline and does not contain the script.',
				'Your browser can save your language, display and reading preferences, role at Mass, type of Mass, and prayer form on your device. You can return to a saved reading position for 12 hours. The browser remembers the selected day until midnight local time. To remove saved settings and downloaded pages, clear this site’s data in your browser.',
				'Search runs on your device. On the website, the page address can include your search terms, the selected day, a word, or a passage. Anyone you share the link with can see that part of the address.',
				'Cloudflare Pages serves the site’s files. When your browser requests a file, Cloudflare receives your IP address and the address of that file. Scrutabor keeps no visit logs of its own. The installed app downloads the book to your device for offline reading.',
				'If you report a problem on GitHub, your report and your account name are public.'
			],
			contact: 'Contact the editors',
			back: 'go to the home page'
		}
	};

	const t = $derived(T[lang]);
</script>

<!-- jscpd:ignore-start — the opening every landing surface shares:
     head, frame, nav, heading. Scaffolding, not content. -->
<svelte:head>
	<title>Scrutabor — {t.title.toLowerCase()}</title>
	<meta name="description" content={t.description} />
</svelte:head>

<div class="page centered landing">
	<PageNav {lang} base="" />
	<main>
		<h1 class="smallcaps">{t.title}</h1>
		<!-- jscpd:ignore-end -->
		<p class="lede">{t.lede}</p>
		{#each t.points as point (point)}
			<p class="point">{point}</p>
		{/each}
		<!-- jscpd:ignore-start — the way to the sources and the way home,
		     spelled the same as the landing's footer on purpose. -->
		<p class="contact">
			<a href="/{lang}/support">{t.contact}</a>
		</p>
		<p class="back"><a href="/{lang}">{t.back} ›</a></p>
		<!-- jscpd:ignore-end -->
	</main>
</div>

<style>
	/* The nav row is shared furniture (app.css). */

	main {
		max-width: 34rem;
		/* The page column is wider than this cap, and a stretch-flex
		   child aligns start — without this the whole block sits left of
		   the viewport centre on wide screens. */
		margin-inline: auto;
	}

	.lede {
		margin: 1.6rem 0 0;
		font-size: 1.15rem;
	}

	.point {
		margin: 1.1rem 0 0;
		line-height: 1.65;
		text-align: left;
	}

	.contact {
		margin: 1.6rem 0 0;
	}

	.contact a {
		color: var(--ink-soft);
	}

	.contact a:hover {
		color: var(--ink);
	}

	.back {
		margin: 2.4rem 0 0;
		font-size: 0.95rem;
	}
</style>
