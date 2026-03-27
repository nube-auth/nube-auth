<template>
  <div class="not-found">
    <div class="not-found-inner">
      <div class="not-found-code" aria-hidden="true">404</div>
      <h1 class="not-found-title">Page not found</h1>
      <p class="not-found-desc">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <div class="not-found-actions">
        <a href="/getting-started/introduction/" class="btn-primary">Browse docs</a>
        <a href="https://nubeauth.com" class="btn-secondary">Go home</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--vp-nav-height, 64px));
  padding: 4rem 1.5rem;
  background: var(--vp-c-bg);
}

.not-found-inner {
  text-align: center;
  max-width: 480px;
}

.not-found-code {
  font-size: clamp(6rem, 20vw, 9rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--vp-c-brand-1);
  opacity: 0.15;
  user-select: none;
}

.not-found-title {
  margin-top: -0.75rem;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  color: var(--vp-c-text-1);
  border: none;
  padding: 0;
}

.not-found-desc {
  margin-top: 1rem;
  font-size: 1rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.not-found-actions {
  margin-top: 2rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 1.35rem;
  background: var(--vp-c-brand-1);
  color: #fff;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9375rem;
  text-decoration: none;
  transition: background 0.15s;
}

.btn-primary:hover {
  background: var(--vp-c-brand-3);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 1.35rem;
  background: transparent;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-border);
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9375rem;
  text-decoration: none;
  transition: color 0.15s, border-color 0.15s;
}

.btn-secondary:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}
</style>
