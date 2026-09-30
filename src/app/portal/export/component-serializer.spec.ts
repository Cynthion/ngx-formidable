import { PortalFormDefinition } from '../model/field-spec.model';
import { PREVIEW_FORM_DEFINITION } from '../model/preview-form.definition';
import { serializeComponent } from './component-serializer';
import { serializeDefinition } from './markup-serializer';

function only(ids: readonly string[]): PortalFormDefinition {
  return {
    ...PREVIEW_FORM_DEFINITION,
    fields: PREVIEW_FORM_DEFINITION.fields.filter((field) => ids.includes(field.id))
  };
}

describe('component serializer', () => {
  it('holds the form over a signal of the initial model, under the names the template binds', () => {
    const definition = only(['orderName']);

    expect(serializeDefinition(definition)).toContain('<form [formRoot]="form">');
    expect(serializeComponent(definition)).toContain(
      [
        'export class MyForm {',
        '  readonly model = signal<MyFormModel>(myFormInitialModel);',
        '  readonly form = form(this.model, myFormSchema);',
        '}'
      ].join('\n')
    );
  });

  // Read off the template, so a decoration the template leaves out is not imported, and one it adds is.
  it('imports exactly what the template uses', () => {
    const source = serializeComponent(only(['orderName', 'size']));

    expect(source).toContain(
      "import { FieldDecorator, FieldLabel, FieldOption, InputField, SelectField } from '@cynthion/ngx-formidable';"
    );
    expect(source).toContain(
      [
        '  imports: [',
        '    FormRoot,',
        '    FormField,',
        '    FieldDecorator,',
        '    FieldLabel,',
        '    FieldOption,',
        '    InputField,',
        '    SelectField',
        '  ]'
      ].join('\n')
    );
    expect(source).not.toContain('FieldHint');
  });

  // The presets are data, so they live in the component and the template only names the handler. Both
  // halves take the name from one place, or the exported pair would not compile.
  it('declares the preset map and the handler the template binds to', () => {
    const source = serializeComponent(only(['pizza', 'sauce', 'toppings']));

    expect(source).toContain('  readonly pizzaPresets: Record<string, Partial<MyFormModel>> = {');
    expect(source).toContain("    margherita: { sauce: 'tomato', toppings: ['mozzarella', 'basil'] },");
    expect(source).toContain("    'quattro-formaggi': { sauce: 'gorgonzola', toppings: ['mozzarella'] }");
    expect(source).toContain('  applyPizzaPreset(value: string | null): void {');
    expect(source).toContain(
      '    if (value) this.model.update((model) => ({ ...model, ...this.pizzaPresets[value] }));'
    );
  });

  it('declares no preset member for a form that has none', () => {
    const source = serializeComponent(only(['size', 'crust']));

    expect(source).not.toContain('Presets');
    expect(source).not.toContain('Preset(');
  });

  // The library has no form-level input for either, so the component scopes them over its own fields.
  it('provides what the form states itself over the app defaults, and nothing where it states nothing', () => {
    const definition = only(['orderName']);
    const stating = serializeComponent({
      ...definition,
      options: { ...definition.options, revealOn: 'dirty', hideRequiredMarkers: false }
    });

    expect(stating).toContain("import { Component, inject, signal } from '@angular/core';");
    expect(stating).toContain('FORMIDABLE_DEFAULTS');
    expect(stating).toContain(
      "      useFactory: () => ({ ...inject(FORMIDABLE_DEFAULTS, { skipSelf: true }), revealOn: 'dirty', hideRequiredMarkers: false })"
    );

    expect(serializeComponent(definition)).not.toContain('providers');
    expect(serializeComponent(definition)).not.toContain('inject');
  });

  it('points at the custom field it cannot import', () => {
    expect(serializeComponent(only(['quantity']))).toContain(
      "import { ExampleCounterField } from '../example-counter-field/example-counter-field';"
    );
    expect(serializeComponent(only(['orderName']))).not.toContain('ExampleCounterField');
  });

  it('still produces a component for a blank form', () => {
    const source = serializeComponent(only([]));

    expect(source).toContain("import { form, FormRoot } from '@angular/forms/signals';");
    expect(source).not.toContain('@cynthion/ngx-formidable');
    expect(source).toContain('export class MyForm {');
  });
});
