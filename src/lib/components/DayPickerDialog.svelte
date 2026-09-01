<script lang="ts">
	import { SvelteDate } from 'svelte/reactivity';
	import { M, type Lang } from '$lib/i18n';
	import {
		DATE_MAX,
		DATE_MIN,
		calendarCovers,
		dayOf,
		dayOn,
		isoDate,
		type Kalendar
	} from '$lib/kalendarium';
	import { PROPER_DAYS, SEASONS, dayByCalendarKey, dayById, type ProperDay } from '$lib/proprium';

	let {
		lang,
		chosen,
		selectedDate,
		todayDate,
		onpick,
		onclose
	}: {
		lang: Lang;
		chosen: string;
		selectedDate: string | null;
		todayDate: string;
		onpick: (choice: { id: string; date: string | null; requested: string | null }) => void;
		onclose: () => void;
	} = $props();

	const msgs = $derived(M[lang]);
	const locale = $derived(lang === 'pl' ? 'pl-PL' : 'en-GB');
	function initialValues(): { date: string; day: string } {
		const today = calendarCovers(todayDate) ? todayDate : DATE_MIN;
		return {
			date: calendarCovers(selectedDate ?? '') ? (selectedDate as string) : today,
			day: chosen
		};
	}
	const initial = initialValues();
	const canChooseToday = $derived(calendarCovers(todayDate));
	let tab = $state<'calendar' | 'list'>('calendar');
	let pendingDate = $state(initial.date);
	let pendingDay = $state(initial.day);
	let month = $state(initial.date.slice(0, 7));
	let query = $state('');
	let listDay = $state(initial.day);
	let frame = $state<HTMLElement | null>(null);

	function localDate(iso: string): Date {
		const [year, monthNumber, day] = iso.split('-').map(Number);
		return new SvelteDate(year, monthNumber - 1, day, 12);
	}

	function clampDate(iso: string): string {
		if (iso < DATE_MIN) return DATE_MIN;
		if (iso > DATE_MAX) return DATE_MAX;
		return iso;
	}

	function moveDate(iso: string, days: number): string {
		const date = localDate(iso);
		date.setDate(date.getDate() + days);
		return clampDate(isoDate(date));
	}

	function moveMonth(amount: number): void {
		const [year, monthNumber] = month.split('-').map(Number);
		const date = new SvelteDate(year, monthNumber - 1 + amount, 1, 12);
		const next = isoDate(date).slice(0, 7);
		if (`${next}-01` > DATE_MAX || `${next}-31` < DATE_MIN) return;
		month = next;
	}

	function selectDate(iso: string, focus = false): void {
		if (!calendarCovers(iso)) return;
		pendingDate = iso;
		month = iso.slice(0, 7);
		const on = dayOn(iso);
		pendingDay = on ? (dayByCalendarKey(on.formulary)?.id ?? '') : '';
		if (focus) {
			requestAnimationFrame(() => {
				frame?.querySelector<HTMLElement>(`[data-date="${iso}"]`)?.focus();
			});
		}
	}

	function monthCells(value: string): { iso: string; day: number; inMonth: boolean }[] {
		const [year, monthNumber] = value.split('-').map(Number);
		const first = new SvelteDate(year, monthNumber - 1, 1, 12);
		const offset = first.getDay();
		first.setDate(first.getDate() - offset);
		return Array.from({ length: 42 }, (_, index) => {
			const date = new SvelteDate(first);
			date.setDate(first.getDate() + index);
			return {
				iso: isoDate(date),
				day: date.getDate(),
				inMonth: date.getMonth() === monthNumber - 1
			};
		});
	}

	function properFor(calendarDay: Kalendar | null): ProperDay | undefined {
		return calendarDay ? dayByCalendarKey(calendarDay.formulary) : undefined;
	}

	const cells = $derived(monthCells(month));
	const detail = $derived.by(() => {
		const place = dayOf(pendingDate);
		const day = properFor(place.on);
		const sunday = properFor(place.week);
		const variants = day
			? PROPER_DAYS.filter((candidate) => candidate.observance === day.observance)
			: [];
		return { ...place, day, sunday, variants };
	});

	const monthLabel = $derived(
		new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
			localDate(`${month}-01`)
		)
	);

	function dateLabel(iso: string, style: 'long' | 'full' = 'long'): string {
		return new Intl.DateTimeFormat(locale, {
			weekday: style === 'full' ? 'long' : undefined,
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(localDate(iso));
	}

	const weekdays = $derived(
		Array.from({ length: 7 }, (_, index) => {
			const date = new SvelteDate(2026, 0, 4 + index, 12);
			return {
				short: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
				long: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
			};
		})
	);

	function normalise(value: string): string {
		return value
			.toLocaleLowerCase(locale)
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/ł/g, 'l');
	}

	const filtered = $derived.by(() => {
		const needle = normalise(query.trim());
		if (!needle) return PROPER_DAYS;
		return PROPER_DAYS.filter((day) =>
			normalise(`${day.title[lang]} ${day.title.la}`).includes(needle)
		);
	});
	const listReady = $derived(!!listDay && filtered.some((day) => day.id === listDay));
	const canOpenFormulary = $derived(tab === 'calendar' ? !!detail.day : listReady);

	function cellLabel(iso: string): string {
		const on = dayOn(iso);
		const day = properFor(on);
		if (day) return `${dateLabel(iso, 'full')}, ${day.title[lang]}, ${msgs.dayPicker.available}`;
		if (on) return `${dateLabel(iso, 'full')}, ${msgs.dayPicker.unwrittenTitle}`;
		return `${dateLabel(iso, 'full')}, ${msgs.dayPicker.unresolvedTitle}`;
	}

	function chooseCalendar(): void {
		const on = dayOn(pendingDate);
		const available = pendingDay ? dayById(pendingDay) : undefined;
		const canonical = properFor(on);
		// A non-default Mass for a multi-Mass observance is a direct formulary
		// choice. With one URL value it cannot also pretend to be the calendar's
		// automatic answer for that date.
		const date = available && canonical && available.id !== canonical.id ? null : pendingDate;
		onpick({
			id: available?.id ?? '',
			date,
			requested: available?.id ?? on?.formulary ?? null
		});
	}

	function chooseList(): void {
		const available = dayById(listDay);
		onpick({ id: available?.id ?? '', date: null, requested: available?.id ?? null });
	}

	function chooseWithout(): void {
		if (tab === 'calendar' && !detail.day) {
			onpick({
				id: '',
				date: pendingDate,
				requested: detail.on?.formulary ?? null
			});
			return;
		}
		onpick({ id: '', date: null, requested: null });
	}

	function chooseSelected(): void {
		if (tab === 'calendar') chooseCalendar();
		else chooseList();
	}

	function onDateKey(event: KeyboardEvent, iso: string): void {
		const moves: Record<string, number> = {
			ArrowLeft: -1,
			ArrowRight: 1,
			ArrowUp: -7,
			ArrowDown: 7
		};
		if (event.key in moves) {
			event.preventDefault();
			selectDate(moveDate(iso, moves[event.key]), true);
			return;
		}
		if (event.key === 'Home' || event.key === 'End') {
			event.preventDefault();
			const weekday = localDate(iso).getDay();
			selectDate(moveDate(iso, event.key === 'Home' ? -weekday : 6 - weekday), true);
			return;
		}
		if (event.key === 'PageUp' || event.key === 'PageDown') {
			event.preventDefault();
			const date = localDate(iso);
			date.setMonth(date.getMonth() + (event.key === 'PageUp' ? -1 : 1));
			selectDate(clampDate(isoDate(date)), true);
		}
	}

	function onDialogKey(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
			return;
		}
		if (event.key !== 'Tab' || !frame) return;
		const focusable = [
			...frame.querySelectorAll<HTMLElement>(
				'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
			)
		].filter((item) => item.getClientRects().length > 0);
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && (document.activeElement === first || document.activeElement === frame)) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function onTabKey(event: KeyboardEvent, next: 'calendar' | 'list'): void {
		if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
		event.preventDefault();
		if (event.key === 'Home') tab = 'calendar';
		else if (event.key === 'End') tab = 'list';
		else tab = next;
		requestAnimationFrame(() => frame?.querySelector<HTMLElement>(`#${tab}-tab`)?.focus());
	}

	function backdrop(event: MouseEvent): void {
		if (event.target === event.currentTarget) onclose();
	}

	$effect(() => {
		if (!frame) return;
		const dialog = frame;
		const invoker = document.activeElement;
		const overflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		dialog.focus({ preventScroll: true });
		return () => {
			document.body.style.overflow = overflow;
			if (invoker instanceof HTMLElement && invoker.isConnected) {
				invoker.focus({ preventScroll: true });
			}
		};
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="day-dialog-backdrop" onclick={backdrop}>
	<dialog
		class="day-dialog"
		open
		aria-modal="true"
		aria-labelledby="day-dialog-title"
		tabindex="-1"
		bind:this={frame}
		onkeydown={onDialogKey}
	>
		<header class="dialog-header">
			<h2 id="day-dialog-title">{msgs.dayPicker.title}</h2>
			<button type="button" class="close" aria-label={msgs.close} onclick={onclose}>×</button>
		</header>

		<div class="tabs" role="tablist" aria-label={msgs.dayPicker.title}>
			<button
				type="button"
				role="tab"
				id="calendar-tab"
				aria-selected={tab === 'calendar'}
				aria-controls="calendar-panel"
				tabindex={tab === 'calendar' ? 0 : -1}
				onkeydown={(event) => onTabKey(event, 'list')}
				onclick={() => (tab = 'calendar')}>{msgs.dayPicker.calendarTab}</button
			>
			<button
				type="button"
				role="tab"
				id="list-tab"
				aria-selected={tab === 'list'}
				aria-controls="list-panel"
				tabindex={tab === 'list' ? 0 : -1}
				onkeydown={(event) => onTabKey(event, 'calendar')}
				onclick={() => (tab = 'list')}>{msgs.dayPicker.listTab}</button
			>
		</div>

		{#if tab === 'calendar'}
			<div
				class="calendar-panel"
				id="calendar-panel"
				role="tabpanel"
				aria-labelledby="calendar-tab"
			>
				<div class="calendar-side">
					<div class="month-nav">
						<button
							type="button"
							aria-label={msgs.dayPicker.previousMonth}
							disabled={`${month}-01` <= DATE_MIN.slice(0, 7) + '-01'}
							onclick={() => moveMonth(-1)}
						>
							<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
								<path d="m12.5 4-6 6 6 6"></path>
							</svg></button
						>
						<h3 id="month-label" aria-live="polite">{monthLabel}</h3>
						<button
							type="button"
							aria-label={msgs.dayPicker.nextMonth}
							disabled={month >= DATE_MAX.slice(0, 7)}
							onclick={() => moveMonth(1)}
						>
							<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
								<path d="m7.5 4 6 6-6 6"></path>
							</svg></button
						>
					</div>
					<div class="calendar-grid" aria-labelledby="month-label">
						{#each weekdays as weekday (weekday.long)}
							<abbr class="weekday" title={weekday.long}>{weekday.short}</abbr>
						{/each}
						{#each cells as cell (cell.iso)}
							{@const on = dayOn(cell.iso)}
							{@const available = properFor(on)}
							<button
								type="button"
								class="date-cell"
								class:outside={!cell.inMonth}
								class:today-date={cell.iso === todayDate}
								class:selected={cell.iso === pendingDate}
								class:has-formulary={!!available}
								data-date={cell.iso}
								aria-label={cellLabel(cell.iso)}
								aria-pressed={cell.iso === pendingDate}
								tabindex={cell.iso === pendingDate ? 0 : -1}
								disabled={!calendarCovers(cell.iso)}
								onclick={() => selectDate(cell.iso)}
								onkeydown={(event) => onDateKey(event, cell.iso)}
							>
								<span>{cell.day}</span>
								{#if available}<i aria-hidden="true"></i>{/if}
							</button>
						{/each}
					</div>
					<div class="calendar-footer">
						<button
							type="button"
							class="today"
							disabled={!canChooseToday || pendingDate === todayDate}
							onclick={() => selectDate(todayDate)}>{msgs.dayPicker.today}</button
						>
						<p class="legend"><i aria-hidden="true"></i> {msgs.dayPicker.available}</p>
					</div>
				</div>

				<div class="day-detail">
					<p class="detail-date smallcaps">{dateLabel(pendingDate, 'full')}</p>
					{#if detail.day}
						<h3>{detail.day.title[lang]}</h3>
						<p class="availability">
							<span class="available-mark" aria-hidden="true"></span>
							{detail.day.partial ? msgs.dayPicker.partial : msgs.dayPicker.available}
						</p>
						{#if detail.variants.length > 1}
							<fieldset class="variants">
								<legend>{msgs.dayPicker.chooseVariant}</legend>
								{#each detail.variants as variant (variant.id)}
									<label>
										<input
											type="radio"
											name="day-variant"
											value={variant.id}
											checked={pendingDay === variant.id}
											onchange={() => (pendingDay = variant.id)}
										/>
										<span>{variant.title[lang]}</span>
									</label>
								{/each}
							</fieldset>
						{/if}
					{:else if detail.on}
						<h3>{msgs.dayPicker.unwrittenTitle}</h3>
						<p>{msgs.dayPicker.unwrittenText}</p>
					{:else}
						<h3>{msgs.dayPicker.unresolvedTitle}</h3>
						<p>{msgs.dayPicker.unresolvedText}</p>
						{#if detail.sunday}
							<p class="week-note">
								{msgs.dayPicker.unresolvedWeek} <strong>{detail.sunday.title[lang]}</strong>.
							</p>
						{/if}
					{/if}
				</div>
			</div>
		{:else}
			<div class="list-panel" id="list-panel" role="tabpanel" aria-labelledby="list-tab">
				<label class="search">
					<span class="smallcaps">{msgs.dayPicker.searchLabel}</span>
					<input type="search" bind:value={query} placeholder={msgs.dayPicker.searchPlaceholder} />
				</label>
				<div class="formulary-list">
					{#if filtered.length === 0}
						<p class="no-results">{msgs.dayPicker.noResults}</p>
					{:else}
						{#each SEASONS as season (season)}
							{@const days = filtered.filter((day) => day.season === season)}
							{#if days.length}
								<section class="season-group" aria-labelledby={`season-${season}`}>
									<h3 id={`season-${season}`} class="smallcaps">{msgs.seasons[season]}</h3>
									{#each days as day (day.id)}
										<button
											type="button"
											class:selected={listDay === day.id}
											data-formulary={day.id}
											aria-pressed={listDay === day.id}
											onclick={() => (listDay = day.id)}
										>
											<span>{day.title[lang]}</span>
											{#if day.partial}<small>{msgs.dayPartial}</small>{/if}
										</button>
									{/each}
								</section>
							{/if}
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		<div class="modal-actions">
			<button type="button" class="secondary" onclick={chooseWithout}>
				{msgs.dayPicker.openWithout}
			</button>
			<button type="button" class="primary" disabled={!canOpenFormulary} onclick={chooseSelected}>
				{msgs.dayPicker.openFormulary}
			</button>
		</div>
	</dialog>
</div>

<style>
	.day-dialog-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: grid;
		place-items: end center;
		background: rgb(20 15 9 / 52%);
		padding: 0;
	}

	.day-dialog {
		position: relative;
		display: grid;
		grid-template-rows: auto auto minmax(0, 1fr) auto;
		width: 100%;
		max-height: min(94dvh, 54rem);
		overflow: hidden;
		background: var(--surface);
		color: var(--ink);
		border: 1px solid var(--border);
		border-bottom: 0;
		border-radius: 1rem 1rem 0 0;
		box-shadow: var(--shadow);
		margin: 0;
		padding: 1.15rem 1.15rem calc(1.2rem + env(safe-area-inset-bottom));
	}

	.day-dialog:focus-visible {
		outline: none;
	}

	.dialog-header,
	.month-nav,
	.calendar-footer,
	.availability,
	.modal-actions {
		display: flex;
		align-items: center;
	}

	.dialog-header {
		justify-content: space-between;
		gap: 1rem;
	}

	.detail-date {
		font-size: 0.69rem;
		letter-spacing: 0.12em;
		color: var(--rubric);
		margin-block-end: 0.35rem;
	}

	h2,
	h3,
	p {
		margin-block-start: 0;
	}

	h2 {
		font-size: 1.38rem;
		font-weight: 500;
		margin-block-end: 0;
		line-height: 1.1;
	}

	.close,
	.month-nav button {
		appearance: none;
		border: 0;
		background: transparent;
		color: var(--ink-soft);
		cursor: pointer;
	}

	.close {
		font-size: 1.65rem;
		line-height: 1;
		padding: 0.35rem 0.5rem;
	}

	.today,
	.tabs button,
	.primary,
	.secondary {
		font: inherit;
	}

	.today {
		appearance: none;
		border: 0;
		background: transparent;
		color: var(--rubric);
		font-size: 0.82rem;
		font-weight: 600;
		padding: 0.3rem 0.4rem;
		cursor: pointer;
	}

	.today:not(:disabled):hover {
		text-decoration: underline;
		text-underline-offset: 0.14em;
	}

	.today:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.tabs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border-bottom: 1px solid var(--border);
		margin-block-end: 1rem;
	}

	.tabs button {
		appearance: none;
		border: 0;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: var(--ink-soft);
		padding: 0.7rem 0.4rem;
		cursor: pointer;
	}

	.tabs button[aria-selected='true'] {
		border-bottom-color: var(--rubric);
		color: var(--rubric);
		font-weight: 600;
	}

	.calendar-side {
		max-width: 28rem;
		margin-inline: auto;
	}

	.calendar-panel,
	.list-panel {
		height: min(60dvh, 25rem);
		min-height: 0;
		overflow-y: auto;
	}

	.list-panel {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		overflow: hidden;
	}

	.month-nav {
		display: grid;
		grid-template-columns: 2.3rem minmax(0, 1fr) 2.3rem;
		gap: 0.45rem;
		margin-block-end: 0.55rem;
	}

	.month-nav h3 {
		font-size: 1.08rem;
		font-weight: 500;
		text-transform: capitalize;
		margin: 0;
		text-align: center;
	}

	.month-nav button {
		display: grid;
		place-items: center;
		width: 2.3rem;
		height: 2.3rem;
		padding: 0;
		line-height: 1;
	}

	.month-nav svg {
		width: 1.05rem;
		height: 1.05rem;
		fill: none;
		stroke: currentcolor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.month-nav button:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(2.2rem, 1fr));
		gap: 0.16rem;
	}

	.weekday {
		text-align: center;
		text-decoration: none;
		font-size: 0.69rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-soft);
		padding-block: 0.2rem;
	}

	.date-cell {
		position: relative;
		appearance: none;
		aspect-ratio: 1;
		min-height: 2.25rem;
		border: 1px solid transparent;
		border-radius: 50%;
		background: transparent;
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}

	.date-cell.outside {
		color: var(--ink-soft);
		opacity: 0.52;
	}

	.date-cell.today-date {
		border-color: var(--rubric);
	}

	.date-cell.selected {
		background: var(--rubric);
		border-color: var(--rubric);
		color: var(--surface);
		font-weight: 600;
	}

	.date-cell:disabled {
		opacity: 0.18;
		cursor: default;
	}

	.date-cell i,
	.legend i {
		display: inline-block;
		width: 0.25rem;
		height: 0.25rem;
		border-radius: 50%;
		background: var(--rubric);
	}

	.date-cell i {
		position: absolute;
		inset-inline-start: calc(50% - 0.125rem);
		bottom: 0.2rem;
	}

	.date-cell.selected i {
		background: currentcolor;
	}

	.legend {
		font-size: 0.77rem;
		color: var(--ink-soft);
		margin: 0;
		text-align: center;
	}

	.legend i {
		margin-inline-end: 0.25rem;
	}

	.calendar-footer {
		justify-content: space-between;
		gap: 1rem;
		margin-block-start: 0.55rem;
	}

	.day-detail {
		border-top: 1px solid var(--border);
		margin-block-start: 1rem;
		padding-block-start: 1rem;
	}

	.day-detail h3 {
		font-size: 1.2rem;
		font-weight: 500;
		margin-block-end: 0.3rem;
	}

	.week-note {
		color: var(--ink-soft);
	}

	.availability {
		gap: 0.4rem;
		color: var(--ink-soft);
		font-size: 0.88rem;
	}

	.availability span {
		color: var(--rubric);
	}

	.available-mark {
		width: 0.5rem;
		height: 0.3rem;
		border-inline-start: 1.5px solid currentcolor;
		border-bottom: 1.5px solid currentcolor;
		transform: translateY(-0.1rem) rotate(-45deg);
	}

	.variants {
		border: 0;
		padding: 0;
		margin: 1rem 0;
	}

	.variants legend {
		font-size: 0.78rem;
		color: var(--ink-soft);
		margin-block-end: 0.4rem;
	}

	.variants label {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		padding-block: 0.25rem;
	}

	.primary,
	.secondary {
		appearance: none;
		border: 1px solid var(--rubric);
		border-radius: 0.5rem;
		font-weight: 600;
		padding: 0.62rem 0.9rem;
		cursor: pointer;
	}

	.primary {
		background: var(--rubric);
		color: var(--surface);
	}

	.secondary {
		background: transparent;
		color: var(--rubric);
	}

	.primary:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.search {
		display: grid;
		gap: 0.3rem;
	}

	.search span {
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		color: var(--ink-soft);
	}

	.search input {
		width: 100%;
		min-height: 2.55rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--bg);
		color: var(--ink);
		font: inherit;
		padding: 0.5rem 0.65rem;
	}

	.formulary-list {
		min-height: 0;
		overflow-y: auto;
		margin-block: 0.8rem;
		border-block: 1px solid var(--border);
	}

	.season-group {
		padding-block: 0.65rem;
	}

	.season-group + .season-group {
		border-top: 1px solid var(--border);
	}

	.season-group h3 {
		font-size: 0.68rem;
		letter-spacing: 0.1em;
		color: var(--ink-soft);
		margin-block-end: 0.3rem;
	}

	.season-group button {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.8rem;
		width: 100%;
		appearance: none;
		border: 0;
		border-radius: 0.35rem;
		background: transparent;
		color: var(--ink);
		font: inherit;
		text-align: start;
		padding: 0.42rem 0.5rem;
		cursor: pointer;
	}

	.season-group button:hover,
	.season-group button.selected {
		background: var(--wash);
	}

	.season-group button.selected {
		color: var(--rubric);
		font-weight: 600;
	}

	.season-group small {
		font-size: 0.72rem;
		font-weight: 400;
		color: var(--ink-soft);
	}

	.no-results {
		color: var(--ink-soft);
		padding: 1rem 0.5rem;
	}

	.modal-actions {
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 0.65rem;
		border-top: 1px solid var(--border);
		margin-block-start: 1rem;
		padding-block-start: 1rem;
	}

	@media (max-width: 30rem) {
		.modal-actions {
			display: grid;
			grid-template-columns: minmax(0, 1.16fr) minmax(0, 1fr);
			gap: 0.5rem;
		}

		.modal-actions button {
			min-width: 0;
			font-size: 0.88rem;
			padding: 0.58rem 0.55rem;
		}
	}

	@media (min-width: 48rem) {
		.day-dialog-backdrop {
			place-items: center;
			padding: 1.5rem;
		}

		.day-dialog {
			max-width: 49rem;
			border-bottom: 1px solid var(--border);
			border-radius: 1rem;
			padding: 1.4rem 1.55rem;
		}

		.calendar-panel {
			display: grid;
			grid-template-columns: minmax(22rem, 1.15fr) minmax(16rem, 0.85fr);
			gap: 1.5rem;
		}

		.day-detail {
			border-top: 0;
			border-inline-start: 1px solid var(--border);
			margin-block-start: 0;
			padding-block-start: 0.35rem;
			padding-inline-start: 1.5rem;
		}
	}

	@media (forced-colors: active) {
		.date-cell.selected,
		.primary {
			background: Highlight;
			color: HighlightText;
		}

		.date-cell.has-formulary::after {
			content: '·';
		}
	}

	@media print {
		.day-dialog-backdrop {
			display: none;
		}
	}
</style>
