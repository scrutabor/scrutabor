<script lang="ts">
	// Which part the reader has at Mass. Three buttons, no menu: the choice
	// is small, it is made once, and a reader about to pray should not have
	// to open anything to see what it is set to.
	import { tick } from 'svelte';
	import type { MassForm } from '$lib/corpus';
	import { M, type Lang } from '$lib/i18n';
	import { MASS_FORMS, massForm } from '$lib/mass-form.svelte';
	import { ROLES, role, type Role } from '$lib/role.svelte';

	// TWO settings, one control. The reader's part and the kind of Mass are
	// the same sort of question — asked once, answered with a word, and both
	// changing what the page shows — so they are the same row of words in
	// the same place rather than two inventions to learn (owner, 2026-08-10).
	//
	// `compact` is the form the control takes on a page that is being read
	// rather than chosen from: label and options on one line, no note. The
	// reader can change their part wherever they are, which matters when
	// they arrive at a text from a link rather than through the Ordo.
	let {
		lang,
		compact = false,
		kind = 'role'
	}: { lang: Lang; compact?: boolean; kind?: 'role' | 'mass' } = $props();
	const msgs = $derived(M[lang]);
	const isMass = $derived(kind === 'mass');
	const options = $derived<readonly string[]>(isMass ? MASS_FORMS : ROLES);
	const current = $derived(isMass ? massForm.value : role.value);
	const label = $derived(isMass ? msgs.massLabel : msgs.roleLabel);
	const word = $derived((o: string) =>
		isMass ? msgs.massForms[o as MassForm] : msgs.roles[o as Role]
	);
	const hint = $derived(
		isMass ? msgs.massHint[current as MassForm] : msgs.roleHint[current as Role]
	);
	const choose = (o: string) => (isMass ? massForm.set(o as MassForm) : role.set(o as Role));
	// Several of these can be on one page (the Ordo index shows both in full
	// form); a radiogroup must not point at an id that is not its own.
	const labelId = $derived(`${kind}-label-${compact ? 'compact' : 'full'}`);

	// The radiogroup contract, not only its costume: one tab stop (the
	// checked radio), and the arrows move the check. arrow-nav already
	// yields the arrow keys to role="radio" on the promise that the radios
	// use them — a promise this control wore for a while without keeping,
	// so a keyboard heard "radio button, 1 of 3", pressed Right, and
	// nothing moved.
	let group = $state<HTMLElement | undefined>();
	async function onGroupKey(e: KeyboardEvent) {
		const delta =
			e.key === 'ArrowRight' || e.key === 'ArrowDown'
				? 1
				: e.key === 'ArrowLeft' || e.key === 'ArrowUp'
					? -1
					: 0;
		if (!delta) return;
		e.preventDefault();
		const at = options.indexOf(current);
		choose(options[(at + delta + options.length) % options.length]);
		await tick();
		group?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
	}
</script>

<div class="picker" class:compact data-kind={kind}>
	<span class="label smallcaps" id={labelId}>{label}</span>
	<!-- Roving tabindex: the CHECKED radio inside carries tabindex 0,
	     which is the APG radiogroup pattern; the group itself is never a
	     tab stop. -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="options"
		role="radiogroup"
		aria-labelledby={labelId}
		bind:this={group}
		onkeydown={onGroupKey}
	>
		{#each options as r (r)}
			<button
				type="button"
				role="radio"
				aria-checked={current === r}
				tabindex={current === r ? 0 : -1}
				class="option"
				class:on={current === r}
				data-word={word(r)}
				onclick={() => choose(r)}
			>
				{#if compact}
					<!-- the ghost sets the width at the weight the chosen word
					     will take, so choosing one does not nudge its
					     neighbours. ONLY compact: that is the variant that
					     goes bold, and the styling for these spans is scoped
					     to it — rendered in the full picker they both showed,
					     and every part read twice.

					     The slot exists to be what the visible word is
					     positioned against. Without it the word was laid over
					     the whole button, and the button also holds the
					     separator before it, so every unselected word was
					     drawn a few pixels into its own middot. -->
					<span class="slot">
						<span class="ghost" aria-hidden="true">{word(r)}</span>
						<span class="real">{word(r)}</span>
					</span>
				{:else}
					{word(r)}
				{/if}
			</button>
		{/each}
	</div>
	{#if !compact}<p class="hint">{hint}</p>{/if}
</div>

<style>
	.options {
		display: inline-flex;
		margin-top: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		overflow: hidden;
	}

	/* Only the FULL picker is a container. `container-type: inline-size`
	   applies `contain: inline-size`, which means the contents no longer
	   contribute to the width — fine for a block that is as wide as its
	   parent, fatal for the compact form, which is an inline-flex sized BY
	   its contents. It collapsed, the query matched at every window width,
	   and the control stacked on a 1800px screen. */
	.picker:not(.compact) {
		container: picker / inline-size;
	}

	/* Three parts side by side need about 15rem of room. Below that — a
	   narrow phone, or a wide one at the largest reading size — they stack
	   instead of running off the page. A segmented control set as a column
	   is still a segmented control; one that overflows is not.
	   NAMED, and that is the whole point. An unnamed query resolves against
	   the nearest ancestor container, and the compact picker is deliberately
	   not one (see above) — so its query was answered by `.help-row` instead.
	   At the largest reading size 15rem is 336px and `.help-row` measures
	   253-347px on a phone, so every compact picker took the full picker's
	   stacking rules ON TOP OF its own: horizontal rules and middots at once,
	   and a header a thousand pixels tall before the first Latin word. On the
	   one setting the book offers for reading at arm's length in a dim nave.
	   A named container only matches an ancestor that carries the name. */
	@container picker (max-width: 15rem) {
		.options {
			display: flex;
			flex-direction: column;
			width: 100%;
			border-radius: 1rem;
		}

		.option + .option {
			border-inline-start: 0;
			border-top: 1px solid var(--border);
		}
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

	/* The ring follows the pill. An outline traces its element's own corners,
	   and an option's are square while the row it sits in is a 999px pill —
	   so the ring on the first and last options cut across the curve and
	   showed a red sliver outside it (owner, 2026-08-10). The end options
	   take the pill's radius on their outer side, which is the shape the
	   ring should have had; the inner sides stay square, because that edge
	   is a divider between two options and not an end of anything. */
	.option:focus-visible {
		outline: 2px solid var(--rubric);
		outline-offset: -2px;
	}

	.picker:not(.compact) .option:first-child {
		border-start-start-radius: 999px;
		border-end-start-radius: 999px;
	}

	.picker:not(.compact) .option:last-child {
		border-start-end-radius: 999px;
		border-end-end-radius: 999px;
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
		/* the label and the three parts wrap rather than run off the page */
		flex-wrap: wrap;
		justify-content: center;
		align-items: baseline;
		gap: 0.2rem 0.6rem;
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
		font-size: 0.9rem;
		/* The block padding is the touch target and the negative margin
		   gives the space back to the row: the words alone were a 19px
		   target on the control row of a book read at arm's length, and
		   WCAG 2.5.8 asks 24px. The row keeps its visual density. */
		padding: 0.3rem 0.15rem;
		margin-block: -0.25rem;
		color: var(--ink-soft);
	}

	/* The slot is the box the word is centred in, and it holds ONLY the two
	   copies of the word. The separator lives on the option, outside it, so
	   the space the middot takes is not space the word can be laid over. */
	.picker.compact .slot {
		position: relative;
		display: inline-block;
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

	/* The ring goes round the WORD. Compact, the option's box carries the
	   separator before it — the middot and the 0.4rem after it — so a ring
	   on the button enclosed the dot belonging to the previous part and
	   started a third of a word to its left (owner, 2026-08-09). The slot
	   holds only the word, which is the thing being chosen. */
	.picker.compact .option:focus-visible {
		outline: none;
	}

	.picker.compact .option:focus-visible .slot {
		outline: 2px solid var(--rubric);
		outline-offset: 3px;
		border-radius: 0.15rem;
	}

	@media print {
		/* A printed prayer needs to say which participation layer produced it,
		   but the unchosen radio options are controls, not content. Reduce each
		   picker to one small label/value pair; adjacent role and Mass pairs fit
		   on one line whenever the paper gives them room. */
		.picker,
		.picker.compact {
			display: inline-flex;
			flex-wrap: nowrap;
			align-items: baseline;
			gap: 0.25rem;
			width: auto;
			max-width: none;
			margin: 0;
			text-align: start;
			white-space: nowrap;
			container-type: normal;
		}

		.label,
		.picker.compact .label {
			display: inline;
			font-size: 5.5pt;
			letter-spacing: 0.06em;
			line-height: 1.1;
			color: var(--ink-soft);
		}

		.label::after {
			content: ':';
		}

		.options,
		.picker.compact .options {
			display: inline-flex;
			margin: 0;
			border: 0;
			border-radius: 0;
			overflow: visible;
		}

		.option:not(.on) {
			display: none;
		}

		.option.on,
		.picker.compact .option.on {
			display: inline;
			padding: 0;
			background: none;
			color: var(--ink);
			font-size: 6.5pt;
			font-weight: 600;
			line-height: 1.1;
		}

		.picker.compact .ghost {
			display: none;
		}

		.picker.compact .slot,
		.picker.compact .real {
			position: static;
			display: inline;
		}

		.picker.compact .option + .option::before {
			display: none;
		}

		.hint {
			display: none;
		}
	}
</style>
