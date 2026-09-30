import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DropdownField } from '@cynthion/ngx-formidable';
import { provideNgxMask } from 'ngx-mask';
import { serializeComponent } from '../portal/export/component-serializer';
import { serializeDefinition } from '../portal/export/markup-serializer';
import { serializeSchema } from '../portal/export/schema-serializer';
import { PREVIEW_FORM_DEFINITION } from '../portal/model/preview-form.definition';
import { MyForm } from './my-form';
// TypeScript types a `.ts` file imported as text as the module it is, so these two expect an error.
// @ts-expect-error: the text of the module, not the module
import componentText from './my-form' with { loader: 'text' };
// @ts-expect-error: the text of the module, not the module
import schemaText from './my-form.form' with { loader: 'text' };
import templateText from './my-form.html' with { loader: 'text' };

/**
 * The Studio's export of the sample form, checked in, compiled and rendered — which is the proof that what
 * the Studio hands out works.
 *
 * The serializers must write these files exactly, so a change to them fails here first. To take it on, copy
 * the three files again from the served Studio — Import & Export ▸ Form ▸ Export, with the sample loaded.
 */
describe('golden export', () => {
  const lines = (text: unknown): string[] => String(text).split('\n');

  it('is what the Studio writes for the sample form', () => {
    expect(lines(serializeDefinition(PREVIEW_FORM_DEFINITION))).toEqual(lines(templateText));
    expect(lines(serializeComponent(PREVIEW_FORM_DEFINITION))).toEqual(lines(componentText));
    expect(lines(serializeSchema(PREVIEW_FORM_DEFINITION))).toEqual(lines(schemaText));
  });

  describe('rendered', () => {
    let fixture: ComponentFixture<MyForm>;
    let host: MyForm;
    let root: HTMLElement;

    function settle(): void {
      fixture.detectChanges();
      tick(100);
      fixture.detectChanges();
    }

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

    beforeEach(fakeAsync(() => {
      TestBed.configureTestingModule({ providers: [provideNgxMask()] });

      fixture = TestBed.createComponent(MyForm);
      host = fixture.componentInstance;
      root = fixture.nativeElement as HTMLElement;
      settle();
    }));

    // Delivery is the default, so the branch waits on the toggle, and the card number on a card.
    it('renders every field its condition lets through', fakeAsync(() => {
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
    }));

    it('marks a field required from the schema alone', fakeAsync(() => {
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
    }));

    it('hands a field its limits from the schema', fakeAsync(() => {
      const slider = root.querySelector<HTMLInputElement>('formidable-slider-field input[type="range"]')!;

      expect([slider.min, slider.max]).toEqual(['0', '4']);
    }));

    it('swaps the fields a condition decides when the watched field changes', fakeAsync(() => {
      host.form.pickup().value.set(true);
      settle();

      expect(labels()).toContain('Pick Up From');
      expect(labels()).not.toContain('Delivery Address');

      host.form.payment.method().value.set('card');
      settle();

      expect(labels()).toContain('Card Number');
    }));

    // The field writes its value model on a pick of the user's, which is what reaches `(valueChange)`.
    it('applies a preset on the pick, and leaves the rest of the model alone', fakeAsync(() => {
      const pizza = fixture.debugElement.query(By.directive(DropdownField)).componentInstance as DropdownField;

      pizza.value.set('margherita');
      settle();

      expect(host.model()).toEqual(
        jasmine.objectContaining({
          pizza: 'margherita',
          sauce: 'tomato',
          toppings: ['mozzarella', 'basil'],
          size: null
        })
      );
    }));
  });
});
