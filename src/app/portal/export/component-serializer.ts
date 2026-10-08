import { FIELD_KIND_CLASSES, FIELD_KIND_SELECTORS } from '../model/field-capabilities';
import { PortalFieldKind, PortalFormDefinition } from '../model/field-spec.model';
import { isIdentifier, presetHandlerName, serializeDefinition } from './markup-serializer';
import { importLines } from './schema-serializer';

/** The library's own decorations, by the mark each leaves in the template. */
const DECORATIONS: readonly (readonly [mark: RegExp, name: string])[] = [
  [/<formidable-field-decorator\b/, 'FieldDecorator'],
  [/<formidable-field-option\b/, 'FieldOption'],
  [/\bformidableFieldLabel\b/, 'FieldLabel'],
  [/\bformidableFieldLabelAdornment\b/, 'FieldLabelAdornment'],
  [/\bformidableFieldPrefix\b/, 'FieldPrefix'],
  [/\bformidableFieldSuffix\b/, 'FieldSuffix'],
  [/\bformidableFieldHint\b/, 'FieldHint']
];

/** A field element in the template, by its selector. */
const element = (kind: PortalFieldKind): RegExp => new RegExp(`<${FIELD_KIND_SELECTORS[kind]}(?![\\w-])`);

const key = (name: string): string => (isIdentifier(name) ? name : `'${name}'`);

/**
 * A preset field's map and the handler the template binds to its `valueChange`.
 *
 * The presets are the component's rather than the template's: they are data, and a template cannot hold a
 * map. That is also why a re-imported template arrives without them — see `user/studio.md`.
 */
function presetMembers(definition: PortalFormDefinition): string[] {
  return definition.fields
    .filter((field) => field.presets)
    .flatMap((field) => {
      const handler = presetHandlerName(field.name);
      const map = `${handler.replace(/^apply/, '').replace(/^./, (first) => first.toLowerCase())}s`;

      return [
        '',
        `  /** What each option of \`${field.name}\` writes into the rest of the model. */`,
        `  readonly ${map}: Record<string, Partial<ExampleFormModel>> = {`,
        ...presetEntries(field.presets!),
        '  };',
        '',
        `  ${handler}(value: string | null): void {`,
        `    if (value) this.model.update((model) => ({ ...model, ...this.${map}[value] }));`,
        '  }'
      ];
    });
}

/** One line per option, each a patch written as an object literal. */
function presetEntries(presets: Readonly<Record<string, Readonly<Record<string, unknown>>>>): string[] {
  const entries = Object.entries(presets);

  return entries.map(([option, patch], index) => {
    const members = Object.entries(patch)
      .map(([name, value]) => `${key(name)}: ${literal(value)}`)
      .join(', ');

    return `    ${key(option)}: { ${members} }${index < entries.length - 1 ? ',' : ''}`;
  });
}

/** A preset value as source text. The value types are the field value types, so this covers all of them. */
function literal(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`;
  if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
  if (value instanceof Date) return `new Date('${value.toISOString()}')`;

  return String(value);
}

/**
 * The form's own `revealOn` and `hideRequiredMarkers`, over the app defaults. The library has no form-level
 * input for them, so the component scopes them over its fields the way the Studio's stage does.
 */
function formDefaults(definition: PortalFormDefinition): string[] {
  const { revealOn, hideRequiredMarkers } = definition.options;
  const members = [
    ...(revealOn ? [`revealOn: '${revealOn}'`] : []),
    ...(hideRequiredMarkers === undefined ? [] : [`hideRequiredMarkers: ${hideRequiredMarkers}`])
  ];

  if (!members.length) return [];

  return [
    '  // The form states these for its own fields, over the app defaults.',
    '  providers: [',
    '    {',
    '      provide: FORMIDABLE_DEFAULTS,',
    `      useFactory: () => ({ ...inject(FORMIDABLE_DEFAULTS, { skipSelf: true }), ${members.join(', ')} })`,
    '    }',
    '  ]'
  ];
}

/**
 * The component, `example-form.ts`: the model, the form over it, and the handlers the template binds.
 *
 * It imports exactly what the template uses, read off the template itself, so the two cannot disagree.
 */
export function serializeComponent(definition: PortalFormDefinition): string {
  const template = serializeDefinition(definition);
  const uses = (mark: RegExp): boolean => mark.test(template);

  const library = [
    ...DECORATIONS.filter(([mark]) => uses(mark)).map(([, name]) => name),
    ...(Object.keys(FIELD_KIND_SELECTORS) as PortalFieldKind[])
      .filter((kind) => kind !== 'counter' && uses(element(kind)))
      .map((kind) => FIELD_KIND_CLASSES[kind])
  ].sort((a, b) => a.localeCompare(b));
  const counter = uses(element('counter'));
  const forms = ['FormRoot', ...(uses(/\[formField\]/) ? ['FormField'] : [])];
  const defaults = formDefaults(definition);

  const imports = [...forms, ...library, ...(counter ? [FIELD_KIND_CLASSES.counter] : [])];

  return [
    ...importLines(['Component', 'signal', ...(defaults.length ? ['inject'] : [])], '@angular/core'),
    ...importLines(['form', ...forms], '@angular/forms/signals'),
    ...(library.length || defaults.length
      ? importLines([...library, ...(defaults.length ? ['FORMIDABLE_DEFAULTS'] : [])], '@cynthion/ngx-formidable')
      : []),
    ...(counter
      ? [
          "// The Studio's own custom field: import yours instead, see user/custom-fields.md",
          `import { ${FIELD_KIND_CLASSES.counter} } from '../example-counter-field/example-counter-field';`
        ]
      : []),
    "import { initialExampleFormModel, ExampleFormModel, exampleSchema } from './example.form';",
    '',
    '@Component({',
    "  selector: 'app-example-form',",
    "  templateUrl: './example-form.html',",
    '  imports: [',
    ...imports.map((name, index) => `    ${name}${index < imports.length - 1 ? ',' : ''}`),
    `  ]${defaults.length ? ',' : ''}`,
    ...defaults,
    '})',
    'export class ExampleForm {',
    '  readonly model = signal<ExampleFormModel>(initialExampleFormModel);',
    '  readonly form = form(this.model, exampleSchema);',
    ...presetMembers(definition),
    '}',
    ''
  ].join('\n');
}
