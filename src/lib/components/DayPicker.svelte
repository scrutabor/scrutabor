<script module lang="ts">
	import { M, type Lang } from '$lib/i18n';
	import { dayHint, dayToday, type Today } from '$lib/proprium';

	// The line under the index's table for the day setting. The decision
	// lives in $lib/proprium so that every combination of "what today is"
	// and "what the reader picked" can be enumerated in a unit test — it
	// got the order wrong once and shipped. Exported at module level so
	// the Ordo index can render it as the tabella's one hint line without
	// duplicating the mapping (the tabella shows ONE hint, for the setting
	// last touched — owner, 2026-08-21, direction D).
	//
	// Built as ONE string rather than branched across template lines: a
	// branch that spans lines puts the newlines and tabs between them into
	// the text. The sentence rendered correctly on the page while
	// `textContent` came back with a line break and four tabs in the
	// middle of it.
	export function dayHintText(lang: Lang, chosen: string, now: Today | null): string {
		const msgs = M[lang];
		const which = dayHint(chosen, now);
		switch (which.kind) {
			case 'chosen':
				// nothing: the table already names the chosen day in the
				// rubric, and "its texts fill the order" taught nobody
				// anything (owner, 2026-08-21 — drop the trivial hints)
				return '';
			case 'week':
				return `${msgs.dayWeekOf} ${which.sunday.title[lang]}`;
			case 'ahead':
				return msgs.dayAhead;
			default:
				return msgs.dayHint.none;
		}
	}
</script>

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
	import { pageUrl } from '$lib/url';
	import { replaceState } from '$app/navigation';
	import { browser } from '$app/environment';
	import { DAY_PARAM, chooseDay, proper, rememberDay, storedDay } from '$lib/proper.svelte';
	import { PROPER_DAYS, SEASONS, dayById } from '$lib/proprium';

	// ONE FORM, a row of the tabella (owner, 2026-08-21 — direction D): the
	// boxed pill of the index and the bare line of the reading pages were
	// two costumes for one control, and the inconsistency was the defect.
	// `chosen` is bindable so the index can build the table's single hint
	// line from the same value this control is actually showing.
	let { lang, chosen = $bindable('') }: { lang: Lang; chosen?: string } = $props();
	const msgs = $derived(M[lang]);
	const labelId = 'day-label';

	/** What today is, whether or not this edition carries its Mass. Read once
	 * per mount rather than per render: it cannot change while a page is open,
	 * and reading the clock in a derived would make every keystroke ask. */
	let now = $state(browser ? dayToday() : null);

	// What the folded control is showing. A select takes the width of its
	// WIDEST option rather than its chosen one, so "bez formularza" sat in the
	// room "III Niedziela Adwentu" needs and trailed dead space. The sizer
	// below is this text, hidden, and the select is laid over it.
	const isToday = $derived(!!chosen && chosen === now?.id);
	const shown = $derived.by(() => {
		const day = PROPER_DAYS.find((d) => d.id === chosen);
		if (!day) return msgs.dayNone;
		const partial = day.partial ? ` ${msgs.dayPartial}` : '';
		return `${isToday ? `${msgs.dayIsToday} ` : ''}${day.title[lang]}${partial}`;
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
		// Written once and then read through the LOCAL, never back through
		// the state: this runs inside an $effect, and an effect that writes
		// `now` (a fresh object every call) and then reads it depends on its
		// own write and re-runs forever. Storage kept the old shape from
		// looping by accident — the second run short-circuited on the
		// remembered day before reaching `now.id` — so the loop surfaced
		// exactly where storage is denied.
		const today = dayToday();
		now = today;
		// The order is the order of how deliberate each answer is. A link
		// someone was sent names its day on purpose. A choice made today is
		// the reader's own and holds until midnight. Failing both, the book
		// opens on today — which is the question this whole layer exists to
		// answer, and the reason the calendar was built.
		//
		// Only what the shelf can honour is REMEMBERED. A link naming a day
		// this edition has not written (or nothing at all) is answered on the
		// spot and forgotten: one bad link must not blank the reader's day
		// until midnight, which is the poisoning the review reproduced.
		const usable = (id: string | null): id is string => id !== null && (id === '' || !!dayById(id));
		const named = pageUrl().searchParams.get(DAY_PARAM);
		if (named !== null && !usable(named)) {
			chosen = '';
			void chooseDay(named, lang);
			return;
		}
		const stored = storedDay();
		const day = named ?? (usable(stored) ? stored : today.id);
		chosen = day;
		rememberDay(day);
		void chooseDay(day || null, lang);
	}

	$effect(() => {
		applyFromLocation();
	});

	// A downloaded copy navigates by hash, and a hash change that stays on
	// the same page never re-renders it (offline/entry.ts) — so a ?dies=
	// arriving that way would name a day the page does not show. The site
	// never fires this: its query changes are shallow replaceState.
	function onHashChange() {
		applyFromLocation();
	}

	function pick(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		chosen = value;
		rememberDay(value);
		const url = pageUrl();
		if (value) url.searchParams.set(DAY_PARAM, value);
		else url.searchParams.delete(DAY_PARAM);
		// Shallow: the page stays, the address bar catches up.
		if (browser) replaceState(url, {});
		// Told directly rather than left to the URL to announce: nothing here
		// re-runs on a shallow history change.
		void chooseDay(value || null, lang);
	}
</script>

<svelte:window onhashchange={onHashChange} />

<div class="picker day row" class:on={!!chosen}>
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
	<!-- One PERSISTENT live region for everything the pick changes off-screen:
	     a live region added together with its content is not reliably
	     announced, so the span is always in the tree. A sighted reader sees
	     the slots fill above and below; this is that fact for everyone else —
	     the states while they last, and the day's arrival when it lands,
	     which otherwise changed five slots of Latin around the reader's
	     cursor with nothing said at all. -->
	<span class="states" aria-live="polite">
		{#if proper.slow}
			<span class="state smallcaps">{msgs.dayLoading}</span>
		{:else if proper.failed}
			<span class="state smallcaps">{msgs.dayFailed}</span>
		{:else if proper.unwritten}
			<span class="state smallcaps">{msgs.dayUnwritten}</span>
		{:else if chosen && proper.payload?.day === chosen}
			<span class="sr-only">{shown} — {msgs.dayInPlace}</span>
		{/if}
	</span>
</div>

<style>
	/* A ROW OF THE TABELLA, like the role and the Mass beneath it. It
	   cannot be their row of words — three parts fit on a line and sixty
	   days do not — so it stays a native select, which keeps the phone's
	   own picker, the keyboard, and the screen reader, none of which a
	   hand-built listbox would give back for free. What is styled away is
	   only the browser's idea of a form field. */
	/* The caret is drawn here rather than left to the browser: the native
	   one is a different mark on every platform. The field carries it,
	   because a select cannot hold a pseudo-element of its own. */
	.field {
		position: relative;
		display: inline-flex;
		max-width: 100%;
	}

	/* Hidden, and the only thing that has a size. Both it and the select
	   carry the same padding, so the box is the chosen text plus the room
	   the caret needs and nothing else. */
	.sizer,
	select {
		font: inherit;
		font-size: 0.92rem;
		/* Block padding for the touch target (WCAG 2.5.8's 24px — the bare
		   line was 19), given back to the row by the margin so the row
		   keeps its density, the same trade the role words make. */
		padding: 0.3rem 1.05rem 0.3rem 0;
		margin-block: -0.25rem;
	}

	.sizer {
		visibility: hidden;
		white-space: nowrap;
		overflow: hidden;
	}

	.field::after {
		content: '';
		position: absolute;
		inset-inline-end: 0.1rem;
		top: 50%;
		width: 0.3em;
		height: 0.3em;
		border-inline-end: 1.2px solid currentColor;
		border-bottom: 1.2px solid currentColor;
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
		cursor: pointer;
		/* The list itself is drawn by the platform, so it has to be told which
		   way the page is lit or a dark reader gets a white menu. */
		color-scheme: var(--scheme);
	}

	/* The width has to be the CHOSEN weight, or setting a day thickens the
	   word and nudges the row. Chosen reads as chosen the way the words
	   do: the rubric, and heavier. */
	.picker.on .sizer {
		font-weight: 600;
	}

	.picker.on select {
		color: var(--rubric);
		font-weight: 600;
	}

	.picker.on .field::after {
		color: var(--rubric);
	}

	select:hover {
		color: var(--rubric);
	}

	/* The same standoff the role picker gives its own words. Inset, the
	   ring sat hard against the letters and read as a form field being
	   validated rather than as the house focus mark. */
	select:focus-visible {
		outline: none;
	}

	.field:has(select:focus-visible) {
		outline: 2px solid var(--rubric);
		outline-offset: 3px;
		border-radius: 0.15rem;
	}

	.state {
		margin-inline-start: 0.5rem;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		color: var(--ink-soft);
	}

	@media print {
		/* A printed prayer says which day produced it, and nothing that was
		   not chosen. The select cannot be reduced the way a radio group can,
		   so the field is hidden and the day is printed from its own value. */
		.field {
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

		select {
			position: static;
			width: auto;
			padding: 0;
			margin: 0;
			font-size: 6.5pt;
			font-weight: 600;
			color: var(--ink);
		}

		.state {
			display: none;
		}
	}
</style>
