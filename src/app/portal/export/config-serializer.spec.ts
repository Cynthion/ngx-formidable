import { serializeAppConfig } from './config-serializer';

describe('app config serializer', () => {
  it('provides the library with no defaults when none are set, and says so', () => {
    const config = serializeAppConfig({});

    expect(config).toContain('...provideNgxFormidable()');
    expect(config).toContain("No defaults set: every field keeps the library's own.");
    expect(config).not.toContain('defaults:');
  });

  it('states every default that is set, in the order the panel lists them', () => {
    const config = serializeAppConfig({ hideRequiredMarkers: true, revealOn: 'dirty', labelPosition: 'border' });

    expect(config).toContain(
      [
        '    ...provideNgxFormidable({',
        '      defaults: {',
        "        labelPosition: 'border',",
        "        revealOn: 'dirty',",
        '        hideRequiredMarkers: true',
        '      }',
        '    })'
      ].join('\n')
    );
  });

  it('writes a boolean as a literal, not a string', () => {
    const config = serializeAppConfig({ hideRequiredMarkers: false });

    expect(config).toContain('hideRequiredMarkers: false');
    expect(config).not.toContain("'false'");
  });

  it('is a whole app.config.ts, imports included', () => {
    const config = serializeAppConfig({ labelPosition: 'outside' });

    expect(config).toContain("import { ApplicationConfig } from '@angular/core';");
    expect(config).toContain("import { provideNgxFormidable } from '@cynthion/ngx-formidable';");
    expect(config).toContain('export const appConfig: ApplicationConfig = {');
  });
});
