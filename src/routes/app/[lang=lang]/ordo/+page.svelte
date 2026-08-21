<script lang="ts">
	import { browser } from '$app/environment';
	import PageNav from '$lib/components/PageNav.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
	import DayPicker, { dayHintText } from '$lib/components/DayPicker.svelte';
	import HelpLevels from '$lib/components/HelpLevels.svelte';
	import { dayHref } from '$lib/proper.svelte';
	import { M, type Lang } from '$lib/i18n';
	import { ORDO } from '$lib/ordo';
	import { dayToday } from '$lib/proprium';

	let { data } = $props();

	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);

	// THE DAY'S STATUS LINE. One line under the table, and it speaks only
	// for the day: which formulary fills the order in front of the reader,
	// or that today has none and another day can be picked. It NEVER
	// explains the other settings — a first cut re-aimed it at whichever
	// row was last touched, and the owner found the shifting subject
	// confusing where the labels already say what the rows are
	// (owner, 2026-08-21, evening).
	let dayChosen = $state('');
	const today = browser ? dayToday() : null;
	const hintLine = $derived(dayHintText(lang, dayChosen, today));

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

		<!-- THE TABELLA (owner, 2026-08-21 — direction D): every setting is
		     a row of one framed table, the same table a movement page and a
		     reading page carry, mode first. Nothing on this page carries a
		     proper, so the day row fills nothing here — it sets the day the
		     six movements will carry. -->
		<div class="help-row">
			<div class="tabella">
				<HelpLevels {lang} />
				<DayPicker {lang} bind:chosen={dayChosen} />
				<RolePicker {lang} />
				<RolePicker {lang} kind="mass" />
			</div>
			<!-- The day's status, and only when it is news: no formulary
			     today, a feria's week, a day ahead. A chosen day says
			     nothing — the table already names it. aria-live, because
			     picking a day changes it with no other announcement. -->
			{#if hintLine}<p class="tabella-hint" aria-live="polite">{hintLine}</p>{/if}
		</div>

		<div class="movements">
			{#each movements as m (m.id)}
				<a class="movement" href={dayHref(`/app/${lang}/ordo/${m.id}`)}>
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
