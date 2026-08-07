<script lang="ts">
	// The privacy page: short because the truth is short. There are no
	// accounts and no telemetry anywhere in the architecture, so this page
	// states what IS stored (the reader's own settings, on their own
	// device) and the one thing serving a website necessarily involves.
	// The app stores will require this URL when the wrapped builds ship.
	import SurfaceNav from '$lib/components/SurfaceNav.svelte';
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
			description: 'Scrutabor nie wymaga rejestracji, nie zbiera danych i niczego nie śledzi.',
			lede: 'Scrutabor nie wymaga rejestracji, nie zbiera danych i niczego nie śledzi.',
			points: [
				'Nie używamy plików cookie, analityki, reklam ani żadnych skryptów osób trzecich. Strona nie mierzy odwiedzin i nie buduje żadnych profili.',
				'Ustawienia czytelnika — język, motyw, wielkość pisma, wybrana rola we Mszy, miejsce w lekturze — są zapisywane wyłącznie w pamięci przeglądarki i nigdy nie opuszczają urządzenia. Zainstalowana aplikacja przechowuje na urządzeniu całą książkę, żeby działała bez internetu.',
				'Strona to zbiór statycznych plików serwowanych przez Cloudflare Pages. Jak każdy serwer WWW, Cloudflare widzi adres IP, pod który dostarcza pliki; my nie prowadzimy żadnych dzienników odwiedzin i nie mamy niczego, co można by komuś przekazać.'
			],
			contact: 'Uwagi i poprawki: github.com/scrutabor.',
			back: 'wróć na stronę główną'
		}),
		en: {
			title: 'Privacy',
			description: 'Scrutabor requires no registration, collects no data, and tracks nothing.',
			lede: 'Scrutabor requires no registration, collects no data, and tracks nothing.',
			points: [
				'There are no cookies, no analytics, no ads, and no third-party scripts. The site does not count visits and builds no profiles.',
				'A reader’s settings — language, theme, text size, the chosen part at Mass, the place in the reading — are stored only in the browser’s own storage and never leave the device. The installed app keeps the whole book on the device so that it works offline.',
				'The site is a set of static files served by Cloudflare Pages. Like any web server, Cloudflare sees the IP address it delivers files to; we keep no visit logs and hold nothing that could be handed over.'
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
	<SurfaceNav {lang} base="" />
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
