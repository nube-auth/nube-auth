import { defineConfig } from 'vitepress'

const envTag = process.env.VITE_ENV_TAG || 'BETA';

export default defineConfig({
  title: 'Nube Auth',
  description: 'Authentication, session management, and licensing for modern applications',
  head: [
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#09090B' }],
    ['style', {}, `:root { --env-tag-label: '${envTag}'; }`],
  ],
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Docs', link: '/getting-started/introduction/' },
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/getting-started/introduction/' },
          { text: 'Quick Start', link: '/getting-started/quickstart/' },
          { text: 'Installation', link: '/getting-started/installation/' },
          { text: 'Configuration', link: '/getting-started/configuration/' },
        ]
      },
      {
        text: 'Dashboards',
        items: [
          { text: 'Overview', link: '/dashboards/overview/' },
          { text: 'Admin Dashboard', link: '/dashboards/admin-dashboard/' },
          { text: 'User Dashboard', link: '/dashboards/user-dashboard/' },
        ]
      },
      {
        text: 'Integration',
        items: [
          { text: 'Quick Start', link: '/integration/quickstart/' },
          { text: 'Browser Extension', link: '/integration/browser-extension/' },
        ]
      },
      {
        text: 'Authentication',
        items: [
          { text: 'Overview', link: '/authentication/overview/' },
          { text: 'OAuth Providers', link: '/authentication/oauth-providers/' },
          { text: 'Magic Links', link: '/authentication/magic-links/' },
        ]
      },
      {
        text: 'Sessions',
        items: [
          { text: 'Overview', link: '/sessions/overview/' },
          { text: 'Token Refresh', link: '/sessions/token-refresh/' },
        ]
      },
      {
        text: 'Licensing',
        items: [
          { text: 'Overview', link: '/licensing/overview/' },
          { text: 'Plans & Tiers', link: '/licensing/plans/' },
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'REST API', link: '/api/rest/' },
          { text: 'Authentication', link: '/api/authentication/' },
          { text: 'Sessions', link: '/api/sessions/' },
        ]
      },
    ],
  }
})
