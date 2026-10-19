<script lang="ts">
	import MassFormulary from '$lib/components/MassFormulary.svelte';

	let { data } = $props();
</script>

<MassFormulary
	{data}
	parent="/app/{data.lang}/ordo"
	parentLabel="Ordo Missæ"
	parentLang="la"
	neighbourBase="commemoratio"
/>
