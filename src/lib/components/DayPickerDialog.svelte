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
	import { dayByCalendarKey, type ProperDay } from '$lib/proprium';
	import { massesOn, resolveOrdoChoice, type OrdoChoice } from '$lib/ordo-choice';

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
		onpick: (choice: OrdoChoice) => void;
		onclose: () => void;
	} = $props();

	const msgs = $derived(M[lang]);
	const locale = $derived(lang === 'pl' ? 'pl-PL' : 'en-GB');
	function initialValues(): { date: string; day: string } {
		const date = selectedDate ?? todayDate;
		return {
			date,
			day: chosen || resolveOrdoChoice(date)?.mass || ''
		};
	}
	const initial = initialValues();
	const canChooseToday = $derived(calendarCovers(todayDate));
	let pendingDate = $state(initial.date);
	let pendingDay = $state(initial.day);
	let month = $state(clampDate(initial.date).slice(0, 7));
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

	function monthCells(value: string): { iso: string; day: number; column?: number }[] {
		const [year, monthNumber] = value.split('-').map(Number);
		const first = new SvelteDate(year, monthNumber - 1, 1, 12);
		const length = new SvelteDate(year, monthNumber, 0, 12).getDate();
		return Array.from({ length }, (_, index) => {
			const date = new SvelteDate(year, monthNumber - 1, index + 1, 12);
			return {
				iso: isoDate(date),
				day: date.getDate(),
				column: index === 0 ? first.getDay() + 1 : undefined
			};
		});
	}

	function properFor(calendarDay: Kalendar | null): ProperDay | undefined {
		return calendarDay ? dayByCalendarKey(calendarDay.formulary) : undefined;
	}

	const cells = $derived(monthCells(month));
	const focusDate = $derived(
		cells.find((cell) => cell.iso === pendingDate)?.iso ??
			cells.find((cell) => calendarCovers(cell.iso))?.iso
	);
	const detail = $derived.by(() => {
		const place = dayOf(pendingDate);
		const day = properFor(place.on);
		const sunday = properFor(place.week);
		const variants = massesOn(pendingDate);
		return { ...place, day, sunday, variants };
	});
	const displayedDay = $derived(detail.variants.find((day) => day.id === pendingDay) ?? detail.day);

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
				short:
					lang === 'pl' && index === 0
						? 'ndz.'
						: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
				long: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
			};
		})
	);

	const canOpenFormulary = $derived(detail.variants.some((day) => day.id === pendingDay));

	function cellLabel(iso: string): string {
		const on = dayOn(iso);
		const day = properFor(on);
		if (day) return `${dateLabel(iso, 'full')}, ${day.title[lang]}, ${msgs.dayPicker.available}`;
		if (on) return `${dateLabel(iso, 'full')}, ${msgs.dayPicker.unwrittenTitle}`;
		return `${dateLabel(iso, 'full')}, ${msgs.dayPicker.unresolvedTitle}`;
	}

	function chooseCalendar(): void {
		const choice = resolveOrdoChoice(pendingDate, pendingDay);
		if (choice) onpick(choice);
	}

	function chooseWithout(): void {
		onpick({ date: pendingDate, mass: null });
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

		<div class="calendar-panel">
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
							style:grid-column={cell.column}
							class:today-date={cell.iso === todayDate}
							class:selected={cell.iso === pendingDate}
							class:has-formulary={!!available}
							data-date={cell.iso}
							aria-label={cellLabel(cell.iso)}
							aria-pressed={cell.iso === pendingDate}
							aria-current={cell.iso === todayDate ? 'date' : undefined}
							tabindex={cell.iso === focusDate ? 0 : -1}
							disabled={!calendarCovers(cell.iso)}
							onclick={() => selectDate(cell.iso)}
							onkeydown={(event) => onDateKey(event, cell.iso)}
						>
							<span>{cell.day}</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="day-detail">
				<p class="detail-date smallcaps">{dateLabel(pendingDate, 'full')}</p>
				{#if displayedDay}
					<h3>{displayedDay.title[lang]}</h3>
					{#if displayedDay.partial}<p class="availability">{msgs.dayPicker.partial}</p>{/if}
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

		<div class="modal-actions">
			<button
				type="button"
				class="today secondary"
				disabled={!canChooseToday || (pendingDate === todayDate && month === todayDate.slice(0, 7))}
				onclick={() => selectDate(todayDate, true)}
			>
				{msgs.dayPicker.today}
			</button>
			<div class="confirm-actions">
				<button type="button" class="secondary" onclick={chooseWithout}>
					{msgs.dayPicker.openWithout}
				</button>
				<button type="button" class="primary" disabled={!canOpenFormulary} onclick={chooseCalendar}>
					{msgs.dayPicker.openFormulary}
				</button>
			</div>
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
		grid-template-rows: auto minmax(0, 1fr) auto;
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
	.confirm-actions,
	.modal-actions {
		display: flex;
		align-items: center;
	}

	.dialog-header {
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid var(--border);
		padding-block-end: 0.8rem;
		margin-block-end: 1rem;
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
		text-align: start;
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
		flex-shrink: 0;
		font-size: 1.65rem;
		line-height: 1;
		padding: 0.35rem 0.5rem;
	}

	.calendar-side {
		width: 100%;
		max-width: 28rem;
		margin-inline: auto;
		align-self: start;
	}

	.calendar-panel {
		height: min(60dvh, 25rem);
		min-height: 0;
		overflow-y: auto;
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
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 0.12rem;
	}

	.weekday {
		text-align: center;
		text-decoration: none;
		font-size: clamp(0.6rem, 2.8vw, 0.69rem);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-soft);
		padding-block: 0.2rem;
	}

	.date-cell {
		position: relative;
		appearance: none;
		aspect-ratio: 1;
		width: 100%;
		min-width: 0;
		padding: 0;
		border: 1px solid transparent;
		border-radius: 50%;
		background: transparent;
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}

	/* Dates without a formulary remain selectable. Softened ink still
	   clears AA in both themes; the day-picker accessibility tests check it. */
	.date-cell:not(.has-formulary) {
		color: var(--ink-soft);
		color: color-mix(in srgb, var(--ink-soft) 84%, var(--surface));
	}

	/* A light weight accent complements the colour without crowding the numerals. */
	.date-cell.has-formulary {
		color: var(--rubric);
		font-weight: 500;
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
		color: var(--ink-soft);
		font-size: 0.88rem;
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
		font: inherit;
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

	.primary:disabled,
	.secondary:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.modal-actions {
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.65rem;
		border-top: 1px solid var(--border);
		margin-block-start: 1rem;
		padding-block-start: 1rem;
	}

	.confirm-actions {
		justify-content: flex-end;
		gap: 0.65rem;
		margin-inline-start: auto;
		max-width: 100%;
		min-width: 0;
	}

	@media (max-width: 30rem) {
		.dialog-header {
			gap: 0.5rem;
		}

		.dialog-header h2 {
			font-size: 1.2rem;
		}

		.modal-actions {
			gap: 0.5rem;
		}

		.confirm-actions {
			display: grid;
			grid-template-columns: minmax(0, 1.16fr) minmax(0, 1fr);
			gap: 0.5rem;
			width: 100%;
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
			max-width: 42rem;
			border-bottom: 1px solid var(--border);
			border-radius: 1rem;
			padding: 1.1rem 1.2rem;
		}

		.calendar-panel {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 1.2rem;
			height: auto;
		}

		.calendar-grid {
			/* Keep desktop navigation still across months. The phone's fixed
			   scroll panel needs no reserved rows below its last date. */
			grid-template-rows: auto repeat(6, 1fr);
		}

		.day-detail {
			border-top: 0;
			border-inline-start: 1px solid var(--border);
			margin-block-start: 0;
			padding-block-start: 0.35rem;
			padding-inline-start: 1.2rem;
		}
	}

	@media (forced-colors: active) {
		.date-cell.selected,
		.primary {
			background: Highlight;
			color: HighlightText;
		}

		.date-cell:not(.has-formulary):not(.selected) {
			color: GrayText;
		}
	}

	@media print {
		.day-dialog-backdrop {
			display: none;
		}
	}
</style>
