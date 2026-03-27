import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import '@nube-auth/components/styles/theme.css';
import './custom.css';
import ThemeToggle from './components/ThemeToggle.vue';
import Card from './components/Card.vue';
import NotFound from './components/NotFound.vue';

export default {
	extends: DefaultTheme,
	Layout: DefaultTheme.Layout,
	NotFound,
	enhanceApp({ app }) {
		// Register custom components
		app.component('ThemeToggle', ThemeToggle);
		app.component('Card', Card);
	}
} satisfies Theme;
