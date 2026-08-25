<script lang="ts">
	// Everything that makes the BOOK an installable app lives on this
	// layout, not the root one: the landing pages above it are plain web
	// pages, and editing them must never touch the app's offline promise.
	import { dev } from '$app/environment';
	import type { Lang } from '$lib/i18n';
	import { M } from '$lib/i18n';
	import { loadMassForm } from '$lib/mass-form.svelte';
	import { loadPrayerForm } from '$lib/prayer-form.svelte';
	import { loadRole } from '$lib/role.svelte';
	import { langOfPath } from '$lib/url';

	let { children } = $props();
	let waitingWorker = $state<ServiceWorker | null>(null);
	let updateLang = $state<Lang>('en');
	let reloading = $state(false);
	const updateCopy = $derived(M[updateLang]);

	function offerUpdate(worker: ServiceWorker) {
		updateLang = langOfPath(location.pathname);
		waitingWorker = worker;
	}

	function acceptUpdate() {
		if (!waitingWorker || reloading) return;
		reloading = true;
		waitingWorker.postMessage('activate-release');
	}

	// The reader's part at Mass, applied once the page is alive (the
	// prerendered HTML is always the pew's view).
	$effect(() => {
		loadRole();
		loadMassForm();
		loadPrayerForm();
	});

	// Registered by hand rather than by the framework, because the scope
	// matters: /app/ keeps the worker off the landing pages, so a landing
	// edit can never churn the book's offline cache and a landing visit
	// never installs anything. The worker file itself stays at the origin
	// root (the build puts it there); narrowing its scope is allowed,
	// widening would not be. Not in dev — the worker stands aside there
	// anyway — and never from a downloaded folder, where there is no
	// origin to register against.
	$effect(() => {
		if (dev || !('serviceWorker' in navigator)) return;
		if (!/^https?:$/.test(location.protocol)) return;

		const serviceWorkers = navigator.serviceWorker;
		const hadController = !!serviceWorkers.controller;
		let registration: ServiceWorkerRegistration | null = null;
		let installing: ServiceWorker | null = null;
		let disposed = false;

		const onStateChange = () => {
			if (!disposed && installing?.state === 'installed' && serviceWorkers.controller) {
				offerUpdate(installing);
			}
		};
		const watch = (worker: ServiceWorker | null) => {
			installing?.removeEventListener('statechange', onStateChange);
			installing = worker;
			installing?.addEventListener('statechange', onStateChange);
			onStateChange();
		};
		const onUpdateFound = () => watch(registration?.installing ?? null);
		const onControllerChange = () => {
			if (hadController) location.reload();
		};

		serviceWorkers.addEventListener('controllerchange', onControllerChange);
		void serviceWorkers
			.register('/service-worker.js', { scope: '/app/', updateViaCache: 'none' })
			.then((value) => {
				if (disposed) return;
				registration = value;
				registration.addEventListener('updatefound', onUpdateFound);
				if (registration.waiting && serviceWorkers.controller) offerUpdate(registration.waiting);
				watch(registration.installing);
			})
			.catch(() => {
				// a browser that refuses (old, or private mode) still gets the
				// hosted book — it just is not offline-capable
			});

		return () => {
			disposed = true;
			installing?.removeEventListener('statechange', onStateChange);
			registration?.removeEventListener('updatefound', onUpdateFound);
			serviceWorkers.removeEventListener('controllerchange', onControllerChange);
		};
	});

	// The offline promise belongs to the installed app, not to a first web
	// visit: when the browser reports an install, tell the worker to fetch
	// the whole book. Someone who opened one prayer never pays for a missal.
	$effect(() => {
		// `ready`, not `controller`: a worker that has just installed is not
		// yet controlling this page, and that is exactly when an install
		// happens.
		const ask = () =>
			navigator.serviceWorker?.ready.then((r) => r.active?.postMessage('cache-the-book'));
		const onInstalled = () => ask();
		addEventListener('appinstalled', onInstalled);
		// Already installed and merely reopened: ask again; the worker only
		// fetches what it is missing.
		if (matchMedia('(display-mode: standalone)').matches) ask();
		return () => removeEventListener('appinstalled', onInstalled);
	});
</script>

<svelte:head>
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/icon-192.png" />
</svelte:head>

{@render children()}

{#if waitingWorker}
	<aside class="update-notice" role="status" aria-live="polite" aria-atomic="true">
		<p>{updateCopy.updateAvailable}</p>
		<button type="button" onclick={acceptUpdate} disabled={reloading}>
			{reloading ? updateCopy.updateReloading : updateCopy.updateReload}
		</button>
	</aside>
{/if}

<style>
	.update-notice {
		position: fixed;
		z-index: 100;
		inset-inline: 50% auto;
		bottom: max(1rem, env(safe-area-inset-bottom));
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: min(28rem, calc(100vw - 2rem));
		padding: 0.7rem 0.75rem 0.7rem 1rem;
		border: 1px solid var(--border);
		border-radius: 0.65rem;
		background: var(--surface);
		box-shadow: var(--shadow);
		color: var(--ink);
	}

	.update-notice p {
		margin: 0;
		line-height: 1.3;
	}

	.update-notice button {
		min-height: 2.75rem;
		padding: 0.4rem 0.85rem;
		border: 1px solid var(--rubric);
		border-radius: 0.45rem;
		background: transparent;
		color: var(--rubric);
		font: inherit;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
	}

	.update-notice button:disabled {
		cursor: default;
		opacity: 0.7;
	}

	@media (max-width: 24rem) {
		.update-notice {
			align-items: stretch;
			flex-direction: column;
			gap: 0.6rem;
			padding: 0.85rem;
		}
	}
</style>
