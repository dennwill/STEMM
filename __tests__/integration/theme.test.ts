import { Colors, Fonts } from '@/constants/theme';

const REQUIRED_COLOR_KEYS = [
  'text',
  'background',
  'tint',
  'icon',
  'tabIconDefault',
  'tabIconSelected',
] as const;

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

describe('Colors', () => {
  it('has both light and dark keys', () => {
    expect(Colors).toHaveProperty('light');
    expect(Colors).toHaveProperty('dark');
  });

  it.each(['light', 'dark'] as const)(
    '%s scheme has all required keys',
    (scheme) => {
      for (const key of REQUIRED_COLOR_KEYS) {
        expect(Colors[scheme]).toHaveProperty(key);
      }
    },
  );

  it.each(['light', 'dark'] as const)(
    '%s scheme values are valid hex colors',
    (scheme) => {
      for (const key of REQUIRED_COLOR_KEYS) {
        const value = Colors[scheme][key];
        expect(typeof value).toBe('string');
        expect(value).toMatch(HEX_COLOR_REGEX);
      }
    },
  );

  it('light and dark themes have different text colors', () => {
    expect(Colors.light.text).not.toBe(Colors.dark.text);
  });

  it('light and dark themes have different background colors', () => {
    expect(Colors.light.background).not.toBe(Colors.dark.background);
  });

  it('light and dark themes have different tint colors', () => {
    expect(Colors.light.tint).not.toBe(Colors.dark.tint);
  });
});

describe('Fonts', () => {
  it('is defined', () => {
    expect(Fonts).toBeDefined();
  });

  it('has sans, serif, rounded, and mono keys', () => {
    expect(Fonts).toHaveProperty('sans');
    expect(Fonts).toHaveProperty('serif');
    expect(Fonts).toHaveProperty('rounded');
    expect(Fonts).toHaveProperty('mono');
  });

  it('all font values are strings', () => {
    for (const key of ['sans', 'serif', 'rounded', 'mono'] as const) {
      expect(typeof Fonts![key]).toBe('string');
    }
  });
});
