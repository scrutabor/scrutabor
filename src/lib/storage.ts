// localStorage, behind a guard.
//
// Storage can be DENIED: Chrome's "block all cookies", enterprise policy and
// privacy extensions make the property itself throw a SecurityError, and a
// full quota makes setItem throw. One such error escaping during hydration
// kills SvelteKit's router before it initialises — the word panel, the day
// picker and every other interactive layer die silently while the prerendered
// text stays readable. So no module reads or writes storage directly: a
// reader who blocks it gets the defaults, and keeps every choice for as long
// as the page lives, which is the most the book can offer them.
export function readStored(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

export function writeStored(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// nothing here is worth an error
	}
}
