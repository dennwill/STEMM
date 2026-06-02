import * as fs from 'fs';
import * as path from 'path';

const APP_JSON_PATH = path.resolve(__dirname, '../../app.json');
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf-8'));
const expo = appJson.expo;

describe('app.json configuration', () => {
  it('has the correct app name', () => {
    expect(expo.name).toBe('STEMM');
  });

  it('has expo-router plugin configured', () => {
    const pluginNames = expo.plugins.map((p: string | [string, ...unknown[]]) =>
      Array.isArray(p) ? p[0] : p,
    );
    expect(pluginNames).toContain('expo-router');
  });

  it('has expo-sqlite plugin configured', () => {
    const pluginNames = expo.plugins.map((p: string | [string, ...unknown[]]) =>
      Array.isArray(p) ? p[0] : p,
    );
    expect(pluginNames).toContain('expo-sqlite');
  });

  it('has expo-audio plugin configured', () => {
    const pluginNames = expo.plugins.map((p: string | [string, ...unknown[]]) =>
      Array.isArray(p) ? p[0] : p,
    );
    expect(pluginNames).toContain('expo-audio');
  });

  it('has Android adaptive icon configured', () => {
    expect(expo.android).toBeDefined();
    expect(expo.android.adaptiveIcon).toBeDefined();
    expect(expo.android.adaptiveIcon.foregroundImage).toBeDefined();
    expect(expo.android.adaptiveIcon.backgroundColor).toBeDefined();
  });

  it('has the deep-linking scheme set to "stemm"', () => {
    expect(expo.scheme).toBe('stemm');
  });

  it('has typed routes experiment enabled', () => {
    expect(expo.experiments).toBeDefined();
    expect(expo.experiments.typedRoutes).toBe(true);
  });

  it('is configured for portrait orientation', () => {
    expect(expo.orientation).toBe('portrait');
  });

  it('has iOS tablet support enabled', () => {
    expect(expo.ios?.supportsTablet).toBe(true);
  });
});
