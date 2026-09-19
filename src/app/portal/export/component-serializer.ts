import { FIELD_KIND_VALUE_TYPES, PortalValueType } from '../model/field-capabilities';
import { PortalFormDefinition } from '../model/field-spec.model';
import { isIdentifier } from './markup-serializer';

/** What the shape holds for each value type, as source text. */
const SHAPE_LITERALS: Readonly<Record<PortalValueType, string>> = {
  'string': "''",
  'string[]': '[]',
  'Date': 'new Date()',
  'boolean': 'false',
  'number': '0'
};

/**
 * A component for the exported template to bind to: the model, its shape and, under Vest, a suite.
 *
 * A proposal rather than a requirement. It lays the pieces out the way `user/validation.md` does, and any
 * component providing `model` and `shape` — and `suite` under Vest — serves the template just as well. The
 * Studio has no rule editor, so the suite is a skeleton and the rules are the consumer's.
 */
export function serializeComponent(definition: PortalFormDefinition): string {
  const vest = definition.options.validator === 'vest';
  // One key per name: two controls sharing a name share one value, and a duplicate key would not compile.
  const fields = [...new Map(definition.fields.map((field) => [field.name, field])).values()];
  const key = (name: string): string => (isIdentifier(name) ? name : `'${name}'`);
  const example = fields[0]?.name ?? 'name';
  const exampleRead = isIdentifier(example) ? `model.${example}` : `model['${example}']`;

  return [
    "import { Component, signal } from '@angular/core';",
    "import { DeepPartial, DeepRequired, NgxFormidableModule } from '@cynthion/ngx-formidable';",
    ...(vest
      ? [
          "import { NgxFormidableVestValidatorDirective } from '@cynthion/ngx-formidable/vest';",
          "import { create, mode, Modes, only, Suite } from 'vest';"
        ]
      : []),
    '',
    'export interface MyForm {',
    ...fields.map((field) => `  ${key(field.name)}: ${FIELD_KIND_VALUE_TYPES[field.kind]};`),
    '}',
    '',
    'export type MyFormModel = DeepPartial<MyForm>;',
    'export type MyFormShape = DeepRequired<MyFormModel>;',
    '',
    '/** Every key the model may carry. A dev-mode typo check, not a validator. */',
    'export const myFormShape: MyFormShape = {',
    ...fields.map(
      (field, index) =>
        `  ${key(field.name)}: ${SHAPE_LITERALS[FIELD_KIND_VALUE_TYPES[field.kind]]}${index < fields.length - 1 ? ',' : ''}`
    ),
    '};',
    ...(vest
      ? [
          '',
          'export const myFormSuite: Suite<string, string, (model: MyFormModel, field?: string) => void> = create(',
          '  (model: MyFormModel, field?: string) => {',
          "    mode(Modes.ALL); // every failing rule, not only a target's first",
          '',
          '    if (field) {',
          '      only(field); // the form validates one target at a time',
          '    }',
          '',
          '    // Your rules, for example:',
          `    // test('${example}', 'Required.', () => {`,
          `    //   enforce(${exampleRead}).isNotBlank();`,
          '    // });',
          '  }',
          ');'
        ]
      : []),
    '',
    '@Component({',
    "  selector: 'app-my-form',",
    "  templateUrl: './my-form.component.html',",
    ...(fields.some((field) => field.kind === 'counter')
      ? ["  // <example-counter-field> is the Studio's own custom field: import yours, see user/custom-fields.md"]
      : []),
    `  imports: [NgxFormidableModule${vest ? ', NgxFormidableVestValidatorDirective' : ''}]`,
    '})',
    'export class MyFormComponent {',
    '  readonly model = signal<MyFormModel>({});',
    '  readonly shape = myFormShape;',
    ...(vest ? ['  readonly suite = myFormSuite;'] : []),
    '}',
    ''
  ].join('\n');
}
