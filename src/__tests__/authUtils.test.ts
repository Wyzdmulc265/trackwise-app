import { describe, it, expect } from 'vitest';
import { hashPassword, slug } from '../utils/authUtils';

describe('authUtils', () => {
  it('returns a deterministic password hash', () => {
    const first = hashPassword('StrongPass1!');
    const second = hashPassword('StrongPass1!');

    expect(first).toBe(second);
    expect(first).toMatch(/^tw_[0-9a-z]+$/);
  });

  it('generates a safe slug from a business name', () => {
    expect(slug('Chitsanzo General Dealers')).toBe('chitsanzo_general_dealers');
    expect(slug('TrackWise™ Business!')).toBe('trackwise_business');
  });
});
