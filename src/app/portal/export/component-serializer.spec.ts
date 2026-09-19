import { PortalFormDefinition } from '../model/field-spec.model';
import { PREVIEW_FORM_DEFINITION } from '../model/preview-form.definition';
import { serializeComponent } from './component-serializer';
import { serializeDefinition } from './markup-serializer';

function only(ids: readonly string[], validator = PREVIEW_FORM_DEFINITION.options.validator): PortalFormDefinition {
  return {
    ...PREVIEW_FORM_DEFINITION,
    fields: PREVIEW_FORM_DEFINITION.fields.filter((field) => ids.includes(field.id)),
    options: { ...PREVIEW_FORM_DEFINITION.options, validator }
  };
}

describe('component serializer', () => {
  it('types each key by what its field writes, and shapes it to match', () => {
    const source = serializeComponent(
      only(['travellerName', 'arrivalDate', 'arrivalTime', 'metYourself', 'paradoxTolerance', 'declarations'])
    );

    expect(source).toContain('  travellerName: string;');
    expect(source).toContain('  arrivalDate: Date;');
    expect(source).toContain('  arrivalTime: Date;');
    expect(source).toContain('  metYourself: boolean;');
    expect(source).toContain('  paradoxTolerance: number;');
    expect(source).toContain('  declarations: string[];');

    expect(source).toContain("  travellerName: '',");
    expect(source).toContain('  arrivalDate: new Date(),');
    expect(source).toContain('  metYourself: false,');
    expect(source).toContain('  paradoxTolerance: 0,');
    expect(source).toContain('  declarations: []\n};');
  });

  it('provides every name the template binds', () => {
    const definition = only(['travellerName'], 'vest');
    const template = serializeDefinition(definition);
    const source = serializeComponent(definition);

    expect(template).toContain('[formValue]="model()"');
    expect(template).toContain('(formValueChange)="model.set($event)"');
    expect(template).toContain('[formShape]="shape"');
    expect(template).toContain('[formSuite]="suite"');

    expect(source).toContain('  readonly model = signal<MyFormModel>({});');
    expect(source).toContain('  readonly shape = myFormShape;');
    expect(source).toContain('  readonly suite = myFormSuite;');
  });

  it('carries a suite only under Vest, and leaves its rules to the consumer', () => {
    const vest = serializeComponent(only(['travellerName'], 'vest'));
    const angular = serializeComponent(only(['travellerName'], 'angular'));

    expect(vest).toContain("from 'vest'");
    expect(vest).toContain('NgxFormidableVestValidatorDirective');
    expect(vest).toContain("    // test('travellerName', 'Required.', () => {");
    expect(vest).not.toMatch(/^\s*test\(/m);

    expect(angular).not.toContain('vest');
    expect(angular).not.toContain('suite');
  });

  it('quotes a name that is not an identifier, in the component and the template alike', () => {
    const definition = only(['travellerName']);
    const field = { ...definition.fields[0]!, name: 'radio-group1' };
    const renamed = { ...definition, fields: [field] };

    expect(serializeComponent(renamed)).toContain("  'radio-group1': string;");
    expect(serializeDefinition(renamed)).toContain(`[ngModel]="model()['radio-group1']"`);
  });

  it('declares a shared name once', () => {
    const definition = only(['travellerName', 'temporalId']);
    const fields = definition.fields.map((field) => ({ ...field, name: 'shared' }));

    expect(serializeComponent({ ...definition, fields }).match(/ {2}shared: string;/g)?.length).toBe(1);
  });

  it('points at the custom field it cannot import', () => {
    expect(serializeComponent(only(['companions']))).toContain('<example-counter-field>');
    expect(serializeComponent(only(['travellerName']))).not.toContain('<example-counter-field>');
  });

  it('still produces a component for a blank form', () => {
    const source = serializeComponent(only([]));

    expect(source).toContain('export interface MyForm {\n}');
    expect(source).toContain('export const myFormShape: MyFormShape = {\n};');
    expect(source).toContain('export class MyFormComponent {');
  });
});
