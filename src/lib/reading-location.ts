import { replaceState } from '$app/navigation';

export function readingLocationFrame() {
	let frame = 0;
	const cancel = () => {
		cancelAnimationFrame(frame);
		frame = 0;
	};
	return {
		cancel,
		schedule(action: () => void) {
			cancel();
			frame = requestAnimationFrame(() => {
				frame = 0;
				action();
			});
		}
	};
}

/** Publish only after a page has checked that its deferred address is current. */
export function presentReadingLocation(
	url: URL,
	original: string,
	selection: { segments: string[]; part?: string | null },
	refreshPanel: () => void,
	scroll: boolean
) {
	if (url.href !== original) replaceState(url, {});
	refreshPanel();
	const first = selection.segments[0];
	if (!scroll || !first || selection.part === null) return;
	const id = selection.part ? `${selection.part}-${first}` : first;
	document.getElementById(id)?.scrollIntoView({ block: 'center' });
}
