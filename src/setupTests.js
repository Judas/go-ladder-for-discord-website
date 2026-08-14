// Adds the jest-dom matchers (toBeInTheDocument, toHaveAttribute, …) to Vitest's expect.
import '@testing-library/jest-dom/vitest';

/**
 * Node 24+ ships its own `localStorage` global, which is **undefined** unless the process was started with
 * `--localstorage-file`. Under Vitest the jsdom window *is* globalThis, so that accessor shadows the storage jsdom
 * would otherwise install: `window.localStorage` and a bare `localStorage` are both undefined, and only in tests.
 *
 * src/AuthProfile.js reads and writes a bare `localStorage` on every page load, so without this the whole app throws
 * on render here while working perfectly in a browser. The descriptor is configurable, so redefine it with a plain
 * in-memory Storage — per worker, cleared by whoever needs it clean.
 */
/**
 * WGo is vendored under public/ and loaded by classic <script> tags in index.html, so `window.WGo` simply does not
 * exist under jsdom. Components/WGOPlayer.jsx reads `window.WGo.BasicPlayer.layouts` while rendering — not in an
 * effect — so any page carrying a goban throws here without this. A stub, not the real library: nothing in these
 * tests asserts on a rendered board.
 */
class StubBasicPlayer { }
StubBasicPlayer.layouts = { right_top: {} };
globalThis.WGo = { BasicPlayer: StubBasicPlayer };

const store = new Map();
Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
        get length() { return store.size; },
        key: index => Array.from(store.keys())[index] ?? null,
        getItem: key => (store.has(String(key)) ? store.get(String(key)) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: key => { store.delete(String(key)); },
        clear: () => { store.clear(); },
    },
});
