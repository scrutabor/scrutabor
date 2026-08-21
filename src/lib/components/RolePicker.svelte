<script lang="ts">
	// Which part the reader has at Mass. Three buttons, no menu: the choice
	// is small, it is made once, and a reader about to pray should not have
	// to open anything to see what it is set to.
	import type { MassForm } from '$lib/corpus';
	import { radiogroupKeydown } from '$lib/radio-nav';
	import { M, type Lang } from '$lib/i18n';
	import { MASS_FORMS, massForm } from '$lib/mass-form.svelte';
	import { ROLES, role, type Role } from '$lib/role.svelte';

	// TWO settings, one control. The reader's part and the kind of Mass are
	// the same sort of question — asked once, answered with a word, and both
	// changing what the page shows — so they are the same row of words in
	// the same place rather than two inventions to learn (owner, 2026-08-10).
	//
	// ONE FORM, everywhere (owner, 2026-08-21 — the tabella, direction D of
	// the design canvas). For a year this control wore two costumes: a
	// boxed pill group on the Ordo index and a bare word-row on reading
	// pages, and the owner named the inconsistency itself as the defect.
	// Now it is always a row of the framed table: label column, words,
	// the reader's own in the rubric. Hints left the component with the
	// full form — the index says what a setting means in ONE line under
	// the table, for the setting last touched.
	let { lang, kind = 'role' }: { lang: Lang; kind?: 'role' | 'mass' } = $props();
	const msgs = $derived(M[lang]);
	const isMass = $derived(kind === 'mass');
	const options = $derived<readonly string[]>(isMass ? MASS_FORMS : ROLES);
	const current = $derived(isMass ? massForm.value : role.value);
	const label = $derived(isMass ? msgs.massLabel : msgs.roleLabel);
	const word = $derived((o: string) =>
		isMass ? msgs.massForms[o as MassForm] : msgs.roles[o as Role]
	);
	const choose = (o: string) => (isMass ? massForm.set(o as MassForm) : role.set(o as Role));
	const labelId = $derived(`${kind}-label`);

	// The radiogroup contract, not only its costume (lib/radio-nav): one
	// tab stop, the arrows move the check — the promise arrow-nav yields
	// the arrow keys on, which this control wore for a while without
	// keeping.
	let group = $state<HTMLElement | undefined>();
	const onGroupKey = radiogroupKeydown({
		options: () => options,
		current: () => current,
		choose,
		group: () => group
	});
</script>

<div class="picker row" data-kind={kind}>
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
				<!-- the ghost sets the width at the weight the chosen word
				     will take, so choosing one does not nudge its neighbours.
				     The slot exists to be what the visible word is positioned
				     against: the button also holds the separator before it,
				     and without the slot every unselected word was drawn a
				     few pixels into its own middot. -->
				<span class="slot">
					<span class="ghost" aria-hidden="true">{word(r)}</span>
					<span class="real">{word(r)}</span>
				</span>
			</button>
		{/each}
	</div>
</div>

<style>
	/* A ROW OF THE TABELLA (app.css): the shared label column, then the
	   words, the reader's own in the rubric and heavier — two signals, no
	   ornament. The hairline above belongs to the row, because the frame
	   cannot reach its children: the mode row that always leads the table
	   carries none, so the lines land exactly between rows. */
	.options {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		font-size: 0.92rem;
	}

	/* The squeezed table (the row skeleton in app.css stacks the label). */
	@container help (max-width: 26rem) {
		.options {
			justify-content: center;
		}
	}

	@media print {
		/* A printed prayer needs to say which participation layer produced it,
		   but the unchosen radio options are controls, not content. Reduce each
		   picker to one small label/value pair; adjacent role and Mass pairs fit
		   on one line whenever the paper gives them room. */
		.options {
			display: inline-flex;
			margin: 0;
			border: 0;
		}

		.option:not(.on) {
			display: none;
		}

		.option.on {
			display: inline;
			padding: 0;
			background: none;
			font-size: 6.5pt;
			font-weight: 600;
			line-height: 1.1;
		}

		/* On the word itself, not the button: the screen rule colours .real
		   directly with the rubric, and a direct declaration beats any
		   inheritance — so without this the printed value came out dark
		   red where paper wants ink. */
		.option.on .real {
			color: var(--ink);
		}

		.ghost {
			display: none;
		}

		.slot,
		.real {
			position: static;
			display: inline;
		}

		.option + .option::before {
			display: none;
		}
	}
</style>
