<script lang="ts">
	import type { ComponentCondition } from '$lib/corpus-metadata';
	import type { Lang } from '$lib/i18n';
	import { bindPlFields } from '$lib/polish';

	let { condition, lang }: { condition: ComponentCondition; lang: Lang } = $props();
	const labels = bindPlFields({
		pl: {
			sunday: 'Gdy ten dzień przypada w niedzielę.',
			'not-sunday': 'Gdy ten dzień przypada poza niedzielą.',
			paschale: 'W okresie wielkanocnym.',
			'not-paschale': 'Poza okresem wielkanocnym.',
			'post-septuagesimam': 'Od Siedemdziesiątnicy do Wielkanocy.',
			'not-post-septuagesimam': 'Poza czasem od Siedemdziesiątnicy do Wielkanocy.',
			'votive-after-septuagesima':
				'W Mszach wotywnych od Siedemdziesiątnicy do Wielkanocy. Ten tekst nie należy do formularza święta wybranego w kalendarzu.',
			'votive-before-septuagesima-or-after-pentecost':
				'W Mszach wotywnych przed Siedemdziesiątnicą lub po Zesłaniu Ducha Świętego. Ten tekst nie należy do formularza święta wybranego w kalendarzu.'
		},
		en: {
			sunday: 'When this day falls on a Sunday.',
			'not-sunday': 'When this day falls on a weekday.',
			paschale: 'During Eastertide.',
			'not-paschale': 'Outside Eastertide.',
			'post-septuagesimam': 'From Septuagesima until Easter.',
			'not-post-septuagesimam': 'Outside the weeks from Septuagesima until Easter.',
			'votive-after-septuagesima':
				'In votive Masses from Septuagesima until Easter. This text is not part of the feast selected in the calendar.',
			'votive-before-septuagesima-or-after-pentecost':
				'In votive Masses before Septuagesima or after Pentecost. This text is not part of the feast selected in the calendar.'
		}
	});
	const key = $derived(
		'weekday' in condition
			? condition.weekday
			: 'season' in condition
				? condition.season
				: condition.use
	);
</script>

<p class="component-condition">{labels[lang][key]}</p>

<style>
	.component-condition {
		color: var(--rubric);
		font-style: italic;
		margin-block: 0.75em 1em;
	}
</style>
