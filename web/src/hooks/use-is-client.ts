import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Reads a browser-only value without a hydration mismatch (server renders the fallback). */
export function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}
