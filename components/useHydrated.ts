import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
/** false in the prerendered HTML and during hydration, true once the browser runs React. */
export const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false);
/** A browser-only value: the server (and no-JS) value until hydrated. */
export const useBrowser = <T,>(client: () => T, server: T) => useSyncExternalStore(subscribe, client, () => server);
