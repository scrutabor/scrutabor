<script lang="ts">
	import { LANGS, M } from '$lib/i18n';
</script>

<!-- The root is not a page, it is a router: pick the reader's language
     and get out of the way (prayer-book first — no interstitial). The
     script element below is prerendered into <head> so it runs before
     first paint — the only way a static site can redirect without a
     flash or a backend. Order of trust: the stored choice (maintained
     by the [lang] layout on every visit), then the browser's ordered
     language list, then English. The body is the fallback for no-JS
     readers and crawlers. -->
<svelte:head>
	<title>Scrutabor</title>
	<link rel="alternate" hreflang="en" href="https://scrutabor.org/en" />
	<link rel="alternate" hreflang="pl" href="https://scrutabor.org/pl" />
	<link rel="alternate" hreflang="x-default" href="https://scrutabor.org/en" />
	<script>
		(function () {
			var pick = 'en';
			try {
				var stored = localStorage.getItem('scrutabor-lang');
				if (stored === 'pl' || stored === 'en') {
					pick = stored;
				} else {
					var prefs = navigator.languages || [navigator.language || ''];
					for (var i = 0; i < prefs.length; i++) {
						var base = String(prefs[i]).toLowerCase().split('-')[0];
						if (base === 'pl' || base === 'en') {
							pick = base;
							break;
						}
					}
				}
			} catch (e) {
				/* storage blocked: fall through to English */
			}
			location.replace('/' + pick + location.search + location.hash);
		})();
	</script>
</svelte:head>

<div class="landing">
	<main>
		<h1 class="smallcaps">Scrutabor</h1>
		<p class="motto" lang="la">
			„Da mihi intellectum, et scrutabor legem tuam, et custodiam illam in toto corde meo.”
		</p>
		<div class="langs">
			{#each LANGS as lang (lang)}
				<a class="card" href="/{lang}" {lang}>
					<span class="card-title">{M[lang].langName}</span>
					<span class="card-note">{M[lang].tagline}</span>
				</a>
			{/each}
		</div>
	</main>
</div>

<style>
	.landing {
		max-width: 38rem;
		margin: 0 auto;
		padding: 1.25rem 1.5rem 4rem;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	h1 {
		margin: 0;
		font-size: 3.4rem;
		font-weight: 500;
		letter-spacing: 0.12em;
	}

	.motto {
		margin: 1.8rem 0 0;
		font-style: italic;
		font-size: 1.1rem;
		line-height: 1.6;
		max-width: 28rem;
	}

	.langs {
		margin: 3rem 0 0;
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		text-decoration: none;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		padding: 1.1rem 2.2rem;
		background: var(--surface);
		min-width: 14rem;
	}

	.card:hover {
		background: var(--wash);
	}

	.card-title {
		font-size: 1.4rem;
	}

	.card-note {
		font-size: 0.95rem;
		color: var(--ink-soft);
		font-style: italic;
	}
</style>
