/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
	// Only run Biome on file types it supports — Biome cannot parse YAML or
	// .npmrc, so a bare "*" glob makes `biome format --fix` fail on those.
	"*.{js,jsx,ts,tsx,mjs,json}": ["npx biome format --write", "pnpm lint --fix"],
};
