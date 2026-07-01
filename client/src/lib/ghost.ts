/**
 * GHOST server client. Thin re-export of the HTTP helpers so callers can import
 * from a single `@/lib/ghost` entry point.
 */
export { get, post, ts } from "./api";
