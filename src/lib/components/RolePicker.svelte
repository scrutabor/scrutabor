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
				data-word={msgs.roles[r]}
				onclick={() => role.set(r as Role)}
			>
				<!-- the ghost sets the width at the weight the chosen word will
				     take, so choosing one does not nudge its neighbours -->
				<span class="ghost" aria-hidden="true">{msgs.roles[r]}</span>
				<span class="real">{msgs.roles[r]}</span>
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

	/* Every option holds the width of its own BOLD form, chosen or not: a
	   hidden copy at that weight sets the width and the visible word sits
	   over it, so choosing one no longer nudges its neighbours sideways as
	   it thickens. (The width-setter is an element rather than a
	   pseudo-element because ::before is already carrying the separator
	   between the words.) */
	.picker.compact .option {
		position: relative;
		font-size: 0.9rem;
		padding: 0 0.15rem;
		color: var(--ink-soft);
	}

	.picker.compact .ghost {
		visibility: hidden;
		font-weight: 600;
	}

	.picker.compact .real {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}

	.picker.compact .option + .option {
		border-inline-start: 0;
	}

	.picker.compact .option + .option::before {
		content: '·';
		margin-inline-end: 0.4rem;
		color: var(--border);
		/* it must not thicken with the word it follows — bold on a middot
		   is a fraction of a pixel, and a fraction of a pixel on every
		   separator is the row shifting again */
		font-weight: 400;
	}

	/* Colour alone was not enough to say "this one" — ink against soft ink
	   is a difference you have to look for. The rule under it said so
	   clearly and looked like a link doing it, so the chosen part is set in
	   the rubric instead, and heavier: two signals, no ornament. */
	.picker.compact .option.on {
		background: none;
		color: var(--rubric);
		font-weight: 600;
	}

	.picker.compact .option:hover {
		color: var(--rubric);
	}
</style>
