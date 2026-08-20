<script lang="ts">
	// The support page: the live contact door the app stores require
	// (Apple's reviewers visit the Support URL and reject pages without a
	// real contact mechanism), and the honest description of how this
	// project answers — through its public issue trackers, and by mail.
	// jscpd:ignore-start — the same scaffolding as the privacy page,
	// deliberately: landing subpages share one shape.
	import PageNav from '$lib/components/PageNav.svelte';
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
			title: 'Kontakt',
			description: 'Pytania, uwagi i zgłoszenia błędów — GitHub albo e-mail.',
			lede: 'Pytania, uwagi i zgłoszenia błędów są mile widziane.',
			appIssues: 'błędy i propozycje dotyczące aplikacji',
			corpusIssues: 'uwagi do tekstów, przekładów i analiz',
			mailLead: 'Można również napisać na adres e-mail:',
			note: 'Scrutabor jest projektem pro bono — odpowiadamy tak szybko, jak to możliwe.',
			back: 'wróć na stronę główną'
		}),
		en: {
			title: 'Contact',
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
	<PageNav {lang} base="" />
	<main>
		<h1 class="smallcaps">{t.title}</h1>
		<!-- jscpd:ignore-end -->
		<p class="lede">{t.lede}</p>
		<ul class="channels">
			<li>
				<a href="https://github.com/scrutabor/scrutabor/issues" rel="external">scrutabor · Issues</a
				>
				<span class="channel-note">{t.appIssues}</span>
			</li>
			<li>
				<a href="https://github.com/scrutabor/scrutabor-corpus/issues" rel="external"
					>scrutabor-corpus · Issues</a
				>
				<span class="channel-note">{t.corpusIssues}</span>
			</li>
		</ul>
		<p class="mail">
			{t.mailLead} <a href="mailto:contact@scrutabor.org">contact@scrutabor.org</a>
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
		/* The page column is wider than this cap, and a stretch-flex
		   child aligns start — without this the whole block sits left of
		   the viewport centre on wide screens. */
		margin-inline: auto;
		/* A container, so the channel list below can lay itself out by the
		   room it actually has. The reading size changes that room as much
		   as the window does: the same phone offers 17rem of column at the
		   default size and 11.3rem at the largest.
		   The width goes WITH the container. `container-type: inline-size`
		   applies `contain: inline-size`, so the contents stop contributing
		   a width — and the auto inline margins that centre this block also
		   stop it stretching, which left it sized by contents that no longer
		   count. It collapsed to a hundred pixels of column. */
		width: 100%;
		container-type: inline-size;
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
		/* Two aligned columns: the trackers differ in width, and with a
		   per-row flex the descriptions started wherever each link ended.
		   Rows are list items for the reader; the grid sees through them. */
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.7rem 0.8rem;
	}

	.channels li {
		/* Each row shares the list's own columns through subgrid, so the
		   two description cells share one left edge to the pixel. The
		   descriptions must NOT be named .what: app.css gives that class
		   the prose measure with margin-inline auto, and auto margins
		   beat grid alignment — the narrower cell sat centred, one
		   pixel off the shared edge. */
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: subgrid;
		align-items: baseline;
		justify-items: start;
	}

	/* The two columns need 14.6rem: the longer tracker name beside the
	   widest word of its description. Below that the first track cannot
	   give way — it is sized to a link, and a link does not break — so the
	   row carried the page 40px off a 320px screen at the largest reading
	   size. The description goes under its link instead, which is what a
	   list of links and notes reads as anyway. */
	@container (max-width: 15rem) {
		.channels,
		.channels li {
			display: block;
		}

		.channels li + li {
			margin-top: 1rem;
		}

		.channel-note {
			display: block;
		}
	}

	.channels a {
		color: var(--rubric);
		text-decoration: none;
		border-bottom: 1px dotted var(--rubric);
	}

	.channels a:hover {
		border-bottom-style: solid;
	}

	.channel-note {
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
