/** Returns the current time as an ISO 8601 string. Injected so tests control time. */
export type Clock = () => string;

export const systemClock: Clock = () => new Date().toISOString();
