<script lang="ts">
	import MassFormulary from '$lib/components/MassFormulary.svelte';
	import ResolvedCommemoration from '$lib/components/ResolvedCommemoration.svelte';

	let { data } = $props();
</script>

{#if data.kind === 'resolved'}
	<ResolvedCommemoration {data} />
{:else}
	<MassFormulary
		{data}
		parent="/app/{data.lang}/ordo"
		parentLabel="Ordo Missæ"
		parentLang="la"
		neighbourBase="commemoratio"
	/>
{/if}
