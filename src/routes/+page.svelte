<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { LANGS, M } from '$lib/i18n';

	// Returning readers go straight to their language; first visit chooses.
	onMount(() => {
		const stored = localStorage.getItem('scrutabor-lang');
		if (stored === 'pl' || stored === 'en') {
			goto(`/${stored}`, { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Scrutabor</title>
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
