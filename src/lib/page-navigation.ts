import { goto } from '$app/navigation';

/** Open another static page in the hosted reader or another hash route in
 * the downloaded, single-document edition. */
export function openPage(href: string): void {
	if (location.protocol === 'file:') {
		void goto(href);
		return;
	}
	location.assign(href);
}
