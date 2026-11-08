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
	import { readSession, writeSession } from '$lib/storage';
	import { langOfPath } from '$lib/url';

	let { children } = $props();
	let waitingWorker = $state<ServiceWorker | null>(null);
	let notice = $state<HTMLElement | null>(null);
	let updateLang = $state<Lang>('en');
	let reloading = $state(false);
	// An ordinary update may be put off for the session; a copy that can no
	// longer fetch its own assets may not stay quiet about it. The fatal
	// state re-surfaces the notice past a dismissal, with its reason.
	const DISMISSED = 'scrutabor-update-dismissed';
	let dismissed = $state(false);
	let stale = $state(false);
	const noticeShown = $derived(waitingWorker !== null && (!dismissed || stale));
	const updateCopy = $derived(M[updateLang]);

	function offerUpdate(worker: ServiceWorker) {
		updateLang = langOfPath(location.pathname);
		waitingWorker = worker;
	}

	function acceptUpdate() {
		if (!waitingWorker || reloading) return;
		// The accepted card keeps its box while its label lengthens and the
		// quiet choice leaves: a card that re-centred under the finger would
		// look broken. The fatal card has no quiet choice to give the room, so
		// it is left to grow.
		if (notice && !stale) notice.style.inlineSize = `${notice.getBoundingClientRect().width}px`;
		reloading = true;
		waitingWorker.postMessage('activate-release');
	}

	function dismissUpdate() {
		dismissed = true;
		writeSession(DISMISSED, '1');
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
	// widening would not be. In dev the same URL serves a tiny neutral worker:
	// that lets localhost replace a production worker left behind by an earlier
	// preview, rather than letting its cache impersonate the current Vite app.
	// Never register from a downloaded folder, where there is no origin.
	$effect(() => {
		if (!('serviceWorker' in navigator)) return;
		if (!/^https?:$/.test(location.protocol)) return;

		const serviceWorkers = navigator.serviceWorker;
		const hadController = !!serviceWorkers.controller;

		if (dev) {
			const onControllerChange = () => {
				// A stale production worker has just yielded to the neutral dev
				// worker. Reload once so every lazy module comes from Vite too.
				if (hadController) location.reload();
			};
			serviceWorkers.addEventListener('controllerchange', onControllerChange);
			void serviceWorkers
				// A distinct script URL makes this an immediate update even when
				// the browser would throttle a same-URL worker check for 24 hours.
				.register('/service-worker.js?dev', { scope: '/app/', updateViaCache: 'none' })
				.then((registration) => registration.update())
				.catch(() => {
					// A browser that refuses workers still gets the ordinary dev app.
				});
			return () => serviceWorkers.removeEventListener('controllerchange', onControllerChange);
		}

		let registration: ServiceWorkerRegistration | null = null;
		let installing: ServiceWorker | null = null;
		let disposed = false;

		// A worker that reaches `installed` beside a controller is an update
		// only when it is not that controller: on a first visit the page's own
		// worker can be seen as installed after it has already claimed the page
		// (WebKit delivers the state change late), and that is not an update.
		const onStateChange = () => {
			if (
				!disposed &&
				installing?.state === 'installed' &&
				serviceWorkers.controller &&
				serviceWorkers.controller !== installing
			) {
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
			// A first activation leaves this page open. An accepted update reloads
			// even when the page began without a controller.
			if (hadController || reloading) location.reload();
		};

		// The worker says when this copy has gone stale past self-repair — a
		// content-addressed asset the network no longer carries. That turns
		// the quiet notice into an explained one, past any dismissal, and
		// asks the registration for the newer worker if none is waiting yet.
		const onWorkerMessage = (event: MessageEvent) => {
			if ((event.data as { type?: string } | null)?.type !== 'stale-asset') return;
			stale = true;
			if (!waitingWorker) void registration?.update();
		};

		serviceWorkers.addEventListener('controllerchange', onControllerChange);
		serviceWorkers.addEventListener('message', onWorkerMessage);
		dismissed = readSession(DISMISSED) === '1';
		void serviceWorkers
			.register('/service-worker.js', { scope: '/app/', updateViaCache: 'none' })
			.then((value) => {
				if (disposed) return;
				registration = value;
				registration.addEventListener('updatefound', onUpdateFound);
				if (registration.waiting && serviceWorkers.controller) offerUpdate(registration.waiting);
				watch(registration.installing);
				// Each load lets the worker settle an unfinished migration:
				// idempotent, and the retry an interrupted refill needs.
				value.active?.postMessage('settle-caches');
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
			serviceWorkers.removeEventListener('message', onWorkerMessage);
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

{#if noticeShown}
	<aside
		class="update-notice"
		class:stale
		role="status"
		aria-live="polite"
		aria-atomic="true"
		bind:this={notice}
	>
		<p class="trim-label">{stale ? updateCopy.updateStale : updateCopy.updateAvailable}</p>
		<div class="actions">
			{#if !stale && !reloading}
				<button type="button" class="later trim-label" onclick={dismissUpdate}>
					{updateCopy.updateLater}
				</button>
			{/if}
			<button type="button" class="reload trim-label" onclick={acceptUpdate} disabled={reloading}>
				{reloading ? updateCopy.updateReloading : updateCopy.updateReload}
			</button>
		</div>
	</aside>
{/if}

<style>
	/* A housekeeping card, not a dialog. It floats above the page's foot,
	   sized to its own words, in the sheet's card idiom (surface, hairline
	   border, 0.9rem corners) with the chrome's pill controls: the quiet
	   choice first, the action last and filled, so the eye lands on one
	   thing. Below an open sheet (its aside sits at 10): the panel the
	   reader opened outranks the housekeeping card. */
	.update-notice {
		position: fixed;
		z-index: 9;
		inset-inline: 0;
		bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
		inline-size: max-content;
		max-inline-size: min(34rem, 100% - 1.5rem);
		margin-inline: auto;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		column-gap: 1.25rem;
		row-gap: 0.5rem;
		padding: 0.5rem 0.5rem 0.5rem 1.1rem;
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		background: var(--surface);
		box-shadow: var(--shadow-float);
		color: var(--ink);
		animation: notice-in 220ms ease-out;
	}

	@keyframes notice-in {
		from {
			opacity: 0;
			transform: translateY(0.5rem);
		}
	}

	/* A copy that can no longer fetch its files: the same card, edged in
	   the rubric, so the longer explanation reads as the warning it is. */
	.update-notice.stale {
		border-color: var(--rubric);
	}

	/* On a phone the card spans the gutter width, so it sits the same in
	   both languages and in both states. */
	@media (max-width: 40rem) {
		.update-notice {
			inline-size: auto;
		}
	}

	/* The message keeps its own width while the controls fit beside it
	   and grows into what they leave; a long one wraps at a short measure
	   (two balanced lines beside the button), and on a narrow screen the
	   controls drop under it, flush right. The label face keeps its
	   baseline level with the pill labels. */
	.update-notice p {
		flex: 1 1 auto;
		min-inline-size: 0;
		max-inline-size: 17rem;
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.35;
		text-wrap: balance;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-inline-start: auto;
	}

	.update-notice button {
		appearance: none;
		min-block-size: 2.5rem;
		padding: 0.35rem 1rem;
		border: 1px solid transparent;
		border-radius: 999px;
		background: none;
		color: var(--ink-soft);
		font-size: 0.95rem;
		line-height: 1.2;
		white-space: nowrap;
		cursor: pointer;
	}

	.update-notice .later:hover {
		background: var(--wash);
		color: var(--ink);
	}

	.update-notice .reload {
		border-color: var(--rubric);
		background: var(--rubric);
		color: var(--surface);
		font-weight: 600;
	}

	.update-notice .reload:not(:disabled):hover {
		box-shadow: inset 0 0 0 999px rgb(0 0 0 / 8%);
	}

	/* The pressed pill is the only progress message there is, so it stays
	   legible (4.7:1 on paper, 5.8:1 at night). */
	.update-notice button:disabled {
		cursor: progress;
		opacity: 0.8;
	}

	/* A finger gets the full 44 px the chrome's mouse pills do not need. */
	@media (pointer: coarse) {
		.update-notice button {
			min-block-size: 2.75rem;
		}
	}

	/* Forced colours keep the one filled action, in the system's own pair.
	   Without opting out of the adjustment the engine paints a Canvas
	   backplate behind the label, which hides HighlightText on Highlight. */
	@media (forced-colors: active) {
		.update-notice .reload {
			forced-color-adjust: none;
			border-color: Highlight;
			background: Highlight;
			color: HighlightText;
		}
	}

	@media print {
		.update-notice {
			display: none;
		}
	}
</style>
