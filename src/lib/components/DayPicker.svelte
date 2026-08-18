<script lang="ts">
	// Which day's Mass the reader is at. Sits with the role and the kind of
	// Mass because it answers the same sort of question — not what the book
	// says, but what is true where the reader is standing.
	//
	// The choice lives in the URL (`?dies=`), so it survives a reload, can be
	// sent to someone else, and is what the page reads on arrival. Changing it
	// does NOT navigate: the day is fetched and the slots fill in place
	// (decisions #27, revised 2026-08-18).
	//
	// It reads `location` directly and never `page.url`, and this is not a
	// style choice. The downloaded copy runs without SvelteKit's router, so a
	// component that reaches for `$app/state` throws there — the select
	// changed, the handler died on its first line, and nothing else happened.
	// The word panel's `?w=` has always read location for exactly this reason.
	import { replaceState } from '$app/navigation';
	import { browser } from '$app/environment';
	import { M, type Lang } from '$lib/i18n';
	import { DAY_PARAM, chooseDay, proper } from '$lib/proper.svelte';
	import { PROPER_DAYS } from '$lib/proprium';

	let { lang }: { lang: Lang } = $props();
	const msgs = $derived(M[lang]);

	let chosen = $state('');

	// On arrival, and after a history traversal: the URL is the truth.
	export function applyFromLocation(): void {
		if (!browser) return;
		const day = new URL(location.href).searchParams.get(DAY_PARAM) ?? '';
		chosen = day;
		void chooseDay(day || null, lang);
	}

	$effect(() => {
		applyFromLocation();
	});

	function pick(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		chosen = value;
		const url = new URL(location.href);
		if (value) url.searchParams.set(DAY_PARAM, value);
		else url.searchParams.delete(DAY_PARAM);
		// Shallow: the page stays, the address bar catches up.
		if (browser) replaceState(url, {});
		// Told directly rather than left to the URL to announce: nothing here
		// re-runs on a shallow history change.
		void chooseDay(value || null, lang);
	}
</script>

<label class="day">
	<span class="smallcaps">{msgs.dayLabel}</span>
	<select value={chosen} onchange={pick} aria-label={msgs.dayLabel}>
		<option value="">{msgs.dayNone}</option>
		{#each PROPER_DAYS as d (d.id)}
			<option value={d.id}>{d.title[lang]}</option>
		{/each}
	</select>
	{#if proper.loading}
		<span class="state smallcaps">{msgs.dayLoading}</span>
	{:else if proper.failed}
		<span class="state smallcaps">{msgs.dayFailed}</span>
	{/if}
</label>

<style>
	.day {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
	}
	select {
		font: inherit;
		color: inherit;
		background: transparent;
		border: 1px solid var(--rule);
		border-radius: 0.2rem;
		padding: 0.1rem 0.3rem;
		max-width: 14rem;
	}
	.state {
		color: var(--muted);
	}
</style>
