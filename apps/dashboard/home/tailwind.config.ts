import type { Config } from 'tailwindcss';
import preset from '@proofa/components/styles/tailwind.preset';

const config: Config = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	presets: [preset],
	theme: {
		extend: {},
	},
};

export default config;
