<script lang="ts">
	// A date and a formulary are related, but not interchangeable. The calendar
	// may know the date while this edition lacks its proper, and the reader may
	// deliberately choose a formulary from the full list without asking about a
	// civil date. The URL carries either answer in one `?dies=` value.
	import { pageUrl } from '$lib/url';
	import { replaceState } from '$app/navigation';
	import { browser } from '$app/environment';
	import { M, type Lang } from '$lib/i18n';
	import DayPickerDialog from '$lib/components/DayPickerDialog.svelte';
	import { DAY_PARAM, chooseDay, proper, rememberChoice, storedChoice } from '$lib/proper.svelte';
	import { calendarCovers, dayOn, isoDate } from '$lib/kalendarium';
	import { PROPER_DAYS, dayByCalendarKey, dayById } from '$lib/proprium';

	let { lang }: { lang: Lang } = $props();
	const msgs = $derived(M[lang]);
	const labelId = 'day-label';

	let chosen = $state('');
	let selectedDate = $state<string | null>(null);
	let applied = $state(false);
	let open = $state(false);
	let todayDate = $state(browser ? isoDate(new Date()) : '');

	const day = $derived(PROPER_DAYS.find((candidate) => candidate.id === chosen));
	const shown = $derived.by(() => {
		if (day) {
			const partial = day.partial ? ` ${msgs.dayPartial}` : '';
			return `${day.title[lang]}${partial}`;
		}
		if (selectedDate) return msgs.dayPicker.dateOnly;
		return msgs.dayNone;
	});

	const dateShown = $derived(
		selectedDate
			? new Intl.DateTimeFormat(lang === 'pl' ? 'pl-PL' : 'en-GB', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				}).format(new Date(`${selectedDate}T12:00:00`))
			: ''
	);

	type Choice = { id: string; date: string | null; requested: string | null };

	function resolve(value: string): Choice {
		if (calendarCovers(value)) {
			const on = dayOn(value);
			const available = on ? dayByCalendarKey(on.formulary) : undefined;
			return {
				id: available?.id ?? '',
				date: value,
				requested: available?.id ?? on?.formulary ?? null
			};
		}
		const available = dayById(value);
		return { id: available?.id ?? '', date: null, requested: available?.id ?? (value || null) };
	}

	function honour(choice: Choice, remember: boolean): void {
		chosen = choice.id;
		selectedDate = choice.date;
		applied = true;
		if (remember) rememberChoice(choice.id, choice.date);
		void chooseDay(choice.requested, lang, choice.date);
	}

	// A deliberate URL wins, then today's unexpired memory, then today's civil
	// date. Invalid links are answered once and never allowed to poison memory.
	export function applyFromLocation(): void {
		if (!browser) return;
		todayDate = isoDate(new Date());
		const named = pageUrl().searchParams.get(DAY_PARAM);
		if (named !== null) {
			const choice = resolve(named);
			const usable = calendarCovers(named) || !!dayById(named);
			honour(choice, usable);
			return;
		}
		const remembered = storedChoice();
		const value =
			remembered && (calendarCovers(remembered) || !!dayById(remembered)) ? remembered : todayDate;
		honour(resolve(value), true);
	}

	$effect(() => {
		applyFromLocation();
	});

	function onHashChange(): void {
		applyFromLocation();
	}

	function pick(choice: Choice): void {
		honour(choice, true);
		const url = pageUrl();
		const value = choice.date ?? choice.id;
		if (value) url.searchParams.set(DAY_PARAM, value);
		else url.searchParams.delete(DAY_PARAM);
		if (browser) replaceState(url, {});
		open = false;
	}
</script>

<svelte:window onhashchange={onHashChange} />

<div class="picker day row" class:on={!!chosen || !!selectedDate}>
	<span class="label smallcaps" id={labelId}>{msgs.dayLabel}</span>
	<button
		type="button"
		class="day-open"
		aria-labelledby={`${labelId} day-value`}
		aria-haspopup="dialog"
		aria-expanded={open}
		onclick={() => (open = true)}
	>
		<span class="choice-copy">
			<span id="day-value" class="choice-title">{shown}</span>
			{#if dateShown}<span class="choice-date">{dateShown}</span>{/if}
		</span>
		<svg
			class="calendar-icon"
			class:dated={!!dateShown}
			viewBox="0 0 20 20"
			aria-hidden="true"
			focusable="false"
		>
			<rect x="3" y="4.5" width="14" height="12.5" rx="1.75"></rect>
			<path d="M6.5 2.75v3.5M13.5 2.75v3.5M3 8h14"></path>
		</svg>
		<span class="sr-only"> — {msgs.dayPicker.open}</span>
	</button>
	{#if applied}
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
	{/if}
</div>

{#if open}
	<DayPickerDialog
		{lang}
		{chosen}
		{selectedDate}
		{todayDate}
		onpick={pick}
		onclose={() => (open = false)}
	/>
{/if}

<style>
	.picker {
		position: relative;
	}

	.day-open {
		display: inline-flex;
		align-items: center;
		gap: 0.95rem;
		max-width: 100%;
		appearance: none;
		border: 0;
		background: transparent;
		color: var(--ink-soft);
		font: inherit;
		font-size: 0.92rem;
		text-align: start;
		padding: 0.28rem 0;
		margin-block: -0.23rem;
		cursor: pointer;
	}

	.choice-copy {
		display: grid;
		row-gap: 0.2rem;
		min-width: 0;
	}

	.choice-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.choice-date {
		font-size: 0.8rem;
		font-weight: 400;
		color: var(--ink-soft);
		line-height: 1.25;
	}

	.calendar-icon {
		flex: 0 0 auto;
		align-self: center;
		width: 1rem;
		height: 1rem;
		fill: none;
		stroke: currentcolor;
		stroke-width: 1.35;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: color 120ms ease;
	}

	.calendar-icon.dated {
		transform: translateY(-0.08rem);
	}

	.day-open:hover .calendar-icon {
		color: var(--rubric);
	}

	.picker.on .choice-title {
		color: var(--rubric);
		font-weight: 600;
	}

	.state {
		margin-inline-start: 0.5rem;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		color: var(--ink-soft);
	}

	@media print {
		.day-open {
			padding: 0;
			margin: 0;
			font-size: 6.5pt;
			color: var(--ink);
			cursor: default;
		}

		.calendar-icon,
		.state {
			display: none;
		}
	}
</style>
