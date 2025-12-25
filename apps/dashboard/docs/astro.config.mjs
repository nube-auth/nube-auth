import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	integrations: [
		starlight({
			title: 'Proofa',
			description: 'Authentication, session management, and licensing for modern applications',
			favicon: '/favicon.png',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/0xdps/proofa-core' },
			],
			head: [],
			editLink: {
				baseUrl: 'https://github.com/0xdps/proofa-core/edit/trunk/apps/docs/',
			},
			customCss: ['./src/styles/custom.css'],
			components: {
				// Override the default theme selector with our custom toggle button
				ThemeSelect: './src/components/ThemeSelect.astro',
			},
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', link: '/getting-started/introduction/' },
						{ label: 'Quick Start', link: '/getting-started/quickstart/' },
						{ label: 'Installation', link: '/getting-started/installation/' },
						{ label: 'Configuration', link: '/getting-started/configuration/' },
					],
				},
				{
					label: 'Authentication',
					items: [
						{ label: 'Overview', link: '/authentication/overview/' },
						{ label: 'OAuth Providers', link: '/authentication/oauth-providers/' },
						{ label: 'Magic Links', link: '/authentication/magic-links/' },
					],
				},
				{
					label: 'Sessions',
					items: [
						{ label: 'Overview', link: '/sessions/overview/' },
						{ label: 'Token Refresh', link: '/sessions/token-refresh/' },
					],
				},
				{
					label: 'Licensing',
					items: [
						{ label: 'Overview', link: '/licensing/overview/' },
						{ label: 'Plans & Tiers', link: '/licensing/plans/' },
					],
				},
				{
					label: 'API Reference',
					items: [
						{ label: 'REST API', link: '/api/rest/' },
						{ label: 'Authentication', link: '/api/authentication/' },
						{ label: 'Sessions', link: '/api/sessions/' },
					],
				},
				{
					label: 'Self-Hosting',
					items: [
						{ label: 'Docker', link: '/self-hosting/docker/' },
						{ label: 'Environment', link: '/self-hosting/environment/' },
					],
				},
			],
		}),
	],
});
