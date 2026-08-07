// `page` from $app/state is the router's view of where the reader is. No
// page in this book reads it any more — every route takes its language and
// params as data (see [lang=lang]/+layout.server.ts) — so this exists only
// to satisfy the error page, which is the one component that still asks.
export const page = {
	url: new URL('https://scrutabor.invalid/'),
	params: {} as Record<string, string>,
	route: { id: null as string | null },
	status: 200,
	error: null as Error | null,
	data: {} as Record<string, unknown>,
	form: null,
	state: {}
};
export const navigating = null;
export const updated = { current: false, check: async () => false };
