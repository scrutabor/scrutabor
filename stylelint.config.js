/** Hand-written CSS is the product (no component library, no Tailwind —
 * design decision), so it gets a linter like any other source. */
export default {
	extends: ['stylelint-config-recommended'],
	rules: {
		// The rule guards against later low-specificity selectors being
		// overridden in a global cascade. Svelte styles are scoped per
		// component and these blocks are grouped by element for reading
		// order, not cascade order — the hazard does not apply.
		'no-descending-specificity': null
	},
	overrides: [
		{
			files: ['**/*.svelte'],
			customSyntax: 'postcss-html'
		}
	]
};
