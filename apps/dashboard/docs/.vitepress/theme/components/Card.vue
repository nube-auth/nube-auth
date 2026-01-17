<template>
	<div class="custom-card" :class="variant">
		<div v-if="icon" class="card-icon">{{ icon }}</div>
		<h3 v-if="title" class="card-title">{{ title }}</h3>
		<div class="card-content">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	title?: string;
	icon?: string;
	variant?: 'default' | 'tip' | 'warning' | 'danger';
}

withDefaults(defineProps<Props>(), {
	variant: 'default'
});
</script>

<style scoped>
.custom-card {
	padding: 24px;
	border-radius: 12px;
	border: 1px solid var(--vp-c-border);
	background: var(--vp-c-bg-soft);
	transition: all 0.2s ease;
}

.custom-card:hover {
	border-color: var(--vp-c-brand-2);
	transform: translateY(-2px);
	box-shadow: 0 8px 16px rgba(99, 102, 241, 0.1);
}

.custom-card.tip {
	border-color: rgba(99, 102, 241, 0.3);
	background: rgba(99, 102, 241, 0.05);
}

.custom-card.warning {
	border-color: rgba(251, 146, 60, 0.3);
	background: rgba(251, 146, 60, 0.05);
}

.custom-card.danger {
	border-color: rgba(239, 68, 68, 0.3);
	background: rgba(239, 68, 68, 0.05);
}

.card-icon {
	font-size: 32px;
	margin-bottom: 12px;
	line-height: 1;
}

.card-title {
	margin: 0 0 12px 0;
	font-size: 18px;
	font-weight: 600;
	color: var(--vp-c-text-1);
}

.card-content {
	color: var(--vp-c-text-2);
	line-height: 1.6;
}

.card-content :deep(p) {
	margin: 0;
}

.card-content :deep(p + p) {
	margin-top: 8px;
}
</style>
