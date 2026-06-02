import { generateDiscriminant } from '@/lib/discriminant';

const VALID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

describe('generateDiscriminant', () => {
  it('returns a string of default length 6', () => {
    const result = generateDiscriminant();
    expect(typeof result).toBe('string');
    expect(result).toHaveLength(6);
  });

  it('returns a string of custom length when provided', () => {
    expect(generateDiscriminant(10)).toHaveLength(10);
    expect(generateDiscriminant(3)).toHaveLength(3);
    expect(generateDiscriminant(20)).toHaveLength(20);
  });

  it('only contains valid characters from the alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const result = generateDiscriminant(12);
      for (const char of result) {
        expect(VALID_CHARS).toContain(char);
      }
    }
  });

  it('does not contain ambiguous characters I, O, 0, or 1', () => {
    for (let i = 0; i < 100; i++) {
      const result = generateDiscriminant(12);
      expect(result).not.toMatch(/[IO01]/);
    }
  });

  it('produces different results across multiple calls', () => {
    const results = new Set(
      Array.from({ length: 20 }, () => generateDiscriminant()),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it('returns an empty string when length is 0', () => {
    expect(generateDiscriminant(0)).toBe('');
  });

  it('returns a single valid character when length is 1', () => {
    const result = generateDiscriminant(1);
    expect(result).toHaveLength(1);
    expect(VALID_CHARS).toContain(result);
  });
});
