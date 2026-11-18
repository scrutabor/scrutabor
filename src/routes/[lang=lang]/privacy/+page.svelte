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
				'W serwisie nie ma reklam. Cloudflare Web Analytics zbiera dane o otwieranych stronach i pomiary ich wydajności, między innymi czas ładowania. Nie używa plików cookie ani trwałego identyfikatora czytelnika. Korzystamy ze zbiorczych statystyk, na przykład liczby otwarć strony według języka, kraju i przeglądarki.',
				'Nie uruchamiamy skryptu analitycznego, gdy przeglądarka zgłasza Do Not Track lub Global Privacy Control. Pobrana kopia książki działa offline i pozostaje na urządzeniu.',
				'Przeglądarka zapamiętuje język, motyw, wielkość pisma, rolę i rodzaj Mszy, formę modlitwy, tryb czytania oraz ostatnie miejsce w lekturze. Zapamiętany wybór dnia wygasa o północy. Wersja internetowa może też umieścić wybrany dzień lub miejsce w lekturze w adresie strony. Zainstalowana aplikacja pobiera na urządzenie książkę, aby można było ją czytać bez połączenia z internetem.',
				'Pliki strony dostarcza Cloudflare Pages. Aby je dostarczyć, Cloudflare otrzymuje adres IP i adres żądanej strony. Scrutabor nie prowadzi własnych dzienników odwiedzin.'
			],
			contact: 'Uwagi i poprawki: github.com/scrutabor.',
			back: 'wróć na stronę główną'
		}),
		en: {
			title: 'Privacy',
			description:
				'You can use Scrutabor without an account or cookies. We measure visits without building reader profiles.',
			lede: 'You can use Scrutabor without an account or cookies. We measure visits without building reader profiles.',
			points: [
				'The site has no ads. Cloudflare Web Analytics collects information about the pages people open and measures their performance, including load time. It uses no cookies or persistent reader identifier. We use aggregate statistics such as page views by language, country, and browser.',
				'We leave the analytics script off when the browser signals Do Not Track or Global Privacy Control. A downloaded copy of the book works offline and stays on the device.',
				'The browser remembers your language, theme, text size, role and kind of Mass, prayer form, reading mode, and last place in the book. The saved choice of day expires at midnight. The web version can also include the selected day or reading location in the page address. The installed app downloads the book to your device so you can read offline.',
				'Cloudflare Pages serves the site’s files. To deliver them, Cloudflare receives your IP address and the address of the requested page. Scrutabor keeps no visit logs of its own.'
			],
			contact: 'Questions and corrections: github.com/scrutabor.',
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
			<a href="https://github.com/scrutabor" rel="external">{t.contact}</a>
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
