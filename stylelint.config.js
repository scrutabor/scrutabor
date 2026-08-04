/** Hand-written CSS is the product (no component library, no Tailwind —
 * design decision), so it gets a linter like any other source. */
export default {
	extends: ['stylelint-config-recommended'],
	overrides: [
		{
			files: ['**/*.svelte'],
			customSyntax: 'postcss-html'
		}
	]
};
