import { FormidableDefaults } from '@cynthion/ngx-formidable';

/** The keys in the order the App Defaults scope lists them, so the snippet reads like the panel. */
const ORDER: readonly (keyof FormidableDefaults)[] = [
  'labelPosition',
  'prefixAlign',
  'suffixAlign',
  'panelPosition',
  'revealOn',
  'hideRequiredMarkers',
  'debounceMs'
];

/**
 * The app defaults serialized to the `app.config.ts` that provides them.
 *
 * Export only, like the component: the template the form half exports leaves out whatever these supply, so
 * the two are taken away together, and neither is read back in.
 */
export function serializeAppConfig(defaults: FormidableDefaults): string {
  const entries = ORDER.filter((key) => defaults[key] !== undefined).map((key) => {
    const value = defaults[key];

    return `${key}: ${typeof value === 'string' ? `'${value}'` : String(value)}`;
  });

  const call = entries.length
    ? [
        '    ...provideNgxFormidable({',
        '      defaults: {',
        ...entries.map((entry, index) => `        ${entry}${index < entries.length - 1 ? ',' : ''}`),
        '      }',
        '    })'
      ]
    : ["    // No defaults set: every field keeps the library's own.", '    ...provideNgxFormidable()'];

  return [
    '// app.config.ts — an NgModule app passes the same object to NgxFormidableModule.forRoot().',
    "import { ApplicationConfig } from '@angular/core';",
    "import { provideNgxFormidable } from '@cynthion/ngx-formidable';",
    '',
    'export const appConfig: ApplicationConfig = {',
    '  providers: [',
    ...call,
    '  ]',
    '};',
    ''
  ].join('\n');
}
