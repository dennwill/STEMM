import { friendlyError } from '@/lib/errors';

describe('friendlyError', () => {
  it('returns a friendly message for auth/user-not-found', () => {
    const error = { code: 'auth/user-not-found' };
    expect(friendlyError(error)).toBe('No account found with that email.');
  });

  it('returns a friendly message for auth/invalid-credential', () => {
    const error = { code: 'auth/invalid-credential' };
    expect(friendlyError(error)).toBe('Invalid email or password.');
  });

  it('returns a friendly message for network errors', () => {
    const error = { code: 'auth/network-request-failed' };
    expect(friendlyError(error)).toBe(
      'Network error. Please check your connection.',
    );
  });

  it('returns a friendly message for auth/weak-password', () => {
    const error = { code: 'auth/weak-password' };
    expect(friendlyError(error)).toBe(
      'Password is too weak. Use at least 6 characters.',
    );
  });

  it('returns a friendly message for permission-denied', () => {
    const error = { code: 'permission-denied' };
    expect(friendlyError(error)).toBe(
      "You don't have permission to do that.",
    );
  });

  it('returns the default fallback for unknown error codes', () => {
    const error = { code: 'auth/unknown-code-xyz' };
    expect(friendlyError(error)).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('returns a custom fallback when provided', () => {
    const error = { code: 'some/random-code' };
    expect(friendlyError(error, 'Custom fallback')).toBe('Custom fallback');
  });

  it('returns the fallback for errors without a code property', () => {
    const error = new Error('generic failure');
    expect(friendlyError(error)).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('handles null gracefully', () => {
    expect(friendlyError(null)).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('handles undefined gracefully', () => {
    expect(friendlyError(undefined)).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('handles non-object values gracefully', () => {
    expect(friendlyError(42)).toBe('Something went wrong. Please try again.');
    expect(friendlyError('string error')).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
