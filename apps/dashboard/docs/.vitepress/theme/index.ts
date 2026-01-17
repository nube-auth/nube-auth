import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import '@proofa/styles/theme.css';
import './custom.css';
import ThemeToggle from './components/ThemeToggle.vue';
import Card from './components/Card.vue';

export default {
	extends: DefaultTheme,
	enhanceApp({ app }) {
		// Register custom components
		app.component('ThemeToggle', ThemeToggle);
		app.component('Card', Card);
	}
} satisfies Theme;
