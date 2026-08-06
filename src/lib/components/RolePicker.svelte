<script lang="ts">
	// Which part the reader has at Mass. Three buttons, no menu: the choice
	// is small, it is made once, and a reader about to pray should not have
	// to open anything to see what it is set to.
	import { M, type Lang } from '$lib/i18n';
	import { ROLES, role, type Role } from '$lib/role.svelte';

	// `compact` is the form the control takes on a page that is being read
	// rather than chosen from: label and options on one line, no note. The
	// reader can change their part wherever they are, which matters when
	// they arrive at a text from a link rather than through the Ordo.
	let { lang, compact = false }: { lang: Lang; compact?: boolean } = $props();
	const msgs = $derived(M[lang]);
	const current = $derived(role.value);
	// Two of these can be on one page (the Ordo index shows the full form);
	// a radiogroup must not point at an id that is not its own.
	const labelId = $derived(`role-label-${compact ? 'compact' : 'full'}`);
</script>

<div class="picker" class:compact>
	<span class="label smallcaps" id={labelId}>{msgs.roleLabel}</span>
	<div class="options" role="radiogroup" aria-labelledby={labelId}>
		{#each ROLES as r (r)}
			<button
				type="button"
				role="radio"
				aria-checked={current === r}
				class="option"
				class:on={current === r}
				onclick={() => role.set(r as Role)}
			>
				{msgs.roles[r]}
			</button>
		{/each}
	</div>
	{#if !compact}<p class="hint">{msgs.roleHint[current]}</p>{/if}
</div>

<style>
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

	.options {
		display: inline-flex;
		margin-top: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		overflow: hidden;
	}

	.option {
		appearance: none;
		border: 0;
		background: transparent;
		color: var(--ink-soft);
		font: inherit;
		font-size: 0.95rem;
		padding: 0.35rem 1rem;
		cursor: pointer;
	}

	.option + .option {
		border-inline-start: 1px solid var(--border);
	}

	.option.on {
		background: var(--wash);
		color: var(--ink);
	}

	.option:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: -2px;
	}

	.hint {
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
		color: var(--ink-soft);
	}

	/* On a reading page the control is a setting, not a call to action, and
	   it is set once. So no boxes there: three words with the reader's own
	   in ink and the others quiet, which is both lighter beside the slider
	   and honestly centred — a pill group sitting to the right of a small
	   label reads as off-centre however carefully the row is centred, which
	   is what the owner was seeing. The Ordo index keeps the full picker,
	   because choosing is the point of that page. */
	.picker.compact {
		margin: 0;
		display: inline-flex;
		align-items: baseline;
		gap: 0.6rem;
	}

	.picker.compact .label {
		display: inline;
		font-size: 0.68rem;
	}

	.picker.compact .options {
		margin-top: 0;
		border: 0;
		border-radius: 0;
		overflow: visible;
		gap: 0.1rem;
	}

	.picker.compact .option {
		font-size: 0.9rem;
		padding: 0 0.15rem;
		color: var(--ink-soft);
	}

	.picker.compact .option + .option {
		border-inline-start: 0;
	}

	.picker.compact .option + .option::before {
		content: '·';
		margin-inline-end: 0.4rem;
		color: var(--border);
	}

	.picker.compact .option.on {
		background: none;
		color: var(--ink);
	}

	.picker.compact .option:hover {
		color: var(--rubric);
	}
</style>
