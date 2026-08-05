<script lang="ts">
	import { page } from '$app/state';
	import { TEXTS } from '$lib/corpus';
	import HelpLevels from '$lib/components/HelpLevels.svelte';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import TextBody from '$lib/components/TextBody.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import WakeLockToggle from '$lib/components/WakeLockToggle.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { ORDO } from '$lib/ordo';
	import { ribbon } from '$lib/ribbon.svelte';

	const lang = $derived(page.params.lang as Lang);
	const msgs = $derived(M[lang]);

	// The flow shares the reading page's help ladder (and its stored
	// setting) but not its study machinery: words here are plain text.
	// Following the Mass is the job; a word worth pursuing has its own
	// page one tap away, at the part's title.
	let helpLevel = $state(1);

	// The flow is the longest surface in the book and the one a reader
	// leaves and comes back to mid-Mass — it keeps a ribbon like the rest.
	ribbon(() => 'scrutabor-pos:ordo');
</script>

<svelte:head>
	<title>Ordo Missæ — Scrutabor</title>
	<meta name="description" content={msgs.ordoDescription} />
</svelte:head>

<div class="page">
	<header>
		<nav>
			<a href="/{lang}" class="back smallcaps">scrutabor</a>
			<div class="nav-right">
				<WakeLockToggle {lang} />
				<LangMenu {lang} />
				<ThemeToggle {lang} />
			</div>
		</nav>
		<h1 lang="la">Ordo Missæ</h1>
		<p class="subtitle smallcaps">{msgs.ordoSubtitle}</p>
		<div class="help-row">
			<HelpLevels {lang} bind:value={helpLevel} />
		</div>
	</header>

	<main>
		{#each ORDO as section (section.id)}
			<h2 class="section smallcaps">{section.label[lang]}</h2>
			{#each section.entries as e (e.id)}
				{@const entry = e.text ? TEXTS[e.text] : undefined}
				<section class="part">
					<div class="part-head">
						{#if e.text && entry}
							<a class="part-title" href="/{lang}/{e.text}" lang="la"
								>{e.title}<span class="chev" aria-hidden="true">›</span></a
							>
						{:else}
							<span class="part-title" lang="la">{e.title}</span>
						{/if}
						{#if e.kind !== 'text'}
							<span class="mark smallcaps"
								>{e.kind === 'proper' ? msgs.ordoProper : msgs.ordoPending}</span
							>
						{/if}
					</div>
					<!-- The what-happens line rides with any help, like the rubric
					     narratives it continues (reading-ux §5). -->
					{#if helpLevel >= 1}
						<p class="part-note">
							{e.note[lang]}{#if e.when}<span class="when">{e.when[lang]}</span>{/if}
						</p>
					{/if}
					{#if entry}
						<div class="part-text">
							<TextBody doc={entry.text} gloss={entry.glosses[lang]} {lang} {helpLevel} />
						</div>
					{/if}
				</section>
			{/each}
		{/each}
	</main>
</div>

<style>
	.page {
		max-width: 38rem;
		margin: 0 auto;
		padding: 1.25rem 1.5rem 4rem;
	}

	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.back {
		text-decoration: none;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.back:hover {
		color: var(--ink);
	}

	h1 {
		margin: 1.8rem 0 0;
		font-size: 2.6rem;
		font-weight: 500;
		text-align: center;
	}

	.subtitle {
		margin: 0.3rem 0 0;
		text-align: center;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.help-row {
		display: flex;
		justify-content: center;
		margin: 1.4rem 0 2.2rem;
	}

	.section {
		margin: 2.8rem 0 1.4rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--rubric);
		text-align: center;
	}

	.section:first-child {
		margin-top: 0;
	}

	/* Every part is a station on one road: the rule marks the step, and a
	   part whose text we carry simply continues below it. */
	.part {
		margin: 0 0 1.8rem;
		padding-top: 1.1rem;
		border-top: 1px solid var(--border);
	}

	.part-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.part-title {
		font-size: 1.3rem;
		color: var(--ink);
		text-decoration: none;
	}

	a.part-title:hover {
		color: var(--rubric);
	}

	.chev {
		display: inline-block;
		transform: translateY(-0.09em);
		margin-inline: 0.15em;
		color: var(--ink-soft);
	}

	.mark {
		flex: none;
		font-size: 0.7rem;
		color: var(--ink-soft);
	}

	.part-note {
		margin: 0.3rem 0 0;
		color: var(--ink-soft);
		font-size: 0.98rem;
		line-height: 1.5;
	}

	/* The condition is a footnote to the part, not a clause of its
	   description — the note prose already carries dashes of its own. */
	.when {
		display: block;
		margin-top: 0.2rem;
		font-style: italic;
		font-size: 0.9rem;
	}

	.part-text {
		margin-top: 1.2rem;
	}
</style>
