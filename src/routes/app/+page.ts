// The app's front door prerenders as app/index.html, INSIDE the app
// subtree, rather than as a loose app.html beside it. Two things depend
// on that: the manifest's start_url must sit within the service worker's
// /app/ scope (a prefix match — /app is not inside /app/), and the
// offline package copies the build/app/ subtree whole, chooser included.
export const trailingSlash = 'always';
