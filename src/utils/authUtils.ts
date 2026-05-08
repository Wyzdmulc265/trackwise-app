/**
 * Client-side auth utils (test helper only).
 *
 * NOTE:
 * - This is NOT used for production password storage/verification.
 * - It exists to keep deterministic behavior for frontend unit tests.
 */

export const hashPassword = (password: string): string => {
  // Deterministic non-cryptographic hash (test-only).
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `tw_${Math.abs(hash).toString(36)}`;
};

export const slug = (s: string): string =>
  s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
