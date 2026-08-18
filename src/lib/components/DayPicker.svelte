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
	import { DAY_PARAM, chooseDay, proper, rememberDay, storedDay } from '$lib/proper.svelte';
	import { PROPER_DAYS, SEASONS } from '$lib/proprium';

	// `compact` is the form the control takes on a page being read rather than
	// chosen from, exactly as the role and Mass-kind picker has: label and
	// value on one line, no box, no hint.
	let { lang, compact = false }: { lang: Lang; compact?: boolean } = $props();
	const msgs = $derived(M[lang]);
	// Both forms can stand on one page, and a label must not be pointed at by
	// a control that is not its own.
	const labelId = $derived(`day-label-${compact ? 'compact' : 'full'}`);

	let chosen = $state('');
	// What the folded control is showing. A select takes the width of its
	// WIDEST option rather than its chosen one, so "bez formularza" sat in the
	// room "III Niedziela Adwentu" needs and trailed dead space. The sizer
	// below is this text, hidden, and the select is laid over it.
	const shown = $derived.by(() => {
		const day = PROPER_DAYS.find((d) => d.id === chosen);
		if (!day) return msgs.dayNone;
		return `${day.title[lang]}${day.partial ? ` ${msgs.dayPartial}` : ''}`;
	});

	// On arrival, and after a history traversal. The URL wins where it
	// speaks — a link someone was sent names its day on purpose — and the
	// remembered choice answers where it does not, which is every step
	// through the six movement pages.
	//
	// It READS here and never writes. `replaceState` needs SvelteKit's router,
	// and at mount the router does not exist yet: a first draft wrote the
	// remembered day into the address bar here and threw on every arrival,
	// leaving the select empty and the slots unfilled. The word panel's `?w=`
	// has always read on arrival and written only from a tap, and this follows
	// it. What keeps the address bar truthful instead is that every link out
	// of a page carries the day with it (`dayHref` in lib/proper.svelte).
	export function applyFromLocation(): void {
		if (!browser) return;
		const named = new URL(location.href).searchParams.get(DAY_PARAM);
		const day = named ?? storedDay();
		chosen = day;
		rememberDay(day);
		void chooseDay(day || null, lang);
	}

	$effect(() => {
		applyFromLocation();
	});

	function pick(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		chosen = value;
		rememberDay(value);
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

<div class="picker day" class:compact class:on={!!chosen}>
	<span class="label smallcaps" id={labelId}>{msgs.dayLabel}</span>
	<span class="field">
		<!-- The width-setter. The same trick the role picker uses for its own
		     words, and for the same reason: the box must be the size of what
		     is actually shown. -->
		<span class="sizer" aria-hidden="true">{shown}</span>
		<select value={chosen} onchange={pick} aria-labelledby={labelId}>
			<option value="">{msgs.dayNone}</option>
			<!-- Grouped by season, which is how a reader holds the year and how
			     `ProperDay.season` was declared to be used. A flat list is fine
			     for one season and unreadable for the twelve months this will
			     become. -->
			{#each SEASONS as season (season)}
				{@const days = PROPER_DAYS.filter((d) => d.season === season)}
				{#if days.length}
					<optgroup label={msgs.seasons[season]}>
						{#each days as d (d.id)}
							<option value={d.id}>{d.title[lang]}{d.partial ? ` ${msgs.dayPartial}` : ''}</option>
						{/each}
					</optgroup>
				{/if}
			{/each}
		</select>
	</span>
	{#if proper.slow}
		<span class="state smallcaps">{msgs.dayLoading}</span>
	{:else if proper.failed}
		<span class="state smallcaps">{msgs.dayFailed}</span>
	{/if}
	{#if !compact}<p class="hint">{chosen ? msgs.dayHint.chosen : msgs.dayHint.none}</p>{/if}
</div>

<style>
	/* The day belongs to the same family as the reader's part and the kind of
	   Mass (lib/components/RolePicker.svelte), so it wears their clothes: the
	   label above in small caps, the control as a pill, a hint beneath saying
	   what the setting is doing. It cannot be their row of words — three parts
	   fit on a line and sixty days do not — so it stays a native select, which
	   also keeps the phone's own picker, the keyboard, and the screen reader,
	   none of which a hand-built listbox would give back for free.
	   What is styled away is only the browser's idea of a form field. */
	.picker {
		margin: 1.6rem auto 0;
		max-width: 34rem;
		text-align: center;
	}

	.label {
		display: block;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		color: var(--ink-soft);
	}

	/* The caret is drawn here rather than left to the browser: the native one
	   is a different mark on every platform, and this is the only control on
	   the page. The field is what carries it, because a select cannot hold a
	   pseudo-element of its own. */
	.field {
		position: relative;
		display: inline-flex;
		margin-top: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		max-width: 100%;
	}

	/* Hidden, and the only thing that has a size. Both it and the select carry
	   the same padding, so the box is the chosen text plus the room the caret
	   needs and nothing else. */
	.sizer,
	select {
		font: inherit;
		font-size: 0.95rem;
		padding: 0.35rem 2.2rem 0.35rem 1.1rem;
	}

	.sizer {
		visibility: hidden;
		white-space: nowrap;
		overflow: hidden;
	}

	.field::after {
		content: '';
		position: absolute;
		inset-inline-end: 1rem;
		top: 50%;
		width: 0.36em;
		height: 0.36em;
		border-inline-end: 1.5px solid currentColor;
		border-bottom: 1.5px solid currentColor;
		transform: translateY(-70%) rotate(45deg);
		color: var(--ink-soft);
		pointer-events: none;
	}

	select {
		appearance: none;
		position: absolute;
		inset: 0;
		width: 100%;
		color: var(--ink-soft);
		background: transparent;
		border: 0;
		border-radius: inherit;
		cursor: pointer;
		/* The list itself is drawn by the platform, so it has to be told which
		   way the page is lit or a dark reader gets a white menu. */
		color-scheme: var(--scheme);
	}

	/* Chosen reads as chosen, the way a segmented option does: the pill fills
	   and the word comes forward. A reader glancing down should see whether
	   the Mass in front of them is a day's or the bare order. */
	.picker.on .field {
		background: var(--wash);
	}

	.picker.on select {
		color: var(--ink);
	}

	/* The ring traces the control, with room to breathe. On the select it sat
	   hard against the letters, because the select IS the text box now. */
	select:focus-visible {
		outline: none;
	}

	.field:has(select:focus-visible) {
		outline: 2px solid var(--rubric);
		outline-offset: 3px;
	}

	.hint {
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
		color: var(--ink-soft);
	}

	.state {
		margin-inline-start: 0.5rem;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		color: var(--ink-soft);
	}

	/* On a page being read rather than chosen from, the same rule as the role
	   and the Mass: no box. The label and the day on one line, the day in the
	   rubric when it is set, so the three settings above the text read as one
	   row of words and not as a row of words with a form control on the end. */
	.picker.compact {
		margin: 0;
		display: inline-flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: baseline;
		/* the same breathing space the role and Mass rows keep between their
		   label and their words */
		gap: 0.2rem 0.6rem;
		max-width: 100%;
	}

	.picker.compact .label {
		display: inline;
		font-size: 0.68rem;
	}

	.picker.compact .field {
		margin-top: 0;
		border: 0;
		background: none;
	}

	.picker.compact .field::after {
		inset-inline-end: 0.1rem;
		width: 0.3em;
		height: 0.3em;
		border-width: 1.2px;
	}

	.picker.compact .sizer,
	.picker.compact select {
		font-size: 0.9rem;
		padding: 0 1.05rem 0 0;
	}

	/* The width has to be the CHOSEN weight, or setting a day thickens the
	   word and nudges the row. */
	.picker.compact.on .sizer {
		font-weight: 600;
	}

	/* The same standoff the role picker gives its own words. Inset, the ring
	   sat hard against the letters and read as a form field being validated
	   rather than as the house focus mark. */
	.picker.compact .field:has(select:focus-visible) {
		outline-offset: 3px;
		border-radius: 0.15rem;
	}

	.picker.compact.on select {
		color: var(--rubric);
		font-weight: 600;
	}

	.picker.compact.on .field::after {
		color: var(--rubric);
	}

	select:hover {
		color: var(--rubric);
	}

	@media print {
		/* A printed prayer says which day produced it, and nothing that was
		   not chosen. The select cannot be reduced the way a radio group can,
		   so the field is hidden and the day is printed from its own value. */
		.picker,
		.picker.compact {
			display: inline-flex;
			flex-wrap: nowrap;
			align-items: baseline;
			gap: 0.25rem;
			margin: 0;
			max-width: none;
			white-space: nowrap;
		}

		.label,
		.picker.compact .label {
			display: inline;
			font-size: 5.5pt;
			letter-spacing: 0.06em;
			color: var(--ink-soft);
		}

		.label::after {
			content: ':';
		}

		.field,
		.picker.compact .field {
			border: 0;
			background: none;
			margin: 0;
		}

		.field::after {
			display: none;
		}

		.sizer {
			display: none;
		}

		select,
		.picker.compact select,
		.picker.compact.on select {
			position: static;
			width: auto;
			padding: 0;
			font-size: 6.5pt;
			font-weight: 600;
			color: var(--ink);
		}

		.hint,
		.state {
			display: none;
		}
	}
</style>
