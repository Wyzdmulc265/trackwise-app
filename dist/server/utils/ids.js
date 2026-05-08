import { randomUUID } from 'crypto';
export const uuidv4 = () => randomUUID();
// If DB expects specific prefixes, keep them here while still using UUID v4 for uniqueness.
export const withPrefix = (prefix) => `${prefix}_${randomUUID()}`;
//# sourceMappingURL=ids.js.map