<script lang="ts">
	// The privacy page: short because the truth is short. There are no
	// accounts, and the only measurement in the architecture is a count of
	// pages opened that stores nothing on the device and knows no one — so
	// this page states that plainly, states what IS kept (the reader's own
	// settings, on their own device), and states the one thing serving a
	// website necessarily involves. It is also the page that must never
	// drift from what src/app.html actually does.
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
				'Scrutabor nie wymaga rejestracji, nie używa plików cookie i nie śledzi czytelników.',
			lede: 'Scrutabor nie wymaga rejestracji, nie używa plików cookie i nie śledzi czytelników.',
			points: [
				'Nie używamy plików cookie, reklam ani profilowania. Odwiedziny liczymy narzędziem Cloudflare Web Analytics, które nie zapisuje niczego na urządzeniu i nie przechowuje żadnego identyfikatora, więc nie rozpoznaje czytelnika i nie łączy jego odwiedzin ani między sesjami, ani między stronami. Zapisywane są wyłącznie zagregowane dane — ile razy otwarto daną stronę, w jakim języku, z jakiego kraju i w jakiej przeglądarce. Nie ma w nich śladu tego, co robił pojedynczy czytelnik.',
				'Przeglądarka, która prosi o nieśledzenie sygnałem Do Not Track lub Global Privacy Control, nie jest liczona wcale. Pobrana kopia książki działa całkowicie offline — niczego nie liczy i z niczym się nie łączy.',
				'Ustawienia czytelnika — język, motyw, wielkość pisma, wybrana rola i forma modlitwy, miejsce w lekturze — są zapisywane wyłącznie w pamięci przeglądarki i nigdy nie opuszczają urządzenia. Zainstalowana aplikacja przechowuje na urządzeniu całą książkę, aby działała także bez połączenia z internetem.',
				'Strona to zbiór statycznych plików serwowanych przez Cloudflare Pages. Jak każdy serwer WWW, Cloudflare widzi adres IP, na który dostarcza pliki. Poza zagregowanymi danymi opisanymi wyżej nie prowadzimy żadnych dzienników i nie przechowujemy niczego, co dałoby się powiązać z osobą.'
			],
			contact: 'Uwagi i poprawki: github.com/scrutabor.',
			back: 'wróć na stronę główną'
		}),
		en: {
			title: 'Privacy',
			description: 'Scrutabor requires no registration, uses no cookies, and tracks no one.',
			lede: 'Scrutabor requires no registration, uses no cookies, and tracks no one.',
			points: [
				'There are no cookies, no ads, and no profiles. Visits are counted with Cloudflare Web Analytics, which stores nothing on the device and keeps no identifier, so it cannot recognise a reader or join their visits across sessions or across sites. What it records are aggregate counts — how often a page was opened, in which language, from which country, and in which browser. There is no trace in them of what any one reader did.',
				'A browser that asks not to be tracked, by Do Not Track or Global Privacy Control, is not counted at all. A downloaded copy of the book works entirely offline — it counts nothing and connects to nothing.',
				'A reader’s settings — language, theme, text size, the chosen part and prayer form, the place in the reading — are stored only in the browser’s own storage and never leave the device. The installed app keeps the whole book on the device so that it works offline.',
				'The site is a set of static files served by Cloudflare Pages. Like any web server, Cloudflare sees the IP address it delivers files to. Beyond the aggregate counts described above we keep no logs at all and hold nothing that could be tied to a person.'
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
