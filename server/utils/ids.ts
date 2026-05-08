import { randomUUID } from 'crypto';

export const uuidv4 = (): string => randomUUID();

// If DB expects specific prefixes, keep them here while still using UUID v4 for uniqueness.
export const withPrefix = (prefix: string): string => `${prefix}_${randomUUID()}`;

