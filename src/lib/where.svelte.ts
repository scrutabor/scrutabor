/**
 * Where the reader is, as the BOOK understands it: the path within a
 * language, with no language prefix. /pl/orationes/ave-maria is
 * "/orationes/ave-maria", and so is the English page beside it.
 *
 * The language menu used to work this out by cutting the prefix off
 * `location.pathname`. That holds only while a path is a URL path. Opened
 * from a folder it is a file path — /Users/…/app/pl/orationes/ave-maria.html
 * — the prefix is not at the front, nothing is cut, and the menu offered a
 * link into the middle of somebody's home directory.
 *
 * The layout knows the answer at prerender ([lang=lang]/+layout.server.ts)
 * and puts it here, so every surface reads the same fact rather than
 * deriving it from something that is only sometimes true.
 */
import { writeStored } from '$lib/storage';

export const where = $state({ path: '' });

/**
 * What every language layout does when its page is alive: record where
 * the reader is, keep the live DOM lang in sync (the prerendered
 * <html lang> is set by hooks), and remember the choice so both routers
 * — the site root's and the app's — open in it next time. One function
 * because the book's layout and the landing's must do exactly the same
 * thing without depending on each other.
 */
export function adoptLanguage(lang: string, path: string): void {
	where.path = path;
	document.documentElement.lang = lang;
	writeStored('scrutabor-lang', lang);
}
