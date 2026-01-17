<template>
	<button 
		@click="cycleTheme" 
		class="theme-toggle"
		:data-theme-mode="currentMode"
		:title="currentLabel"
		aria-label="Toggle theme"
	>
		<!-- System icon -->
		<svg v-if="currentMode === 'system'" class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
			<line x1="8" y1="21" x2="16" y2="21"></line>
			<line x1="12" y1="17" x2="12" y2="21"></line>
		</svg>
		
		<!-- Sun icon (light) -->
		<svg v-else-if="currentMode === 'light'" class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="5"></circle>
			<line x1="12" y1="1" x2="12" y2="3"></line>
			<line x1="12" y1="21" x2="12" y2="23"></line>
			<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
			<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
			<line x1="1" y1="12" x2="3" y2="12"></line>
			<line x1="21" y1="12" x2="23" y2="12"></line>
			<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
			<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
		</svg>
		
		<!-- Moon icon (dark) -->
		<svg v-else class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
		</svg>
		
		<span class="theme-label">{{ currentLabel }}</span>
	</button>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useData } from 'vitepress';

type ThemeMode = 'system' | 'light' | 'dark';

const { isDark } = useData();
const currentMode = ref<ThemeMode>('system');

const currentLabel = computed(() => {
	const labels: Record<ThemeMode, string> = {
		'system': 'System',
		'light': 'Light',
		'dark': 'Dark'
	};
	return labels[currentMode.value];
});

// Get theme preference from localStorage
function getThemePreference(): ThemeMode {
	if (typeof localStorage !== 'undefined') {
		const stored = localStorage.getItem('vitepress-theme') as ThemeMode;
		if (stored && ['system', 'light', 'dark'].includes(stored)) {
			return stored;
		}
	}
	return 'system';
}

// Apply theme based on mode
function applyTheme(mode: ThemeMode) {
	if (mode === 'system') {
		// Use system preference
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		document.documentElement.classList.toggle('dark', prefersDark);
		document.documentElement.classList.toggle('light', !prefersDark);
		isDark.value = prefersDark;
	} else {
		document.documentElement.classList.toggle('dark', mode === 'dark');
		document.documentElement.classList.toggle('light', mode === 'light');
		isDark.value = mode === 'dark';
	}
}

// Cycle through theme modes: system → light → dark → system
function cycleTheme() {
	const modes: ThemeMode[] = ['system', 'light', 'dark'];
	const currentIndex = modes.indexOf(currentMode.value);
	const nextMode = modes[(currentIndex + 1) % modes.length];
	
	currentMode.value = nextMode;
	localStorage.setItem('vitepress-theme', nextMode);
	applyTheme(nextMode);
}

// Initialize theme on mount
onMounted(() => {
	currentMode.value = getThemePreference();
	applyTheme(currentMode.value);
	
	// Listen for system preference changes (only if in system mode)
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	const handleSystemThemeChange = (e: MediaQueryListEvent) => {
		if (currentMode.value === 'system') {
			isDark.value = e.matches;
			document.documentElement.classList.toggle('dark', e.matches);
			document.documentElement.classList.toggle('light', !e.matches);
		}
	};
	
	mediaQuery.addEventListener('change', handleSystemThemeChange);
	
	// Cleanup
	return () => {
		mediaQuery.removeEventListener('change', handleSystemThemeChange);
	};
});

// Watch for mode changes
watch(currentMode, (newMode) => {
	applyTheme(newMode);
});
</script>

<style scoped>
.theme-toggle {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	min-width: 90px;
	padding: 6px 12px;
	border-radius: 8px;
	border: 1px solid var(--vp-c-border);
	background: var(--vp-c-bg-soft);
	color: var(--vp-c-text-2);
	cursor: pointer;
	transition: all 0.2s ease;
	font-size: 13px;
	font-weight: 500;
	font-family: var(--vp-font-family-base);
}

.theme-toggle:hover {
	border-color: var(--vp-c-brand-1);
	color: var(--vp-c-text-1);
	background: var(--vp-c-bg-elv);
	transform: translateY(-1px);
}

.theme-toggle .icon {
	width: 16px;
	height: 16px;
	flex-shrink: 0;
}

.theme-label {
	white-space: nowrap;
}

/* Active state based on current mode */
.theme-toggle[data-theme-mode="system"] {
	border-color: var(--vp-c-brand-1);
}

.theme-toggle[data-theme-mode="light"] {
	border-color: var(--vp-c-brand-2);
}

.theme-toggle[data-theme-mode="dark"] {
	border-color: var(--vp-c-brand-3);
}
</style>
