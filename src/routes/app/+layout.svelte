<script lang="ts">
	// Everything that makes the BOOK an installable app lives on this
	// layout, not the root one: the landing pages above it are plain web
	// pages, and editing them must never touch the app's offline promise.
	import { dev } from '$app/environment';
	import { loadMassForm } from '$lib/mass-form.svelte';
	import { loadPrayerForm } from '$lib/prayer-form.svelte';
	import { loadRole } from '$lib/role.svelte';

	let { children } = $props();

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
		navigator.serviceWorker.register('/service-worker.js', { scope: '/app/' }).catch(() => {
			// a browser that refuses (old, or private mode) still gets the
			// hosted book — it just is not offline-capable
		});
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
