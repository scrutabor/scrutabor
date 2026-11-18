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
				Łacińskie teksty przepisujemy z&nbsp;publicznie dostępnych ksiąg liturgicznych
				i&nbsp;sprawdzamy je z&nbsp;drukiem słowo po słowie. Zachowujemy zapis liter ze źródła.
				Decyzje dotyczące interpunkcji i&nbsp;wielkich liter wyjaśniamy w&nbsp;aparacie krytycznym.
				Źródła, aparat i&nbsp;dane wydania można znaleźć w&nbsp;<a
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
				>. W&nbsp;karcie słowa można sprawdzić, które źródła potwierdzają rozbiór. Oznaczeniem
				„opracowanie” obejmujemy własne przekłady, podpisy pod słowami, objaśnienia i&nbsp;decyzje
				redakcyjne.
			</p>
			<p class="what">
				Analizatory pokazują, jakie rozbiory są możliwe dla danej formy. Samo „María” dopuszcza
				dwanaście odczytań. Żeby wybrać właściwe, trzeba przeczytać słowo w&nbsp;zdaniu. To właśnie
				wybór rozbioru w&nbsp;kontekście czeka na przegląd latynisty. Oba programy korzystają między
				innymi ze słownika Lewis&nbsp;&amp; Short.
			</p>
			<p class="what">
				„Zaakceptowane” przy słowie oznacza, że analizatory potwierdzają podany rozbiór jako
				możliwy. „Do przeglądu” oznacza, że dana część analizy jeszcze czeka na sprawdzenie.
				Scrutabor pozostaje <strong>wydaniem roboczym</strong> do czasu przeglądu przez latynistę.
			</p>
			<p class="what">
				Źródła zewnętrzne, na których opierają się objaśnienia, są podane bezpośrednio przy nich
				i&nbsp;zebrane we wspólnej <a href="/app/{lang}/bibliographia">bibliografii</a>.
			</p>
		{:else}
			<p class="what">
				We transcribe the Latin from publicly available liturgical books and check it against the
				printed text word by word. We follow the source spelling and record decisions about
				punctuation and capitalization in the critical apparatus. The sources, apparatus, and
				edition data are available in the
				<a
					href="https://github.com/scrutabor/scrutabor-corpus"
					target="_blank"
					rel="external noopener">corpus repository</a
				>.
			</p>
			<p class="what">
				We check each word’s dictionary form and grammar with two independent, open-source Latin
				analyzers,
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
				The analyzers list the possible grammatical forms. “María” alone has twelve possible
				readings. The sentence tells us which one fits, and that choice still needs review by a
				Latinist. Both analyzers draw on Lewis &amp; Short among their sources.
			</p>
			<p class="what">
				“Accepted” means the analyzers recognize the analysis as possible. “Awaiting review” marks
				part of the analysis that still needs checking. Scrutabor remains a <strong
					>working edition</strong
				>
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
