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
    const source = serializeComponent(only(['orderName', 'pickup', 'spice', 'toppings', 'quantity']));

    expect(source).toContain('  orderName: string;');
    expect(source).toContain('  pickup: boolean;');
    expect(source).toContain('  spice: number;');
    expect(source).toContain('  toppings: string[];');
    expect(source).toContain('  quantity: number;');

    // Keys follow the definition's section and field order, not the order asked for here, and only the last
    // drops its comma — so the block is asserted whole rather than a line at a time.
    expect(source).toContain(
      [
        'export const myFormShape: MyFormShape = {',
        '  toppings: [],',
        '  spice: 0,',
        '  pickup: false,',
        "  orderName: '',",
        '  quantity: 0',
        '};'
      ].join('\n')
    );
  });

  // A grouped section nests in the model, so it has to nest in the interface and the shape too.
  it('nests a grouped section under its group name', () => {
    const source = serializeComponent(only(['date', 'time', 'orderName']));

    expect(source).toContain(['  when: {', '    date: Date;', '    time: Date;', '  };'].join('\n'));
    expect(source).toContain(
      ['  when: {', '    date: new Date(),', '    time: new Date()', '  },', "  orderName: ''"].join('\n')
    );
  });

  // The presets are data, so they live in the component and the template only names the handler. Both
  // halves take the name from one place, or the exported pair would not compile.
  it('declares the preset map and the handler the template binds to', () => {
    const source = serializeComponent(only(['pizza', 'sauce', 'toppings']));

    expect(source).toContain('  readonly pizzaPresets: Record<string, Partial<MyForm>> = {');
    expect(source).toContain("    margherita: { sauce: 'tomato', toppings: ['mozzarella', 'basil'] },");
    expect(source).toContain("    'quattro-formaggi': { sauce: 'gorgonzola', toppings: ['mozzarella'] }");
    expect(source).toContain('  applyPizzaPreset(value: string): void {');
    expect(source).toContain('    this.model.update((model) => ({ ...model, ...this.pizzaPresets[value] }));');
  });

  it('declares no preset member for a form that has none', () => {
    const source = serializeComponent(only(['size', 'crust']));

    expect(source).not.toContain('Presets');
    expect(source).not.toContain('Preset(');
  });

  it('provides every name the template binds', () => {
    const definition = only(['orderName'], 'vest');
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
    const vest = serializeComponent(only(['orderName'], 'vest'));
    const angular = serializeComponent(only(['orderName'], 'angular'));

    expect(vest).toContain("from 'vest'");
    expect(vest).toContain('NgxFormidableVestValidatorDirective');
    expect(vest).toContain("    // test('orderName', 'Required.', () => {");
    expect(vest).not.toMatch(/^\s*test\(/m);

    expect(angular).not.toContain('vest');
    expect(angular).not.toContain('suite');
  });

  it('names a grouped example target by its dotted path', () => {
    const vest = serializeComponent(only(['date'], 'vest'));

    expect(vest).toContain("    // test('when.date', 'Required.', () => {");
    expect(vest).toContain('    //   enforce(model.when.date).isNotBlank();');
  });

  it('quotes a name that is not an identifier, in the component and the template alike', () => {
    const definition = only(['orderName']);
    const field = { ...definition.fields[0]!, name: 'radio-group1' };
    const renamed = { ...definition, fields: [field] };

    expect(serializeComponent(renamed)).toContain("  'radio-group1': string;");
    expect(serializeDefinition(renamed)).toContain(`[ngModel]="model()['radio-group1']"`);
  });

  it('declares a shared name once', () => {
    const definition = only(['orderName', 'phone']);
    const fields = definition.fields.map((field) => ({ ...field, name: 'shared' }));

    expect(serializeComponent({ ...definition, fields }).match(/ {2}shared: string;/g)?.length).toBe(1);
  });

  it('points at the custom field it cannot import', () => {
    expect(serializeComponent(only(['quantity']))).toContain('<example-counter-field>');
    expect(serializeComponent(only(['orderName']))).not.toContain('<example-counter-field>');
  });

  it('still produces a component for a blank form', () => {
    const source = serializeComponent(only([]));

    expect(source).toContain('export interface MyForm {\n}');
    expect(source).toContain('export const myFormShape: MyFormShape = {\n};');
    expect(source).toContain('export class MyFormComponent {');
  });
});
