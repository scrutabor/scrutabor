<script lang="ts">
	import HelpLevels, { initialHelp } from '$lib/components/HelpLevels.svelte';
	import RolePicker from '$lib/components/RolePicker.svelte';
	import type { Lang } from '$lib/i18n';

	let {
		lang,
		value = $bindable(initialHelp()),
		hasRoleChoice,
		hasMassFormChoice
	}: {
		lang: Lang;
		value?: number;
		hasRoleChoice: boolean;
		hasMassFormChoice: boolean;
	} = $props();
</script>

<div class="help-row">
	<div class="tabella">
		<HelpLevels {lang} bind:value />
		{#if hasRoleChoice}<RolePicker {lang} />{/if}
		{#if hasMassFormChoice}<RolePicker {lang} kind="mass" />{/if}
	</div>
</div>
