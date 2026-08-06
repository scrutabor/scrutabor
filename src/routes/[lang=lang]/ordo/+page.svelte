<script lang="ts">
	import { page } from '$app/state';
	import PageNav from '$lib/components/PageNav.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { ORDO } from '$lib/ordo';
	import { role } from '$lib/role.svelte';

	let { data } = $props();

	// What this part actually has to say, counted from the corpus at
	// prerender. Titles only while there are few enough to read: the
	// celebrant says 43 of the parts and gets the number instead.
	const mine = $derived(data.summary[role.value]);

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

		<RolePicker {lang} />
		<!-- What this part actually has to say, counted from the corpus at
		     prerender. The picker changes what the book shows; this says
		     what it means before the reader goes looking. Titles only
		     while there are few enough to read — the celebrant says 43 of
		     the parts and gets the number instead. -->
		<p class="role-part">
			{msgs.rolePart(mine.answers, mine.says.length, mine.says.length <= 4 ? mine.says : [])}
		</p>

		<div class="movements">
			{#each movements as m (m.id)}
				<a class="movement" href="/{lang}/ordo/{m.id}">
					<span class="movement-head">
						<span class="movement-title" lang="la">{m.title}</span>
						<span class="movement-label">{m.label[lang]}</span>
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
	.role-part {
		margin: 0.6rem auto 0;
		max-width: 34rem;
		text-align: center;
		font-size: 0.92rem;
		color: var(--ink-soft);
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
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.movement-title {
		font-size: 1.35rem;
		color: var(--ink);
	}

	.movement-label {
		font-size: 0.9rem;
		color: var(--ink-soft);
		font-style: italic;
		text-align: right;
	}

	.movement-carried {
		display: block;
		margin-top: 0.15rem;
		font-size: 0.85rem;
		color: var(--rubric);
	}
</style>
