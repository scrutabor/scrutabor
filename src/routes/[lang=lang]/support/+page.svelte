<script lang="ts">
	// The support page: the live contact door the app stores require
	// (Apple's reviewers visit the Support URL and reject pages without a
	// real contact mechanism), and the honest description of how this
	// project answers — through its public issue trackers, and by mail.
	// jscpd:ignore-start — the same scaffolding as the privacy page,
	// deliberately: landing subpages share one shape.
	import SurfaceNav from '$lib/components/SurfaceNav.svelte';
	import type { Lang } from '$lib/i18n';
	import { bindProse } from '$lib/polish';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	// jscpd:ignore-end

	interface Copy {
		title: string;
		description: string;
		lede: string;
		appIssues: string;
		corpusIssues: string;
		mailLead: string;
		note: string;
		back: string;
	}

	const T: Record<Lang, Copy> = {
		pl: bindProse({
			title: 'Pomoc',
			description: 'Pytania, uwagi i zgłoszenia błędów — GitHub albo e-mail.',
			lede: 'Pytania, uwagi i zgłoszenia błędów są mile widziane.',
			appIssues: 'błędy i propozycje dotyczące aplikacji',
			corpusIssues: 'uwagi do tekstów, przekładów i analiz',
			mailLead: 'Można też napisać wprost:',
			note: 'Scrutabor jest projektem pro bono — odpowiadamy najszybciej, jak się da.',
			back: 'wróć na stronę główną'
		}),
		en: {
			title: 'Support',
			description: 'Questions, feedback, and bug reports — GitHub or e-mail.',
			lede: 'Questions, feedback, and bug reports are welcome.',
			appIssues: 'bugs and suggestions about the app',
			corpusIssues: 'corrections to the texts, translations, and analyses',
			mailLead: 'Or write directly:',
			note: 'Scrutabor is a pro bono project — we answer as quickly as we can.',
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
		<ul class="channels">
			<li>
				<a href="https://github.com/scrutabor/scrutabor/issues" rel="external">scrutabor · Issues</a
				>
				<span class="what">{t.appIssues}</span>
			</li>
			<li>
				<a href="https://github.com/scrutabor/scrutabor-corpus/issues" rel="external"
					>scrutabor-corpus · Issues</a
				>
				<span class="what">{t.corpusIssues}</span>
			</li>
		</ul>
		<p class="mail">
			{t.mailLead} <a href="mailto:js@jakubstefanski.com">js@jakubstefanski.com</a>
		</p>
		<p class="note">{t.note}</p>
		<p class="back"><a href="/{lang}">{t.back} ›</a></p>
	</main>
</div>

<style>
	/* The nav row is shared furniture (app.css). */

	/* jscpd:ignore-start — the frame, the lede and the way home are set
	   exactly as on the privacy page: one shape for the landing's
	   subpages. */
	main {
		max-width: 34rem;
	}

	.lede {
		margin: 1.6rem 0 0;
		font-size: 1.15rem;
	}

	.channels {
		margin: 1.4rem 0 0;
		padding: 0;
		list-style: none;
		text-align: left;
	}

	.channels li {
		margin: 0.7rem 0 0;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.2rem 0.8rem;
	}

	.channels a {
		color: var(--rubric);
		text-decoration: none;
		border-bottom: 1px dotted var(--rubric);
	}

	.channels a:hover {
		border-bottom-style: solid;
	}

	.what {
		color: var(--ink-soft);
		font-size: 0.95rem;
	}

	.mail {
		margin: 1.6rem 0 0;
	}

	.mail a {
		color: inherit;
	}

	.note {
		margin: 1rem 0 0;
		font-size: 0.95rem;
		color: var(--ink-soft);
	}

	.back {
		margin: 2.4rem 0 0;
		font-size: 0.95rem;
	}
	/* jscpd:ignore-end */
</style>
