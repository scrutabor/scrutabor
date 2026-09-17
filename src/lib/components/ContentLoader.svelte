<script lang="ts">
	type Variant = 'lemma' | 'search' | 'source' | 'text';

	let { variant = 'text' }: { variant?: Variant } = $props();
</script>

<div class="loader {variant}" data-content-loader={variant} aria-hidden="true">
	<div class="drawing">
		{#if variant === 'lemma'}
			<div class="lemma-identity">
				<span class="bar lemma-title"></span>
				<span class="bar lemma-pronunciation"></span>
			</div>
			<div class="lemma-card">
				{#each [0, 1, 2] as row (row)}
					<div class="lemma-row">
						<span class="bar lemma-label"></span>
						<span class="bar lemma-value" class:short={row === 1}></span>
					</div>
				{/each}
			</div>
			<div class="lemma-occurrences">
				<span class="bar section-label"></span>
				{#each [0, 1, 2, 3] as row (row)}
					<div class="occurrence-row">
						<span class="bar occurrence-title" class:short={row === 2}></span>
						<span class="bar occurrence-form"></span>
					</div>
				{/each}
			</div>
		{:else if variant === 'search'}
			{#each [0, 1, 2] as group (group)}
				<div class="search-group">
					<span class="bar section-label"></span>
					<span class="bar result-title" class:short={group === 1}></span>
					<span class="bar result-detail" class:short={group === 2}></span>
				</div>
			{/each}
		{:else if variant === 'source'}
			{#each [0, 1] as group (group)}
				<div class="source-group">
					<span class="bar source-role"></span>
					<span class="bar source-locator" class:short={group === 1}></span>
					<span class="bar source-use"></span>
				</div>
			{/each}
		{:else}
			<div class="text-lines">
				<span class="bar"></span>
				<span class="bar"></span>
				<span class="bar"></span>
				<span class="bar"></span>
			</div>
		{/if}
	</div>
</div>

<style>
	.loader {
		width: 100%;
	}

	.drawing {
		width: 100%;
	}

	.bar {
		display: block;
		height: 0.68rem;
		border-radius: 999px;
		background-image: linear-gradient(
			100deg,
			var(--wash) 18%,
			color-mix(in srgb, var(--wash-strong) 72%, var(--wash)) 42%,
			var(--wash) 66%
		);
		background-size: 240% 100%;
		animation: loader-sweep 1.65s ease-in-out infinite;
	}

	.lemma-identity {
		display: grid;
		justify-items: center;
		gap: 0.65rem;
		padding-top: 0.55rem;
	}

	.lemma-title {
		width: min(12rem, 48%);
		height: 2.15rem;
	}

	.lemma-pronunciation {
		width: min(8rem, 34%);
		height: 0.75rem;
	}

	.lemma-card {
		display: grid;
		gap: 0;
		margin-top: 1.25rem;
		padding: 0.35rem 1.4rem;
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		background: var(--surface);
	}

	.lemma-row {
		display: grid;
		grid-template-columns: minmax(4.6rem, 16%) minmax(0, 1fr);
		align-items: center;
		gap: 1.2rem;
		min-height: 3.15rem;
		border-top: 1px solid var(--border);
	}

	.lemma-row:first-child {
		border-top: 0;
	}

	.lemma-label {
		width: 68%;
		height: 0.52rem;
	}

	.lemma-value {
		width: 78%;
	}

	.lemma-value.short {
		width: 55%;
	}

	.lemma-occurrences {
		margin-top: 2.4rem;
	}

	.section-label {
		width: 5.8rem;
		height: 0.52rem;
		margin-bottom: 0.8rem;
	}

	.occurrence-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 2.5rem;
		border-bottom: 1px solid var(--border);
	}

	.occurrence-title {
		width: 42%;
	}

	.occurrence-title.short {
		width: 31%;
	}

	.occurrence-form {
		width: 18%;
	}

	.search-group {
		padding-block: 0.55rem 1.15rem;
	}

	.search-group + .search-group {
		margin-top: 0.35rem;
	}

	.result-title {
		width: min(24rem, 58%);
		height: 0.84rem;
	}

	.result-title.short {
		width: min(18rem, 44%);
	}

	.result-detail {
		width: min(38rem, 88%);
		margin-top: 0.55rem;
	}

	.result-detail.short {
		width: min(30rem, 70%);
	}

	.source {
		max-width: 42rem;
	}

	.source-group {
		padding: 0.65rem 0;
	}

	.source-group + .source-group {
		margin-top: 0.55rem;
	}

	.source-role {
		width: min(10rem, 32%);
		height: 0.48rem;
		margin-bottom: 0.62rem;
	}

	.source-locator {
		width: min(27rem, 72%);
	}

	.source-locator.short {
		width: min(20rem, 56%);
	}

	.source-use {
		width: min(34rem, 88%);
		margin-top: 0.5rem;
	}

	.text-lines {
		display: grid;
		gap: 0.65rem;
		padding-block: 0.3rem 0.2rem;
	}

	.text-lines .bar:nth-child(1) {
		width: 92%;
	}

	.text-lines .bar:nth-child(2) {
		width: 84%;
	}

	.text-lines .bar:nth-child(3) {
		width: 88%;
	}

	.text-lines .bar:nth-child(4) {
		width: 61%;
	}

	@keyframes loader-sweep {
		0% {
			background-position: 100% 0;
		}

		100% {
			background-position: -100% 0;
		}
	}

	@media (max-width: 36rem) {
		.lemma-card {
			padding-inline: 1.05rem;
		}

		.lemma-row {
			grid-template-columns: 4.25rem minmax(0, 1fr);
			gap: 0.75rem;
		}

		.occurrence-form {
			width: 25%;
		}
	}

	@media print {
		.loader {
			display: none;
		}
	}
</style>
