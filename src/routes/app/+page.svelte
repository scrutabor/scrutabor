<script lang="ts">
	import { LANGS, M } from '$lib/i18n';
</script>

<!-- The app's front door is not a page, it is a router: pick the
     reader's language and get out of the way (prayer-book first — no
     interstitial). The script element below is prerendered into <head>
     so it runs before first paint — the only way a static site can
     redirect without a flash or a backend. Order of trust: the stored
     choice (maintained by the [lang] layout on every visit), then the
     browser's ordered language list, then English. The body is the
     fallback for no-JS readers and crawlers.

     This is also the PWA's start_url, which is why it lives at /app/
     with a trailing slash (see +page.ts): the service worker's scope is
     /app/, and a scope only controls what it prefixes — an installed
     app whose first document sat outside it could not open offline. -->
<svelte:head>
	<title>Scrutabor</title>
	<link rel="alternate" hreflang="en" href="https://scrutabor.org/app/en" />
	<link rel="alternate" hreflang="pl" href="https://scrutabor.org/app/pl" />
	<link rel="alternate" hreflang="x-default" href="https://scrutabor.org/app/en" />
	<script>
		// jscpd:ignore-start — one detection rule, two routers: this script
		// is kept deliberately in step with routes/+page.svelte, which
		// differs only in where it sends the reader.
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
			// jscpd:ignore-end
			location.replace('/app/' + pick + location.search + location.hash);
		})();
	</script>
</svelte:head>

<!-- jscpd:ignore-start — the no-JS fallback the two routers share: same
     cards, same order, different hrefs. Named rather than merged; a shared
     component would put a hydrating dependency under a page whose whole
     job is to run before hydration. -->
<div class="page centered landing">
	<main>
		<h1 class="smallcaps">Scrutabor</h1>
		<p class="motto" lang="la">
			„Da mihi intellectum, et scrutabor legem tuam, et custodiam illam in toto corde meo.”
		</p>
		<div class="langs">
			{#each LANGS as lang (lang)}
				<a class="lang-card" href="/app/{lang}" {lang}>
					<span class="card-title">{M[lang].langName}</span>
					<span class="card-note">{M[lang].tagline}</span>
				</a>
			{/each}
		</div>
	</main>
</div>
<!-- jscpd:ignore-end -->

<!-- Styles: the brand furniture (.motto, .langs, .lang-card, .card-title,
     .card-note) is shared with the site root's router and lives in
     app.css — the two routers must stay the same object. -->
