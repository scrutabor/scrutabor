# Scrutabor

*Pray in Latin with understanding.*

A reading and prayer companion for Latin sacral texts — the traditional
Roman liturgy (1962) first, the Church's common prayers next — in which
the text itself is the interface: every Latin word can be tapped for its
lemma, full morphological analysis, gloss, and an explanation of its
function in the sentence — *why Deo and not Deum*. Liturgical rubrics
carry a narrative layer describing what is happening at the altar.

**Status: working edition.** One text so far (the Confiteor), fully
annotated in Polish and English. The annotated data lives in
[scrutabor-corpus](https://github.com/scrutabor/scrutabor-corpus), where
every analysis carries sources, confidence, and review state.

## Reading model

- **Help slider** with three verbosity levels: bare Latin · plus rubric
  narratives and per-segment translations · plus interlinear glosses.
- **Tap any word** at any level for the full analysis; cross-references
  in the explanations are links that jump to the related word.
- **Translations are revealed per verse**, on demand — read first, check
  yourself after, instead of letting a parallel translation read for you.
- Polish and English interfaces (`/pl`, `/en`), light and dark themes,
  and typography treated as a feature: EB Garamond with real interlinear
  ruby annotations, and font-metric corrections where the raw font would
  misrender liturgical text.

## Development

```bash
npm ci
npm run dev        # dev server
npm run check      # svelte-check
npm run build      # static site into build/
```

SvelteKit with the static adapter — the site prerenders completely; every
text page is plain HTML before any JavaScript runs. No backend. Runtime
dependencies are deliberately minimal.

## License

[AGPL-3.0](LICENSE). The liturgical texts and annotations come from
[scrutabor-corpus](https://github.com/scrutabor/scrutabor-corpus)
(CC BY-SA 4.0).
