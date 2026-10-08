import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { serializeComponent } from '../portal/export/component-serializer';
import { serializeDefinition } from '../portal/export/markup-serializer';
import { serializeSchema } from '../portal/export/schema-serializer';
import { PortalFormDefinition, PortalValidatorKind } from '../portal/model/field-spec.model';
import { PREVIEW_FORM_DEFINITION } from '../portal/model/preview-form.definition';
import { FormDefinitionStore } from '../portal/state/form-definition.store';
import { FormValueStore } from '../portal/state/form-value.store';
import { openPage } from '../portal/testing/studio';
import { ExampleForm as AngularForm } from './angular/example-form';
import { ExampleForm as VestForm } from './vest/example-form';
import { ExampleForm as ZodForm } from './zod/example-form';
// TypeScript types a `.ts` file imported as text as the module it is, so these expect an error.
// @ts-expect-error: the text of the module, not the module
import angularComponent from './angular/example-form' with { loader: 'text' };
// @ts-expect-error: the text of the module, not the module
import angularSchema from './angular/example.form' with { loader: 'text' };
import angularTemplate from './angular/example-form.html' with { loader: 'text' };
// @ts-expect-error: the text of the module, not the module
import vestComponent from './vest/example-form' with { loader: 'text' };
// @ts-expect-error: the text of the module, not the module
import vestSchema from './vest/example.form' with { loader: 'text' };
import vestTemplate from './vest/example-form.html' with { loader: 'text' };
// @ts-expect-error: the text of the module, not the module
import zodComponent from './zod/example-form' with { loader: 'text' };
// @ts-expect-error: the text of the module, not the module
import zodSchema from './zod/example.form' with { loader: 'text' };
import zodTemplate from './zod/example-form.html' with { loader: 'text' };

/** One validator's export: the component, and the text of its three files. */
interface Golden {
  readonly validator: PortalValidatorKind;
  readonly form: Type<AngularForm>;
  readonly template: unknown;
  readonly component: unknown;
  readonly schema: unknown;
}

const GOLDEN: readonly Golden[] = [
  {
    validator: 'angular',
    form: AngularForm,
    template: angularTemplate,
    component: angularComponent,
    schema: angularSchema
  },
  { validator: 'vest', form: VestForm, template: vestTemplate, component: vestComponent, schema: vestSchema },
  { validator: 'zod', form: ZodForm, template: zodTemplate, component: zodComponent, schema: zodSchema }
];

/**
 * The Studio's export of the sample form under each validator, checked in, compiled and rendered — which is
 * the proof that what the Studio hands out works, and checks what the stage checks.
 *
 * The serializers must write these files exactly, so a change to them fails here first. To take it on, copy
 * the three files again from the served Studio — Export & Import ▸ Export, with the sample loaded and
 * the validator chosen on Form ▸ Settings ▸ The Form.
 */
describe('golden export', () => {
  const lines = (text: unknown): string[] => String(text).split('\n');

  for (const golden of GOLDEN) {
    describe(`under ${golden.validator}`, () => {
      const definition: PortalFormDefinition = {
        ...PREVIEW_FORM_DEFINITION,
        options: { ...PREVIEW_FORM_DEFINITION.options, validator: golden.validator }
      };

      it('is what the Studio writes for the sample form', () => {
        expect(lines(serializeDefinition(definition))).toEqual(lines(golden.template));
        expect(lines(serializeComponent(definition))).toEqual(lines(golden.component));
        expect(lines(serializeSchema(definition))).toEqual(lines(golden.schema));
      });

      describe('rendered', () => {
        let fixture: ComponentFixture<AngularForm>;
        let host: AngularForm;
        let root: HTMLElement;

        function decorators(): Element[] {
          return Array.from(root.querySelectorAll('formidable-field-decorator'));
        }

        function labelOf(decorator: Element): string {
          return decorator.querySelector('[formidableFieldLabel]')?.textContent?.trim() ?? '';
        }

        /** The fields on the page, by label: the counter is the portal's own and names nothing. */
        function labels(): string[] {
          return decorators().map(labelOf);
        }

        /** Every message the form holds, by its target's model path — `''` for the whole form. */
        function errors(): Readonly<Record<string, readonly string[]>> {
          const name = host.form().name();
          const errors: Record<string, string[]> = {};

          for (const error of host.form().errorSummary()) {
            (errors[
              error
                .fieldTree()
                .name()
                .slice(name.length + 1)
            ] ??= []).push(error.message ?? error.kind);
          }

          return errors;
        }

        /** What the stage reports for the same model, as its model drawer lists it. */
        function stageErrors(model: object): Readonly<Record<string, readonly string[]>> {
          const values = TestBed.inject(FormValueStore);

          TestBed.inject(FormDefinitionStore).updateOptions({ validator: golden.validator });
          values.model.set(model as Record<string, unknown>);

          return values.errors();
        }

        beforeEach(async () => {
          fixture = await openPage(golden.form);
          host = fixture.componentInstance;
          root = fixture.nativeElement as HTMLElement;
        });

        // Delivery is the default, so the branch waits on the toggle, and the card number on a card.
        it('renders every field its condition lets through', () => {
          expect(labels()).toEqual([
            'Pizza',
            'Size',
            'Crust',
            'Sauce',
            'Toppings',
            'Spice',
            'How To Get It',
            'Delivery Address',
            'Date',
            'Time',
            'Pay By',
            'Name On The Order',
            'How Many',
            'Phone Number',
            'Email Address',
            'Notes For The Kitchen'
          ]);
        });

        it('marks a field required from the schema alone', () => {
          const marked = decorators()
            .filter((decorator) => decorator.querySelector('.required-marker'))
            .map(labelOf);

          expect(marked).toEqual([
            'Pizza',
            'Size',
            'Crust',
            'Sauce',
            'Delivery Address',
            'Pay By',
            'Name On The Order',
            'Phone Number',
            'Email Address'
          ]);
        });

        it('hands a field its limits from the schema', async () => {
          const spice = page.getByRole('slider', { name: 'Spice' });

          await expect.element(spice).toHaveAttribute('min', '0');
          await expect.element(spice).toHaveAttribute('max', '4');
        });

        it('swaps the fields a condition decides when the watched field changes', async () => {
          await userEvent.click(page.getByRole('switch', { name: 'How To Get It' }));

          await expect.poll(labels).toContain('Pick Up From');
          expect(labels()).not.toContain('Delivery Address');

          await userEvent.click(page.getByRole('radio', { name: 'Card' }));

          await expect.poll(labels).toContain('Card Number');
        });

        // A pick of the user's is what reaches `(valueChange)`, which the component's handler patches from.
        it('applies a preset on the pick, and leaves the rest of the model alone', async () => {
          // The display input takes no pointer events, so the field takes the click.
          await userEvent.click(page.getByRole('combobox', { name: 'Pizza' }), { force: true });
          await userEvent.click(page.getByRole('option', { name: 'Margherita' }));

          await expect
            .poll(() => host.model())
            .toEqual(
              expect.objectContaining({
                pizza: 'margherita',
                sauce: 'tomato',
                toppings: ['mozzarella', 'basil'],
                size: null
              })
            );
        });

        // The export's checks are text and the stage's are code: they agree on the form as exported, which
        // starts empty, and on one with every rule broken. 28 September 2026 is a Monday.
        it('reports what the stage reports, on the same paths', async () => {
          const broken = {
            ...host.model(),
            sauce: 'bbq',
            toppings: ['basil', 'chilli', 'ham', 'mushrooms', 'pineapple', 'salami'],
            when: { date: new Date(2026, 8, 28), time: new Date(2000, 0, 1, 9, 0) },
            payment: { method: 'card', cardNumber: '4242' },
            phone: '079',
            email: 'alex'
          };

          expect(errors()).toEqual(stageErrors(host.model()));

          host.model.set(broken);

          await expect.poll(errors).toEqual(stageErrors(broken));
          expect(errors()['']).toEqual(['Pineapple on a BBQ base is a combination this kitchen refuses.']);
        });
      });
    });
  }
});
