<script lang="ts">
	let {
		id,
		label,
		clearLabel,
		describedby,
		value = $bindable(),
		field = $bindable(),
		oninput,
		onclear
	}: {
		id: string;
		label: string;
		clearLabel: string;
		describedby?: string;
		value: string;
		field: HTMLInputElement;
		oninput: (event: Event) => void;
		onclear: () => void;
	} = $props();
</script>

<form class="search-page-field" role="search" onsubmit={(event) => event.preventDefault()}>
	<label class="sr-only" for={id}>{label}</label>
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="10.8" cy="10.8" r="6.4" />
		<path d="m15.6 15.6 4.2 4.2" />
	</svg>
	<input
		bind:this={field}
		bind:value
		{id}
		type="search"
		autocomplete="off"
		aria-describedby={describedby}
		{oninput}
	/>
	{#if value}
		<button type="button" class="clear" aria-label={clearLabel} onclick={onclear}>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M7 7l10 10M17 7 7 17" />
			</svg>
		</button>
	{/if}
</form>

<style>
	form {
		position: relative;
	}

	form > svg {
		position: absolute;
		top: 50%;
		left: 1rem;
		width: 1.05rem;
		height: 1.05rem;
		transform: translateY(-50%);
		fill: none;
		stroke: var(--ink-soft);
		stroke-width: 1.8;
		stroke-linecap: round;
		pointer-events: none;
	}

	form.search-page-field > svg {
		left: 1.15rem;
		width: 1.2rem;
		height: 1.2rem;
	}

	input {
		width: 100%;
		height: 3.15rem;
		padding: 0.55rem 2.85rem;
		border: 1px solid var(--border);
		border-radius: 0.7rem;
		background: var(--bg);
		color: var(--ink);
		font: inherit;
		font-size: 1.08rem;
		line-height: 1;
	}

	form.search-page-field input {
		height: 3.6rem;
		padding: 0.65rem 3.1rem;
		border-color: var(--ink-soft);
		border-radius: 0.8rem;
		background: var(--surface);
		box-shadow: 0 3px 0 color-mix(in srgb, var(--ink-soft) 14%, transparent);
		font-size: 1.15rem;
	}

	input:focus-visible {
		outline: none;
		border-color: var(--ink-soft);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ink-soft) 14%, transparent);
	}

	form.search-page-field input:focus-visible {
		border-color: var(--ink);
	}

	input::-webkit-search-cancel-button {
		appearance: none;
	}

	.clear {
		position: absolute;
		top: 50%;
		right: 0.55rem;
		display: grid;
		width: 2rem;
		height: 2rem;
		transform: translateY(-50%);
		place-items: center;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--ink-soft);
		cursor: pointer;
	}

	form.search-page-field .clear {
		right: 0.65rem;
		width: 2.2rem;
		height: 2.2rem;
	}

	.clear:hover {
		background: var(--wash);
		color: var(--ink);
	}

	.clear svg {
		width: 0.8rem;
		height: 0.8rem;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-width: 1.8;
	}

	form.search-page-field .clear svg {
		width: 0.85rem;
		height: 0.85rem;
	}

	@media (max-width: 34rem) {
		form.search-page-field input {
			height: 3.35rem;
		}
	}
</style>
