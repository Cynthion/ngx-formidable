import { FormidableDefaults } from '@cynthion/ngx-formidable';

/** The keys in the order the App Defaults scope lists them, so the snippet reads like the panel. */
const ORDER: readonly (keyof FormidableDefaults)[] = [
  'labelPosition',
  'prefixAlign',
  'suffixAlign',
  'panelPosition',
  'revealOn',
  'hideRequiredMarkers'
];

/** What the Studio's `Custom` icons say, with stand-ins where a consumer names their own components. */
const ICONS = [
  '      icons: {',
  '        fieldToggle: { component: PlusIcon },',
  '        fieldToggleOpen: { component: MinusIcon },',
  '        dateFieldPanelPrevious: { component: ArrowLeftIcon },',
  '        dateFieldPanelNext: { component: ArrowRightIcon }',
  '      }'
].join('\n');

/**
 * The app defaults and icons serialized to the `app.config.ts` that provides them.
 *
 * Export only, like the component: the template the form half exports leaves out whatever these supply, so
 * the two are taken away together, and neither is read back in.
 */
export function serializeAppConfig(defaults: FormidableDefaults, customIcons: boolean): string {
  const entries = ORDER.filter((key) => defaults[key] !== undefined).map((key) => {
    const value = defaults[key];

    return `${key}: ${typeof value === 'string' ? `'${value}'` : String(value)}`;
  });

  const blocks = [
    ...(entries.length
      ? [
          [
            '      defaults: {',
            ...entries.map((entry, index) => `        ${entry}${index < entries.length - 1 ? ',' : ''}`),
            '      }'
          ].join('\n')
        ]
      : []),
    ...(customIcons ? [ICONS] : [])
  ];

  const call = blocks.length
    ? ['    ...provideNgxFormidable({', blocks.join(',\n'), '    })']
    : ["    // No defaults set: every field keeps the library's own.", '    ...provideNgxFormidable()'];

  return [
    '// app.config.ts — an NgModule app lists the same providers in its root module.',
    "import { ApplicationConfig } from '@angular/core';",
    "import { provideNgxFormidable } from '@cynthion/ngx-formidable';",
    ...(customIcons
      ? [
          '// Stand-ins for your own icon components; the Studio draws a plus, a minus and two arrows.',
          "import { ArrowLeftIcon, ArrowRightIcon, MinusIcon, PlusIcon } from './icons';"
        ]
      : []),
    '',
    'export const appConfig: ApplicationConfig = {',
    '  providers: [',
    ...call,
    '  ]',
    '};',
    ''
  ].join('\n');
}
