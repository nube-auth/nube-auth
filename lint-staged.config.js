/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
	"*": ["npx biome format --fix", "pnpm lint --fix"],
};
