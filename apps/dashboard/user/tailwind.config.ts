import type { Config } from 'tailwindcss';

const config: Config = {
	content: ['./src/**/*.{ts,tsx}'],
	theme: {
		extend: {
			colors: {
				primary: 'var(--primary)',
				secondary: 'var(--secondary)',
				danger: 'var(--danger)',
				success: 'var(--success)',
				warning: 'var(--warning)',
				border: 'var(--border)',
			},
		},
	},
	plugins: [],
};

export default config;
