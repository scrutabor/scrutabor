<script lang="ts">
	// The stable identity of a Latin word: the form a reader sees and the
	// way it is pronounced. A panel ranges it left and keeps it compact; a
	// lemma page centres the same relationship at page-title scale.
	import Pronunciation from '$lib/components/Pronunciation.svelte';
	import type { Lang } from '$lib/i18n';

	let {
		form,
		lang,
		level,
		placement = 'panel'
	}: {
		form: string;
		lang: Lang;
		level: 1 | 2;
		placement?: 'panel' | 'page';
	} = $props();

	const tag = $derived(level === 1 ? 'h1' : 'h2');
</script>

<div class="identity identity-{placement}">
	<svelte:element this={tag} class="form" lang="la">{form}</svelte:element>
	<div class="pronunciation-lead">
		<Pronunciation {form} {lang} />
	</div>
</div>

<style>
	.identity {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: baseline;
		gap: 1rem;
		min-width: 0;
		text-align: left;
	}

	.identity-panel {
		flex: 1;
	}

	.identity-page {
		width: max-content;
		max-width: 100%;
		margin: 1.8rem auto 0;
	}

	.form {
		margin: 0;
		font-size: 1.7rem;
		font-weight: 500;
		text-align: left;
	}

	.identity-page .form {
		font-size: 2.2rem;
	}

	.pronunciation-lead {
		min-width: 0;
		text-align: left;
	}

	@media (max-width: 36rem) {
		.identity {
			display: block;
		}

		.identity-page {
			text-align: center;
		}

		.identity-page .form,
		.identity-page .pronunciation-lead {
			text-align: center;
		}
	}
</style>
