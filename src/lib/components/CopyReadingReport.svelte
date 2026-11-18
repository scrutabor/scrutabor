<script lang="ts">
	import type { Lang } from '$lib/i18n';
	import { massForm } from '$lib/mass-form.svelte';
	import { role } from '$lib/role.svelte';
	import { readingReport } from '$lib/reading-report';
	import { pageUrl } from '$lib/url';

	let { lang, mode, word }: { lang: Lang; mode: number; word: string } = $props();
	let status = $state('');
	let manual = $state('');
	const copy = $derived(lang === 'pl' ? 'Kopiuj odsyłacz do zgłoszenia' : 'Copy link for a report');

	async function copyReport() {
		const value = readingReport(pageUrl(), {
			lang,
			mode,
			word,
			role: role.value,
			form: massForm.value
		});
		try {
			await navigator.clipboard.writeText(value);
			manual = '';
			status =
				lang === 'pl'
					? 'Skopiowano odsyłacz i ustawienia widoku.'
					: 'Link and view settings copied.';
		} catch {
			manual = value;
			status =
				lang === 'pl' ? 'Zaznacz i skopiuj tekst poniżej.' : 'Select and copy the text below.';
		}
	}
</script>

<div class="reading-report">
	<button type="button" onclick={copyReport}>{copy}</button>
	{#if status}<p role="status">{status}</p>{/if}
	{#if manual}<textarea aria-label={copy} readonly rows="4" value={manual}></textarea>{/if}
</div>

<style>
	.reading-report {
		margin-block-start: 0.9rem;
		color: var(--ink-soft);
	}

	button {
		font: inherit;
		color: inherit;
		background: transparent;
		border: 0;
		padding: 0.25rem 0;
		text-decoration: underline;
		cursor: pointer;
	}

	p {
		margin-block: 0.25rem;
	}

	textarea {
		display: block;
		width: 100%;
	}
</style>
