<script lang="ts">
	import PageNav from '$lib/components/PageNav.svelte';
	import { M, type Lang } from '$lib/i18n';

	let { data } = $props();
	const lang = $derived(data.lang as Lang);
	const msgs = $derived(M[lang]);
</script>

<svelte:head>
	<title>{lang === 'pl' ? 'O\u00a0wydaniu' : 'About this edition'} — Scrutabor</title>
	<meta name="description" content={msgs.editioDescription} />
</svelte:head>

<div class="page">
	<PageNav {lang} />

	<main>
		<h1 class="minor">{lang === 'pl' ? 'O\u00a0wydaniu' : 'About this edition'}</h1>

		{#if lang === 'pl'}
			<p class="what">
				Teksty łacińskie podajemy według źródeł wskazanych przy poszczególnych modlitwach. Gdy
				podstawą jest druk, porównujemy z&nbsp;nim tekst słowo po słowie. W&nbsp;aparacie krytycznym
				wyjaśniamy decyzje dotyczące pisowni, wielkich liter i&nbsp;interpunkcji. Źródła, aparat
				i&nbsp;dane wydania można znaleźć w&nbsp;<a
					href="https://github.com/scrutabor/scrutabor-corpus"
					target="_blank"
					rel="external noopener">repozytorium korpusu</a
				>.
			</p>
			<p class="what">
				Formę słownikową i&nbsp;rozbiór gramatyczny sprawdzamy za pomocą dwóch niezależnych,
				otwartych analizatorów łaciny,
				<a href="https://github.com/mk270/whitakers-words" target="_blank" rel="external noopener"
					>Whitaker's Words</a
				>
				i&nbsp;<a
					href="https://outils.biblissima.fr/en/collatinus/"
					target="_blank"
					rel="external noopener">Collatinus</a
				>. Karta słowa podaje źródła jego analizy. Oznaczeniem „opracowanie” obejmujemy własne
				przekłady, podpisy pod słowami, objaśnienia i&nbsp;decyzje redakcyjne.
			</p>
			<p class="what">
				Analizatory pokazują możliwe rozbiory słowa. O&nbsp;przypadku często rozstrzyga zdanie.
				W&nbsp;modlitwie <a href="/app/{lang}/orationes/ave-maria?w=w002" lang="la">Ave María</a>
				zwracamy się do Maryi, więc jej imię jest w&nbsp;wołaczu. W&nbsp;słowach
				<a
					href="/app/{lang}/formularium/septem-dolorum-beatae-mariae-virginis?w=septem-dolorum-beatae-mariae-virginis-alleluia.w005"
					lang="la">Stabat sancta María</a
				>
				(„stała święta Maryja”) to samo imię jest podmiotem i&nbsp;stoi w&nbsp;mianowniku. Oba programy
				korzystają między innymi ze słownika Lewis&nbsp;&amp; Short.
			</p>
			<p class="what">
				„Zaakceptowane” oznacza, że w&nbsp;tym wydaniu przyjęliśmy podany rozbiór. Oznaczenie „do
				przeglądu” wskazuje analizę czekającą na sprawdzenie, a&nbsp;„sporne” — odczytanie, co do
				którego pozostają wątpliwości. Scrutabor pozostaje <strong>wydaniem roboczym</strong> do czasu
				przeglądu przez latynistę.
			</p>
			<p class="what">
				Źródła zewnętrzne, na których opierają się objaśnienia, są podane bezpośrednio przy nich
				i&nbsp;zebrane we wspólnej <a href="/app/{lang}/bibliographia">bibliografii</a>.
			</p>
		{:else}
			<p class="what">
				Each prayer lists the sources of its Latin text. When we use a printed edition, we check the
				text against it word by word. The critical apparatus records our decisions about spelling,
				capitalization, and punctuation. The sources, apparatus, and edition data are available in
				the
				<a
					href="https://github.com/scrutabor/scrutabor-corpus"
					target="_blank"
					rel="external noopener">corpus repository</a
				>.
			</p>
			<p class="what">
				To check dictionary forms and grammatical analyses, we use two independent, open-source
				Latin analyzers,
				<a href="https://github.com/mk270/whitakers-words" target="_blank" rel="external noopener"
					>Whitaker's Words</a
				>
				and
				<a
					href="https://outils.biblissima.fr/en/collatinus/"
					target="_blank"
					rel="external noopener">Collatinus</a
				>. The word panel lists the sources that support the analysis. “Editorial” marks our own
				work on the translations, word captions, notes, and textual decisions.
			</p>
			<p class="what">
				The analyzers list the possible grammatical forms. The sentence often tells us which case
				fits. In <a href="/app/{lang}/orationes/ave-maria?w=w002" lang="la">Ave María</a>, Mary is
				addressed directly, so her name is in the vocative. In
				<a
					href="/app/{lang}/formularium/septem-dolorum-beatae-mariae-virginis?w=septem-dolorum-beatae-mariae-virginis-alleluia.w005"
					lang="la">Stabat sancta María</a
				>
				(“Holy Mary stood”), her name is the subject and takes the nominative. Both analyzers draw on
				Lewis &amp; Short among their sources.
			</p>
			<p class="what">
				“Accepted” means that this is the reading we have adopted in this edition. “Awaiting review”
				marks an analysis that still needs checking. “Disputed” marks a reading that remains in
				doubt. Scrutabor remains a <strong>working edition</strong>
				until it has been reviewed by a Latinist.
			</p>
			<p class="what">
				External sources supporting the explanations are named beside them and collected in the
				shared <a href="/app/{lang}/bibliographia">bibliography</a>.
			</p>
		{/if}
	</main>
</div>

<style>
	.what {
		margin: 1.4rem auto 0;
		line-height: 1.65;
	}

	.what a {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px dotted var(--rubric);
	}

	.what a:hover {
		color: var(--rubric);
	}
</style>
