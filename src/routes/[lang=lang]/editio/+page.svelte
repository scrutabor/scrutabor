<script lang="ts">
	import { page } from '$app/state';
	import LangMenu from '$lib/components/LangMenu.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { M, type Lang } from '$lib/i18n';

	const lang = $derived(page.params.lang as Lang);
	const msgs = $derived(M[lang]);
</script>

<svelte:head>
	<title>{lang === 'pl' ? 'o\u00a0wydaniu' : 'about this edition'} — Scrutabor</title>
	<meta name="description" content={msgs.editioDescription} />
</svelte:head>

<div class="page">
	<nav>
		<a href="/{lang}" class="back smallcaps">scrutabor</a>
		<div class="nav-right">
			<LangMenu {lang} />
			<ThemeToggle {lang} />
		</div>
	</nav>

	<main>
		<h1>{lang === 'pl' ? 'o\u00a0wydaniu' : 'about this edition'}</h1>
		<p class="latin-name" lang="la">de editione</p>

		{#if lang === 'pl'}
			<p class="what">
				Teksty tego wydania są przepisane litera po literze ze źródeł publicznie dostępnych —
				świadków tekstu, czyli ksiąg i&nbsp;wydań liturgii z&nbsp;1962 roku — a&nbsp;następnie
				porównane z&nbsp;nimi słowo po słowie. W&nbsp;samych literach nie dopuszczamy żadnej
				rozbieżności; różnice drugorzędne (interpunkcja, wielkie litery) są rozstrzygane,
				a&nbsp;każde rozstrzygnięcie jest zapisane wraz z&nbsp;uzasadnieniem w&nbsp;aparacie
				krytycznym. Źródła, aparat krytyczny i&nbsp;wszystkie dane wydania są jawne w&nbsp;<a
					href="https://github.com/scrutabor/scrutabor-corpus"
					target="_blank"
					rel="external noopener">repozytorium korpusu</a
				>.
			</p>
			<p class="what">
				Analiza każdego słowa — lemat i&nbsp;rozbiór gramatyczny — jest sprawdzana mechanicznie
				przez dwa niezależne, otwarte analizatory łaciny:
				<a href="https://github.com/mk270/whitakers-words" target="_blank" rel="external noopener"
					>Whitaker's Words</a
				>
				i&nbsp;<a
					href="https://outils.biblissima.fr/en/collatinus/"
					target="_blank"
					rel="external noopener">Collatinus</a
				>. Przy każdym słowie panel wymienia, kto potwierdził jego rozbiór; „opracowanie” to praca
				własna wydania — glosy, przekłady i&nbsp;objaśnienia.
			</p>
			<p class="what">
				„Zaakceptowane” przy słowie znaczy: rozbiór zgodny z&nbsp;głosami analizatorów; „do
				przeglądu” — ta część czeka jeszcze na weryfikację. Całość pozostaje
				<strong>wydaniem roboczym</strong> do czasu przeglądu przez latynistę; błędy są możliwe, a&nbsp;uwagi
				mile widziane.
			</p>
		{:else}
			<p class="what">
				The texts of this edition are transcribed letter for letter from publicly available
				witnesses — books and editions of the 1962 liturgy — and collated: no divergence in the
				letters themselves is tolerated, and accidental differences (punctuation, capitals) carry
				recorded rulings in a critical apparatus. The witnesses, critical apparatus and all edition
				data are open in the
				<a
					href="https://github.com/scrutabor/scrutabor-corpus"
					target="_blank"
					rel="external noopener">corpus repository</a
				>.
			</p>
			<p class="what">
				Every word's analysis — lemma and parse — is checked mechanically by two independent open
				Latin analyzers:
				<a href="https://github.com/mk270/whitakers-words" target="_blank" rel="external noopener"
					>Whitaker's Words</a
				>
				and
				<a
					href="https://outils.biblissima.fr/en/collatinus/"
					target="_blank"
					rel="external noopener">Collatinus</a
				>. The word panel names each word's confirmers; “editorial” is the edition's own work — the
				glosses, translations, notes and rulings.
			</p>
			<p class="what">
				“Accepted” on a word means its parse agrees with the analyzers' votes; “awaiting review”
				marks a layer still to be verified. The whole remains a <strong>working edition</strong>
				until review by a Latinist; errors are possible and corrections welcome.
			</p>
		{/if}
	</main>
</div>

<style>
	.page {
		max-width: 38rem;
		margin: 0 auto;
		padding: 1.25rem 1.5rem 4rem;
	}

	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.back {
		text-decoration: none;
		color: var(--ink-soft);
		font-size: 0.85rem;
	}

	.back:hover {
		color: var(--ink);
	}

	h1 {
		margin: 1.8rem 0 0;
		font-size: 2.2rem;
		font-weight: 500;
		text-align: center;
	}

	.latin-name {
		margin: 0.2rem 0 0;
		text-align: center;
		color: var(--rubric);
		font-style: italic;
	}

	.what {
		margin: 1.4rem auto 0;
		max-width: 34rem;
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
