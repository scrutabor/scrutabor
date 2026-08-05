<script lang="ts">
	// Which part the reader has at Mass. Three buttons, no menu: the choice
	// is small, it is made once, and a reader about to pray should not have
	// to open anything to see what it is set to.
	import { M, type Lang } from '$lib/i18n';
	import { ROLES, role, type Role } from '$lib/role.svelte';

	let { lang }: { lang: Lang } = $props();
	const msgs = $derived(M[lang]);
	const current = $derived(role.value);
</script>

<div class="picker">
	<span class="label smallcaps" id="role-label">{msgs.roleLabel}</span>
	<div class="options" role="radiogroup" aria-labelledby="role-label">
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
	<p class="hint">{msgs.roleHint[current]}</p>
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
</style>
