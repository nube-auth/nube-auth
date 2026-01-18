import type { Config } from 'tailwindcss';
import preset from '@proofa/components/styles/tailwind.preset';

const config: Config = {
	content: ['./src/**/*.{ts,tsx}'],
	presets: [preset],
	theme: {
		extend: {},
	},
};

export default config;
