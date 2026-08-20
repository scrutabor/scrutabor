<script lang="ts">
	import { page } from '$app/state';
	import { M, type Lang } from '$lib/i18n';
	import { langOfPath, pageUrl } from '$lib/url';

	// The client-side error boundary (a stale in-app link to a page that
	// was never prerendered, for example); direct hits on unknown URLs
	// are answered by the static 404.html instead. The language comes from
	// the path being attempted, defaulting to English — and it comes through
	// $lib/url, because in a downloaded copy the path is in the hash and
	// `location.pathname` is wherever the reader unzipped the book, which
	// answered English to a Polish reader every time. It is read by SEGMENT
	// (langOfPath), because a substring test answered Polish to English
	// readers on /en/lemma/plenus.
	const path = $derived(typeof location !== 'undefined' ? pageUrl().pathname : page.url.pathname);
	const lang: Lang = $derived(langOfPath(path));
	const message = $derived(page.status === 404 ? M[lang].pageNotFound : M[lang].errorGeneric);
	// The door leads back into whichever side the reader was on. An error
	// inside the book offers the book — on the site, /{lang} would be an
	// unnoticed exit to the landing (the trap PageNav exists to prevent),
	// and in the downloaded copy it is worse: a link out of the folder to
	// scrutabor.org, in a copy whose whole point is working with no signal.
	const home = $derived(path.startsWith('/app') ? `/app/${lang}` : `/${lang}`);
</script>

<svelte:head>
	<title>{page.status} — Scrutabor</title>
</svelte:head>

<div class="page centered errorpage">
	<main>
		<p class="status">{page.status}</p>
		<p class="line" {lang}>
			{message}
			<a href={home}>{M[lang].goHome} ›</a>
		</p>
	</main>
</div>
