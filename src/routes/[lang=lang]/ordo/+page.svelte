<script lang="ts">
	import { page } from '$app/state';
	import PageNav from '$lib/components/PageNav.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { ORDO } from '$lib/ordo';

	const lang = $derived(page.params.lang as Lang);
	const msgs = $derived(M[lang]);

	// The Mass at a glance: six movements, each its own page. This is also
	// the answer to "where am I" — a reader who looks up mid-Mass finds the
	// movement by name instead of scrolling a page as long as the whole ordo.
	const movements = $derived(
		ORDO.map((m) => ({
			...m,
			// What a reader will find there. The spine's own `kind` answers
			// this, so the index does not import the corpus — that would pull
			// every text into the bundle of a page that shows none.
			carried: m.entries.filter((e) => e.kind === 'text').map((e) => e.title)
		}))
	);
</script>

<svelte:head>
	<title>Ordo Missæ — Scrutabor</title>
	<meta name="description" content={msgs.ordoDescription} />
</svelte:head>

<div class="page">
	<PageNav {lang} />

	<main>
		<h1 lang="la">Ordo Missæ</h1>
		<p class="subtitle smallcaps">{msgs.ordoSubtitle}</p>

		<!-- The picker's own hint is the whole answer the index gives to a
		     change of part: it says what the setting means, in the book's
		     voice. A second line counting the reader's places said it again
		     in the second person — "you answer at 16 places" — which is
		     instruction on a page meant for browsing, and no missal does
		     it. The parts themselves are marked where the reader meets
		     them, which is where it is of any use. -->
		<RolePicker {lang} />

		<div class="movements">
			{#each movements as m (m.id)}
				<a class="movement" href="/{lang}/ordo/{m.id}">
					<span class="movement-head">
						<span class="movement-title" lang="la">{m.title}</span>
						<span class="hung-note">{m.label[lang]}</span>
					</span>
					{#if m.carried.length}
						<span class="movement-carried" lang="la">{m.carried.join(' · ')}</span>
					{/if}
				</a>
			{/each}
		</div>
	</main>
</div>

<style>
	.subtitle {
		margin: 0.3rem 0 0;
		text-align: center;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.movements {
		margin: 2.6rem auto 0;
		max-width: 30rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	/* One card per movement, in the catalog's idiom — the Mass read as its
	   own table of contents. */
	.movement {
		display: block;
		text-decoration: none;
		border: 1px solid var(--border);
		border-radius: 0.6rem;
		padding: 0.85rem 1.4rem 0.95rem;
		background: var(--surface);
	}

	.movement:hover {
		background: var(--wash);
	}

	.movement-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.15rem 1rem;
	}

	.movement-title {
		font-size: 1.35rem;
		color: var(--ink);
	}

	.movement-carried {
		display: block;
		margin-top: 0.15rem;
		font-size: 0.85rem;
		color: var(--rubric);
	}
</style>
